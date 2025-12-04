# 🚨 ERRO: Chave de API não pertence ao ambiente

## ❌ PROBLEMA

```
A chave de API informada não pertence a este ambiente
```

Você está usando:
- **Chave:** PRODUÇÃO (`$aact_prod_...`)
- **URL:** SANDBOX (`https://sandbox.asaas.com/api/v3`)

**Isso não funciona!** A chave de produção só funciona com a URL de produção.

---

## ✅ SOLUÇÃO RÁPIDA

### Edite o arquivo: `backend/config.php`

**Escolha UMA das opções:**

### OPÇÃO 1: SANDBOX (Recomendado para testes) ✅

```php
<?php
// Use uma chave de teste do Asaas Sandbox
define('ASAAS_API_KEY', '$aact_test_SUA_CHAVE_SANDBOX_AQUI');
define('ASAAS_API_URL', 'https://sandbox.asaas.com/api/v3');

function get_asaas_headers() {
    return [
        'Content-Type: application/json',
        'access_token: ' . ASAAS_API_KEY
    ];
}
?>
```

**Como obter chave Sandbox:**
1. Acesse: https://sandbox.asaas.com/
2. Faça login ou crie conta
3. Vá em: https://sandbox.asaas.com/api
4. Copie a chave (começa com `$aact_test_`)

---

### OPÇÃO 2: PRODUÇÃO (Cobra taxas reais!) ⚠️

```php
<?php
// Chave de produção - CUIDADO: Cobra taxas reais!
define('ASAAS_API_KEY', '$aact_prod_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OjI2MzcyM2UwLTI0Y2ItNDg3ZC1hMGUzLTU2MThhZWU2YTM1ZDo6JGFhY2hfMzM0YzViNTEtYzU2ZS00MTk2LWI2ZTYtZDEzMDFhODRlMTQ5');
define('ASAAS_API_URL', 'https://api.asaas.com/v3'); // SEM "sandbox"!

function get_asaas_headers() {
    return [
        'Content-Type: application/json',
        'access_token: ' . ASAAS_API_KEY
    ];
}
?>
```

---

## 🧪 TESTAR

Após editar `config.php`, execute:

```powershell
cd c:\Users\Mourinha\Desktop\zucropay\backend
php test-payment-link.php
```

**Deve mostrar:**
```
✅ SUCESSO!
Link ID: pay_link_xxxxx
URL: https://...
```

---

## 📋 CHECKLIST

- [ ] Decidi usar Sandbox (testes) ou Produção (real)
- [ ] Editei `backend/config.php` com chave e URL corretas
- [ ] Chave e URL são do **MESMO** ambiente (ambos sandbox OU ambos produção)
- [ ] Testei com `php test-payment-link.php`
- [ ] Resultado foi ✅ SUCESSO!

---

**Depois de configurar, tente criar o link de pagamento novamente no frontend! 🚀**
