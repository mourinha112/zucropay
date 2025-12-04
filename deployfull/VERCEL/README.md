# ▲ DEPLOY FRONTEND NA VERCEL

**Custo:** GRÁTIS | **Facilidade:** ⭐⭐⭐⭐⭐ | **Tempo:** 5 minutos

---

## 📋 O QUE É A VERCEL

A Vercel é perfeita para React/Next.js:

✅ Deploy em segundos
✅ SSL automático
✅ CDN global
✅ CI/CD do GitHub
✅ Preview de PRs
✅ Analytics grátis

❌ Não suporta PHP (por isso backend vai em Railway/Render)

---

## 🎯 PASSO 1: PREPARAR ARQUIVOS

### 1.1 Copiar configuração

```bash
# No PowerShell
Copy-Item deployfull\VERCEL\vercel.json . -Force
Copy-Item deployfull\VERCEL\.env.production . -Force
```

### 1.2 Configurar API URL

Edite `src/config/api.ts`:

```typescript
// Detectar ambiente
const API_URL = import.meta.env.PROD 
  ? import.meta.env.VITE_API_URL || 'https://zucropay-backend.up.railway.app'
  : 'http://localhost:8000';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false,
});

// Interceptor para token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('zucropay_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
```

---

## 🚀 PASSO 2: DEPLOY VIA DASHBOARD

### 2.1 Criar conta Vercel

1. Acesse: https://vercel.com
2. Clique em **"Sign Up"**
3. **Conecte com GitHub**
4. Autorize Vercel

### 2.2 Importar Projeto

1. No Dashboard: **"Add New..."** → **"Project"**
2. **Import Git Repository**
3. Selecione: `zucropay` (ou seu repo)
4. Configure:

| Campo | Valor |
|-------|-------|
| **Framework Preset** | `Vite` |
| **Root Directory** | `./` |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |
| **Install Command** | `npm install` |

### 2.3 Environment Variables

Adicione:

```env
VITE_API_URL=https://zucropay-backend.up.railway.app
```

*Substitua pela URL do seu backend (Railway/Render)*

5. Clique em **"Deploy"**

Aguarde 2-3 minutos... ☕

### 2.4 Pronto!

Vercel vai gerar:
```
✅ https://zucropay.vercel.app
```

---

## 🚀 PASSO 3: DEPLOY VIA CLI (ALTERNATIVA)

### 3.1 Instalar Vercel CLI

```bash
npm install -g vercel
```

### 3.2 Login

```bash
vercel login
```

Escolha:
- **GitHub** (recomendado)
- Email
- GitLab
- Bitbucket

### 3.3 Configurar Projeto

```bash
# Na pasta raiz do zucropay
vercel
```

Responda:
```
? Set up and deploy "~/zucropay"? [Y/n] Y
? Which scope? Sua conta
? Link to existing project? [y/N] N
? What's your project's name? zucropay
? In which directory is your code located? ./
? Want to override the settings? [y/N] N
```

### 3.4 Deploy Produção

```bash
vercel --prod
```

Resultado:
```
✅ Production: https://zucropay.vercel.app
```

---

## 🔐 PASSO 4: CONFIGURAR VARIÁVEIS DE AMBIENTE

### Via Dashboard

1. Projeto → **Settings** → **Environment Variables**
2. Adicione:

| Key | Value | Environment |
|-----|-------|-------------|
| `VITE_API_URL` | `https://seu-backend.railway.app` | Production |
| `VITE_API_URL` | `http://localhost:8000` | Development |

### Via CLI

```bash
# Produção
vercel env add VITE_API_URL production
# Cole: https://zucropay-backend.up.railway.app

# Preview
vercel env add VITE_API_URL preview
# Cole: https://zucropay-backend.up.railway.app

# Development
vercel env add VITE_API_URL development
# Cole: http://localhost:8000
```

### Redeploy

```bash
vercel --prod
```

---

## 🌐 PASSO 5: DOMÍNIO PERSONALIZADO

### 5.1 Adicionar Domínio

No Dashboard:
1. Projeto → **Settings** → **Domains**
2. **Add Domain**
3. Digite: `seudominio.com`

### 5.2 Configurar DNS

No seu provedor de domínio (GoDaddy, Namecheap, etc):

**Opção A: A Record**
```
Type: A
Name: @
Value: 76.76.21.21
```

**Opção B: CNAME**
```
Type: CNAME
Name: @
Value: cname.vercel-dns.com
```

**Subdomínio (www):**
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

### 5.3 Verificar

Aguarde 5-10 minutos. Vercel vai:
- ✅ Detectar domínio
- ✅ Gerar SSL automático
- ✅ Ativar HTTPS

---

## ✅ PASSO 6: TESTAR PRODUÇÃO

### 6.1 Acessar

```
https://zucropay.vercel.app
```

### 6.2 Testar Login

```
Email: zucro@zucro.com
Senha: zucro2025
```

### 6.3 Verificar Rede

Abra DevTools (F12):
- **Network** → Filtro: `XHR`
- Veja se requisições vão para seu backend
- Status deve ser `200 OK`

✅ Tudo funcionando!

---

## 🔧 CONFIGURAÇÕES AVANÇADAS

### Preview Deployments

Toda branch/PR gera preview automático:

```
main → https://zucropay.vercel.app
develop → https://zucropay-git-develop.vercel.app
PR #123 → https://zucropay-git-pr-123.vercel.app
```

### Rewrite Rules (vercel.json)

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/" }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        }
      ]
    }
  ]
}
```

### Redirects

```json
{
  "redirects": [
    {
      "source": "/admin",
      "destination": "/dashboard",
      "permanent": false
    }
  ]
}
```

---

## 📊 ANALYTICS

### Ativar Analytics

1. Dashboard → Projeto
2. **Analytics** → **Enable**
3. GRÁTIS até 100k requisições/mês

Métricas:
- ✅ Page Views
- ✅ Top Pages
- ✅ Top Referrers
- ✅ Devices/Browsers
- ✅ Countries

---

## 🐛 TROUBLESHOOTING

### Erro: "Build failed"

Veja os logs no Dashboard:
- **Deployments** → Último deploy → **View Build Logs**

Problemas comuns:
```bash
# TypeScript errors
npm run build # Teste local

# Missing dependencies
npm install

# Env variables
vercel env ls
```

### Erro: "404 Not Found" em rotas

Adicione em `vercel.json`:
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/" }]
}
```

### Erro: "API calls failing"

Verifique:
1. `VITE_API_URL` está correta?
2. Backend está rodando?
3. CORS configurado no backend?

```bash
# Testar backend
curl https://seu-backend.railway.app/login.php
```

---

## 💰 CUSTOS

### Plano Hobby (GRÁTIS)

✅ 100 GB bandwidth/mês
✅ 100 GB-horas computação
✅ Deploy ilimitados
✅ SSL automático
✅ Domínios personalizados
✅ Analytics básico

### Plano Pro ($20/mês)

✅ 1 TB bandwidth
✅ Mais recursos de computação
✅ Analytics avançado
✅ Suporte prioritário
✅ Proteção DDoS

**Para ZucroPay:** Hobby é suficiente! 🎉

---

## 🚀 CI/CD AUTOMÁTICO

Vercel monitora GitHub:

```
1. Você faz commit
2. Vercel detecta
3. Build automático
4. Deploy em 2-3 minutos
5. Notificação no Slack/Email
```

**Zero configuração!** ✅

---

## 📝 RESUMO DOS COMANDOS

```bash
# Via CLI
npm install -g vercel
vercel login
vercel # primeira vez
vercel --prod # produção

# Env variables
vercel env add VITE_API_URL production
vercel env ls

# Logs
vercel logs

# Domínios
vercel domains ls
vercel domains add seudominio.com
```

---

## ✅ CHECKLIST FINAL

- [ ] Conta Vercel criada
- [ ] Projeto importado do GitHub
- [ ] Build bem-sucedido
- [ ] VITE_API_URL configurada
- [ ] URL funcionando
- [ ] Login testado
- [ ] Rotas funcionando (SPA)
- [ ] Domínio configurado (opcional)

**Pronto!** 🎉 Frontend no ar!

---

## 🔗 CONECTAR COM BACKEND

### Atualizar CORS no Backend

No Railway/Render (variáveis de ambiente):

```env
FRONTEND_URL=https://zucropay.vercel.app
```

No código PHP (`backend/cors.php`):

```php
$allowedOrigins = [
    'https://zucropay.vercel.app',
    'http://localhost:5173',
];

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowedOrigins)) {
    header("Access-Control-Allow-Origin: $origin");
    header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization");
    header("Access-Control-Allow-Credentials: true");
}
```

---

## 🆘 SUPORTE

- Vercel Docs: https://vercel.com/docs
- Vercel Community: https://github.com/vercel/vercel/discussions
- Status: https://vercel-status.com

**Tempo total:** 5 minutos ⏱️

**Custo:** $0 💰
