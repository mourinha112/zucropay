# 🚀 Setup Completo do ZucroPay com Supabase

Este guia mostra como configurar todo o backend do ZucroPay usando Supabase como Backend as a Service (BaaS).

## 📋 Pré-requisitos

- Conta no [Supabase](https://supabase.com) (gratuita)
- Conta no [Asaas](https://asaas.com) para processamento de pagamentos
- Node.js 16+ e npm/yarn
- Supabase CLI instalado: `npm install -g supabase`

## 🎯 Passo 1: Criar Projeto no Supabase

1. Acesse [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Clique em "New Project"
3. Preencha:
   - Nome: `zucropay` (ou nome de sua preferência)
   - Database Password: Escolha uma senha forte
   - Region: Escolha a região mais próxima
4. Aguarde a criação do projeto (1-2 minutos)

## 🗄️ Passo 2: Configurar o Database

### 2.1 Executar o Schema SQL

1. No dashboard do Supabase, vá em **SQL Editor**
2. Clique em "New Query"
3. Copie todo o conteúdo do arquivo `supabase/schema.sql`
4. Cole no editor e clique em "Run"
5. Aguarde a execução (pode levar alguns segundos)
6. Verifique se não há erros

### 2.2 Verificar Tabelas Criadas

1. Vá em **Table Editor**
2. Você deve ver todas as tabelas:
   - users
   - products
   - asaas_customers
   - payments
   - transactions
   - payment_links
   - checkout_customization
   - affiliates
   - affiliate_sales
   - subscriptions
   - bank_accounts
   - webhooks_log
   - api_keys
   - webhooks
   - webhook_logs

## 🔑 Passo 3: Configurar Autenticação

### 3.1 Habilitar Email Auth

1. Vá em **Authentication** > **Providers**
2. Certifique-se de que "Email" está habilitado
3. Configure:
   - ✅ Enable email provider
   - ✅ Confirm email (desabilitar em desenvolvimento)
   - ✅ Enable email auto confirm (habilitar em desenvolvimento)

### 3.2 Configurar URL de Redirecionamento

1. Vá em **Authentication** > **URL Configuration**
2. Adicione suas URLs:
   - **Site URL**: `http://localhost:5173` (desenvolvimento)
   - **Redirect URLs**: `http://localhost:5173/**` (desenvolvimento)

## 📦 Passo 4: Criar Bucket de Storage

1. Vá em **Storage**
2. Clique em "New Bucket"
3. Nome: `images`
4. Configurações:
   - ✅ Public bucket (para imagens de produtos)
5. Clique em "Create bucket"

### 4.1 Configurar Políticas de Storage

Execute no SQL Editor:

```sql
-- Permitir upload de imagens autenticados
CREATE POLICY "Authenticated users can upload images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'images');

-- Permitir visualização pública
CREATE POLICY "Public can view images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'images');

-- Permitir deletar próprias imagens
CREATE POLICY "Users can delete own images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'images' AND auth.uid()::text = (storage.foldername(name))[1]);
```

## ⚡ Passo 5: Deploy das Edge Functions

### 5.1 Instalar Supabase CLI

```bash
npm install -g supabase
```

### 5.2 Login no Supabase

```bash
supabase login
```

### 5.3 Link com o Projeto

```bash
supabase link --project-ref your-project-ref
```

> **Dica**: Encontre o `project-ref` nas configurações do projeto ou na URL do dashboard

### 5.4 Configurar Secrets

Configure as variáveis de ambiente das Edge Functions:

```bash
# Chave API do Asaas
supabase secrets set ASAAS_API_KEY=your-asaas-api-key

# URL da API do Asaas (produção ou sandbox)
supabase secrets set ASAAS_API_URL=https://api.asaas.com/v3
```

### 5.5 Deploy das Functions

```bash
# Deploy de todas as functions
supabase functions deploy asaas-webhook
supabase functions deploy asaas-api
```

## 🔧 Passo 6: Configurar Variáveis de Ambiente no Frontend

### 6.1 Copiar Credenciais do Supabase

1. Vá em **Settings** > **API**
2. Copie:
   - **Project URL**: `https://xxxxxxxxxx.supabase.co`
   - **anon/public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### 6.2 Criar Arquivo .env

Crie um arquivo `.env` na raiz do projeto:

```env
# SUPABASE
VITE_SUPABASE_URL=https://xxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_EDGE_FUNCTIONS_URL=https://xxxxxxxxxx.supabase.co/functions/v1

# ASAAS
VITE_ASAAS_API_KEY=your-asaas-api-key
VITE_ASAAS_API_URL=https://api.asaas.com/v3

# GERAL
VITE_APP_NAME=ZucroPay
VITE_ENVIRONMENT=development
VITE_FRONTEND_URL=http://localhost:5173
VITE_STORAGE_BUCKET=images
VITE_MAX_UPLOAD_SIZE=5
```

## 🔔 Passo 7: Configurar Webhook do Asaas

Para receber notificações de pagamentos, configure o webhook no Asaas:

### 7.1 Obter URL do Webhook

Sua URL do webhook será:
```
https://your-project-ref.supabase.co/functions/v1/asaas-webhook
```

### 7.2 Configurar no Asaas

1. Acesse [Asaas Dashboard](https://www.asaas.com)
2. Vá em **Configurações** > **Integrações** > **Webhooks**
3. Clique em "Adicionar Webhook"
4. Configure:
   - **URL**: `https://your-project-ref.supabase.co/functions/v1/asaas-webhook`
   - **Eventos**:
     - ✅ PAYMENT_RECEIVED
     - ✅ PAYMENT_CONFIRMED
     - ✅ PAYMENT_OVERDUE
     - ✅ PAYMENT_REFUNDED
     - ✅ TRANSFER_FINISHED
   - **Status**: Ativo
5. Salve

### 7.3 Testar Webhook

Você pode testar enviando um POST para a URL do webhook:

```bash
curl -X POST https://your-project-ref.supabase.co/functions/v1/asaas-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "event": "PAYMENT_RECEIVED",
    "payment": {
      "id": "pay_test_123",
      "status": "RECEIVED",
      "value": 100.00
    }
  }'
```

## 📦 Passo 8: Instalar Dependências do Frontend

```bash
# Instalar dependência do Supabase
npm install @supabase/supabase-js

# Ou com yarn
yarn add @supabase/supabase-js
```

## 🚀 Passo 9: Atualizar Importações

Agora você precisa atualizar as importações nas páginas para usar o novo serviço:

**Antes (PHP Backend):**
```typescript
import * as api from '../services/api';
```

**Depois (Supabase):**
```typescript
import * as api from '../services/api-supabase';
```

## ✅ Passo 10: Testar a Aplicação

### 10.1 Iniciar o Frontend

```bash
npm run dev
# ou
yarn dev
```

### 10.2 Testar Funcionalidades

1. **Registro de Usuário**
   - Acesse http://localhost:5173/register
   - Crie uma nova conta
   - Verifique no Supabase Dashboard: Authentication > Users

2. **Login**
   - Faça login com a conta criada
   - Verifique se o token está sendo armazenado

3. **Criar Produto**
   - Vá em Produtos
   - Crie um novo produto
   - Faça upload de uma imagem
   - Verifique no Supabase: Table Editor > products

4. **Depósito via PIX**
   - Vá em Finanças > Depositar
   - Gere um QR Code PIX
   - Verifique a transação pendente

5. **Verificar Logs**
   - Supabase Dashboard > Logs
   - Edge Functions > asaas-webhook > Logs
   - Verifique se não há erros

## 🔍 Passo 11: Monitoramento

### 11.1 Logs do Supabase

- **Database Logs**: Database > Logs
- **Auth Logs**: Authentication > Logs
- **Edge Functions Logs**: Edge Functions > [function-name] > Logs
- **Storage Logs**: Storage > Logs

### 11.2 Queries Úteis

Verificar últimas transações:
```sql
SELECT * FROM transactions 
ORDER BY created_at DESC 
LIMIT 10;
```

Verificar webhooks recebidos:
```sql
SELECT * FROM webhooks_log 
ORDER BY created_at DESC 
LIMIT 10;
```

Verificar saldo dos usuários:
```sql
SELECT id, name, email, balance 
FROM users 
ORDER BY balance DESC;
```

## 🐛 Troubleshooting

### Erro: "Invalid token"
- Verifique se o token está sendo enviado corretamente
- Verifique se as políticas RLS estão configuradas
- Verifique se o usuário existe na tabela `users`

### Erro: "Row Level Security Policy"
- Certifique-se de que o schema SQL foi executado completamente
- Verifique se as policies foram criadas corretamente
- Execute: `ALTER TABLE [table_name] ENABLE ROW LEVEL SECURITY;`

### Erro ao fazer upload de imagem
- Verifique se o bucket `images` existe
- Verifique se as políticas de storage estão configuradas
- Verifique o tamanho máximo do arquivo (padrão: 5MB)

### Webhook não está sendo recebido
- Verifique se a URL está correta
- Verifique os logs da Edge Function
- Teste a URL manualmente com curl
- Verifique se a função foi deployada corretamente

## 📚 Recursos Adicionais

- [Documentação do Supabase](https://supabase.com/docs)
- [API do Asaas](https://docs.asaas.com)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)

## 🎉 Conclusão

Parabéns! Seu ZucroPay agora está rodando completamente no Supabase! 🚀

**Vantagens:**
- ✅ Backend escalável sem servidor
- ✅ Banco de dados PostgreSQL gerenciado
- ✅ Autenticação integrada
- ✅ Storage para arquivos
- ✅ Edge Functions para lógica customizada
- ✅ Row Level Security para segurança
- ✅ Webhooks em tempo real
- ✅ Logs e monitoramento integrados

**Próximos Passos:**
1. Testar todas as funcionalidades
2. Configurar ambiente de produção
3. Adicionar domínio customizado
4. Configurar SSL/TLS
5. Implementar backup automático

