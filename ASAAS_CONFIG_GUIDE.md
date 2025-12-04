# 🔑 Como Configurar a API do Asaas

## Passo 1: Criar Conta no Asaas

1. Acesse: https://www.asaas.com/
2. Clique em "Criar conta grátis"
3. Preencha seus dados
4. Confirme seu email

## Passo 2: Ativar Modo Sandbox (Para Testes)

⚠️ **IMPORTANTE**: Use o modo Sandbox para testes. Não use dados reais!

1. Faça login na sua conta Asaas
2. No menu superior, você verá um toggle "PRODUÇÃO / SANDBOX"
3. Ative o modo **SANDBOX**

## Passo 3: Obter sua Chave de API

### No Modo Sandbox:

1. Clique no seu **nome** no canto superior direito
2. Vá em **Configurações**
3. No menu lateral, clique em **Integrações**
4. Clique em **API**
5. Você verá sua chave de API. Ela começa com `$aact_`
6. Clique no ícone de copiar 📋

Exemplo de chave:
```
$aact_YTU5YTE0M2M2N2I4MTliNzk0YTI5N2U5MzdjNWZmNDQ6OjAwMDAwMDAwMDAwMDAwNzgxODA6OiRhYWNoXzY1NWNjNTVlLTc1YjUtNDUxZC04MjcxLTkxYjljY2IzOTQ2Zg==
```

## Passo 4: Configurar no Projeto

Abra o arquivo `backend/config.php` e cole sua chave:

```php
<?php
// Asaas API Configuration for ZucroPay

// IMPORTANTE: Troque pela sua chave de API do Asaas
// Sandbox: use a chave de teste do Asaas
// Produção: use a chave de produção
define('ASAAS_API_KEY', '$aact_SUA_CHAVE_AQUI');

// URL da API do Asaas
// Sandbox: https://sandbox.asaas.com/api/v3
// Produção: https://api.asaas.com/v3
define('ASAAS_API_URL', 'https://sandbox.asaas.com/api/v3');

// Headers padrão para requisições ao Asaas
function get_asaas_headers() {
    return [
        'Content-Type: application/json',
        'access_token: ' . ASAAS_API_KEY
    ];
}
?>
```

## Passo 5: Verificar se Está Funcionando

### Teste via Terminal:

```powershell
# Windows PowerShell
cd backend
php -r "require 'config.php'; require 'asaas-api.php'; \$r = asaas_get_balance(); print_r(\$r);"
```

### Resposta Esperada:

```
Array
(
    [code] => 200
    [data] => Array
        (
            [balance] => 0
            [pendingBalance] => 0
        )
)
```

Se você ver isso, está tudo certo! ✅

## 🔄 Sandbox vs Produção

### Modo Sandbox (Testes)
- ✅ Grátis e ilimitado
- ✅ Não processa pagamentos reais
- ✅ Perfeito para desenvolvimento
- ✅ URL: `https://sandbox.asaas.com/api/v3`
- ⚠️ Chave começa com `$aact_` (sandbox)

### Modo Produção (Real)
- 💰 Cobra taxas reais
- 💳 Processa pagamentos reais
- 🔐 Requer validação da conta
- 🏦 Requer conta bancária vinculada
- ✅ URL: `https://api.asaas.com/v3`
- 🔑 Chave de produção diferente

## 🚨 Dicas de Segurança

### ❌ NÃO FAÇA:
- Não commite a chave no Git
- Não exponha a chave no frontend
- Não compartilhe a chave publicamente
- Não use a mesma chave em múltiplos projetos

### ✅ FAÇA:
- Use variáveis de ambiente
- Mantenha a chave no backend apenas
- Use `.gitignore` para `config.php`
- Gere chaves diferentes para cada projeto
- Revogue chaves antigas quando não usar mais

## 📚 Documentação Oficial

- **Docs Asaas**: https://docs.asaas.com/
- **API Reference**: https://asaasv3.docs.apiary.io/
- **Suporte**: suporte@asaas.com
- **WhatsApp**: (47) 3319-1055

## 🎯 Próximos Passos

Depois de configurar a chave:

1. ✅ Execute o schema SQL para criar o banco
2. ✅ Inicie o servidor PHP (`php -S localhost:8000`)
3. ✅ Inicie o frontend (`npm run dev`)
4. ✅ Faça login com os usuários de teste
5. ✅ Teste criar produtos e links de pagamento

## 💡 Testando Pagamentos no Sandbox

No modo Sandbox, você pode usar dados fictícios:

### CPF para teste:
- `123.456.789-01` (válido)
- `111.111.111-11` (válido)

### Cartão de teste:
- Número: `5162306219378829`
- Validade: `12/2028`
- CVV: `318`

### Para PIX:
O QR Code será gerado, mas não precisa pagar de verdade no Sandbox.

## ❓ Problemas Comuns

### Erro: "Invalid API Key"
- Verifique se copiou a chave completa
- Certifique-se de estar no modo correto (Sandbox/Produção)
- A chave está entre aspas no PHP?

### Erro: "Unauthorized"
- Sua chave pode ter sido revogada
- Gere uma nova chave no painel Asaas

### Erro: "Connection refused"
- Verifique sua conexão com a internet
- Confirme a URL da API (sandbox vs produção)

## 🎉 Tudo Pronto!

Se seguiu todos os passos, seu sistema está configurado e pronto para uso! 

Qualquer dúvida, consulte a documentação oficial ou entre em contato com o suporte do Asaas.

**Boa sorte com seu projeto ZucroPay! 🚀**
