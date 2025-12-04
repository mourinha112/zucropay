# 🚀 ZucroPay - Gateway de Pagamento Completo

## ✅ O Que Foi Implementado

### 1. **API REST Pública** (Igual Stripe, Mercado Pago)
- ✅ Endpoint `/api/v1/payments/create.php`
- ✅ Autenticação via API Key (Header `X-API-Key`)
- ✅ Sem necessidade de configurar banco de dados
- ✅ Criação de pagamentos PIX
- ✅ QR Code gerado automaticamente
- ✅ Código PIX copia-e-cola

### 2. **JavaScript SDK** (zucropay-sdk.js)
- ✅ Biblioteca pronta para usar
- ✅ Métodos:
  - `createPayment()` - Criar pagamento via API
  - `createButton()` - Botão pronto com modal
  - `createCheckoutForm()` - Formulário completo
  - `showPaymentModal()` - Modal com QR Code PIX
  - `getPaymentStatus()` - Verificar status

### 3. **Documentação Completa**
- ✅ Página `/api-docs` com 5 abas
- ✅ Exemplos de integração
- ✅ Página `/exemplos-sdk.html` com demos funcionando
- ✅ Arquivo `INTEGRACAO_SIMPLES.md` com guia completo

## 🎯 Como Usar (Versão Simples)

### Opção 1: Botão Pronto (Mais Fácil)

```html
<!-- 1. Incluir SDK -->
<script src="http://localhost:5173/zucropay-sdk.js"></script>

<!-- 2. Container -->
<div id="payment-btn"></div>

<!-- 3. Criar botão -->
<script>
  new ZucroPay('sua_api_key').createButton('payment-btn', {
    amount: 99.90,
    customer: {
      name: 'João Silva',
      email: 'joao@example.com',
      document: '12345678900'
    }
  });
</script>
```

### Opção 2: API REST Direto

```javascript
const response = await fetch('http://localhost:8000/api/v1/payments/create.php', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'sua_api_key_aqui'
  },
  body: JSON.stringify({
    amount: 99.90,
    customer: {
      name: 'João Silva',
      email: 'joao@example.com',
      document: '12345678900'
    },
    description: 'Produto XYZ'
  })
});

const payment = await response.json();
console.log('QR Code:', payment.pix.qr_code_base64);
console.log('Código PIX:', payment.pix.copy_paste);
```

### Opção 3: Formulário Completo

```javascript
const zucropay = new ZucroPay('sua_api_key');

zucropay.createCheckoutForm('checkout', {
  amount: 199.90,
  title: 'Finalizar Compra',
  description: 'Curso de Marketing',
  orderId: 'PEDIDO-123'
});
```

## 📁 Arquivos Criados

### Backend
- `backend/api/v1/payments/create.php` - API pública de pagamentos
- `backend/api-keys.php` - Gerenciamento de API Keys (já existia)
- `backend/webhooks-config.php` - Webhooks (já existia)

### Frontend
- `public/zucropay-sdk.js` - SDK JavaScript completo
- `public/exemplos-sdk.html` - Página de exemplos funcionando
- `src/pages/ApiDocs/ApiDocs.tsx` - Documentação atualizada (nova aba SDK)

### Documentação
- `INTEGRACAO_SIMPLES.md` - Guia completo de integração
- `README_API.md` - Este arquivo

## 🎨 Exemplos de Uso

### WordPress / WooCommerce
```php
add_action('woocommerce_thankyou', 'zucropay_button');
function zucropay_button($order_id) {
  $order = wc_get_order($order_id);
  ?>
  <script src="http://localhost:5173/zucropay-sdk.js"></script>
  <div id="zucropay"></div>
  <script>
    new ZucroPay('<?php echo get_option('zucropay_api_key'); ?>')
      .createButton('zucropay', {
        amount: <?php echo $order->get_total(); ?>,
        customer: {
          name: '<?php echo $order->get_billing_first_name(); ?>',
          email: '<?php echo $order->get_billing_email(); ?>',
          document: '<?php echo get_post_meta($order_id, '_billing_cpf', true); ?>'
        },
        external_reference: '<?php echo $order_id; ?>'
      });
  </script>
  <?php
}
```

### React / Next.js
```javascript
import { useEffect } from 'react';

export default function CheckoutButton() {
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'http://localhost:5173/zucropay-sdk.js';
    script.onload = () => {
      new window.ZucroPay(process.env.NEXT_PUBLIC_ZUCROPAY_API_KEY)
        .createButton('payment', {
          amount: 99.90,
          customer: {
            name: 'Cliente',
            email: 'email@example.com',
            document: '12345678900'
          }
        });
    };
    document.body.appendChild(script);
  }, []);

  return <div id="payment"></div>;
}
```

### HTML Puro
```html
<!DOCTYPE html>
<html>
<head>
  <title>Minha Loja</title>
</head>
<body>
  <h1>Produto: R$ 99,90</h1>
  <div id="payment"></div>

  <script src="http://localhost:5173/zucropay-sdk.js"></script>
  <script>
    new ZucroPay('sua_api_key').createButton('payment', {
      amount: 99.90,
      customer: {
        name: 'Cliente Teste',
        email: 'teste@example.com',
        document: '12345678900'
      }
    });
  </script>
</body>
</html>
```

## 🔔 Webhooks (Opcional)

Webhooks são **opcionais**. O SDK já verifica automaticamente o status do pagamento.

Mas se quiser receber notificações no seu servidor:

1. Acesse http://localhost:5173/webhooks
2. Clique em "Novo Webhook"
3. URL: `https://sua-loja.com/webhook-zucropay`
4. Eventos: `PAYMENT_RECEIVED`

```php
// webhook-zucropay.php
<?php
$payload = file_get_contents('php://input');
$data = json_decode($payload, true);

if ($data['event'] === 'PAYMENT_RECEIVED') {
  $paymentId = $data['payment']['id'];
  $orderId = $data['payment']['external_reference'];
  
  // Atualizar pedido
  update_order_status($orderId, 'paid');
}

http_response_code(200);
```

## 📊 Comparação: Antes vs Agora

| Aspecto | Antes (Complexo) | Agora (Simples) |
|---------|------------------|-----------------|
| **Banco de dados** | ✅ Obrigatório | ❌ Não precisa |
| **Código PHP** | ✅ Necessário (~200 linhas) | ❌ Opcional |
| **Webhook** | ✅ Obrigatório | ⚠️ Opcional |
| **Tempo setup** | ~2 horas | ~5 minutos |
| **Linhas de código** | ~200 linhas | ~10 linhas |
| **Conhecimento** | PHP, MySQL, Git | HTML básico |
| **Configuração** | Servidor, DB, etc | Apenas API Key |

## 🚀 Como Testar

### 1. Iniciar Backend
```bash
cd backend
php -S localhost:8000 router.php
```

### 2. Iniciar Frontend
```bash
npm run dev
```

### 3. Acessar Exemplos
```
http://localhost:5173/exemplos-sdk.html
```

### 4. Pegar API Key
```
1. Login: http://localhost:5173
2. Menu: Integrações
3. Copiar API Key
```

### 5. Testar Integração
- Abrir `exemplos-sdk.html`
- Clicar nos botões de exemplo
- Ver modal com QR Code PIX
- Copiar código PIX

## 📚 Links Úteis

- **Dashboard**: http://localhost:5173
- **Documentação**: http://localhost:5173/api-docs
- **Exemplos**: http://localhost:5173/exemplos-sdk.html
- **Webhooks**: http://localhost:5173/webhooks
- **Integrações**: http://localhost:5173/integracoes

## 🎯 Próximos Passos (Opcional)

- [ ] Plugin WordPress oficial
- [ ] Módulo WooCommerce
- [ ] Extensão Magento
- [ ] App PrestaShop
- [ ] SDK Python/PHP/Ruby
- [ ] Cartão de crédito
- [ ] Boleto bancário
- [ ] Split de pagamento

## 💡 Diferencial do ZucroPay

✅ **Sem banco de dados** - Tudo gerenciado na nuvem  
✅ **SDK pronto** - JavaScript, React, Vue, Angular  
✅ **Modal incluído** - Interface completa com QR Code  
✅ **Webhook opcional** - Funciona sem configurar  
✅ **5 minutos** - Integração mais rápida que a concorrência  
✅ **Código aberto** - Pode customizar tudo  

**Agora sim está igual aos grandes gateways! 🚀**
