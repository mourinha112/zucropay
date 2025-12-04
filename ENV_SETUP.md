# Configuração de Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:

```env
# ============================================
# ZUCROPAY - VARIÁVEIS DE AMBIENTE
# ============================================

# ============================================
# SUPABASE
# ============================================
# URL do seu projeto Supabase (encontre em: Settings > API)
VITE_SUPABASE_URL=https://your-project.supabase.co

# Chave anônima pública do Supabase (encontre em: Settings > API)
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# URL das Edge Functions (geralmente é a URL do Supabase + /functions/v1)
VITE_EDGE_FUNCTIONS_URL=https://your-project.supabase.co/functions/v1

# ============================================
# ASAAS PAYMENT GATEWAY
# ============================================
# Chave de API do Asaas
# Sandbox: https://sandbox.asaas.com/myAccount/apiKey
# Produção: https://www.asaas.com/myAccount/apiKey
VITE_ASAAS_API_KEY=your-asaas-api-key

# URL da API do Asaas
# Sandbox: https://sandbox.asaas.com/api/v3
# Produção: https://api.asaas.com/v3
VITE_ASAAS_API_URL=https://api.asaas.com/v3

# ============================================
# CONFIGURAÇÕES GERAIS
# ============================================
# Nome da aplicação
VITE_APP_NAME=ZucroPay

# Ambiente (development, staging, production)
VITE_ENVIRONMENT=development

# URL do frontend (para redirecionamentos)
VITE_FRONTEND_URL=http://localhost:5173

# ============================================
# STORAGE (Supabase Storage)
# ============================================
# Nome do bucket para uploads de imagens
VITE_STORAGE_BUCKET=images

# Tamanho máximo de upload em MB
VITE_MAX_UPLOAD_SIZE=5
```

## Variáveis de Ambiente do Supabase Edge Functions

Para as Edge Functions, configure as variáveis no Supabase Dashboard:

```bash
# Via CLI
supabase secrets set ASAAS_API_KEY=your-asaas-api-key
supabase secrets set ASAAS_API_URL=https://api.asaas.com/v3
```

Ou via Dashboard: Settings > Edge Functions > Secrets

