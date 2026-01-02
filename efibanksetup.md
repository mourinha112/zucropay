# 🏦 Configuração EfiBank - ZucroPay

## Visão Geral

A ZucroPay agora utiliza a **EfiBank (EfiPay)** para processar pagamentos via:
- ✅ **PIX** (Cobrança imediata)
- ✅ **Cartão de Crédito** (com parcelamento)
- ✅ **Boleto Bancário**

---

## 📋 Pré-requisitos

1. **Conta EfiBank** - Crie em [efipay.com.br](https://efipay.com.br)
2. **Conta PRO ou Empresarial** - Para acesso à API
3. **Chave PIX cadastrada** - No painel da EfiBank
4. **Certificado de autenticação** - Gerado no painel

---

## 🔑 Obtendo as Credenciais

### 1. Acesse o Painel EfiBank

1. Entre em [app.efipay.com.br](https://app.efipay.com.br)
2. Vá em **API** → **Aplicações**
3. Clique em **Nova Aplicação**

### 2. Crie uma Aplicação

1. **Nome**: ZucroPay
2. **Escopos de Produção**:
   - ✅ API de emissões (charge.write, charge.read)
   - ✅ API Pix (cob.write, cob.read, pix.write, pix.read)
   - ✅ Webhooks (webhook.write)
3. Clique em **Criar aplicação**

### 3. Copie as Credenciais

Após criar, você terá:
- `Client_Id`: ex: `Client_Id_xxxxxxxxxxxx`
- `Client_Secret`: ex: `Client_Secret_xxxxxxxxxxxx`

### 4. Gere o Certificado

1. No painel, vá em **API** → **Meus Certificados**
2. Selecione o ambiente (**Produção** ou **Homologação**)
3. Clique em **Novo Certificado**
4. Baixe o arquivo `.p12`

### 5. Converta o Certificado para Base64

No terminal:

```bash
# Linux/Mac
base64 -i certificado.p12 -o certificado_base64.txt

# Windows (PowerShell)
[Convert]::ToBase64String([IO.File]::ReadAllBytes("certificado.p12")) | Out-File certificado_base64.txt
```

### 6. Cadastre uma Chave PIX

1. No painel, vá em **Pix** → **Minhas Chaves**
2. Cadastre uma chave (CPF, CNPJ, Email, Telefone ou Aleatória)
3. Copie a chave cadastrada

---

## ⚙️ Variáveis de Ambiente (Vercel)

Adicione as seguintes variáveis no painel da Vercel:

```env
# EfiBank Credentials
EFI_CLIENT_ID=Client_Id_xxxxxxxxxxxx
EFI_CLIENT_SECRET=Client_Secret_xxxxxxxxxxxx
EFI_CERTIFICATE=CONTEUDO_BASE64_DO_CERTIFICADO_P12
EFI_PIX_KEY=sua-chave-pix@email.com
EFI_SANDBOX=false

# Supabase (já existentes)
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key
SUPABASE_ANON_KEY=sua_anon_key
```

### Variáveis Explicadas:

| Variável | Descrição |
|----------|-----------|
| `EFI_CLIENT_ID` | Client ID da aplicação EfiBank |
| `EFI_CLIENT_SECRET` | Client Secret da aplicação EfiBank |
| `EFI_CERTIFICATE` | Certificado .p12 convertido para Base64 |
| `EFI_PIX_KEY` | Chave PIX cadastrada na conta EfiBank |
| `EFI_SANDBOX` | `true` para homologação, `false` para produção |

---

## 🗄️ Migração do Banco de Dados

Execute o SQL no Supabase para adicionar os campos necessários:

```sql
-- Copie o conteúdo de: supabase/efibank-migration.sql
```

---

## 🔗 Endpoints da API

### PIX

```
POST /api/efi-api
{
  "action": "createPixCharge",
  "value": 100.00,
  "description": "Pagamento teste",
  "customerName": "João Silva",
  "customerCpf": "12345678901",
  "expiration": 3600
}
```

### Cartão de Crédito

```
POST /api/efi-api
{
  "action": "createCardCharge",
  "value": 150.00,
  "description": "Compra de produto",
  "installments": 3,
  "customer": {
    "name": "João Silva",
    "email": "joao@email.com",
    "cpf": "12345678901",
    "phone": "11999999999"
  },
  "card": {
    "paymentToken": "token_gerado_pelo_frontend"
  }
}
```

### Boleto

```
POST /api/efi-api
{
  "action": "createBoletoCharge",
  "value": 200.00,
  "description": "Pagamento boleto",
  "dueDate": "2025-01-15",
  "customer": {
    "name": "João Silva",
    "email": "joao@email.com",
    "cpf": "12345678901",
    "phone": "11999999999"
  }
}
```

### Pagamento Público (Checkout)

```
POST /api/efi-public-payment
{
  "linkId": "uuid-do-link",
  "billingType": "PIX",
  "customerName": "João Silva",
  "customerEmail": "joao@email.com",
  "customerCpfCnpj": "12345678901",
  "customerPhone": "11999999999"
}
```

---

## 🔔 Configurando Webhooks

1. No painel EfiBank, vá em **API** → **Webhooks**
2. Configure a URL: `https://seu-dominio.vercel.app/api/efi-webhook`
3. Selecione os eventos:
   - PIX recebido
   - Cobrança paga
   - Cobrança vencida

---

## 🧪 Ambiente de Testes (Sandbox)

Para testar sem cobranças reais:

1. Defina `EFI_SANDBOX=true`
2. Use as credenciais de homologação
3. Gere um certificado de homologação separado
4. URLs de sandbox:
   - PIX: `https://pix-h.api.efipay.com.br`
   - Cobrança: `https://cobrancas-h.api.efipay.com.br`

### Dados de Teste (Cartão)

```
Número: 5162306219378829
Validade: 10/2028
CVV: 123
Nome: JOAO SILVA
```

---

## 📊 Status de Pagamento

### PIX
| Status | Descrição |
|--------|-----------|
| `ATIVA` | Aguardando pagamento |
| `CONCLUIDA` | Pago |
| `REMOVIDA_PELO_USUARIO_RECEBEDOR` | Cancelada |
| `REMOVIDA_PELO_PSP` | Expirada |

### Cartão/Boleto
| Status | Descrição |
|--------|-----------|
| `new` | Nova |
| `waiting` | Aguardando |
| `approved` | Aprovada |
| `paid` | Paga |
| `unpaid` | Não paga |
| `refunded` | Estornada |
| `canceled` | Cancelada |

---

## ❓ FAQ

### 1. Erro de certificado

> **Solução**: Verifique se o certificado foi convertido corretamente para Base64 sem quebras de linha.

### 2. Token expirado

> A API renova automaticamente o token. Se persistir, verifique as credenciais.

### 3. Chave PIX inválida

> Certifique-se de que a chave PIX está cadastrada e ativa no painel EfiBank.

### 4. Webhook não recebido

> Verifique se a URL do webhook está acessível e retorna status 200.

---

## 📞 Suporte

- **Documentação EfiBank**: [dev.efipay.com.br](https://dev.efipay.com.br)
- **Suporte EfiBank**: suporte@efipay.com.br
- **WhatsApp**: (34) 3003-1722
