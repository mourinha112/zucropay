# 🔧 Correção do Erro de CORS no Ngrok

## 🔴 Problema
Ao acessar via ngrok, aparecia este erro:
```
Access to fetch at 'https://cc31cd46ab04.ngrok-free.app/login.php' from origin 'https://8912dc6d2a43.ngrok-free.app' has been blocked by CORS policy: Response to preflight request doesn't pass access control check: No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

## 🎯 Causa
- O frontend está em um domínio ngrok (ex: `https://8912dc6d2a43.ngrok-free.app`)
- O backend está em OUTRO domínio ngrok (ex: `https://cc31cd46ab04.ngrok-free.app`)
- Navegadores bloqueiam requisições entre domínios diferentes (CORS) por segurança
- O `router.php` não estava enviando os headers CORS necessários
- Mesmo que os arquivos PHP individuais tenham headers CORS, o `router.php` processa ANTES

## ✅ Solução Aplicada

### 1. Adicionado Headers CORS no router.php
Adicionamos no topo do `router.php`:
```php
// CORS headers - DEVEM vir ANTES de qualquer outra resposta
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, ngrok-skip-browser-warning');
header('Access-Control-Max-Age: 86400'); // Cache preflight por 1 dia

// Tratar OPTIONS preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}
```

### 2. Headers CORS Incluem
- **Access-Control-Allow-Origin: \***: Permite qualquer origem (necessário para ngrok)
- **Access-Control-Allow-Methods**: Lista todos os métodos HTTP usados
- **Access-Control-Allow-Headers**: Inclui o header customizado `ngrok-skip-browser-warning`
- **Access-Control-Max-Age**: Navegador guarda permissão por 1 dia (reduz requisições OPTIONS)

### 3. Suporte a OPTIONS Preflight
- Navegadores enviam requisição OPTIONS ANTES da requisição real (preflight check)
- Router agora responde corretamente com código 204 (No Content)

## 📋 Passos para Aplicar

### 1. Parar o Servidor Backend
No terminal do backend, pressione `Ctrl+C`

### 2. Reiniciar com router.php
```powershell
cd C:\Users\Mourinha\Desktop\zucropay\backend
php -S localhost:8000 router.php
```

### 3. Verificar Headers (Opcional)
Teste se os headers estão sendo enviados:
```powershell
curl -I https://cc31cd46ab04.ngrok-free.app/login.php
```

Deve aparecer:
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization, ngrok-skip-browser-warning
```

## 🧪 Testar

### 1. Testar Login
- Acesse o frontend via ngrok: `https://8912dc6d2a43.ngrok-free.app`
- Tente fazer login
- Deve funcionar sem erros de CORS

### 2. Testar Criar Produto
- Vá em Produtos
- Clique em "Adicionar Produto"
- Preencha e salve
- Deve funcionar sem erros de CORS

## 🔍 Como Funciona

### Fluxo Normal (SEM CORS)
```
Frontend (localhost:5173)  →  Backend (localhost:8000)
✅ Mesma origem, sem problemas
```

### Fluxo com Ngrok (COM CORS)
```
Frontend (https://abc.ngrok-free.app)  →  Backend (https://xyz.ngrok-free.app)
❌ Origens diferentes, CORS necessário
```

### Sequência de Requisição CORS
1. **OPTIONS Preflight** (navegador envia automaticamente):
   ```
   OPTIONS /login.php
   Headers: Origin, Access-Control-Request-Method, Access-Control-Request-Headers
   ```

2. **Resposta OPTIONS** (servidor deve responder):
   ```
   204 No Content
   Access-Control-Allow-Origin: *
   Access-Control-Allow-Methods: POST
   Access-Control-Allow-Headers: Content-Type, Authorization
   ```

3. **POST Real** (navegador envia a requisição de verdade):
   ```
   POST /login.php
   Body: {"email":"...","password":"..."}
   ```

4. **Resposta POST** (servidor responde normalmente):
   ```
   200 OK
   Access-Control-Allow-Origin: *
   Body: {"success":true,"token":"..."}
   ```

## ⚠️ Problemas Comuns

### 1. Ainda Dá Erro Depois de Reiniciar
**Causa**: Navegador guardou resposta antiga sem CORS
**Solução**: 
- Limpe o cache do navegador (Ctrl+Shift+Delete)
- Ou abra uma aba anônima

### 2. Funciona Localmente mas Não no Ngrok
**Causa**: Ngrok adiciona camada extra de domínio
**Solução**: 
- Certifique-se que `router.php` tem os headers CORS
- Verifique se servidor foi reiniciado COM router.php

### 3. Erro "net::ERR_FAILED" Sem Mensagem de CORS
**Causa**: Servidor backend está offline
**Solução**:
- Verifique se `php -S localhost:8000 router.php` está rodando
- Verifique se o túnel ngrok do backend está ativo

## 📝 Checklist de Verificação

- [ ] `router.php` tem headers CORS no topo
- [ ] Servidor backend reiniciado com `php -S localhost:8000 router.php`
- [ ] Túnel ngrok do backend está ativo (`ngrok http 8000`)
- [ ] Túnel ngrok do frontend está ativo (`ngrok http 5173`)
- [ ] `api.ts` tem a URL ngrok correta do backend
- [ ] Cache do navegador foi limpo OU está usando aba anônima

## 🎉 Resultado Final
Agora você pode:
- ✅ Compartilhar o link ngrok do frontend com clientes
- ✅ Clientes podem testar o sistema remotamente
- ✅ Login funciona via ngrok
- ✅ Criar produtos funciona via ngrok
- ✅ Upload de imagens funciona via ngrok
- ✅ Checkout funciona via ngrok

## 🔒 Segurança em Produção
⚠️ **IMPORTANTE**: `Access-Control-Allow-Origin: *` permite QUALQUER domínio acessar sua API.

Para produção, substitua por domínio específico:
```php
// Em vez de:
header('Access-Control-Allow-Origin: *');

// Use:
header('Access-Control-Allow-Origin: https://seu-dominio-frontend.com');
```

Ou use variável de ambiente:
```php
$allowedOrigins = [
    'https://seu-dominio-frontend.com',
    'http://localhost:5173', // Para desenvolvimento
];

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowedOrigins)) {
    header('Access-Control-Allow-Origin: ' . $origin);
}
```
