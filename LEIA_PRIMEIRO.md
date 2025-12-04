# 👋 COMECE AQUI!

## ✅ O Que Foi Feito:

✅ Backend PHP migrado 100% para Supabase
✅ Todas as páginas atualizadas
✅ Edge Functions criadas
✅ Documentação completa

---

## 🚀 Para Publicar na Vercel (Passo a Passo):

### 1. Instale a dependência:
```bash
npm install @supabase/supabase-js
```

### 2. Crie projeto no Supabase:
- Acesse: https://supabase.com/dashboard
- Clique em "New Project"
- Aguarde criar

### 3. Execute o SQL:
- No Supabase: **SQL Editor** → **New Query**
- Cole TODO o conteúdo de: **`supabase/schema.sql`**
- Clique em **"Run"**

### 4. Crie bucket de imagens:
- No Supabase: **Storage** → **New Bucket**
- Nome: `images`
- Marque: **Public bucket**

### 5. Copie as credenciais:
- No Supabase: **Settings** → **API**
- Copie: **Project URL** e **anon key**

### 6. Crie arquivo .env:
Copie o conteúdo de **`ENV_LIMPO.txt`** e preencha com suas credenciais

### 7. Deploy Edge Functions:
```bash
npm install -g supabase
supabase login
supabase link --project-ref seu-project-ref
supabase secrets set ASAAS_API_KEY=sua-chave
supabase functions deploy asaas-webhook
supabase functions deploy asaas-api
supabase functions deploy public-payment
```

### 8. Publique na Vercel:
```bash
npm i -g vercel
vercel --prod
```

### 9. Configure variáveis na Vercel:
- Dashboard Vercel → **Settings** → **Environment Variables**
- Adicione as mesmas do `.env`
- Faça Redeploy

---

## 📚 Documentação Completa:

- **`DEPLOY_VERCEL_COMPLETO.md`** - Guia detalhado
- **`COMANDOS_RAPIDOS.txt`** - Apenas comandos
- **`ENV_LIMPO.txt`** - Template do .env
- **`SUPABASE_SETUP.md`** - Setup completo

---

## ⚡ Onde Achar Cada Coisa:

### URL do Supabase:
**Settings → API → Project URL**
```
https://xxxxx.supabase.co
```

### Chave Anon:
**Settings → API → anon/public**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Edge Functions URL:
**Mesma URL do projeto + /functions/v1**
```
https://xxxxx.supabase.co/functions/v1
```

### Project Ref (para CLI):
**Settings → General → Reference ID**
```
xxxxx (apenas as letras/números)
```

### Chave Asaas:
**Asaas → Minha Conta → Integrações → API Key**
```
$aact_prod_xxxxx...
```

---

## 🎯 Pronto!

É só seguir esses passos e seu sistema estará no ar! 🚀

**Tempo total: 15-30 minutos**

