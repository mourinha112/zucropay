# 🎨 DEPLOY ZUCROPAY NO RENDER

**Custo:** $7/mês | **Facilidade:** ⭐⭐⭐⭐ | **Tempo:** 15 minutos

---

## 📋 O QUE VOCÊ VAI FAZER

```
1. Criar conta Render (grátis)
2. Configurar render.yaml
3. Deploy automático do GitHub
4. Criar banco MySQL
5. Deploy Frontend na Vercel
6. Testar tudo
```

---

## 🎯 PASSO 1: PREPARAR ARQUIVOS

### 1.1 Copiar arquivos

```bash
# No PowerShell
Copy-Item deployfull\RENDER\render.yaml . -Force
Copy-Item deployfull\RENDER\.env.production backend\ -Force
```

### 1.2 Commit no GitHub

```bash
git add .
git commit -m "Add Render deploy configuration"
git push origin main
```

---

## 🚀 PASSO 2: CRIAR CONTA RENDER

1. Acesse: https://render.com
2. Clique em **"Get Started"**
3. Conecte com GitHub
4. Autorize Render

---

## 🔧 PASSO 3: CRIAR WEB SERVICE (BACKEND)

### 3.1 No Dashboard Render

1. Clique em **"New +"** → **"Web Service"**
2. Conecte seu repositório **zucropay**
3. Configure:

| Campo | Valor |
|-------|-------|
| **Name** | `zucropay-backend` |
| **Region** | `Oregon (US West)` |
| **Branch** | `main` |
| **Root Directory** | `.` |
| **Runtime** | `PHP` |
| **Build Command** | *(vazio)* |
| **Start Command** | `php -S 0.0.0.0:$PORT -t backend router.php` |
| **Plan** | `Starter ($7/month)` |

4. Clique em **"Create Web Service"**

---

## 🗄️ PASSO 4: CRIAR BANCO MYSQL

### 4.1 Criar Database

1. No Dashboard, clique em **"New +"** → **"MySQL"**
2. Configure:

| Campo | Valor |
|-------|-------|
| **Name** | `zucropay-db` |
| **Database** | `zucropay` |
| **User** | `zucropay_user` |
| **Region** | `Oregon (US West)` (mesma do backend) |
| **Plan** | `Starter ($7/month)` |

3. Clique em **"Create Database"**
4. Aguarde 2-3 minutos

### 4.2 Pegar credenciais

No banco criado, vá em **"Info"**:

```
Internal Database URL: mysql://...
External Database URL: mysql://...
Host: ...
Port: 3306
Database: zucropay
Username: zucropay_user
Password: ...
```

**Salve essas informações!** 📝

---

## 🔐 PASSO 5: CONFIGURAR VARIÁVEIS DE AMBIENTE

### 5.1 No Web Service (Backend)

1. Vá no serviço `zucropay-backend`
2. Clique em **"Environment"**
3. Adicione as variáveis:

```env
# Database (use as credenciais do Passo 4.2)
DB_HOST=dpg-xxxxx.oregon-postgres.render.com
DB_PORT=3306
DB_NAME=zucropay
DB_USER=zucropay_user
DB_PASSWORD=sua_senha_aqui

# Asaas API
ASAAS_API_KEY=seu_token_asaas_aqui
ASAAS_ENVIRONMENT=production

# Frontend
FRONTEND_URL=https://zucropay.vercel.app

# JWT Secret (gere uma aleatória)
JWT_SECRET=gere_string_aleatoria_segura_32_caracteres
```

**Gerar JWT_SECRET:**
```bash
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
```

4. Clique em **"Save Changes"**

O Render vai fazer redeploy automático! ⚡

---

## 📊 PASSO 6: IMPORTAR BANCO DE DADOS

### 6.1 Conectar ao MySQL

```bash
# Usar External Database URL
mysql -h dpg-xxxxx.oregon-postgres.render.com -P 3306 -u zucropay_user -p zucropay
```

### 6.2 Importar Schema

```sql
SOURCE backend/schema.sql;
SOURCE backend/marketplace-schema.sql;
```

Ou use ferramentas gráficas:
- **MySQL Workbench**
- **DBeaver**
- **phpMyAdmin** (instale separadamente)

---

## ✅ PASSO 7: TESTAR BACKEND

### 7.1 Pegar URL

No Dashboard Render (Backend):
- Copie a URL: `https://zucropay-backend.onrender.com`

### 7.2 Testar

```bash
curl https://zucropay-backend.onrender.com/login.php
```

Deve retornar:
```json
{"success":false,"message":"Invalid request method"}
```

✅ Backend funcionando!

---

## 🎨 PASSO 8: DEPLOY FRONTEND (VERCEL)

### 8.1 Configurar Backend URL

Crie `src/config/api.ts`:

```typescript
const API_URL = import.meta.env.PROD 
  ? 'https://zucropay-backend.onrender.com'
  : 'http://localhost:8000';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});
```

### 8.2 Deploy

```bash
# Instalar Vercel CLI
npm install -g vercel

# Build
npm run build

# Deploy
vercel --prod
```

Resultado: `https://zucropay.vercel.app` ✅

---

## 🔗 PASSO 9: CONECTAR FRONTEND ↔ BACKEND

### 9.1 Atualizar CORS

No Render (Backend Environment Variables):

```env
FRONTEND_URL=https://zucropay.vercel.app
```

Salve e aguarde redeploy.

---

## 🎉 PASSO 10: TESTAR TUDO

1. Acesse: `https://zucropay.vercel.app`
2. Login:
   - Email: `zucro@zucro.com`
   - Senha: `zucro2025`

**Funcionou?** 🎊 Deploy completo!

---

## 🔧 CONFIGURAÇÕES EXTRAS

### Domínio Personalizado (Backend)

No Render (Backend):
1. **Settings** → **Custom Domain**
2. Adicione: `api.seudominio.com`
3. Configure DNS:
   ```
   Type: CNAME
   Name: api
   Value: zucropay-backend.onrender.com
   ```

### Domínio Personalizado (Frontend)

Na Vercel:
1. **Settings** → **Domains**
2. Adicione: `seudominio.com`
3. Configure DNS conforme instruções

### Webhook Asaas

Configure no Asaas:
```
https://zucropay-backend.onrender.com/webhook.php
```

---

## 🐛 TROUBLESHOOTING

### Erro: "Connection timeout"

Render pode estar em "sleep" (plano grátis). Upgrade para Starter ($7).

### Erro: "Database connection failed"

Verifique as credenciais no Environment:
- DB_HOST
- DB_PORT
- DB_NAME
- DB_USER
- DB_PASSWORD

### Erro 500 no Backend

Veja os logs:
1. Dashboard → Backend Service
2. **Logs** (tempo real)

---

## 💰 CUSTOS

| Recurso | Custo |
|---------|-------|
| **Web Service (Backend)** | $7/mês |
| **MySQL Database** | Incluso no plano |
| **SSL** | Grátis |
| **Banda** | 100GB/mês |

**Total:** $7/mês

---

## 📊 MONITORAMENTO

### Logs

No Dashboard:
- **Logs** (tempo real)
- **Metrics** (CPU, RAM, Requests)

### Alertas

Configure em **Settings** → **Notifications**:
- Email quando serviço cai
- Slack integration
- Webhook notifications

---

## 🚀 CI/CD AUTOMÁTICO

Render monitora seu GitHub:

```
Novo commit → Build automático → Deploy! 🚀
```

**Branches:**
- `main` → Produção
- `develop` → Staging (crie outro serviço)

---

## 📝 RESUMO DOS COMANDOS

```bash
# Preparar
git add .
git commit -m "Add Render config"
git push origin main

# Render faz o resto automaticamente!

# Frontend
npm install -g vercel
npm run build
vercel --prod

# Conectar MySQL
mysql -h host -P 3306 -u user -p database
SOURCE backend/schema.sql;
```

---

## ✅ CHECKLIST FINAL

- [ ] Conta Render criada
- [ ] Backend deployado
- [ ] MySQL criado e conectado
- [ ] Schema importado
- [ ] Variáveis de ambiente configuradas
- [ ] Frontend na Vercel
- [ ] Login testado
- [ ] Webhook configurado

**Pronto!** 🎉

---

## 🆘 SUPORTE

- Render Docs: https://render.com/docs
- Render Community: https://community.render.com
- Status: https://status.render.com

**Tempo total:** 15 minutos ⏱️
