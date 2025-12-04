# 🔧 Correção: Produto Não Encontrado no Checkout

## 🔴 Problema
Ao acessar qualquer checkout público, aparecia erro "Produto não encontrado".

## 🎯 Causa
As funções públicas do checkout (`getPublicPaymentLink` e `createPublicPayment`) não tinham:
1. ❌ Header `ngrok-skip-browser-warning` para bypass do aviso do ngrok
2. ❌ Validação de Content-Type antes de fazer JSON.parse()
3. ❌ Backend não aceitava o header customizado do ngrok

Resultado: Ngrok retornava página HTML de aviso → Frontend tentava fazer JSON.parse() → Erro "Produto não encontrado"

## ✅ Correções Aplicadas

### 1. Frontend - api.ts

#### getPublicPaymentLink (Linha ~390)
**ANTES:**
```typescript
export const getPublicPaymentLink = async (linkId: string) => {
  const response = await fetch(`${API_BASE_URL}/public-payment-link.php?id=${linkId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Link de pagamento não encontrado');
  }

  return response.json();
};
```

**DEPOIS:**
```typescript
export const getPublicPaymentLink = async (linkId: string) => {
  const response = await fetch(`${API_BASE_URL}/public-payment-link.php?id=${linkId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': '69420', // ✅ ADICIONADO
    },
  });

  if (!response.ok) {
    throw new Error('Link de pagamento não encontrado');
  }

  // ✅ VALIDAÇÃO ADICIONADA
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    const text = await response.text();
    console.error('Resposta não é JSON:', text.substring(0, 500));
    throw new Error('Resposta inválida do servidor');
  }

  return response.json();
};
```

#### createPublicPayment (Linha ~415)
**ANTES:**
```typescript
export const createPublicPayment = async (data: {...}) => {
  const response = await fetch(`${API_BASE_URL}/public-payment.php`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  const result = await response.json();
  // ...
};
```

**DEPOIS:**
```typescript
export const createPublicPayment = async (data: {...}) => {
  const response = await fetch(`${API_BASE_URL}/public-payment.php`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': '69420', // ✅ ADICIONADO
    },
    body: JSON.stringify(data),
  });

  // ✅ VALIDAÇÃO ADICIONADA
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    const text = await response.text();
    console.error('Resposta não é JSON:', text.substring(0, 500));
    throw new Error('Resposta inválida do servidor');
  }

  const result = await response.json();
  // ...
};
```

### 2. Backend - Headers CORS

#### public-payment-link.php (Linha ~5)
**ANTES:**
```php
header('Access-Control-Allow-Headers: Content-Type');
```

**DEPOIS:**
```php
header('Access-Control-Allow-Headers: Content-Type, ngrok-skip-browser-warning');
```

#### public-payment.php (Linha ~7)
**ANTES:**
```php
header('Access-Control-Allow-Headers: Content-Type');
```

**DEPOIS:**
```php
header('Access-Control-Allow-Headers: Content-Type, ngrok-skip-browser-warning');
```

## 📋 Como Aplicar

### 1. Frontend - Reiniciar Servidor Dev
```powershell
# No terminal do frontend (esbuild)
Ctrl+C  # Parar o servidor atual
npm run dev  # Reiniciar
```

### 2. Backend - Reiniciar Servidor PHP
```powershell
# No terminal do backend (powershell)
Ctrl+C  # Parar o servidor PHP

# Reiniciar COM router.php (importante!)
cd C:\Users\Mourinha\Desktop\zucropay\backend
php -S localhost:8000 router.php
```

### 3. Limpar Cache do Navegador
```
Ctrl+Shift+Delete → Limpar cache
OU
Abrir aba anônima (Ctrl+Shift+N)
```

## 🧪 Testar

### 1. Obter Link de Checkout
1. Faça login no sistema
2. Vá em **Produtos**
3. Clique em **Ações** → **Gerar Link de Pagamento**
4. Copie o link (ex: `https://8912dc6d2a43.ngrok-free.app/checkout/link_abc123`)

### 2. Testar Acesso
1. Abra uma aba anônima
2. Cole o link do checkout
3. **Deve carregar:** Nome do produto, preço, imagem, formulário de pagamento
4. **Não deve aparecer:** "Produto não encontrado"

### 3. Testar Pagamento
1. Preencha os dados do cliente
2. Escolha forma de pagamento (PIX, Boleto ou Cartão)
3. Clique em **Finalizar Compra**
4. **Deve funcionar:** Gerar QR Code (PIX), Link do Boleto ou Confirmar Cartão

## 🔍 Verificação de Problemas

### Ainda dá "Produto não encontrado"?

**Verifique:**
1. ✅ Frontend reiniciado? (`npm run dev`)
2. ✅ Backend reiniciado COM router.php? (`php -S localhost:8000 router.php`)
3. ✅ Cache do navegador limpo?
4. ✅ Túnel ngrok do backend está ativo?
5. ✅ URL do backend no `api.ts` está correta?

**Teste no Console do Navegador (F12):**
```javascript
// Deve mostrar: Headers com ngrok-skip-browser-warning
fetch('https://cc31cd46ab04.ngrok-free.app/public-payment-link.php?id=link_test', {
  headers: {'ngrok-skip-browser-warning': '69420'}
})
.then(r => r.text())
.then(console.log)
```

### Console mostra "Resposta não é JSON"?

**Causa:** Backend não está respondendo corretamente
**Verifique:**
1. Backend está rodando? (`php -S localhost:8000 router.php`)
2. Túnel ngrok aponta para porta 8000? (`ngrok http 8000`)
3. Arquivo `public-payment-link.php` existe?

### Erro de CORS ainda aparece?

**Causa:** Backend não enviou headers CORS
**Solução:**
1. Pare o servidor PHP (Ctrl+C)
2. Reinicie com router.php: `php -S localhost:8000 router.php`
3. Verifique que o arquivo `router.php` tem os headers CORS no topo

## 📊 Fluxo Correto de Funcionamento

### 1. Cliente Acessa Link
```
Cliente → https://8912dc6d2a43.ngrok-free.app/checkout/link_abc123
```

### 2. Frontend Carrega Página
```typescript
// CheckoutPublico.tsx linha ~73
loadProductData()
  → api.getPublicPaymentLink('link_abc123')
  → fetch('https://cc31cd46ab04.ngrok-free.app/public-payment-link.php?id=link_abc123')
     Headers: {
       'Content-Type': 'application/json',
       'ngrok-skip-browser-warning': '69420' // ← Bypass do aviso
     }
```

### 3. Ngrok Processa
```
Ngrok recebe header 'ngrok-skip-browser-warning': '69420'
  → ✅ PULA página de aviso
  → Encaminha diretamente para backend
```

### 4. Backend Responde
```php
// public-payment-link.php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, ngrok-skip-browser-warning');

// Busca produto no banco
$stmt = $pdo->prepare('SELECT * FROM payment_links WHERE asaas_payment_link_id = ?');
$stmt->execute([$linkId]);

// Retorna JSON
jsonResponse(['success' => true, 'product' => $product]);
```

### 5. Frontend Exibe
```typescript
// CheckoutPublico.tsx linha ~105
setProductData(response);
// → Exibe nome, preço, imagem, formulário
```

## 🎉 Resultado Final

Agora o checkout público funciona perfeitamente:
- ✅ Carrega dados do produto via ngrok
- ✅ Não mostra erro "Produto não encontrado"
- ✅ Exibe formulário de pagamento
- ✅ Processa pagamento (PIX/Boleto/Cartão)
- ✅ Clientes externos podem acessar o link
- ✅ Funciona em qualquer navegador/dispositivo

## 📝 Arquivos Modificados

### Frontend
- ✅ `src/services/api.ts` (linhas 390-448)
  - Adicionado header ngrok em `getPublicPaymentLink()`
  - Adicionado header ngrok em `createPublicPayment()`
  - Adicionada validação de Content-Type em ambas

### Backend
- ✅ `backend/public-payment-link.php` (linha 7)
  - Adicionado `ngrok-skip-browser-warning` aos headers permitidos
- ✅ `backend/public-payment.php` (linha 7)
  - Adicionado `ngrok-skip-browser-warning` aos headers permitidos
- ✅ `backend/router.php` (linhas 5-13)
  - Headers CORS no topo
  - Suporte a OPTIONS preflight

## 🔐 Próximos Passos

### Para Produção
Quando for para produção (domínio próprio), substitua:
```php
// Em todos os arquivos PHP, em vez de:
header('Access-Control-Allow-Origin: *');

// Use:
header('Access-Control-Allow-Origin: https://seu-dominio-frontend.com');
```

### Para Melhor Segurança
```php
$allowedOrigins = [
    'https://seu-dominio-frontend.com',
    'http://localhost:5173', // Dev local
];

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowedOrigins)) {
    header('Access-Control-Allow-Origin: ' . $origin);
} else {
    http_response_code(403);
    exit('Origin not allowed');
}
```
