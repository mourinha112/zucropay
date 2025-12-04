# 📝 Como Preencher o Arquivo .env

## 🎯 Passo a Passo Rápido

### 1️⃣ Obter Credenciais do Supabase

1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto (ou crie um novo)
3. Vá em **Settings** → **API**
4. Copie os valores:

```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxx...
VITE_EDGE_FUNCTIONS_URL=https://xxxxxxxxxxxxx.supabase.co/functions/v1
```

**Onde encontrar:**
- **Project URL**: Copie exatamente como aparece
- **anon/public key**: É uma chave longa que começa com `eyJ...`
- **Edge Functions URL**: Mesma URL do projeto + `/functions/v1`

---

### 2️⃣ Obter Chave API do Asaas

#### Para Produção (Vendas Reais):
1. Acesse: https://www.asaas.com
2. Faça login
3. Vá em **Minha Conta** → **Integrações** → **API Key**
4. Copie a chave (começa com `$aact_prod_...`)

#### Para Testes (Sandbox):
1. Acesse: https://sandbox.asaas.com
2. Faça login
3. Vá em **Minha Conta** → **Integrações** → **API Key**
4. Copie a chave (começa com `$aact_test_...`)
5. Use URL: `https://sandbox.asaas.com/api/v3`

```env
# PRODUÇÃO (vendas reais)
VITE_ASAAS_API_KEY=$aact_prod_xxxxxxxxxxxxxxxxx
VITE_ASAAS_API_URL=https://api.asaas.com/v3

# OU SANDBOX (apenas testes)
VITE_ASAAS_API_KEY=$aact_test_xxxxxxxxxxxxxxxxx
VITE_ASAAS_API_URL=https://sandbox.asaas.com/api/v3
```

---

### 3️⃣ Configurar URL do Frontend

Se estiver publicando na Vercel:

```env
VITE_FRONTEND_URL=https://seu-projeto.vercel.app
```

Se estiver em desenvolvimento local:

```env
VITE_FRONTEND_URL=http://localhost:5173
```

---

## 📋 Exemplo Completo Preenchido

```env
# ============================================
# ZUCROPAY - VARIÁVEIS DE AMBIENTE
# ============================================

# ============================================
# SUPABASE
# ============================================
VITE_SUPABASE_URL=https://abcdefghijklmno.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ubyIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNjk5OTk5OTk5LCJleHAiOjIwMTU1NzU5OTl9.XXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
VITE_EDGE_FUNCTIONS_URL=https://abcdefghijklmno.supabase.co/functions/v1

# ============================================
# ASAAS
# ============================================
VITE_ASAAS_API_KEY=$aact_prod_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OjI2MzcyM2UwLTI0Y2ItNDg3ZC1hMGUzLTU2MThhZWU2YTM1ZDo6JGFhY2hfMzM0YzViNTEtYzU2ZS00MTk2LWI2ZTYtZDEzMDFhODRlMTQ5
VITE_ASAAS_API_URL=https://api.asaas.com/v3

# ============================================
# GERAL
# ============================================
VITE_APP_NAME=ZucroPay
VITE_ENVIRONMENT=production
VITE_FRONTEND_URL=https://meu-site.vercel.app

# ============================================
# STORAGE
# ============================================
VITE_STORAGE_BUCKET=images
VITE_MAX_UPLOAD_SIZE=5
```

---

## ✅ Checklist de Verificação

Antes de fazer deploy, verifique:

- [ ] `VITE_SUPABASE_URL` está preenchida (começa com https://)
- [ ] `VITE_SUPABASE_ANON_KEY` está preenchida (começa com eyJ)
- [ ] `VITE_EDGE_FUNCTIONS_URL` está preenchida (mesma URL + /functions/v1)
- [ ] `VITE_ASAAS_API_KEY` está preenchida (começa com $aact_)
- [ ] `VITE_ASAAS_API_URL` está correta (prod ou sandbox)
- [ ] `VITE_FRONTEND_URL` está com sua URL da Vercel

---

## 🚀 Após Preencher

### Desenvolvimento Local:
```bash
npm run dev
```

### Deploy na Vercel:

**Não se esqueça!** Adicione TODAS as variáveis também no dashboard da Vercel:
1. Acesse seu projeto na Vercel
2. Vá em **Settings** → **Environment Variables**
3. Adicione uma por uma
4. Faça redeploy

---

## ⚠️ Importante

- **NUNCA** faça commit do arquivo `.env` com suas chaves reais
- O `.gitignore` já está configurado para ignorar `.env`
- Use `.env.example` como referência (sem valores sensíveis)
- Na Vercel, configure as variáveis no dashboard, não no código

---

## 🆘 Problemas Comuns

### "Invalid Supabase URL"
- Verifique se copiou a URL completa
- Deve começar com `https://`
- Deve terminar com `.supabase.co`

### "Invalid API Key"
- Certifique-se de copiar a chave completa
- Não deixe espaços no início ou fim
- Verifique se está usando a chave certa (prod vs sandbox)

### "CORS Error"
- Verifique se configurou o domínio no Supabase
- Vá em: Authentication → URL Configuration
- Adicione sua URL da Vercel

---

## 📞 Ajuda

Consulte a documentação completa:
- `SUPABASE_SETUP.md` - Setup completo
- `INICIO_RAPIDO_SUPABASE.md` - Início rápido
- `RESUMO_COMPLETO.md` - Visão geral

