// Serviço de Push Notifications para ZucroPay
const API_URL = import.meta.env.VITE_API_URL || '';

// VAPID Public Key - precisa ser gerada uma vez e usada sempre
// Gerar em: https://vapidkeys.com/ ou via web-push cli
const VAPID_PUBLIC_KEY = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';

// Converter VAPID key para Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Verificar se push notifications são suportadas
export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 
         'PushManager' in window && 
         'Notification' in window;
}

// Verificar permissão atual
export function getNotificationPermission(): NotificationPermission {
  return Notification.permission;
}

// Solicitar permissão
export async function requestPermission(): Promise<NotificationPermission> {
  if (!isPushSupported()) {
    console.warn('[Push] Push notifications não suportadas');
    return 'denied';
  }

  const permission = await Notification.requestPermission();
  console.log('[Push] Permissão:', permission);
  return permission;
}

// Registrar Service Worker
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.warn('[Push] Service Worker não suportado');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });
    console.log('[Push] Service Worker registrado:', registration.scope);
    return registration;
  } catch (error) {
    console.error('[Push] Erro ao registrar Service Worker:', error);
    return null;
  }
}

// Obter subscription atual
export async function getSubscription(): Promise<PushSubscription | null> {
  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

// Criar nova subscription
export async function subscribe(): Promise<PushSubscription | null> {
  if (!isPushSupported()) {
    console.warn('[Push] Push notifications não suportadas');
    return null;
  }

  // Primeiro, pedir permissão
  const permission = await requestPermission();
  if (permission !== 'granted') {
    console.warn('[Push] Permissão negada');
    return null;
  }

  try {
    // Registrar service worker se necessário
    const registration = await navigator.serviceWorker.ready;

    // Verificar se já tem subscription
    let subscription = await registration.pushManager.getSubscription();
    
    if (!subscription) {
      // Criar nova subscription
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
      console.log('[Push] Nova subscription criada');
    }

    // Salvar no servidor
    await saveSubscription(subscription);

    return subscription;
  } catch (error) {
    console.error('[Push] Erro ao criar subscription:', error);
    return null;
  }
}

// Cancelar subscription
export async function unsubscribe(): Promise<boolean> {
  try {
    const subscription = await getSubscription();
    if (subscription) {
      await removeSubscription(subscription);
      await subscription.unsubscribe();
      console.log('[Push] Subscription cancelada');
      return true;
    }
    return false;
  } catch (error) {
    console.error('[Push] Erro ao cancelar subscription:', error);
    return false;
  }
}

// Salvar subscription no servidor (usando dashboard-data?type=push)
async function saveSubscription(subscription: PushSubscription): Promise<void> {
  const token = localStorage.getItem('zucropay_token');
  if (!token) {
    console.error('[Push] Token não encontrado');
    return;
  }

  try {
    const response = await fetch(`${API_URL}/api/dashboard-data?type=push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        action: 'subscribe',
        subscription: subscription.toJSON(),
      }),
    });

    const result = await response.json();
    if (result.success) {
      console.log('[Push] Subscription salva no servidor');
    } else {
      console.error('[Push] Erro ao salvar subscription:', result.error);
    }
  } catch (error) {
    console.error('[Push] Erro ao salvar subscription:', error);
  }
}

// Remover subscription do servidor
async function removeSubscription(subscription: PushSubscription): Promise<void> {
  const token = localStorage.getItem('zucropay_token');
  if (!token) return;

  try {
    await fetch(`${API_URL}/api/dashboard-data?type=push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        action: 'unsubscribe',
        endpoint: subscription.endpoint,
      }),
    });
  } catch (error) {
    console.error('[Push] Erro ao remover subscription:', error);
  }
}

// Inicializar push notifications (chamar no login)
export async function initPushNotifications(): Promise<boolean> {
  if (!isPushSupported()) {
    console.log('[Push] Push notifications não suportadas neste dispositivo');
    return false;
  }

  // Registrar service worker
  await registerServiceWorker();

  // Se já tem permissão, criar/atualizar subscription
  if (Notification.permission === 'granted') {
    const subscription = await subscribe();
    return !!subscription;
  }

  return false;
}

// Mostrar notificação local (para testes)
export function showLocalNotification(title: string, options?: NotificationOptions): void {
  if (Notification.permission === 'granted') {
    new Notification(title, {
      icon: '/logotipo.png',
      badge: '/logotipo.png',
      ...options,
    });
  }
}

export default {
  isPushSupported,
  getNotificationPermission,
  requestPermission,
  registerServiceWorker,
  getSubscription,
  subscribe,
  unsubscribe,
  initPushNotifications,
  showLocalNotification,
};
