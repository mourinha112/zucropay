# 🔄 Atualização das Páginas para Supabase

## 📝 Lista de Arquivos a Atualizar

Para migrar completamente para Supabase, você precisa atualizar a importação do serviço de API em todas as páginas que usam o backend.

## 🔧 Mudança Necessária

**ANTES (Backend PHP):**
```typescript
import * as api from '../services/api';
```

**DEPOIS (Supabase):**
```typescript
import * as api from '../services/api-supabase';
```

## 📂 Arquivos que Precisam ser Atualizados

### 1. Autenticação

#### `src/pages/Login/Login.tsx`
- **Linha aprox**: 3-10
- **Importação**: `import * as api from ...`
- **Funções usadas**: `api.login()`

#### `src/pages/Register/Register.tsx`
- **Linha aprox**: 3-10
- **Importação**: `import * as api from ...`
- **Funções usadas**: `api.register()`

### 2. Dashboard e Visualizações

#### `src/pages/Dashboard/Dashboard.tsx`
- **Linha aprox**: 3-10
- **Importação**: `import * as api from ...`
- **Funções usadas**: 
  - `api.getBalance()`
  - `api.getTransactions()`
  - `api.getProducts()`
  - `api.getPayments()`

### 3. Produtos

#### `src/pages/Products/Products.tsx`
- **Linha aprox**: 3-10
- **Importação**: `import * as api from ...`
- **Funções usadas**: 
  - `api.getProducts()`
  - `api.createProduct()`
  - `api.updateProduct()`
  - `api.deleteProduct()`
  - `api.uploadImage()`

### 4. Vendas

#### `src/pages/Vendas/Vendas.tsx`
- **Linha aprox**: 3-10
- **Importação**: `import * as api from ...`
- **Funções usadas**: 
  - `api.getPayments()`
  - `api.getTransactions()`

### 5. Finanças

#### `src/pages/Finances/Finances.tsx` ou `FinancesOld.tsx`
- **Linha aprox**: 3-10
- **Importação**: `import * as api from ...`
- **Funções usadas**: 
  - `api.getBalance()`
  - `api.getTransactions()`
  - `api.deposit()`
  - `api.withdraw()`

### 6. Marketplace

#### `src/pages/Marketplace/Marketplace.tsx`
- **Linha aprox**: 3-10
- **Importação**: `import * as api from ...`
- **Funções usadas**: 
  - `api.getMarketplaceProducts()`
  - `api.getMyAffiliates()`
  - `api.affiliateToProduct()`
  - `api.cancelAffiliation()`
  - `api.toggleProductMarketplace()`

### 7. Integrações

#### `src/pages/Integrations/Integrations.tsx`
- **Linha aprox**: 3-10
- **Importação**: `import * as api from ...`
- **Funções usadas**: 
  - `api.getPaymentLinks()`
  - `api.createPaymentLink()`
  - `api.deletePaymentLink()`

### 8. Personalização de Checkout

#### `src/pages/CheckoutCustomization/CheckoutCustomization.tsx`
- **Linha aprox**: 3-10
- **Importação**: `import * as api from ...`
- **Funções usadas**: 
  - `api.getCheckoutCustomization()`
  - `api.saveCheckoutCustomization()`
  - `api.uploadImage()`

### 9. Checkout Público

#### `src/pages/CheckoutPublico/CheckoutPublico.tsx`
- **Linha aprox**: 3-10
- **Importação**: `import * as api from ...`
- **Funções usadas**: 
  - `api.getPublicPaymentLink()`
  - `api.createPublicPayment()`

#### `src/pages/Checkout/Checkout.tsx`
- **Linha aprox**: 3-10
- **Importação**: `import * as api from ...`
- **Funções usadas**: Similares ao CheckoutPublico

### 10. Configurações

#### `src/pages/Settings/Settings.tsx`
- **Linha aprox**: 3-10
- **Importação**: `import * as api from ...`
- **Funções usadas**: 
  - `api.getCurrentUser()`
  - `api.uploadImage()`

### 11. Webhooks

#### `src/pages/WebhooksConfig/WebhooksConfig.tsx`
- **Linha aprox**: 3-10
- **Importação**: `import * as api from ...`
- **Funções usadas**: Funções específicas de webhooks (podem precisar ser adaptadas)

### 12. API Docs

#### `src/pages/ApiDocs/ApiDocs.tsx`
- **Linha aprox**: 3-10
- **Importação**: `import * as api from ...`
- **Uso**: Geralmente apenas para documentação, pode não precisar atualizar

### 13. Componentes

#### `src/components/Header/Header.tsx`
- **Linha aprox**: 3-10
- **Importação**: Pode ter lógica de logout
- **Funções usadas**: 
  - `api.logout()`
  - `api.getCurrentUser()`

## 🤖 Script Automatizado de Atualização

Você pode usar este comando para atualizar automaticamente:

### Linux/Mac:
```bash
find src/pages -name "*.tsx" -type f -exec sed -i "s|from '../services/api'|from '../services/api-supabase'|g" {} \;
find src/pages -name "*.tsx" -type f -exec sed -i "s|from '../../services/api'|from '../../services/api-supabase'|g" {} \;
find src/components -name "*.tsx" -type f -exec sed -i "s|from '../services/api'|from '../services/api-supabase'|g" {} \;
```

### Windows (PowerShell):
```powershell
Get-ChildItem -Path "src\pages" -Filter "*.tsx" -Recurse | ForEach-Object {
    (Get-Content $_.FullName) -replace "from '../services/api'", "from '../services/api-supabase'" | Set-Content $_.FullName
}

Get-ChildItem -Path "src\pages" -Filter "*.tsx" -Recurse | ForEach-Object {
    (Get-Content $_.FullName) -replace "from '../../services/api'", "from '../../services/api-supabase'" | Set-Content $_.FullName
}

Get-ChildItem -Path "src\components" -Filter "*.tsx" -Recurse | ForEach-Object {
    (Get-Content $_.FullName) -replace "from '../services/api'", "from '../services/api-supabase'" | Set-Content $_.FullName
}
```

## ⚠️ Atenções Especiais

### 1. CheckoutPublico (Pagamento Sem Autenticação)

O `CheckoutPublico` usa endpoints públicos. Você pode precisar criar uma Edge Function específica:

```typescript
// supabase/functions/public-payment/index.ts
// Edge Function para processar pagamentos públicos
```

### 2. Upload de Imagens

No Supabase, o upload usa o Storage:

```typescript
// ANTES (PHP)
const response = await fetch(`${API_URL}/upload-image.php`, {
  method: 'POST',
  body: formData,
});

// DEPOIS (Supabase)
import { uploadFile } from '../config/supabase';
const result = await uploadFile('images', fileName, file);
```

### 3. Webhooks Config

Se você tem uma página de configuração de webhooks do usuário, pode precisar adaptar para usar a tabela `webhooks`:

```typescript
// Criar webhook do usuário
await supabase
  .from('webhooks')
  .insert({
    url: webhookUrl,
    secret: webhookSecret,
    events: ['PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED'],
  });
```

## 🧪 Teste Após Atualização

Para cada página atualizada, teste:

1. **Carregar a página**
   - [ ] Sem erros no console
   - [ ] Dados carregam corretamente

2. **Criar/Editar**
   - [ ] Formulários funcionam
   - [ ] Validações corretas
   - [ ] Dados salvam no Supabase

3. **Deletar**
   - [ ] Confirmação aparece
   - [ ] Dados são removidos

4. **Upload**
   - [ ] Imagens fazem upload
   - [ ] URL pública funciona
   - [ ] Preview aparece

## 🔍 Verificação de Erros Comuns

### Erro: "Cannot find module '../services/api-supabase'"
```bash
# Certifique-se de que o arquivo existe
ls src/services/api-supabase.ts
```

### Erro: "Property 'X' does not exist on type"
```typescript
// Verifique se a função existe no api-supabase.ts
// Se não existe, você pode precisar implementá-la
```

### Erro: "Invalid token" ou "Unauthorized"
```typescript
// Verifique se o usuário está logado
const session = await supabase.auth.getSession();
console.log('Session:', session);
```

### Erro: "Row Level Security Policy violation"
```sql
-- Verifique as policies no Supabase Dashboard
-- SQL Editor > Execute:
SELECT * FROM pg_policies WHERE tablename = 'products';
```

## 📊 Progresso de Atualização

Use esta checklist para acompanhar o progresso:

- [ ] Login.tsx
- [ ] Register.tsx
- [ ] Dashboard.tsx
- [ ] Products.tsx
- [ ] Vendas.tsx
- [ ] Finances.tsx
- [ ] Marketplace.tsx
- [ ] Integrations.tsx
- [ ] CheckoutCustomization.tsx
- [ ] CheckoutPublico.tsx
- [ ] Checkout.tsx
- [ ] Settings.tsx
- [ ] WebhooksConfig.tsx
- [ ] ApiDocs.tsx
- [ ] Header.tsx

## 🎯 Resultado Esperado

Após atualizar todos os arquivos:

✅ Sistema completamente funcional com Supabase
✅ Backend PHP não é mais necessário
✅ Todas as páginas carregam corretamente
✅ CRUD funciona em todas as entidades
✅ Autenticação via Supabase Auth
✅ Upload via Supabase Storage
✅ Webhooks processados por Edge Functions

## 🚀 Deploy

Após testar localmente:

1. Build do frontend:
```bash
npm run build
```

2. Deploy no Vercel/Netlify:
```bash
# Vercel
vercel --prod

# Ou Netlify
netlify deploy --prod
```

3. Configurar variáveis de ambiente no host:
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_ASAAS_API_KEY=...
```

## ✅ Conclusão

Com todas as páginas atualizadas, seu sistema estará 100% migrado para Supabase! 🎉

**Benefícios imediatos:**
- 🚀 Mais rápido (Edge Functions globais)
- 🔐 Mais seguro (RLS + Auth gerenciado)
- 💰 Mais barato (Serverless)
- 📈 Mais escalável (Auto-scaling)
- 🛠️ Menos manutenção (Managed)

