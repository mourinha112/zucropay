# ❓ PERGUNTAS FREQUENTES (FAQ)

## 📋 ÍNDICE

1. [Dúvidas Gerais](#duvidas-gerais)
2. [Sobre Custos](#sobre-custos)
3. [Sobre PHP e Backend](#sobre-php-e-backend)
4. [Sobre MySQL](#sobre-mysql)
5. [Sobre Deploy](#sobre-deploy)
6. [Problemas Comuns](#problemas-comuns)
7. [Segurança](#seguranca)
8. [Performance](#performance)

---

## 🎯 DÚVIDAS GERAIS

### P: Por que não posso usar só a Vercel?
**R:** A Vercel é otimizada para frontend (React, Next.js) e serverless functions (Node.js, Python, Go). Ela **não suporta**:
- PHP tradicional (`php -S`)
- MySQL persistente
- Arquivos persistentes (uploads)
- Servidor sempre rodando

Por isso, você precisa separar:
- **Frontend** → Vercel (grátis)
- **Backend PHP** → Railway/Render/DigitalOcean ($5-12/mês)

### P: Qual a melhor opção para começar?
**R:** **Railway ($5/mês)** porque:
- ✅ Setup mais rápido (10 minutos)
- ✅ Mais barato
- ✅ MySQL incluído
- ✅ PHP funciona nativamente
- ✅ Perfeito para MVP

### P: Posso mudar de plataforma depois?
**R:** Sim! Você pode migrar entre Railway → Render → DigitalOcean facilmente porque:
- Código continua igual (PHP)
- Banco de dados pode ser exportado/importado
- Frontend continua na Vercel

### P: Preciso saber programar para fazer deploy?
**R:** Não muito! Os guias têm comandos prontos para copiar/colar. Você só precisa:
- Saber usar terminal básico
- Copiar e colar comandos
- Seguir o passo a passo

---

## 💰 SOBRE CUSTOS

### P: Tem como fazer deploy grátis mesmo?
**R:** Sim, mas com conversão de 15-18 horas de trabalho:
- Reescrever TODO backend de PHP para Node.js
- Alto risco de bugs
- Muito complexo

**Nossa recomendação:** Pague $5/mês no Railway. Seu tempo vale mais!

### P: Railway cobra por quê?
**R:** Railway cobra:
- Servidor rodando 24/7
- MySQL hospedado
- Banda (100GB/mês incluído)
- SSL automático
- Monitoramento

$5/mês é **muito barato** comparado com AWS, Azure, etc.

### P: Os $5 são pra sempre?
**R:** Depende do tráfego:
- 0-1.000 usuários/mês: $5
- 1.000-10.000: $5-10
- 10.000+: $10-40

Você só paga mais se crescer muito! 📈

### P: Aceita cartão brasileiro?
**R:** Sim! Railway/Render/DigitalOcean aceitam:
- Cartão de crédito (Visa, Mastercard, Amex)
- PayPal
- Cartão internacional

### P: Posso cancelar a qualquer momento?
**R:** Sim! Sem contrato, sem multa. Cancele quando quiser.

---

## 🖥️ SOBRE PHP E BACKEND

### P: Preciso converter PHP para Node.js?
**R:** **NÃO!** Se usar Railway/Render/DigitalOcean.

Só precisa converter se quiser deploy 100% grátis (Vercel Serverless), mas não vale a pena (15h de trabalho).

### P: Que versão do PHP funciona?
**R:** Todas as modernas:
- PHP 8.0 ✅
- PHP 8.1 ✅
- PHP 8.2 ✅ (sua versão atual)
- PHP 8.3 ✅

### P: Minhas extensões PHP vão funcionar?
**R:** Sim! Railway/Render incluem:
- PDO ✅
- MySQL ✅
- JSON ✅
- cURL ✅
- GD (imagens) ✅
- OpenSSL ✅

### P: Composer funciona?
**R:** Sim! Se tiver `composer.json`, Railway/Render instalam dependências automaticamente.

### P: Posso usar frameworks PHP (Laravel, Symfony)?
**R:** Sim! Railway/Render suportam qualquer framework PHP.

---

## 🗄️ SOBRE MYSQL

### P: Posso usar meu banco existente?
**R:** Sim! Você pode:
1. Exportar banco local: `mysqldump`
2. Importar no Railway/Render
3. Continuar usando mesmos dados

### P: Quantos GB de banco vem incluído?
**R:**
- **Railway:** 5GB (após acabar, +$5 por 10GB)
- **Render:** 10GB incluído
- **DigitalOcean:** 10-25GB

Para ZucroPay, 5GB é muito! (milhares de produtos)

### P: Consigo fazer backup do banco?
**R:**
- **Railway:** Manual (via mysqldump)
- **Render:** Automático diário
- **DigitalOcean:** Automático diário

### P: E se o banco cair?
**R:** Raro! Uptime:
- Railway: 99.9%
- Render: 99.99%
- DigitalOcean: 99.99%

Mas sempre faça backups manuais também!

### P: Posso conectar via MySQL Workbench?
**R:** Sim! Todas as plataformas fornecem:
- Host
- Port
- Username
- Password

Conecte com qualquer client MySQL.

---

## 🚀 SOBRE DEPLOY

### P: Deploy demora quanto tempo?
**R:**
- **Railway:** 2-3 minutos
- **Render:** 3-4 minutos
- **DigitalOcean:** 4-5 minutos

### P: Deploy é automático?
**R:** Sim! Após configurar:
```bash
git push origin main
# Deploy automático em 2-3 minutos! 🚀
```

### P: Posso ter ambiente de teste?
**R:** Sim! Crie branches:
- `main` → Produção
- `develop` → Staging
- `feature-x` → Preview

Cada branch = URL diferente.

### P: E se o deploy falhar?
**R:** Você vê logs em tempo real:
```bash
railway logs --follow
```

Erros comuns:
- Sintaxe PHP
- Falta de extensão
- Variável de ambiente errada

### P: Posso fazer rollback?
**R:** Sim! No dashboard:
- **Deployments** → Selecione deploy anterior → **Redeploy**

### P: SSL (HTTPS) é automático?
**R:** Sim! Todas as plataformas geram SSL grátis:
- Railway ✅
- Render ✅
- DigitalOcean ✅
- Vercel ✅

---

## 🐛 PROBLEMAS COMUNS

### P: Erro "Database connection failed"
**R:** Verifique:
1. Variáveis de ambiente (`railway variables`)
2. Host/Port corretos
3. Senha sem espaços
4. Banco criado

### P: Erro "CORS policy"
**R:** Configure no backend:
```env
FRONTEND_URL=https://zucropay.vercel.app
```

E no PHP:
```php
header("Access-Control-Allow-Origin: {$_ENV['FRONTEND_URL']}");
```

### P: Imagens não aparecem
**R:** Problema de upload persistente. Soluções:
1. Use Cloudinary (grátis 25GB)
2. Use AWS S3
3. Use DigitalOcean Spaces

Railway/Render não são ideais para uploads!

### P: "Port already in use"
**R:** No Railway/Render, use:
```php
php -S 0.0.0.0:$PORT
```

A variável `$PORT` é injetada automaticamente.

### P: Erro 500 no backend
**R:** Veja logs:
```bash
railway logs
```

Erros comuns:
- Sintaxe PHP
- Extensão faltando
- Variável undefined

### P: Frontend não conecta com backend
**R:** Verifique:
1. `VITE_API_URL` no frontend
2. CORS configurado no backend
3. Backend está rodando
4. URL correta (https, não http)

---

## 🔒 SEGURANÇA

### P: É seguro colocar em produção?
**R:** Sim, mas:
- ✅ Use HTTPS (automático)
- ✅ Valide inputs
- ✅ Use prepared statements (PDO)
- ✅ Hash senhas (bcrypt)
- ✅ Token JWT
- ⚠️ Configure rate limiting

### P: Como proteger variáveis sensíveis?
**R:** Use Environment Variables:
```env
ASAAS_API_KEY=xxxxx  # Nunca commita no Git!
JWT_SECRET=xxxxx
DB_PASSWORD=xxxxx
```

Railway/Render criptografam essas variáveis.

### P: Posso usar token Asaas de sandbox em produção?
**R:** **NÃO!** Use:
- **Sandbox:** Desenvolvimento/testes
- **Produção:** Pagamentos reais

Configure:
```env
ASAAS_ENVIRONMENT=production
ASAAS_API_KEY=seu_token_producao
```

### P: Como proteger contra SQL Injection?
**R:** Use **prepared statements**:
```php
// ❌ ERRADO
$stmt = $db->query("SELECT * FROM users WHERE email = '$email'");

// ✅ CORRETO
$stmt = $db->prepare("SELECT * FROM users WHERE email = ?");
$stmt->execute([$email]);
```

Seu código já faz isso! ✅

### P: Preciso firewall?
**R:** Railway/Render incluem proteção básica:
- DDoS protection ✅
- Rate limiting (configure você)
- SSL/TLS ✅

Para produção séria, considere:
- Cloudflare (grátis)
- WAF (Web Application Firewall)

---

## ⚡ PERFORMANCE

### P: Meu site vai ser rápido?
**R:** Sim! Com CDN:
- **Frontend (Vercel):** Edge (super rápido) ⚡
- **Backend:** Depende do plano
  - Railway Basic: OK (512MB RAM)
  - Render Starter: Bom (1GB RAM)
  - DigitalOcean: Melhor (escalável)

### P: Quantos usuários suporta?
**R:**
- **Railway Basic:** 1.000-5.000 usuários/mês
- **Render Starter:** 5.000-10.000 usuários/mês
- **DigitalOcean:** 10.000+ (escalável)

### P: Como otimizar?
**R:**
1. **Frontend:**
   - Cache (Vercel faz automático)
   - Lazy loading de imagens
   - Code splitting

2. **Backend:**
   - Cache de queries (Redis)
   - Índices no MySQL
   - CDN para imagens (Cloudinary)

3. **Database:**
   - Índices em colunas buscadas
   - Evite SELECT *
   - Use EXPLAIN para analisar queries

### P: Posso escalar depois?
**R:** Sim! Todas as plataformas permitem upgrade:

**Railway:**
```
Basic → Pro → Enterprise
$5 → $10 → Custom
```

**Render:**
```
Starter → Standard → Pro
$7 → $25 → $85+
```

**DigitalOcean:**
```
Basic → Professional → Advanced
$5 → $12 → $24+
```

---

## 🎯 RECOMENDAÇÕES FINAIS

### P: Qual plataforma VOCÊ recomenda?
**R:** **Railway**, porque:
1. Mais barato ($5/mês)
2. Setup mais rápido (10 min)
3. Perfeito para MVP
4. Escala quando necessário
5. Community ativa

### P: E se eu crescer muito?
**R:** Migre na ordem:
```
Railway ($5) 
  ↓ (1k-10k usuários)
Render ($7-25)
  ↓ (10k-100k usuários)
DigitalOcean Kubernetes ($50-200)
  ↓ (100k+ usuários)
AWS/Azure (enterprise)
```

### P: Vale a pena fazer deploy grátis (conversão)?
**R:** **NÃO!** Faça as contas:
```
Conversão grátis:
- Tempo: 15 horas
- Valor/hora: R$50
- Custo: R$750 do seu tempo
- Bugs: ???

Railway:
- Tempo: 10 minutos
- Custo: R$25/mês
- 30 meses = R$750
- Zero bugs
```

Railway só se paga em **30 meses** (2,5 anos)!

### P: Preciso contratar desenvolvedor?
**R:** **NÃO!** Os guias têm tudo:
- Comandos prontos
- Passo a passo
- Troubleshooting
- Screenshots (nos links)

Qualquer pessoa consegue seguir! ✅

---

## 🆘 AINDA TEM DÚVIDAS?

### Documentação Oficial

**Railway:**
- 📚 https://docs.railway.app
- 💬 https://discord.gg/railway

**Render:**
- 📚 https://render.com/docs
- 💬 https://community.render.com

**DigitalOcean:**
- 📚 https://docs.digitalocean.com
- 💬 https://www.digitalocean.com/community

**Vercel:**
- 📚 https://vercel.com/docs
- 💬 https://github.com/vercel/vercel

### Guias ZucroPay

- **[README Principal](./README.md)** - Visão geral
- **[Início Rápido](./INICIO_RAPIDO.md)** - 10 minutos
- **[Comparação](./COMPARACAO.md)** - Qual escolher
- **[Estrutura](./ESTRUTURA.md)** - Como usar
- **[Railway](./RAILWAY/README.md)** - Recomendado
- **[Render](./RENDER/README.md)** - Alternativa
- **[DigitalOcean](./DIGITALOCEAN/README.md)** - Escalável
- **[Vercel](./VERCEL/README.md)** - Frontend

---

## ✅ RESUMO DAS RECOMENDAÇÕES

```
╔═══════════════════════════════════════════╗
║                                           ║
║  ✅ RECOMENDADO: RAILWAY ($5/mês)         ║
║  ⏱️ Tempo: 10 minutos                     ║
║  💰 Custo: R$25/mês                       ║
║  📖 Guia: RAILWAY/README.md               ║
║                                           ║
║  ❌ NÃO FAÇA: Conversão grátis            ║
║  ⏱️ Tempo: 15 horas                       ║
║  💰 Custo: R$750 do seu tempo             ║
║  📖 Guia: GRATUITO/README.md (ignore)     ║
║                                           ║
╚═══════════════════════════════════════════╝
```

---

## 🎉 PRONTO PARA COMEÇAR?

👉 **[INÍCIO RÁPIDO](./INICIO_RAPIDO.md)** - Deploy em 10 minutos

👉 **[RAILWAY COMPLETO](./RAILWAY/README.md)** - Guia detalhado

**Boa sorte! 🚀**
