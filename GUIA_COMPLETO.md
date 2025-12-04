# 🚀 GUIA RÁPIDO - ZUCROPAY

## ✅ Sistema Completo Pronto!

### 📋 O que foi feito:

1. ✅ **Backend PHP** - 15 endpoints funcionando
2. ✅ **Banco de Dados** - 10 tabelas + 3 usuários de teste  
3. ✅ **Frontend React** - 8 páginas completas
4. ✅ **Autenticação** - Login/Registro com JWT
5. ✅ **Produtos** - CRUD completo + estatísticas
6. ✅ **Links de Pagamento** - Geração automática
7. ✅ **Checkout Personalizado** - PIX + Boleto + Cartão
8. ✅ **Webhook** - Notificações automáticas do Asaas
9. ✅ **Personalização** - Sistema de customização do checkout
10. ✅ **Saldo e Saques** - Gestão financeira completa

---

## 🎯 COMO INICIAR (3 passos)

### 1️⃣ Banco de Dados

```sql
CREATE DATABASE zucropay CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE zucropay;
SOURCE backend/schema.sql;
```

Ou via PowerShell:
```powershell
mysql -u root -p -e "CREATE DATABASE zucropay"
mysql -u root -p zucropay < backend/schema.sql
```

---

### 2️⃣ Backend (IMPORTANTE!)

**Abra um terminal PowerShell** e execute:

```powershell
cd c:\Users\Mourinha\Desktop\zucropay\backend
php -S localhost:8000
```

⚠️ **ATENÇÃO**: O comando deve ser executado **DENTRO** da pasta `backend`!

Você verá:
```
[Wed Oct 1 2025] PHP 8.2.12 Development Server (http://localhost:8000) started
```

**Deixe este terminal aberto!**

---

### 3️⃣ Frontend

**Abra OUTRO terminal PowerShell** e execute:

```powershell
cd c:\Users\Mourinha\Desktop\zucropay
npm install
npm run dev
```

Você verá:
```
VITE v5.x.x  ready in XXX ms
➜  Local:   http://localhost:5173/
```

---

## 👤 CREDENCIAIS DE TESTE

### Usuário Zucro (Recomendado)
```
Email: zucro@zucro.com
Senha: zucro2025
Saldo: R$ 2.000,00
```

### Outros usuários
```
admin@zucropay.com / 123456 (R$ 1.000,00)
joao@example.com / 123456 (R$ 500,00)
```

---

## 🎨 FLUXO COMPLETO DE TESTE

### Passo 1: Login
1. Acesse `http://localhost:5173`
2. Faça login com: `zucro@zucro.com` / `zucro2025`
3. Você será redirecionado para o Dashboard

---

### Passo 2: Criar Produto
1. Clique em **"Produtos"** no menu lateral
2. Clique em **"Novo Produto"**
3. Preencha:
   ```
   Nome: Curso de Marketing Digital
   Descrição: Aprenda marketing digital do zero
   Preço: 497.00
   URL da Imagem: https://via.placeholder.com/400x300
   Estoque: 100
   ```
4. Clique em **"Salvar"**

---

### Passo 3: Personalizar Checkout (NOVO!)
1. No card do produto, clique no ícone 🎨 (**Paleta**)
2. Você acessará a página de personalização com 7 abas:

#### 🖼️ Aba Imagens
- Logo URL
- Banner URL  
- Background URL

#### 🎨 Aba Cores
- Cor Primária (ex: #667eea)
- Cor Secundária (ex: #764ba2)
- Cor do Texto
- Cor de Fundo

#### ⏰ Aba Cronômetro
- Ativar cronômetro de urgência
- Definir tempo (5-120 minutos)
- Personalizar texto

#### 🛡️ Aba Garantia
- Ativar selo de garantia
- Definir dias (3-90 dias)
- Texto personalizado

#### 💬 Aba Depoimentos
- Adicionar depoimentos de clientes
- Nome, texto, avatar, rating (1-5 estrelas)

#### ❓ Aba FAQ
- Adicionar perguntas frequentes
- Pergunta e resposta

#### ⚙️ Aba Extras
- Selos de segurança
- WhatsApp para suporte
- CSS personalizado

3. Clique em **"Salvar Alterações"**

---

### Passo 4: Gerar Link de Pagamento
1. Volte para **"Produtos"**
2. No card do produto, clique em **"Gerar Link"**
3. Selecione os métodos de pagamento:
   - ☑️ PIX
   - ☑️ Boleto
   - ☑️ Cartão de Crédito
4. Clique em **"Criar Link"**
5. Copie o link gerado (ex: `http://localhost:5173/checkout/abc123`)

---

### Passo 5: Testar Checkout
1. Abra o link em **nova aba anônima**
2. Você verá o checkout **100% personalizado** com:
   - Suas cores personalizadas
   - Cronômetro (se ativado)
   - Garantia (se ativada)
   - Depoimentos (se ativados)
   - FAQ (se ativado)
   - Selos de segurança
3. Preencha os dados do cliente
4. Escolha método de pagamento:
   - **PIX**: Gera QR Code instantâneo
   - **Boleto**: Gera código de barras
   - **Cartão**: Formulário de pagamento

---

### Passo 6: Ver Estatísticas
1. Volte para **"Produtos"**
2. No card do produto você verá:
   - Número de vendas
   - Total recebido
   - Link do checkout

---

### Passo 7: Gestão Financeira
1. Clique em **"Finanças"** no menu lateral
2. Visualize:
   - **Saldo Disponível**
   - **Saldo Pendente**
   - **Saldo Total**
3. Teste funcionalidades:
   - **Depositar**: Adicionar crédito
   - **Sacar**: Solicitar transferência
   - **Histórico**: Ver todas as transações

---

## 📁 ESTRUTURA DE ARQUIVOS

### Backend (15 arquivos)
```
backend/
├── config.php                    # Chave API Asaas
├── db.php                        # Conexão + JWT
├── asaas-api.php                 # Wrapper Asaas
├── login.php                     # Autenticação ✅
├── register.php                  # Cadastro ✅
├── products.php                  # CRUD Produtos ✅
├── payment-links.php             # Links de pagamento ✅
├── payments.php                  # Cobranças ✅
├── customers.php                 # Clientes ✅
├── balance.php                   # Saldo ✅
├── deposit.php                   # Depósitos ✅
├── withdraw.php                  # Saques ✅
├── transactions.php              # Histórico ✅
├── checkout-customization.php    # Personalização ✅ NOVO
├── webhook.php                   # Notificações ✅
└── schema.sql                    # Database
```

### Frontend (8 páginas)
```
src/pages/
├── Login/                        # Página de login ✅
├── Register/                     # Página de cadastro ✅
├── Dashboard/                    # Dashboard principal ✅
├── Products/                     # Gestão de produtos ✅
├── CheckoutCustomization/        # Personalizar checkout ✅ NOVO
├── Checkout/                     # Checkout público ✅
├── Finances/                     # Gestão financeira ✅
└── Support/                      # Suporte ✅
```

---

## 🔑 CONFIGURAR ASAAS API

### 1. Criar Conta Asaas
1. Acesse: https://sandbox.asaas.com
2. Crie uma conta gratuita
3. Faça login

### 2. Obter Chave API
1. Vá em **Configurações** > **Integrações** > **API**
2. Copie sua chave (começa com `$aact_...`)

### 3. Configurar no Sistema
Edite `backend/config.php`:
```php
define('ASAAS_API_KEY', 'SUA_CHAVE_AQUI');
define('ASAAS_API_URL', 'https://sandbox.asaas.com/api/v3');
```

---

## 🔔 CONFIGURAR WEBHOOK (Opcional)

### 1. Expor localhost com ngrok
```powershell
ngrok http 8000
```

Você receberá uma URL como: `https://abc123.ngrok.io`

### 2. Configurar no Painel Asaas
1. Acesse: https://sandbox.asaas.com
2. Vá em **Configurações** > **Webhooks**
3. Clique em **"Novo Webhook"**
4. Cole a URL: `https://abc123.ngrok.io/webhook.php`
5. Selecione eventos:
   - Pagamento recebido
   - Pagamento confirmado
   - Pagamento vencido
   - Pagamento reembolsado
   - Transferência finalizada

---

## ❌ TROUBLESHOOTING

### Erro "404 Not Found" no login
✅ **Solução**: Execute `php -S localhost:8000` **DENTRO** da pasta `backend`

### Erro CORS
✅ **Solução**: Os arquivos PHP já têm headers CORS configurados

### Erro "Cannot find module"
✅ **Solução**: Execute `npm install` na pasta do projeto

### Token inválido
✅ **Solução**: Faça logout e login novamente

### Webhook não funciona
✅ **Solução**: Use ngrok para expor localhost

---

## 📚 DOCUMENTAÇÃO

- `README_SETUP.md` - Instalação completa
- `ASAAS_CONFIG_GUIDE.md` - Configurar Asaas
- `WEBHOOK_CONFIG.md` - Configurar webhook
- `FUNCIONALIDADES.md` - Lista de features
- `INICIO_RAPIDO.md` - Quick start
- `SISTEMA_COMPLETO.md` - Checklist completo

---

## 🎉 PRONTO!

**Sistema 100% funcional com:**
- ✅ Login/Registro
- ✅ CRUD de Produtos
- ✅ Links de Pagamento
- ✅ Checkout Personalizado com 7 opções de customização
- ✅ PIX + Boleto + Cartão
- ✅ Gestão Financeira
- ✅ Webhook Asaas
- ✅ Saldo e Saques

---

**Acesse agora: http://localhost:5173** 🚀

**Login: zucro@zucro.com | Senha: zucro2025**
