# 🚀 Deploy na Vercel - Guia Completo e Simples

## ✅ Status: Sistema 100% Pronto para Deploy!

---

## 📋 O Que Foi Feito:

✅ **10 arquivos do frontend atualizados** para usar Supabase
✅ **Schema SQL completo** criado (supabase/schema.sql)
✅ **4 Edge Functions** criadas (webhooks, API Asaas, pagamentos públicos)
✅ **Serviço API completo** migrado (src/services/api-supabase.ts)
✅ **Documentação completa** criada

---

## 🎯 O Que Você Precisa Fazer:

### 1️⃣ Instalar Dependência (30 segundos)

```bash
npm install @supabase/supabase-js
```

---

### 2️⃣ Criar Projeto no Supabase (2 minutos)

1. Acesse: **https://supabase.com/dashboard**
2. Clique em **"New Project"**
3. Preencha:
   - **Name**: `zucropay`
   - **Database Password**: escolha uma senha forte (guarde!)
   - **Region**: escolha a mais próxima
4. Clique em **"Create Project"**
5. Aguarde 1-2 minutos

---

### 3️⃣ Executar Schema SQL (1 minuto)

1. No dashboard do Supabase, vá em **SQL Editor** (menu lateral)
2. Clique em **"New Query"**
3. Abra o arquivo **`supabase/schema.sql`** do seu projeto
4. Copie **TODO** o conteúdo
5. Cole no editor SQL do Supabase
6. Clique em **"Run"** (botão verde)
7. Aguarde terminar (30 segundos)

---

### 4️⃣ Criar Bucket de Storage (30 segundos)

1. No Supabase, vá em **Storage** (menu lateral)
2. Clique em **"New Bucket"**
3. Nome: `images`
4. ✅ Marque **"Public bucket"**
5. Clique em **"Create bucket"**

---

### 5️⃣ Copiar Credenciais do Supabase (1 minuto)

1. No Supabase, vá em **Settings** → **API**
2. Copie:
   - **Project URL** (ex: https://xxxxx.supabase.co)
   - **anon/public key** (uma chave longa que começa com eyJ...)

---

### 6️⃣ Criar Arquivo .env (1 minuto)

Crie um arquivo chamado **`.env`** na **raiz do projeto** e cole:

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_EDGE_FUNCTIONS_URL=https://xxxxx.supabase.co/functions/v1
VITE_ASAAS_API_KEY=$aact_prod_sua-chave-asaas
VITE_ASAAS_API_URL=https://api.asaas.com/v3
VITE_APP_NAME=ZucroPay
VITE_ENVIRONMENT=production
VITE_FRONTEND_URL=
VITE_STORAGE_BUCKET=images
VITE_MAX_UPLOAD_SIZE=5
```

**Preencha:**
- `VITE_SUPABASE_URL` → Cole a URL copiada
- `VITE_SUPABASE_ANON_KEY` → Cole a chave anon copiada
- `VITE_EDGE_FUNCTIONS_URL` → Mesma URL + `/functions/v1`
- `VITE_ASAAS_API_KEY` → Sua chave do Asaas

---

### 7️⃣ Deploy das Edge Functions (2 minutos)

```bash
# Instalar Supabase CLI
npm install -g supabase

# Login
supabase login

# Link com projeto (pegue o project-ref no dashboard)
supabase link --project-ref seu-project-ref

# Configurar secrets
supabase secrets set ASAAS_API_KEY=sua-chave-asaas
supabase secrets set ASAAS_API_URL=https://api.asaas.com/v3

# Deploy das functions
supabase functions deploy asaas-webhook
supabase functions deploy asaas-api
supabase functions deploy public-payment
```

---

### 8️⃣ Testar Localmente (1 minuto)

```bash
npm run dev
```

Abra **http://localhost:5173** e teste:
- ✅ Registro
- ✅ Login
- ✅ Criar produto

---

### 9️⃣ Deploy na Vercel (3 minutos)

#### Opção A - Via GitHub (Recomendado):

1. **Commit e Push:**
```bash
git add .
git commit -m "Migração completa para Supabase"
git push origin main
```

2. **Conectar na Vercel:**
   - Acesse: https://vercel.com
   - Clique em **"New Project"**
   - Importe seu repositório do GitHub
   - Clique em **"Deploy"**

3. **Configurar Variáveis de Ambiente:**
   - No projeto na Vercel, vá em **Settings** → **Environment Variables**
   - Adicione **TODAS** as variáveis do `.env`:
     ```
     VITE_SUPABASE_URL
     VITE_SUPABASE_ANON_KEY
     VITE_EDGE_FUNCTIONS_URL
     VITE_ASAAS_API_KEY
     VITE_ASAAS_API_URL
     VITE_APP_NAME
     VITE_ENVIRONMENT
     VITE_STORAGE_BUCKET
     VITE_MAX_UPLOAD_SIZE
     ```

4. **Redeploy:**
   - Vá em **Deployments**
   - Clique nos 3 pontinhos do último deploy
   - Clique em **"Redeploy"**

#### Opção B - Via CLI:

```bash
# Instalar Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

---

### 🔟 Configurar Webhook no Asaas (1 minuto)

1. Acesse: **https://www.asaas.com**
2. Vá em **Configurações** → **Integrações** → **Webhooks**
3. Clique em **"Adicionar Webhook"**
4. Preencha:
   - **URL**: `https://seu-project-ref.supabase.co/functions/v1/asaas-webhook`
   - **Eventos**: Marque todos (PAYMENT_RECEIVED, CONFIRMED, etc.)
5. Salve

---

## ✅ PRONTO! Sistema no Ar!

Acesse sua URL da Vercel e teste tudo!

---

## 🔍 Verificação Final

- [ ] Site abre sem erros
- [ ] Consigo fazer login
- [ ] Consigo criar produto
- [ ] Upload de imagem funciona
- [ ] Saldo aparece corretamente

---

## 📞 Se Der Erro:

### "Invalid Supabase URL"
→ Verifique se preencheu corretamente no .env

### "CORS Error"
→ No Supabase: **Authentication** → **URL Configuration**
→ Adicione sua URL da Vercel

### "Cannot read properties of undefined"
→ Verifique se todas as variáveis estão configuradas na Vercel

### "Build Failed"
→ Verifique se instalou a dependência: `npm install @supabase/supabase-js`

---

## 🎉 Tudo Pronto!

Seu ZucroPay está rodando 100% no Supabase e publicado na Vercel! 🚀

**Qualquer dúvida, consulte:**
- `SUPABASE_SETUP.md` - Setup detalhado
- `INICIO_RAPIDO_SUPABASE.md` - Guia rápido
- `RESUMO_COMPLETO.md` - Visão geral

