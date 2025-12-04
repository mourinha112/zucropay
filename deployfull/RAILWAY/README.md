# 🚂 DEPLOY ZUCROPAY NO RAILWAY

**Custo:** $5/mês | **Facilidade:** ⭐⭐⭐⭐⭐ | **Tempo:** 10 minutos

---

## 📋 O QUE VOCÊ VAI FAZER

```
1. Criar conta Railway (grátis)
2. Deploy do Backend PHP
3. Criar banco MySQL
4. Configurar variáveis de ambiente
5. Deploy do Frontend na Vercel
6. Conectar tudo
```

---

## 🎯 PASSO 1: PREPARAR ARQUIVOS

### 1.1 Copiar arquivos de configuração

Copie os arquivos desta pasta para a raiz do projeto:

```bash
# No PowerShell
Copy-Item deployfull\RAILWAY\railway.toml . -Force
Copy-Item deployfull\RAILWAY\.env.production backend\ -Force
Copy-Item deployfull\RAILWAY\config.production.php backend\ -Force
```

---

## 🚀 PASSO 2: CRIAR CONTA RAILWAY

1. Acesse: https://railway.app
2. Clique em **"Start a New Project"**
3. Conecte com GitHub
4. Autorize Railway

---

## 🔧 PASSO 3: DEPLOY DO BACKEND

### 3.1 Criar Projeto

```bash
# Instalar Railway CLI
npm install -g @railway/cli

# Login
railway login

# Criar projeto
railway init
```

Escolha:
- **Project Name:** `zucropay-backend`
- **Environment:** `production`

### 3.2 Deploy

```bash
# Na pasta raiz do zucropay
railway up
```

Railway vai detectar PHP automaticamente! ✅

### 3.3 Pegar URL do Backend

```bash
railway domain
```

Vai gerar algo como: `zucropay-backend.up.railway.app`

**Salve essa URL!** 📝

---

## 🗄️ PASSO 4: CRIAR MYSQL

### 4.1 No Dashboard Railway

1. Abra: https://railway.app/dashboard
2. Selecione seu projeto `zucropay-backend`
3. Clique em **"New"** → **"Database"** → **"MySQL"**
4. Aguarde 30 segundos

### 4.2 Conectar ao Backend

1. Clique no serviço **Backend**
2. Vá em **"Variables"**
3. Clique em **"New Variable"** → **"Add Reference"**
4. Selecione todas as variáveis do MySQL:
   - `MYSQLHOST`
   - `MYSQLPORT`
   - `MYSQLDATABASE`
   - `MYSQLUSER`
   - `MYSQLPASSWORD`

---

## 🔐 PASSO 5: CONFIGURAR VARIÁVEIS

### 5.1 No Dashboard Railway (serviço Backend)

Adicione estas variáveis manualmente:

```env
# Asaas API
ASAAS_API_KEY=seu_token_asaas_aqui
ASAAS_ENVIRONMENT=production

# Frontend URL
FRONTEND_URL=https://zucropay.vercel.app

# JWT Secret
JWT_SECRET=gere_string_aleatoria_segura_32_caracteres
```

**Gerar JWT_SECRET:**
```bash
# No PowerShell
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
```

---

## 📊 PASSO 6: IMPORTAR BANCO DE DADOS

### 6.1 Conectar ao MySQL Railway

No Dashboard Railway:
1. Clique no banco **MySQL**
2. Vá em **"Data"** → **"Connect"**
3. Copie o comando de conexão

### 6.2 Importar Schema

```bash
# Conectar ao MySQL
mysql -h containers-us-west-xxx.railway.app -P 6379 -u root -p

# Importar schema
USE railway;
SOURCE backend/schema.sql;
SOURCE backend/marketplace-schema.sql;
```

Ou use o **Railway CLI:**

```bash
railway connect MySQL
```

Depois execute os SQLs:
```sql
SOURCE backend/schema.sql;
SOURCE backend/marketplace-schema.sql;
```

---

## ✅ PASSO 7: TESTAR BACKEND

```bash
# Teste de API
curl https://zucropay-backend.up.railway.app/login.php

# Deve retornar:
# {"success":false,"message":"Invalid request method"}
```

Se retornou JSON, está funcionando! ✅

---

## 🎨 PASSO 8: DEPLOY FRONTEND (VERCEL)

### 8.1 Instalar Vercel CLI

```bash
npm install -g vercel
```

### 8.2 Configurar Backend URL

Edite `src/config/api.ts`:

```typescript
const API_URL = import.meta.env.PROD 
  ? 'https://zucropay-backend.up.railway.app'
  : 'http://localhost:8000';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});
```

### 8.3 Deploy

```bash
# Build
npm run build

# Deploy
vercel --prod
```

Siga o wizard:
- **Set up and deploy?** `Y`
- **Which scope?** Sua conta
- **Link to existing project?** `N`
- **Project name?** `zucropay`
- **Directory?** `./`
- **Override settings?** `N`

### 8.4 Pegar URL Frontend

Vercel vai mostrar algo como:
```
✅ Production: https://zucropay.vercel.app
```

---

## 🔗 PASSO 9: CONECTAR FRONTEND ↔ BACKEND

### 9.1 Atualizar CORS no Backend

No Railway Dashboard (Backend):

Adicione variável:
```env
FRONTEND_URL=https://zucropay.vercel.app
```

### 9.2 Redeploy Backend

```bash
railway up
```

---

## 🎉 PASSO 10: TESTAR TUDO

1. Acesse: `https://zucropay.vercel.app`
2. Faça login:
   - Email: `zucro@zucro.com`
   - Senha: `zucro2025`

**Funcionou?** 🎊 Deploy completo!

---

## 🔧 CONFIGURAÇÕES EXTRAS

### Webhook do Asaas

1. No Railway Dashboard (Backend)
2. Copie a URL: `https://zucropay-backend.up.railway.app`
3. Configure no Asaas:
   ```
   https://zucropay-backend.up.railway.app/webhook.php
   ```

### Upload de Imagens

Crie pasta no Railway:

```bash
railway run mkdir -p uploads/products
railway run chmod 777 uploads/products
```

**⚠️ ATENÇÃO:** Railway não é ideal para uploads! Considere:
- AWS S3
- Cloudinary
- DigitalOcean Spaces

---

## 🐛 TROUBLESHOOTING

### Erro: "Database connection failed"

```bash
# Verificar variáveis
railway variables

# Reconectar MySQL
railway link
```

### Erro: "CORS policy"

Verifique `FRONTEND_URL` no Backend:
```bash
railway variables
```

Deve ter: `FRONTEND_URL=https://zucropay.vercel.app`

### Erro 500 no Backend

Veja os logs:
```bash
railway logs
```

---

## 💰 CUSTOS

| Recurso | Limite Grátis | Custo Após |
|---------|---------------|------------|
| **Backend** | 500h/mês | $5/mês |
| **MySQL** | 5GB | Incluso |
| **Banda** | 100GB/mês | $0.10/GB |

**Total estimado:** $5-7/mês

---

## 📊 MONITORAMENTO

### Logs em Tempo Real

```bash
railway logs --follow
```

### Dashboard

Acesse: https://railway.app/dashboard

Monitore:
- ✅ Uptime
- ✅ CPU/RAM
- ✅ Requests/min
- ✅ Erros

---

## 🚀 PRÓXIMOS PASSOS

### 1. Domínio Personalizado

No Railway:
- Settings → Domains → Add Custom Domain
- Configure DNS no seu provedor

### 2. SSL Automático

Railway gera SSL automaticamente! ✅

### 3. CI/CD

Railway monitora seu repo GitHub:
- Novo commit → Deploy automático! 🚀

---

## 📝 RESUMO DOS COMANDOS

```bash
# Setup
npm install -g @railway/cli
railway login
railway init

# Deploy Backend
railway up
railway domain

# Criar MySQL
# (via Dashboard)

# Deploy Frontend
npm install -g vercel
npm run build
vercel --prod

# Logs
railway logs --follow
```

---

## ✅ CHECKLIST FINAL

- [ ] Backend no Railway funcionando
- [ ] MySQL criado e conectado
- [ ] Schema importado
- [ ] Variáveis de ambiente configuradas
- [ ] Frontend na Vercel funcionando
- [ ] Login testado com sucesso
- [ ] Webhook configurado no Asaas

**Tudo marcado?** 🎉 Você fez deploy do ZucroPay!

---

## 🆘 SUPORTE

- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- Vercel Docs: https://vercel.com/docs

**Tempo total:** 10-15 minutos ⏱️
