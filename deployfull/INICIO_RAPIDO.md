# ⚡ INÍCIO RÁPIDO - DEPLOY EM 10 MINUTOS

## 🎯 ESCOLHA SUA OPÇÃO (1 CLIQUE)

### 🥇 RECOMENDADO: Railway ($5/mês)
```bash
cd c:\Users\Mourinha\Desktop\zucropay

# 1. Instalar Railway CLI
npm install -g @railway/cli

# 2. Login
railway login

# 3. Deploy
railway init
railway up

# 4. Pegar URL
railway domain

# 5. Configurar frontend
# Edite src/config/api.ts com a URL acima

# 6. Deploy frontend
npm install -g vercel
npm run build
vercel --prod

# ✅ PRONTO! Tempo: 10 minutos
```

**[📖 Guia Completo Railway](./RAILWAY/README.md)**

---

### 🥈 ALTERNATIVA: Render ($7/mês)
```bash
# 1. Push para GitHub
git add .
git commit -m "Deploy config"
git push origin main

# 2. Abra: https://render.com
# 3. New → Web Service → Conecte GitHub
# 4. Configure:
#    - Name: zucropay-backend
#    - Build: (vazio)
#    - Start: php -S 0.0.0.0:$PORT -t backend router.php
# 5. Add Database → MySQL

# 6. Deploy frontend
vercel --prod

# ✅ PRONTO! Tempo: 15 minutos
```

**[📖 Guia Completo Render](./RENDER/README.md)**

---

### 🥉 OPÇÃO 3: DigitalOcean ($12/mês)
```bash
# 1. Criar conta: https://cloud.digitalocean.com
# 2. New → App → From GitHub
# 3. Selecionar repo
# 4. Add Database → MySQL
# 5. Deploy

# ✅ PRONTO! Tempo: 20 minutos
```

**[📖 Guia Completo DigitalOcean](./DIGITALOCEAN/README.md)**

---

## 📊 COMPARAÇÃO RÁPIDA

| | Railway | Render | DigitalOcean |
|---|---------|--------|--------------|
| **Preço** | $5/mês | $7/mês | $12/mês |
| **Tempo** | 10 min | 15 min | 20 min |
| **Facilidade** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| **MySQL** | Incluso | Incluso | +$7 |

**[📊 Ver Comparação Completa](./COMPARACAO.md)**

---

## 🚀 RECOMENDAÇÃO

### Para começar AGORA:
👉 **RAILWAY** (mais rápido + mais barato)

### Se precisa máxima confiabilidade:
👉 **RENDER** (backups + uptime 99.99%)

### Se vai escalar muito:
👉 **DIGITALOCEAN** (mais recursos)

---

## ✅ CHECKLIST PRÉ-DEPLOY

Antes de começar, verifique:

- [ ] Git instalado
- [ ] Node.js instalado
- [ ] Conta GitHub
- [ ] Backend rodando local (`php -S localhost:8000`)
- [ ] Frontend rodando local (`npm run dev`)
- [ ] Token Asaas (sandbox ou produção)

---

## 📝 VARIÁVEIS DE AMBIENTE

Você vai precisar configurar:

```env
# Database (auto-configurado)
DB_HOST=auto
DB_PORT=auto
DB_USER=auto
DB_PASSWORD=auto

# Asaas (IMPORTANTE!)
ASAAS_API_KEY=seu_token_aqui
ASAAS_ENVIRONMENT=production

# JWT (gere uma aleatória)
JWT_SECRET=xxxxxxxxxxxxx

# Frontend URL (após deploy)
FRONTEND_URL=https://zucropay.vercel.app
```

**Gerar JWT_SECRET:**
```powershell
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
```

---

## 🎯 PASSO A PASSO (RAILWAY)

### 1️⃣ Instalar CLI
```bash
npm install -g @railway/cli
```

### 2️⃣ Login
```bash
railway login
```
Autorize no navegador.

### 3️⃣ Iniciar Projeto
```bash
cd c:\Users\Mourinha\Desktop\zucropay
railway init
```

Responda:
- Project name: `zucropay`
- Environment: `production`

### 4️⃣ Deploy Backend
```bash
railway up
```

Aguarde 2-3 minutos...

### 5️⃣ Adicionar MySQL
```bash
railway add
```

Escolha: **MySQL**

### 6️⃣ Pegar URL do Backend
```bash
railway domain
```

Cópia: `https://zucropay-backend-xxx.railway.app`

### 7️⃣ Configurar Frontend
Edite `src/config/api.ts`:
```typescript
const API_URL = import.meta.env.PROD 
  ? 'https://zucropay-backend-xxx.railway.app'
  : 'http://localhost:8000';
```

### 8️⃣ Deploy Frontend
```bash
npm install -g vercel
npm run build
vercel --prod
```

### 9️⃣ Testar
Acesse:
```
https://zucropay.vercel.app
```

Login:
- Email: `zucro@zucro.com`
- Senha: `zucro2025`

### 🎉 PRONTO!

---

## 🐛 PROBLEMAS COMUNS

### Erro: "Railway CLI not found"
```bash
npm install -g @railway/cli
```

### Erro: "Git not initialized"
```bash
git init
git add .
git commit -m "Initial commit"
```

### Erro: "Database connection failed"
Verifique variáveis de ambiente:
```bash
railway variables
```

### Erro: "CORS policy"
Configure no backend:
```bash
railway variables set FRONTEND_URL=https://zucropay.vercel.app
```

---

## 📚 DOCUMENTAÇÃO COMPLETA

### 📖 Guias Detalhados

- **[Railway](./RAILWAY/README.md)** - Recomendado ($5/mês)
- **[Render](./RENDER/README.md)** - Confiável ($7/mês)
- **[DigitalOcean](./DIGITALOCEAN/README.md)** - Escalável ($12/mês)
- **[Vercel](./VERCEL/README.md)** - Frontend apenas (grátis)
- **[Grátis](./GRATUITO/README.md)** - Conversão Node.js (não recomendado)

### 📊 Comparações

- **[Comparação Completa](./COMPARACAO.md)** - Todas as opções lado a lado

---

## 💰 CUSTOS

### Railway (Recomendado)
```
Backend + MySQL: $5/mês
Frontend Vercel: GRÁTIS
Total: $5/mês = R$25/mês
```

### Render
```
Backend + MySQL: $7/mês
Frontend Vercel: GRÁTIS
Total: $7/mês = R$35/mês
```

### DigitalOcean
```
Backend: $5/mês
Frontend: $3/mês
MySQL: $7/mês
Total: $15/mês = R$75/mês
```

---

## 🎯 RECOMENDAÇÃO FINAL

```
╔═══════════════════════════════════════╗
║  🥇 MELHOR OPÇÃO: RAILWAY ($5/mês)   ║
║                                       ║
║  ✅ Mais rápido (10 minutos)          ║
║  ✅ Mais barato ($5/mês)              ║
║  ✅ MySQL incluído                    ║
║  ✅ Setup automático                  ║
║                                       ║
║  📖 Ver guia: RAILWAY/README.md       ║
╚═══════════════════════════════════════╝
```

---

## 🆘 PRECISA DE AJUDA?

### Railway
- Docs: https://docs.railway.app
- Discord: https://discord.gg/railway
- Status: https://status.railway.app

### Render
- Docs: https://render.com/docs
- Community: https://community.render.com
- Status: https://status.render.com

### DigitalOcean
- Docs: https://docs.digitalocean.com
- Community: https://www.digitalocean.com/community
- Support: Dashboard → Support

### Vercel
- Docs: https://vercel.com/docs
- Community: https://github.com/vercel/vercel/discussions

---

## 🚀 COMEÇAR AGORA

**Escolha Railway?** (Recomendado)
```bash
npm install -g @railway/cli
railway login
railway init
railway up
```

**Tempo:** 10 minutos ⏱️
**Custo:** $5/mês 💰

👉 **[Guia Completo Railway](./RAILWAY/README.md)**

---

**Boa sorte! 🎉**
