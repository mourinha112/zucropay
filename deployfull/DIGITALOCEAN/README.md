# 🌊 DEPLOY ZUCROPAY NO DIGITALOCEAN

**Custo:** $12/mês | **Facilidade:** ⭐⭐⭐ | **Tempo:** 20 minutos

---

## 📋 O QUE É DIGITALOCEAN APP PLATFORM

Solução completa (tudo em um):

✅ Frontend + Backend juntos
✅ MySQL gerenciado
✅ SSL automático
✅ Mais escalável
✅ Backups automáticos
✅ Monitoramento incluso

❌ Mais caro ($12/mês vs $5 Railway)
❌ Setup mais complexo

---

## 🎯 PASSO 1: PREPARAR ARQUIVOS

### 1.1 Criar estrutura

```bash
# No PowerShell
New-Item -ItemType Directory -Path .do -Force
Copy-Item deployfull\DIGITALOCEAN\.do\app.yaml .do\ -Force
Copy-Item deployfull\DIGITALOCEAN\.env.production . -Force
```

### 1.2 Commit no GitHub

```bash
git add .
git commit -m "Add DigitalOcean deploy config"
git push origin main
```

---

## 🚀 PASSO 2: CRIAR CONTA DIGITALOCEAN

1. Acesse: https://cloud.digitalocean.com
2. **Sign Up** (use este link para $200 créditos grátis por 60 dias):
   ```
   https://m.do.co/c/4d7f4ff9cfe4
   ```
3. Adicione método de pagamento (não será cobrado durante trial)

---

## 🔧 PASSO 3: CRIAR APP

### 3.1 No Dashboard

1. Clique em **"Create"** → **"Apps"**
2. **"From GitHub"** → Autorize DigitalOcean
3. Selecione repositório: `zucropay`
4. Branch: `main`
5. Clique em **"Next"**

### 3.2 Configurar Resources

DigitalOcean detecta automaticamente!

**Backend (Web Service):**
```
Name: zucropay-backend
Type: Web Service
Environment: PHP
Build Command: (vazio)
Run Command: php -S 0.0.0.0:8080 -t backend router.php
HTTP Port: 8080
Instance Size: Basic ($5/mês)
```

**Frontend (Static Site):**
```
Name: zucropay-frontend
Type: Static Site
Build Command: npm run build
Output Directory: dist
Instance Size: Basic ($5/mês)
```

### 3.3 Adicionar Database

1. Clique em **"Add Resource"** → **"Database"**
2. Configure:

```
Name: zucropay-db
Engine: MySQL
Version: 8
Plan: Basic ($15/mês) OU Dev Database ($7/mês)
Region: New York (mesmo do app)
```

3. Clique em **"Add Database"**

---

## 🔐 PASSO 4: CONFIGURAR VARIÁVEIS DE AMBIENTE

### 4.1 Backend Environment Variables

No App Platform (Backend Component):

```env
# Database (auto-injetadas pela DigitalOcean)
DATABASE_URL=${db.DATABASE_URL}
DB_HOST=${db.HOSTNAME}
DB_PORT=${db.PORT}
DB_NAME=${db.DATABASE}
DB_USER=${db.USERNAME}
DB_PASSWORD=${db.PASSWORD}

# Asaas API
ASAAS_API_KEY=seu_token_asaas_aqui
ASAAS_ENVIRONMENT=production

# Frontend URL (será gerado após deploy)
FRONTEND_URL=https://zucropay-frontend-xxxxx.ondigitalocean.app

# JWT Secret
JWT_SECRET=gere_string_aleatoria_segura_32_caracteres

# Uploads
UPLOAD_DIR=/workspace/uploads
MAX_UPLOAD_SIZE=5242880
```

**Gerar JWT_SECRET:**
```bash
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
```

### 4.2 Frontend Environment Variables

```env
# Backend URL (será gerado após deploy)
VITE_API_URL=https://zucropay-backend-xxxxx.ondigitalocean.app
```

---

## 📊 PASSO 5: IMPORTAR BANCO DE DADOS

### 5.1 Pegar credenciais

No Dashboard → Database → **Connection Details**:

```
Host: db-xxxxx-do-user-xxxxx.db.ondigitalocean.com
Port: 25060
Database: defaultdb
User: doadmin
Password: xxxxx
```

### 5.2 Conectar via MySQL Client

```bash
mysql -h db-xxxxx.db.ondigitalocean.com -P 25060 -u doadmin -p --ssl-mode=REQUIRED
```

### 5.3 Importar Schema

```sql
USE defaultdb;
SOURCE backend/schema.sql;
SOURCE backend/marketplace-schema.sql;
```

Ou use **DBeaver/MySQL Workbench** com SSL habilitado.

---

## 🚀 PASSO 6: DEPLOY

### 6.1 Revisar Configurações

No App Platform:
- Verifique Resources (Backend, Frontend, Database)
- Verifique Environment Variables
- Verifique Region (todos no mesmo)

### 6.2 Deploy

Clique em **"Create Resources"**

Aguarde 5-10 minutos... ☕

### 6.3 Pegar URLs

Após deploy:

```
Backend: https://zucropay-backend-xxxxx.ondigitalocean.app
Frontend: https://zucropay-frontend-xxxxx.ondigitalocean.app
```

**Salve essas URLs!** 📝

---

## 🔗 PASSO 7: CONECTAR FRONTEND ↔ BACKEND

### 7.1 Atualizar Frontend ENV

No App Platform (Frontend Component) → Environment Variables:

```env
VITE_API_URL=https://zucropay-backend-xxxxx.ondigitalocean.app
```

### 7.2 Atualizar Backend ENV

No App Platform (Backend Component) → Environment Variables:

```env
FRONTEND_URL=https://zucropay-frontend-xxxxx.ondigitalocean.app
```

### 7.3 Redeploy

Clique em **"Deploy"** novamente.

---

## ✅ PASSO 8: TESTAR PRODUÇÃO

### 8.1 Testar Backend

```bash
curl https://zucropay-backend-xxxxx.ondigitalocean.app/login.php
```

Deve retornar:
```json
{"success":false,"message":"Invalid request method"}
```

### 8.2 Testar Frontend

Acesse:
```
https://zucropay-frontend-xxxxx.ondigitalocean.app
```

Login:
- Email: `zucro@zucro.com`
- Senha: `zucro2025`

✅ Funcionou? Deploy completo!

---

## 🌐 PASSO 9: DOMÍNIO PERSONALIZADO

### 9.1 Adicionar Domínio no App

No App Platform → **Settings** → **Domains**:

**Frontend:**
```
Domain: seudominio.com
Component: zucropay-frontend
```

**Backend (API):**
```
Domain: api.seudominio.com
Component: zucropay-backend
```

### 9.2 Configurar DNS

No seu provedor de domínio:

**Frontend (seudominio.com):**
```
Type: A
Name: @
Value: (IP fornecido pela DigitalOcean)
```

**Backend (api.seudominio.com):**
```
Type: CNAME
Name: api
Value: zucropay-backend-xxxxx.ondigitalocean.app
```

### 9.3 Aguardar Propagação

SSL automático será gerado em 5-10 minutos.

---

## 🔧 CONFIGURAÇÕES EXTRAS

### Webhooks Asaas

Configure no Asaas:
```
https://api.seudominio.com/webhook.php
```

Ou:
```
https://zucropay-backend-xxxxx.ondigitalocean.app/webhook.php
```

### Backups Automáticos

No Database → **Settings** → **Backups**:
- ✅ Daily backups (incluído)
- ✅ Retention: 7 dias (grátis) ou 30 dias (+$3/mês)

### Escalabilidade

No App Platform → Component → **Resources**:

Upgrade conforme necessário:
- Basic: $5/mês (512MB RAM)
- Professional: $12/mês (1GB RAM)
- Advanced: $24/mês (2GB RAM)

---

## 🐛 TROUBLESHOOTING

### Erro: "Build failed"

Veja logs no Dashboard:
- Component → **Runtime Logs**
- Component → **Build Logs**

### Erro: "Database connection timeout"

Verifique:
1. Database está no mesmo region do App
2. Conexão SSL está habilitada
3. Environment variables estão corretas

### Erro 500 no Backend

```bash
# Ver logs em tempo real
doctl apps logs <app-id> --follow

# Ou no Dashboard:
Component → Runtime Logs
```

---

## 💰 CUSTOS DETALHADOS

| Recurso | Plano | Custo/Mês |
|---------|-------|-----------|
| **Backend** | Basic (512MB) | $5 |
| **Frontend** | Basic | $3 |
| **Database** | Dev (1GB) | $7 |
| **Database** | Basic (10GB) | $15 |
| **Banda** | 1TB incluído | GRÁTIS |
| **SSL** | Automático | GRÁTIS |
| **Backups** | Diários (7 dias) | GRÁTIS |

**Total Mínimo:** $15/mês (Backend + Frontend + Dev DB)
**Total Recomendado:** $23/mês (Backend + Frontend + Basic DB)

---

## 📊 MONITORAMENTO

### Insights

No App Platform → **Insights**:

✅ CPU Usage
✅ Memory Usage
✅ Request Rate
✅ Response Time
✅ Error Rate

### Alertas

Configure em **Settings** → **Alerts**:
- Email quando CPU > 80%
- Slack quando app fica offline
- PagerDuty para emergências

---

## 🚀 CI/CD AUTOMÁTICO

DigitalOcean monitora GitHub:

```
Novo commit → Build → Test → Deploy! 🚀
```

Configure em **Settings** → **App-Level**:
- Auto-deploy on push: `main` branch
- Auto-deploy PRs: Preview environments

---

## 📝 RESUMO DOS COMANDOS

```bash
# Preparar
mkdir .do
# Copiar app.yaml

# Commit
git add .
git commit -m "Add DigitalOcean config"
git push origin main

# DigitalOcean Dashboard faz o resto!

# CLI (opcional)
snap install doctl
doctl auth init
doctl apps create --spec .do/app.yaml

# Logs
doctl apps logs <app-id> --follow
```

---

## ✅ CHECKLIST FINAL

- [ ] Conta DigitalOcean criada
- [ ] App criado com Backend + Frontend
- [ ] Database MySQL criado
- [ ] Schema importado
- [ ] Environment variables configuradas
- [ ] Deploy bem-sucedido
- [ ] URLs funcionando
- [ ] Login testado
- [ ] Domínio configurado (opcional)
- [ ] Webhook configurado

**Pronto!** 🎉

---

## 🆘 SUPORTE

- DigitalOcean Docs: https://docs.digitalocean.com/products/app-platform
- Community: https://www.digitalocean.com/community
- Status: https://status.digitalocean.com
- Tickets: Dashboard → Support

**Tempo total:** 20 minutos ⏱️
**Custo:** $15-23/mês 💰
