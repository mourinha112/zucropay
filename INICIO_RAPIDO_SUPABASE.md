# ⚡ Início Rápido - ZucroPay com Supabase

## 🎯 Setup em 15 Minutos

### 1️⃣ Instalar Dependência (1 min)

```bash
npm install @supabase/supabase-js
```

### 2️⃣ Criar Projeto no Supabase (2 min)

1. Acesse: https://supabase.com/dashboard
2. Clique em **"New Project"**
3. Preencha:
   - Nome: `zucropay`
   - Password: escolha uma senha forte
   - Region: mais próxima de você
4. Clique em **"Create project"**
5. Aguarde 1-2 minutos

### 3️⃣ Executar Schema SQL (2 min)

1. No Supabase Dashboard, vá em **SQL Editor**
2. Clique em **"New Query"**
3. Copie TODO o conteúdo de: `supabase/schema.sql`
4. Cole no editor
5. Clique em **"Run"**
6. Aguarde (pode levar 30 segundos)

### 4️⃣ Criar Bucket de Storage (1 min)

1. Vá em **Storage**
2. Clique em **"New Bucket"**
3. Nome: `images`
4. ✅ Marque **"Public bucket"**
5. Clique em **"Create bucket"**

### 5️⃣ Configurar Variáveis de Ambiente (2 min)

1. No Supabase Dashboard, vá em **Settings** > **API**
2. Copie:
   - **Project URL**
   - **anon public key**

3. Crie arquivo `.env` na raiz do projeto:

```env
# Supabase
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_EDGE_FUNCTIONS_URL=https://xxxxx.supabase.co/functions/v1

# Asaas
VITE_ASAAS_API_KEY=sua-chave-api-do-asaas
VITE_ASAAS_API_URL=https://api.asaas.com/v3

# Geral
VITE_STORAGE_BUCKET=images
```

### 6️⃣ Instalar Supabase CLI (1 min)

```bash
npm install -g supabase
```

### 7️⃣ Deploy das Edge Functions (3 min)

```bash
# Login
supabase login

# Link com projeto (pegue o project-ref no dashboard)
supabase link --project-ref seu-project-ref

# Configurar secrets
supabase secrets set ASAAS_API_KEY=sua-chave-api-do-asaas
supabase secrets set ASAAS_API_URL=https://api.asaas.com/v3

# Deploy
supabase functions deploy asaas-webhook
supabase functions deploy asaas-api
```

### 8️⃣ Atualizar Importações do Frontend (2 min)

Execute este comando para atualizar automaticamente:

**Linux/Mac:**
```bash
find src -name "*.tsx" -type f -exec sed -i "s|from '../services/api'|from '../services/api-supabase'|g" {} \;
find src -name "*.tsx" -type f -exec sed -i "s|from '../../services/api'|from '../../services/api-supabase'|g" {} \;
```

**Windows PowerShell:**
```powershell
Get-ChildItem -Path "src" -Filter "*.tsx" -Recurse | ForEach-Object {
    (Get-Content $_.FullName) -replace "from '../services/api'", "from '../services/api-supabase'" | Set-Content $_.FullName
    (Get-Content $_.FullName) -replace "from '../../services/api'", "from '../../services/api-supabase'" | Set-Content $_.FullName
}
```

**Ou manualmente**, edite cada arquivo e troque:
```typescript
// ❌ ANTES
import * as api from '../services/api';

// ✅ DEPOIS
import * as api from '../services/api-supabase';
```

### 9️⃣ Configurar Webhook no Asaas (1 min)

1. Acesse: https://www.asaas.com (login)
2. Vá em **Configurações** > **Integrações** > **Webhooks**
3. Adicione webhook:
   - **URL**: `https://seu-project-ref.supabase.co/functions/v1/asaas-webhook`
   - **Eventos**: Marque todos (PAYMENT_RECEIVED, CONFIRMED, etc.)
   - **Status**: Ativo
4. Salve

### 🔟 Testar! (1 min)

```bash
npm run dev
```

Acesse: http://localhost:5173

1. Registre um novo usuário
2. Faça login
3. Crie um produto
4. Teste upload de imagem

**Pronto! 🎉 Sistema rodando no Supabase!**

---

## 🔍 Verificar se Está Funcionando

### ✅ Checklist Rápida

1. **Autenticação**
   ```
   ✓ Consigo registrar novo usuário
   ✓ Consigo fazer login
   ✓ Token é salvo e renovado automaticamente
   ```

2. **Produtos**
   ```
   ✓ Consigo criar produto
   ✓ Upload de imagem funciona
   ✓ Consigo editar produto
   ✓ Consigo deletar produto
   ```

3. **Finanças**
   ```
   ✓ Saldo aparece corretamente
   ✓ Consigo gerar PIX para depósito
   ✓ QR Code é exibido
   ```

4. **Supabase Dashboard**
   ```
   ✓ Tabelas aparecem no Table Editor
   ✓ Usuário aparece em Authentication > Users
   ✓ Produto aparece em Table Editor > products
   ✓ Edge Functions aparecem em Edge Functions
   ```

---

## 🐛 Problemas?

### Erro: "Invalid token"
```typescript
// Verificar no console do navegador
const session = await supabase.auth.getSession();
console.log(session);

// Se null, faça logout e login novamente
```

### Erro: "Cannot find module 'api-supabase'"
```bash
# Verificar se arquivo existe
ls src/services/api-supabase.ts

# Se não existe, foi algum erro ao criar os arquivos
# Copie novamente do repositório
```

### Erro: "Row Level Security"
```
# Execute o schema.sql novamente
# Vá em SQL Editor e execute todo o arquivo
```

### Webhook não funciona
```bash
# Ver logs da Edge Function
supabase functions logs asaas-webhook

# Testar manualmente
curl -X POST https://seu-project-ref.supabase.co/functions/v1/asaas-webhook \
  -H "Content-Type: application/json" \
  -d '{"event":"PAYMENT_RECEIVED","payment":{"id":"test"}}'
```

---

## 📚 Documentação Completa

Para setup mais detalhado, consulte:

- **[SUPABASE_SETUP.md](SUPABASE_SETUP.md)**: Guia completo passo a passo
- **[MIGRACAO_BACKEND_PHP_PARA_SUPABASE.md](MIGRACAO_BACKEND_PHP_PARA_SUPABASE.md)**: Comparação detalhada
- **[ATUALIZACAO_PAGINAS.md](ATUALIZACAO_PAGINAS.md)**: Lista de páginas a atualizar
- **[SUPABASE_README.md](SUPABASE_README.md)**: Visão geral completa

---

## 🎯 Próximos Passos

Depois que tudo estiver funcionando:

1. ✅ Testar todas as funcionalidades
2. ✅ Migrar dados do MySQL (se tiver)
3. ✅ Configurar ambiente de staging
4. ✅ Deploy em produção (Vercel/Netlify)
5. ✅ Monitorar logs do Supabase

---

## 🚀 Deploy em Produção

### Opção 1: Vercel
```bash
# Instalar Vercel CLI
npm i -g vercel

# Deploy
vercel

# Configurar variáveis de ambiente no dashboard
```

### Opção 2: Netlify
```bash
# Instalar Netlify CLI
npm i -g netlify-cli

# Deploy
netlify deploy --prod

# Configurar variáveis de ambiente no dashboard
```

---

## ✨ Sistema Pronto!

Agora seu ZucroPay está rodando 100% no Supabase com:

✅ Backend serverless escalável
✅ PostgreSQL gerenciado
✅ Autenticação completa
✅ Storage para arquivos
✅ Edge Functions globais
✅ Webhooks automáticos
✅ Row Level Security
✅ Backups automáticos

**Parabéns! 🎉**

