# 🚀 INICIAR ZUCROPAY - GUIA RÁPIDO

## ⚠️ PROBLEMA: Erro 404 no Login

Você está recebendo erro 404 porque está executando o servidor PHP **FORA** da pasta `backend`.

---

## ✅ SOLUÇÃO: Execute o Servidor Corretamente

### Opção 1: Script Automático (RECOMENDADO)

**Windows CMD:**
```cmd
cd c:\Users\Mourinha\Desktop\zucropay\backend
start-server.bat
```

**Windows PowerShell:**
```powershell
cd c:\Users\Mourinha\Desktop\zucropay\backend
.\start-server.ps1
```

O script vai:
- ✅ Verificar se está na pasta correta
- ✅ Verificar se os arquivos PHP existem
- ✅ Mostrar a URL do Backend
- ✅ Mostrar a URL do Webhook
- ✅ Iniciar o servidor

---

### Opção 2: Comando Manual

**PASSO A PASSO:**

1. **Abra PowerShell/CMD**
2. **Execute EXATAMENTE este comando:**

```powershell
cd c:\Users\Mourinha\Desktop\zucropay\backend
php -S localhost:8000
```

**IMPORTANTE**: O `cd` precisa apontar para a pasta `backend`!

---

## 📋 Verificar se Funcionou

Depois de iniciar o servidor, você deve ver:

```
PHP 8.2.12 Development Server (http://localhost:8000) started
```

**Teste no navegador:**
```
http://localhost:8000/login.php
```

Você deve ver um JSON de erro (e não 404):
```json
{"success":false,"message":"Invalid request method"}
```

Se vir isso, **está funcionando!** ✅

---

## 🔗 URL do Webhook

Depois de iniciar o servidor:

### Localhost (desenvolvimento local)
```
http://localhost:8000/webhook.php
```

### Com ngrok (para receber notificações do Asaas)

1. **Instale ngrok:** https://ngrok.com/download

2. **Em outro terminal, execute:**
```powershell
ngrok http 8000
```

3. **Copie a URL gerada** (exemplo):
```
https://abc123.ngrok.io
```

4. **URL do Webhook para configurar no Asaas:**
```
https://abc123.ngrok.io/webhook.php
```

---

## 📝 RESUMO DOS COMANDOS

### Terminal 1 (Backend):
```powershell
cd c:\Users\Mourinha\Desktop\zucropay\backend
php -S localhost:8000
```

### Terminal 2 (Frontend):
```powershell
cd c:\Users\Mourinha\Desktop\zucropay
npm run dev
```

### Terminal 3 (Webhook - Opcional):
```powershell
ngrok http 8000
```

---

## ✅ Checklist

- [ ] Backend rodando: `http://localhost:8000`
- [ ] Frontend rodando: `http://localhost:5173`
- [ ] Teste de login funcionando (sem erro 404)
- [ ] Ngrok rodando (opcional, só para webhook)

---

## 🎯 URLs Importantes

| Serviço | URL |
|---------|-----|
| **Frontend** | http://localhost:5173 |
| **Backend** | http://localhost:8000 |
| **Login API** | http://localhost:8000/login.php |
| **Webhook** | http://localhost:8000/webhook.php |
| **Ngrok Web UI** | http://localhost:4040 (se ngrok estiver rodando) |

---

## ❌ Erros Comuns

### Erro: "404 Not Found"
✅ **Solução**: Execute `php -S localhost:8000` **DENTRO** da pasta `backend`

### Erro: "CORS policy"
✅ **Solução**: Os arquivos PHP já têm headers CORS. Se ainda der erro, recarregue a página.

### Erro: "Port 8000 already in use"
✅ **Solução**: Mate o processo anterior:
```powershell
Get-Process -Name php | Stop-Process -Force
```

---

## 🎉 Pronto!

Agora você pode fazer login em:
```
http://localhost:5173
Email: zucro@zucro.com
Senha: zucro2025
```
