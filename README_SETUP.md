# 💳 ZucroPay - Sistema de Pagamentos com Asaas API v3

Sistema completo de pagamentos integrado com a API do Asaas para gerenciamento de produtos, links de pagamento, depósitos, saques e cobranças.

## 🚀 Tecnologias

### Backend
- PHP 7.4+
- MySQL 5.7+
- Asaas API v3

### Frontend
- React 19
- TypeScript
- Material-UI
- Vite

## 📦 Instalação

### 1. Configurar Banco de Dados

```sql
-- Criar banco de dados
CREATE DATABASE zucropay CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Importar schema
mysql -u root -p zucropay < backend/schema.sql
```

### 2. Configurar Backend PHP

Edite o arquivo `backend/config.php` e insira sua chave da API do Asaas:

```php
define('ASAAS_API_KEY', 'SUA_CHAVE_AQUI');
```

**Como obter a chave:**
1. Acesse [Asaas](https://www.asaas.com/)
2. Crie uma conta (use modo Sandbox para testes)
3. Vá em Configurações > Integrações > API
4. Copie sua chave de API

**URLs da API:**
- Sandbox (testes): `https://sandbox.asaas.com/api/v3`
- Produção: `https://api.asaas.com/v3`

### 3. Iniciar Servidor PHP

**IMPORTANTE**: Execute o servidor PHP **DENTRO** da pasta backend:

```powershell
cd backend
php -S localhost:8000
```

O backend estará rodando em `http://localhost:8000`

**Nota**: NÃO use `cd c:\Users\Mourinha\Desktop\zucropay`, execute a partir da pasta backend para evitar erros 404.

### 4. Instalar Dependências do Frontend

```powershell
npm install
```

### 5. Configurar API URL do Frontend

Edite `src/services/api.ts` e verifique a URL da API:

```typescript
const API_BASE_URL = 'http://localhost:8000';
```

### 6. Iniciar Frontend

```powershell
npm run dev
```

O frontend estará rodando em `http://localhost:5173`

## 👤 Usuários de Teste

O schema cria automaticamente 3 usuários de teste:

**Zucro (Principal):**
- Email: `zucro@zucro.com`
- Senha: `zucro2025`
- Saldo: R$ 2.000,00

**Admin:**
- Email: `admin@zucropay.com`
- Senha: `123456`
- Saldo: R$ 1.000,00

**Usuário:**
- Email: `joao@example.com`
- Senha: `123456`
- Saldo: R$ 500,00

## 📚 Estrutura do Projeto

```
zucropay/
├── backend/
│   ├── asaas-api.php         # Wrapper da API Asaas
│   ├── balance.php            # Consultar saldo
│   ├── config.php             # Configurações
│   ├── customers.php          # CRUD de clientes
│   ├── db.php                 # Conexão DB + JWT
│   ├── deposit.php            # Realizar depósito
│   ├── login.php              # Autenticação
│   ├── payment-links.php      # Links de pagamento
│   ├── payments.php           # Criar cobranças
│   ├── products.php           # CRUD de produtos
│   ├── register.php           # Cadastro
│   ├── schema.sql             # Schema do banco
│   ├── transactions.php       # Histórico
│   └── withdraw.php           # Solicitar saque
├── src/
│   ├── pages/
│   │   ├── Checkout/          # Página de checkout
│   │   ├── Dashboard/         # Dashboard principal
│   │   ├── Finances/          # Gestão financeira
│   │   └── Products/          # Gestão de produtos
│   └── services/
│       └── api.ts             # Service layer
└── README_SETUP.md            # Este arquivo
```

## 🔥 Funcionalidades

### 💰 Financeiro
- ✅ Consultar saldo (disponível, pendente, total)
- ✅ Realizar depósitos
- ✅ Solicitar saques para conta bancária
- ✅ Histórico completo de transações
- ✅ Integração com Asaas API para transferências

### 🛍️ Produtos
- ✅ Criar produtos com nome, descrição, preço, imagem
- ✅ Editar produtos existentes
- ✅ Excluir produtos
- ✅ Controle de estoque
- ✅ Ativar/desativar produtos
- ✅ Gerar links de pagamento por produto
- ✅ Estatísticas de vendas por produto

### 🔗 Links de Pagamento
- ✅ Criar links de checkout personalizados
- ✅ Escolher método de pagamento (PIX, Boleto, Cartão, Todos)
- ✅ Copiar link para compartilhar
- ✅ Rastrear cliques e conversões
- ✅ Ver total recebido por link

### 💳 Checkout
- ✅ Página de checkout 100% personalizada
- ✅ Aceita PIX, Boleto e Cartão de Crédito
- ✅ QR Code PIX automático
- ✅ Boleto bancário via Asaas
- ✅ Design moderno e responsivo

### 👥 Clientes
- ✅ Cadastrar clientes no Asaas
- ✅ Listar clientes
- ✅ Excluir clientes
- ✅ Vincular clientes a cobranças

### 📄 Cobranças
- ✅ Criar cobranças para clientes
- ✅ Escolher vencimento
- ✅ Gerar PIX QR Code automático
- ✅ Gerar boleto bancário
- ✅ Processar cartão de crédito
- ✅ Rastrear status de pagamento

## 🔐 Autenticação

O sistema usa tokens JWT para autenticação:

1. Faça login via `/backend/login.php`
2. Receba um token JWT
3. Use o token no header `Authorization: Bearer TOKEN`
4. Token expira em 30 dias

## 🌐 Endpoints da API

### Autenticação
- `POST /backend/login.php` - Login
- `POST /backend/register.php` - Cadastro

### Financeiro
- `GET /backend/balance.php` - Consultar saldo
- `POST /backend/deposit.php` - Depositar
- `POST /backend/withdraw.php` - Sacar
- `GET /backend/transactions.php` - Listar transações

### Produtos
- `GET /backend/products.php` - Listar produtos
- `POST /backend/products.php` - Criar produto
- `PUT /backend/products.php` - Atualizar produto
- `DELETE /backend/products.php` - Excluir produto

### Links de Pagamento
- `GET /backend/payment-links.php` - Listar links
- `POST /backend/payment-links.php` - Criar link
- `DELETE /backend/payment-links.php` - Excluir link

### Clientes
- `GET /backend/customers.php` - Listar clientes
- `POST /backend/customers.php` - Criar cliente
- `DELETE /backend/customers.php` - Excluir cliente

### Pagamentos
- `GET /backend/payments.php` - Listar cobranças
- `POST /backend/payments.php` - Criar cobrança

## 📝 Exemplo de Uso

### 1. Criar um Produto

```typescript
import * as api from './services/api';

const produto = await api.createProduct({
  name: 'Curso de React',
  description: 'Curso completo de React do zero',
  price: 199.90,
  imageUrl: 'https://exemplo.com/imagem.jpg',
  stock: 100,
  active: true
});
```

### 2. Gerar Link de Pagamento

```typescript
const link = await api.createPaymentLink({
  productId: produto.id,
  name: 'Curso de React',
  amount: 199.90,
  billingType: 'UNDEFINED' // Aceita todos os métodos
});

console.log('Link de pagamento:', link.url);
```

### 3. Solicitar Saque

```typescript
await api.withdraw(500.00, {
  bank: '260', // Nubank
  agency: '0001',
  account: '123456',
  accountDigit: '7',
  cpfCnpj: '12345678901',
  name: 'João Silva'
});
```

## 🔧 Troubleshooting

### Erro de CORS
Adicione no `.htaccess` ou configure o Apache/Nginx para permitir CORS.

### Erro "DB connection failed"
Verifique as credenciais em `backend/db.php`.

### Erro na API do Asaas
- Verifique se a chave está correta em `backend/config.php`
- Confirme se está usando a URL correta (sandbox vs produção)
- Veja os logs de erro do PHP

### Token inválido
O token expira em 30 dias. Faça login novamente.

## 📞 Suporte

Para dúvidas sobre a API do Asaas:
- Documentação: https://docs.asaas.com/
- Suporte: suporte@asaas.com

## 🎉 Pronto!

Seu sistema ZucroPay está configurado e pronto para uso! 🚀

Acesse `http://localhost:5173` e faça login com os usuários de teste.
