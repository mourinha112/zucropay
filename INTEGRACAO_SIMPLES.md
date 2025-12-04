# 🚀 ZucroPay SDK - Integração Sem Banco de Dados

## Como Outros Gateways Funcionam

Diferente dos exemplos anteriores que exigiam configurar banco de dados e código PHP, agora você pode usar o **ZucroPay SDK** igual a Stripe, Mercado Pago, PagSeguro, etc.

## ✅ O Que Mudou

### ❌ ANTES (Complexo)
```php
// Você precisava:
1. Criar tabela no banco de dados
2. Escrever código PHP
3. Configurar webhook manualmente
4. Validar assinaturas HMAC
5. Processar pagamentos no seu servidor
```

### ✅ AGORA (Simples)
```html
<!-- Apenas isso: -->
<script src="https://cdn.zucropay.com/v1/zucropay.js"></script>
<script>
  new ZucroPay('sua_api_key').createButton('btn', {
    amount: 99.90,
    customer: { name: 'Cliente', email: 'email@example.com', document: 'CPF' }
  });
</script>
<div id="btn"></div>
```

## 🎯 Como Usar

### 1. Pegar sua API Key

1. Acesse: http://localhost:5173
2. Vá em **Integrações**
3. Copie sua API Key (gerada automaticamente)

### 2. Incluir o SDK

```html
<script src="http://localhost:5173/zucropay-sdk.js"></script>
```

### 3. Criar Pagamento

#### Opção A: Botão Pronto
```html
<div id="payment-button"></div>

<script>
  const zucropay = new ZucroPay('SUA_API_KEY_AQUI');
  
  zucropay.createButton('payment-button', {
    amount: 99.90,
    customer: {
      name: 'João Silva',
      email: 'joao@example.com',
      document: '12345678900'  // CPF
    },
    description: 'Produto XYZ'
  });
</script>
```

#### Opção B: Formulário Completo
```html
<div id="checkout"></div>

<script>
  const zucropay = new ZucroPay('SUA_API_KEY_AQUI');
  
  zucropay.createCheckoutForm('checkout', {
    amount: 199.90,
    title: 'Finalizar Compra',
    description: 'Curso de Marketing',
    orderId: 'PEDIDO-123'
  });
</script>
```

#### Opção C: API Direto (mais controle)
```javascript
const zucropay = new ZucroPay('SUA_API_KEY_AQUI');

const payment = await zucropay.createPayment({
  amount: 150.00,
  customer: {
    name: 'Maria Santos',
    email: 'maria@example.com',
    document: '98765432100',
    phone: '11999999999'
  },
  billing_type: 'PIX',
  description: 'Consultoria 1h',
  external_reference: 'SEU-ID-INTERNO'
});

// Pagamento criado!
console.log('ID:', payment.payment.id);
console.log('QR Code:', payment.pix.qr_code_base64);
console.log('Código PIX:', payment.pix.copy_paste);

// Exibir modal com QR Code
zucropay.showPaymentModal(payment);
```

## 🛒 Integração com E-commerce

### WooCommerce (WordPress)

```php
// functions.php ou plugin
add_action('woocommerce_thankyou', 'zucropay_payment_button');

function zucropay_payment_button($order_id) {
  $order = wc_get_order($order_id);
  ?>
  <script src="http://localhost:5173/zucropay-sdk.js"></script>
  <div id="zucropay-btn"></div>
  <script>
    new ZucroPay('<?php echo get_option('zucropay_api_key'); ?>').createButton('zucropay-btn', {
      amount: <?php echo $order->get_total(); ?>,
      customer: {
        name: '<?php echo $order->get_billing_first_name() . ' ' . $order->get_billing_last_name(); ?>',
        email: '<?php echo $order->get_billing_email(); ?>',
        document: '<?php echo get_post_meta($order_id, '_billing_cpf', true); ?>'
      },
      external_reference: '<?php echo $order_id; ?>'
    });
  </script>
  <?php
}
```

### Shopify (Liquid Template)

```liquid
<script src="http://localhost:5173/zucropay-sdk.js"></script>
<div id="zucropay-payment"></div>

<script>
  new ZucroPay('{{ shop.metafields.zucropay.api_key }}').createButton('zucropay-payment', {
    amount: {{ checkout.total_price | money_without_currency | remove: ',' | remove: '.' | times: 0.01 }},
    customer: {
      name: '{{ checkout.customer.name }}',
      email: '{{ checkout.customer.email }}',
      document: '{{ checkout.customer.metafields.custom.cpf }}'
    },
    external_reference: '{{ checkout.order_id }}'
  });
</script>
```

### HTML/JavaScript Puro

```html
<!DOCTYPE html>
<html>
<head>
  <title>Minha Loja</title>
</head>
<body>
  <h1>Produto: Curso Online</h1>
  <p>Preço: R$ 99,90</p>
  
  <div id="payment"></div>

  <script src="http://localhost:5173/zucropay-sdk.js"></script>
  <script>
    const zucropay = new ZucroPay('sua_api_key_aqui');
    
    zucropay.createButton('payment', {
      amount: 99.90,
      customer: {
        name: document.getElementById('nome').value,
        email: document.getElementById('email').value,
        document: document.getElementById('cpf').value
      },
      description: 'Curso Online'
    }, {
      text: 'Pagar com PIX',
      onSuccess: (result) => {
        alert('Pagamento criado! ID: ' + result.payment.id);
      },
      onError: (error) => {
        alert('Erro: ' + error.message);
      }
    });
  </script>
</body>
</html>
```

## 🔔 Receber Notificações (Webhook Opcional)

Se quiser receber notificações quando o pagamento for pago:

### 1. Configure no Painel

1. Acesse: http://localhost:5173/webhooks
2. Clique em "Novo Webhook"
3. URL: `https://sua-loja.com/webhook-zucropay`
4. Eventos: `PAYMENT_RECEIVED`, `PAYMENT_PENDING`

### 2. Receba as Notificações

```php
// webhook-zucropay.php
<?php
$payload = file_get_contents('php://input');
$signature = $_SERVER['HTTP_X_ZUCROPAY_SIGNATURE'];

// Validar assinatura (opcional mas recomendado)
$expected = hash_hmac('sha256', $payload, 'seu_webhook_secret');
if ($signature !== $expected) {
  http_response_code(401);
  exit('Assinatura inválida');
}

$data = json_decode($payload, true);

if ($data['event'] === 'PAYMENT_RECEIVED') {
  $paymentId = $data['payment']['id'];
  $orderId = $data['payment']['external_reference'];
  
  // Atualizar pedido no seu sistema
  update_order_status($orderId, 'paid');
  
  // Enviar email, liberar produto, etc
  send_confirmation_email($orderId);
}

http_response_code(200);
echo 'OK';
```

**Mas webhook é OPCIONAL!** Você também pode verificar o status manualmente:

```javascript
const status = await zucropay.getPaymentStatus('pay_abc123');
if (status.payment.status === 'RECEIVED') {
  // Pagamento confirmado!
}
```

## 📡 API REST Completa

Se preferir usar a API direto (sem JavaScript):

```bash
curl -X POST http://localhost:8000/api/v1/payments/create.php \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sua_api_key_aqui" \
  -d '{
    "amount": 99.90,
    "customer": {
      "name": "João Silva",
      "email": "joao@example.com",
      "document": "12345678900"
    },
    "description": "Produto XYZ",
    "external_reference": "PEDIDO-123"
  }'
```

Resposta:
```json
{
  "success": true,
  "payment": {
    "id": "pay_abc123def456",
    "status": "PENDING",
    "amount": 99.90,
    "customer": {
      "name": "João Silva",
      "email": "joao@example.com"
    },
    "external_reference": "PEDIDO-123",
    "created_at": "2025-10-02 15:30:00"
  },
  "pix": {
    "qr_code_base64": "iVBORw0KGgoAAAANS...",
    "copy_paste": "00020126580014br.gov.bcb.pix..."
  },
  "checkout_url": "http://localhost:5173/checkout/pay_abc123def456"
}
```

## 🎨 Customização Avançada

```javascript
const zucropay = new ZucroPay('sua_api_key', {
  baseUrl: 'http://localhost:8000/api/v1',  // URL da API
  debug: true  // Logs no console
});

zucropay.createButton('btn', paymentData, {
  text: '🛒 Comprar Agora',
  color: '#FF6B6B',        // Cor do botão
  hoverColor: '#FF5252',   // Cor ao passar mouse
  
  onSuccess: (result) => {
    console.log('Sucesso!', result);
    // Redirecionar, mostrar mensagem, etc
    window.location.href = '/obrigado';
  },
  
  onError: (error) => {
    console.error('Erro:', error);
    alert('Erro ao processar pagamento');
  }
});
```

## 📦 Instalação via NPM (React, Vue, Angular)

```bash
npm install zucropay-sdk
```

```javascript
import ZucroPay from 'zucropay-sdk';

const zucropay = new ZucroPay(process.env.ZUCROPAY_API_KEY);

// React
function CheckoutButton() {
  const handlePayment = async () => {
    const payment = await zucropay.createPayment({...});
    zucropay.showPaymentModal(payment);
  };
  
  return <button onClick={handlePayment}>Pagar</button>;
}
```

## 🔐 Segurança

- ✅ API Key única por conta
- ✅ HTTPS obrigatório em produção
- ✅ Webhook com assinatura HMAC
- ✅ Validação de CPF/CNPJ
- ✅ Rate limiting
- ✅ Logs de todas requisições

## 🆘 Suporte

- 📧 Email: suporte@zucropay.com
- 💬 Chat: http://localhost:5173/suporte
- 📚 Docs: http://localhost:5173/api-docs
- 🔧 Exemplos: http://localhost:5173/exemplos-sdk.html

## 🎯 Resumo

| Aspecto | Antes (Complexo) | Agora (Simples) |
|---------|------------------|-----------------|
| **Banco de dados** | ✅ Obrigatório | ❌ Não precisa |
| **Código PHP** | ✅ Necessário | ❌ Opcional |
| **Webhook** | ✅ Obrigatório | ⚠️ Opcional |
| **Tempo setup** | ~2 horas | ~5 minutos |
| **Linhas de código** | ~200 linhas | ~10 linhas |
| **Conhecimento** | PHP, MySQL, Git | HTML básico |

**Agora sim está igual Stripe, Mercado Pago e outros! 🚀**
