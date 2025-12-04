# ✅ Sistema de Webhooks - COMPLETO E FUNCIONAL# 🔔 Configuração de Webhook Asaas



## 🎉 Implementação Completa## 📋 O que é um Webhook?



### ✅ Página de Configuração: `/webhooks`Webhooks são notificações automáticas que o Asaas envia para o seu sistema quando eventos importantes acontecem (pagamentos confirmados, boletos vencidos, etc).



**Funcionalidades:**---

- 📋 Listagem de webhooks cadastrados

- ➕ Criar novo webhook## 🎯 Endpoint do Webhook

- ✏️ Editar webhooks existentes

- 🔄 Ativar/Desativar webhooksO arquivo `backend/webhook.php` já está pronto e processa os seguintes eventos:

- 🗑️ Deletar webhooks

- 📋 Copiar webhook secret- ✅ `PAYMENT_RECEIVED` - Pagamento recebido

- 📊 Ver status e logs de tentativas- ✅ `PAYMENT_CONFIRMED` - Pagamento confirmado

- ⏰ `PAYMENT_OVERDUE` - Pagamento vencido

**Acesse:** http://localhost:5173/webhooks- 🔄 `PAYMENT_REFUNDED` - Pagamento reembolsado

- 💸 `TRANSFER_FINISHED` - Transferência finalizada

---

---

## 🚀 Como Usar

## 🚀 Como Configurar no Painel Asaas

### 1. Criar Webhook

### Passo 1: Expor seu servidor local (desenvolvimento)

1. Acesse `/webhooks`

2. Clique "Novo Webhook"Para receber webhooks em localhost, use **ngrok** ou **localtunnel**:

3. Digite sua URL: `https://sua-loja.com.br/webhook-zucropay.php`

4. Selecione eventos (PAYMENT_RECEIVED, PAYMENT_PENDING, etc)#### Opção A: Usando ngrok (recomendado)

5. Copie o **Secret** gerado```bash

# Baixe em: https://ngrok.com/download

### 2. Implementar no Seu Servidorngrok http 8000

```

```php

<?phpVocê receberá uma URL como: `https://abc123.ngrok.io`

// webhook-zucropay.php

$payload = file_get_contents('php://input');#### Opção B: Usando localtunnel

$data = json_decode($payload, true);```bash

npm install -g localtunnel

// Validar assinaturalt --port 8000

$signature = $_SERVER['HTTP_X_ZUCROPAY_SIGNATURE'] ?? '';```

$secret = 'SEU_WEBHOOK_SECRET';

$expected = hash_hmac('sha256', $payload, $secret);Você receberá uma URL como: `https://funny-name-123.loca.lt`



if (!hash_equals($expected, $signature)) {---

    exit('Assinatura inválida');

}### Passo 2: Acessar o Painel Asaas



// Processar1. Acesse: https://sandbox.asaas.com (ambiente de testes)

if ($data['event'] === 'PAYMENT_RECEIVED') {2. Faça login com sua conta

    // Pagamento confirmado!3. Vá em **Configurações** > **Webhooks**

    liberarProduto($data['payment']['externalReference']);

}---



http_response_code(200);### Passo 3: Cadastrar o Webhook

echo json_encode(['received' => true]);

?>1. Clique em **"Novo Webhook"**

```2. Preencha os campos:



### 3. Testar Localmente (ngrok)**URL de Callback:**

```

```bashhttps://SEU-NGROK-URL.ngrok.io/webhook.php

ngrok http 80```

# URL: https://abc123.ngrok.io/webhook-zucropay.php

```**Eventos a monitorar:**

- ✅ Pagamento recebido

---- ✅ Pagamento confirmado

- ✅ Pagamento vencido

## 📊 Monitoramento- ✅ Pagamento reembolsado

- ✅ Transferência finalizada

- ✅ **Verde**: Funcionando

- ⚫ **Cinza**: Desativado3. Clique em **"Salvar"**

- ❌ **Vermelho**: Com erros

---

Ver logs:

```sql### Passo 4: Testar o Webhook

SELECT * FROM webhook_logs ORDER BY created_at DESC LIMIT 50;

```O Asaas possui um botão de **"Testar Webhook"** no painel:



---1. Na lista de webhooks, clique em **"Testar"**

2. Verifique se o status retorna **200 OK**

## 🔐 Segurança3. Confira no banco de dados se foi gravado em `webhooks_log`



**SEMPRE valide a assinatura!**```sql

SELECT * FROM webhooks_log ORDER BY created_at DESC LIMIT 5;

```php```

$signature = $_SERVER['HTTP_X_ZUCROPAY_SIGNATURE'] ?? '';

$expected = hash_hmac('sha256', $payload, $webhookSecret);---



if (!hash_equals($expected, $signature)) {## 🔍 Verificar Logs do Webhook

    exit('Não autorizado');

}Todos os webhooks recebidos são salvos automaticamente na tabela `webhooks_log`:

```

```sql

----- Ver últimos webhooks

SELECT 

## ✅ Sistema Completo    id,

    event_type,

- ✅ Backend API funcional    processed,

- ✅ Interface de gerenciamento    created_at 

- ✅ Banco de dados configuradoFROM webhooks_log 

- ✅ Exemplo de códigoORDER BY created_at DESC 

- ✅ Links nas páginasLIMIT 10;

- ✅ 100% funcional!

-- Ver webhooks não processados

**Acesse agora:** http://localhost:5173/webhooksSELECT * FROM webhooks_log WHERE processed = 0;


-- Ver payload de um webhook específico
SELECT payload FROM webhooks_log WHERE id = 1;
```

---

## 🛡️ Segurança do Webhook

### Validação de Token (Opcional)

Para produção, adicione validação de token do Asaas:

1. No painel Asaas, copie o **Token de Webhook**
2. Edite `backend/webhook.php` e adicione no início:

```php
$expectedToken = 'seu_token_do_asaas_aqui';
$receivedToken = $_SERVER['HTTP_ASAAS_ACCESS_TOKEN'] ?? '';

if ($receivedToken !== $expectedToken) {
    http_response_code(401);
    jsonResponse(['success' => false, 'message' => 'Unauthorized']);
    exit;
}
```

---

## 📊 Eventos Automáticos

Quando um webhook é recebido, o sistema automaticamente:

### Pagamento Confirmado:
1. ✅ Atualiza status do pagamento
2. 💰 Adiciona crédito ao saldo do usuário
3. 📝 Cria transação no histórico
4. 📈 Atualiza estatísticas do link de pagamento

### Pagamento Vencido:
1. ⏰ Atualiza status para "OVERDUE"
2. 📧 (Você pode adicionar envio de email aqui)

### Reembolso:
1. 🔄 Atualiza status para "REFUNDED"
2. 💸 Remove crédito do saldo do usuário
3. 📝 Cria transação de estorno

---

## 🌍 Produção

Para ambiente de produção:

1. **Webhook URL:** Aponte para seu domínio real
```
https://api.seusitezucropay.com/webhook.php
```

2. **Painel Asaas:** Use a conta de produção
   - https://www.asaas.com (não sandbox)

3. **SSL obrigatório:** O Asaas só envia para URLs HTTPS

4. **Monitoramento:** Configure alertas para webhooks não processados

---

## ❓ Troubleshooting

### Webhook não está sendo recebido

1. ✅ Verifique se o ngrok está rodando
2. ✅ Confirme a URL no painel Asaas
3. ✅ Teste com o botão "Testar Webhook"
4. ✅ Verifique logs do servidor PHP

### Webhook recebido mas não processado

1. Verifique a tabela `webhooks_log`:
```sql
SELECT * FROM webhooks_log WHERE processed = 0;
```

2. Veja o payload para debugar:
```sql
SELECT payload FROM webhooks_log WHERE id = [ID];
```

3. Execute o processamento manualmente no código

---

## 📝 Resumo Rápido

```bash
# 1. Expor localhost
ngrok http 8000

# 2. Copiar URL ngrok
# Exemplo: https://abc123.ngrok.io

# 3. Configurar no Asaas
URL: https://abc123.ngrok.io/webhook.php
Eventos: Todos de pagamento

# 4. Testar
Clique em "Testar Webhook" no painel Asaas

# 5. Verificar
SELECT * FROM webhooks_log ORDER BY created_at DESC LIMIT 1;
```

---

## 🎉 Pronto!

Agora seu sistema receberá notificações automáticas do Asaas e processará pagamentos em tempo real! 🚀
