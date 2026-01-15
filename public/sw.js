// Service Worker para Push Notifications - ZucroPay
// Atualizar versão para forçar atualização do cache
const CACHE_NAME = 'zucropay-v2';

// Arquivos para cache offline
const urlsToCache = [
  '/',
  '/index.html',
  '/logotipo.png',
  '/manifest.json',
];

// Instalação do Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Cache aberto');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error('[SW] Erro ao cachear:', error);
      })
  );
  self.skipWaiting();
});

// Ativação
self.addEventListener('activate', (event) => {
  console.log('[SW] Ativando...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Removendo cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch com cache - Network First para HTML, Cache First para assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorar requisições de API (não cachear)
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // Ignorar service worker
  if (url.pathname.includes('/sw.js')) {
    return;
  }

  // Para requisições de navegação (HTML), sempre servir index.html (SPA)
  if (request.mode === 'navigate' || (request.headers.get('accept')?.includes('text/html'))) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Se a resposta é HTML, sempre cachear index.html atualizado
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              // Cachear como index.html para todas as rotas SPA
              cache.put('/index.html', responseToCache);
            });
          }
          return response;
        })
        .catch(() => {
          // Se network falhar, sempre retornar index.html do cache
          return caches.match('/index.html').then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Fallback: tentar buscar index.html do network
            return fetch('/index.html');
          });
        })
    );
    return;
  }

  // Para assets estáticos (JS, CSS, imagens), Network First com cache
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cachear resposta válida
        if (response && response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // Se network falhar, usar cache
        return caches.match(request);
      })
  );
});

// ==========================================
// PUSH NOTIFICATIONS
// ==========================================

self.addEventListener('push', (event) => {
  console.log('[SW] Push recebido:', event);

  let data = {
    title: 'ZucroPay',
    body: 'Você tem uma nova notificação!',
    icon: '/logotipo.png',
    badge: '/logotipo.png',
    tag: 'notification-' + Date.now(),
    data: {},
  };

  // Tentar parsear dados do push
  if (event.data) {
    try {
      const pushData = event.data.json();
      data = {
        title: pushData.title || data.title,
        body: pushData.body || data.body,
        icon: pushData.icon || data.icon,
        badge: pushData.badge || data.badge,
        tag: pushData.tag || data.tag,
        data: pushData.data || {},
      };
    } catch (e) {
      console.error('[SW] Erro ao parsear push:', e);
      data.body = event.data.text();
    }
  }

  // Opções de notificação bonita
  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    tag: data.tag,
    data: data.data,
    vibrate: [100, 50, 100, 50, 200], // Padrão de vibração agradável
    actions: [
      {
        action: 'open',
        title: '📊 Ver Vendas',
      },
      {
        action: 'close',
        title: '✕ Fechar',
      },
    ],
    requireInteraction: false, // Fecha sozinho após alguns segundos
    silent: false,
    renotify: true, // Notifica mesmo se já tem uma com mesmo tag
    // Timestamp para mostrar quando foi
    timestamp: Date.now(),
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Click na notificação
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notificação clicada:', event);

  event.notification.close();

  const action = event.action;
  const notificationData = event.notification.data || {};

  if (action === 'close') {
    return;
  }

  // URL para abrir
  let urlToOpen = '/dashboard';
  
  if (notificationData.url) {
    urlToOpen = notificationData.url;
  } else if (notificationData.type === 'sale') {
    urlToOpen = '/vendas';
  } else if (notificationData.type === 'withdrawal') {
    urlToOpen = '/financas';
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Se já tem uma janela aberta, focar nela
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.focus();
            client.navigate(urlToOpen);
            return;
          }
        }
        // Se não, abrir nova janela
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Fechar notificação
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notificação fechada');
});

console.log('[SW] Service Worker carregado!');
