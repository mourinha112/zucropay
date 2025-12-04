# ⚡ ZucroPay - Início Rápido

## 🚀 5 Passos para Começar

### 1️⃣ Criar Banco de Dados (2 minutos)

```sql
CREATE DATABASE zucropay CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Depois, importe o schema:

```powershell
# Windows
Get-Content backend\schema.sql | mysql -u root -p zucropay
```

### 2️⃣ Configurar Asaas API (2 minutos)

1. Acesse: https://www.asaas.com/ e crie uma conta
2. Ative o modo **SANDBOX** (para testes)
3. Vá em: **Configurações > Integrações > API**
4. Copie sua chave (começa com `$aact_`)
5. Cole em `backend/config.php`:

```php
define('ASAAS_API_KEY', '$aact_SUA_CHAVE_AQUI');
```

### 3️⃣ Iniciar Backend (30 segundos)

```powershell
cd backend
php -S localhost:8000
```

✅ Backend rodando em: `http://localhost:8000`

### 4️⃣ Iniciar Frontend (30 segundos)

```powershell
# Instalar dependências (primeira vez)
npm install

# Iniciar
npm run dev
```

✅ Frontend rodando em: `http://localhost:5173`

### 5️⃣ Fazer Login (10 segundos)

Acesse `http://localhost:5173` e use:

**Email:** `admin@zucropay.com`  
**Senha:** `123456`

---

## 🎯 Primeiro Teste

### Teste 1: Criar um Produto

1. Vá em **Produtos**
2. Clique em **Novo Produto**
3. Preencha:
   - Nome: "Teste"
   - Preço: 10.00
4. Clique em **Criar**

### Teste 2: Gerar Link de Pagamento

1. No card do produto, clique em **Gerar Link**
2. Escolha **PIX**
3. Clique em **Gerar Link**
4. Clique no ícone de copiar 📋

### Teste 3: Fazer um Depósito

1. Vá em **Financeiro**
2. Clique em **Depositar**
3. Digite: 100.00
4. Clique em **Depositar**
5. Veja seu saldo atualizado!

---

## 📚 O que Você Pode Fazer

✅ **Gestão de Produtos**
- Criar, editar, excluir produtos
- Controlar estoque
- Upload de imagens

✅ **Links de Pagamento**
- Gerar links personalizados
- Aceitar PIX, Boleto, Cartão
- Ver estatísticas de vendas

✅ **Financeiro**
- Ver saldo em tempo real
- Depositar dinheiro
- Solicitar saques
- Histórico completo

✅ **Clientes**
- Cadastrar clientes
- Criar cobranças
- Enviar links de pagamento

✅ **Checkout Personalizado**
- Página de pagamento 100% sua
- Design moderno
- Múltiplos métodos de pagamento

---

## 🔧 Comandos Úteis

### Backend
```powershell
# Iniciar servidor
cd backend
php -S localhost:8000

# Testar API
curl http://localhost:8000/backend/balance.php
```

### Frontend
```powershell
# Instalar dependências
npm install

# Rodar em dev
npm run dev

# Build para produção
npm run build

# Preview do build
npm run preview
```

### Banco de Dados
```powershell
# Resetar banco
mysql -u root -p -e "DROP DATABASE IF EXISTS zucropay; CREATE DATABASE zucropay;"
Get-Content backend\schema.sql | mysql -u root -p zucropay

# Backup
mysqldump -u root -p zucropay > backup.sql

# Restaurar
mysql -u root -p zucropay < backup.sql
```

---

## 🐛 Problemas Comuns

### ❌ "Call to undefined function mysql_connect()"
**Solução:** Use PDO, não mysql_connect

### ❌ "CORS error"
**Solução:** Backend já tem CORS configurado. Certifique-se que está rodando em `localhost:8000`

### ❌ "Token inválido"
**Solução:** Faça logout e login novamente

### ❌ "Erro ao conectar no banco"
**Solução:** Verifique credenciais em `backend/db.php`

### ❌ "Erro na API do Asaas"
**Solução:** 
- Verifique se a chave está correta
- Confirme que está no modo SANDBOX
- Veja a resposta de erro completa

---

## 📖 Documentação Completa

- **Setup Completo**: `README_SETUP.md`
- **Configurar Asaas**: `ASAAS_CONFIG_GUIDE.md`
- **Todas as Funcionalidades**: `FUNCIONALIDADES.md`

---

## 💡 Dicas

### Desenvolvimento
- Use modo SANDBOX do Asaas (gratuito e ilimitado)
- Não commite `config.php` no Git
- Use os usuários de teste do schema

### Produção
- Troque para chave de PRODUÇÃO do Asaas
- Use HTTPS obrigatoriamente
- Configure domínio próprio
- Ative logs de erro
- Faça backups regulares

### Testes
- CPF fictício: `123.456.789-01`
- Cartão teste: `5162306219378829`
- Use dados fictícios no Sandbox

---

## 🎉 Pronto!

Agora você tem um sistema completo de pagamentos rodando!

**Próximos passos:**
1. Personalize o design
2. Adicione mais produtos
3. Teste os fluxos de pagamento
4. Configure webhooks do Asaas
5. Integre com seu site/app

---

## 🆘 Precisa de Ajuda?

- **Asaas**: https://docs.asaas.com/
- **Material-UI**: https://mui.com/
- **React**: https://react.dev/

---

**Desenvolvido com ❤️ para ZucroPay**

**Boa sorte! 🚀**
