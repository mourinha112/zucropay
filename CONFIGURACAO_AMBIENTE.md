# ⚙️ Configuração Central de Ambiente - ZucroPay

## 🎯 O Que É?

Um sistema centralizado para gerenciar URLs e configurações do ambiente (localhost, ngrok, VPS) em um único lugar. Não precisa mais editar arquivos de código para mudar entre ambientes!

## ✨ Recursos

- ✅ **Interface Visual**: Configure tudo pela UI, sem tocar em código
- ✅ **3 Modos Pré-Configurados**: Localhost, Ngrok e VPS
- ✅ **URLs Customizadas**: Configure URLs personalizadas para qualquer ambiente
- ✅ **Automático**: Headers especiais (como ngrok-skip-browser-warning) são adicionados automaticamente
- ✅ **Persistente**: Configurações salvas no localStorage do navegador
- ✅ **Hot Reload**: Mudanças aplicam instantaneamente, sem precisar reiniciar

## 📋 Como Usar

### 1. Acessar Configurações

1. Faça login no sistema
2. Clique em **Configurações** no menu lateral (ícone de engrenagem)
3. Você verá a página de configurações

### 2. Escolher Modo de Operação

#### 🖥️ Localhost (Padrão)
**Quando usar:** Desenvolvimento local no seu computador

**Como ativar:**
- Clique no card **Localhost**
- URLs configuradas automaticamente:
  - Backend: `http://localhost:8000`
  - Frontend: `http://localhost:5173`

**Ideal para:**
- Desenvolvimento diário
- Testes rápidos
- Debug de problemas

---

#### ☁️ Ngrok
**Quando usar:** Demonstrações para clientes, testes externos, acesso remoto

**Como ativar:**
1. **Inicie os túneis ngrok:**
   ```powershell
   # Terminal 1 - Backend
   cd C:\Users\Mourinha\Desktop\zucropay\backend
   ngrok http 8000
   # Copie a URL gerada (ex: https://abc123.ngrok-free.app)
   
   # Terminal 2 - Frontend
   ngrok http 5173
   # Copie a URL gerada (ex: https://xyz789.ngrok-free.app)
   ```

2. **Configure no sistema:**
   - Clique no card **Ngrok**
   - Clique em **Editar URLs**
   - Cole as URLs dos túneis ngrok
   - Clique em **Salvar URLs Customizadas**

**O que acontece automaticamente:**
- ✅ Header `ngrok-skip-browser-warning: 69420` adicionado em todas as requisições
- ✅ Headers CORS configurados automaticamente
- ✅ Todas as chamadas de API usam as URLs do ngrok

**Ideal para:**
- Apresentações para clientes
- Testes em dispositivos móveis
- Acesso remoto temporário

---

#### 🌐 VPS / Servidor
**Quando usar:** Produção, ambiente estável, domínio próprio

**Como ativar:**
1. Clique no card **VPS**
2. Clique em **Editar URLs**
3. Configure suas URLs:
   - Backend: `http://seu-ip:8000` ou `https://api.seudominio.com`
   - Frontend: `http://seu-ip` ou `https://seudominio.com`
4. Clique em **Salvar URLs Customizadas**

**Ideal para:**
- Ambiente de produção
- Acesso permanente
- Domínio próprio

### 3. URLs Customizadas

Para qualquer outro cenário (ngrok customizado, IP diferente, porta diferente):

1. Clique em **Editar URLs**
2. Preencha:
   - **URL do Backend**: Onde o PHP está rodando
   - **URL do Frontend**: Onde o React está acessível
3. Clique em **Salvar URLs Customizadas**

**Exemplos:**
```
Backend: http://192.168.1.100:8000
Frontend: http://192.168.1.100:5173

Backend: https://custom-url.ngrok-free.app
Frontend: https://another-url.ngrok-free.app

Backend: https://api.meusite.com.br
Frontend: https://meusite.com.br
```

### 4. Resetar Configurações

Se algo der errado ou quiser voltar ao padrão:

1. Clique em **Resetar para Padrão (Localhost)**
2. Sistema volta para desenvolvimento local

## 🔧 Como Funciona Internamente

### Arquitetura

```
┌─────────────────────────────────────────┐
│  Página de Configurações (UI)           │
│  /configuracoes                         │
│  - Escolhe modo                         │
│  - Define URLs customizadas             │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  Config Central (src/config/config.ts)  │
│  - Gerencia configurações               │
│  - Salva no localStorage                │
│  - Retorna URLs e headers               │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  API Service (src/services/api.ts)      │
│  - Lê configuração atual                │
│  - Usa URLs dinâmicas                   │
│  - Adiciona headers automaticamente     │
└─────────────────────────────────────────┘
```

### Fluxo de Requisição

```
1. Componente chama api.getProducts()
   ↓
2. api.ts chama getBackendUrl()
   ↓
3. config.ts lê do localStorage
   ↓
4. Retorna URL configurada (ex: https://abc.ngrok-free.app)
   ↓
5. api.ts monta URL completa: https://abc.ngrok-free.app/products.php
   ↓
6. api.ts chama getRequiredHeaders()
   ↓
7. config.ts verifica se é ngrok
   ↓
8. Se ngrok: adiciona header 'ngrok-skip-browser-warning': '69420'
   ↓
9. Faz a requisição com URL e headers corretos
```

## 📁 Arquivos Modificados/Criados

### ✅ Novos Arquivos

1. **`src/config/config.ts`** (140 linhas)
   - Gerenciamento central de configurações
   - Tipos TypeScript para configurações
   - Funções para ler/salvar/atualizar
   - Detecção automática de modo (localhost, ngrok, vps)
   - Geração automática de headers

2. **`src/pages/Settings/Settings.tsx`** (360 linhas)
   - Interface visual de configuração
   - Cards clicáveis para cada modo
   - Formulário para URLs customizadas
   - Indicadores visuais do modo ativo
   - Botões para copiar URLs

3. **`CONFIGURACAO_AMBIENTE.md`** (este arquivo)
   - Documentação completa
   - Guias de uso
   - Exemplos práticos

### ✏️ Arquivos Modificados

1. **`src/services/api.ts`**
   - ❌ Removido: `const API_BASE_URL = 'https://...'` (hardcoded)
   - ✅ Adicionado: `import { getBackendUrl, getRequiredHeaders }`
   - ✅ Adicionado: `const getApiBaseUrl = () => getBackendUrl()`
   - ✅ Modificado: Todas as funções agora usam URL dinâmica
   - ✅ Modificado: Headers gerados dinamicamente

2. **`src/App.tsx`**
   - ✅ Adicionado: `import Settings from './pages/Settings/Settings'`
   - ✅ Adicionado: `<Route path="/configuracoes" element={...} />`

3. **`src/components/Layout/Sidebar.tsx`**
   - ✅ Modificado: Menu item "Suporte" → "Configurações"
   - ✅ Modificado: Path `/suporte` → `/configuracoes`

## 🎬 Tutorial Passo a Passo

### Cenário 1: Desenvolvendo Localmente

```bash
# 1. Inicie o backend
cd C:\Users\Mourinha\Desktop\zucropay\backend
php -S localhost:8000 router.php

# 2. Inicie o frontend (outro terminal)
cd C:\Users\Mourinha\Desktop\zucropay
npm run dev

# 3. Acesse o sistema
# http://localhost:5173

# 4. Faça login

# 5. Vá em Configurações
# - Clique em "Localhost" (já deve estar ativo)
# - Pronto! Sistema configurado
```

### Cenário 2: Testando com Cliente via Ngrok

```bash
# 1. Backend rodando localmente
cd C:\Users\Mourinha\Desktop\zucropay\backend
php -S localhost:8000 router.php

# 2. Frontend rodando localmente (outro terminal)
cd C:\Users\Mourinha\Desktop\zucropay
npm run dev

# 3. Inicie túnel ngrok do BACKEND (outro terminal)
ngrok http 8000
# Copie a URL: https://abc123.ngrok-free.app

# 4. Inicie túnel ngrok do FRONTEND (outro terminal)
ngrok http 5173
# Copie a URL: https://xyz789.ngrok-free.app

# 5. No navegador, acesse a URL do FRONTEND ngrok
# https://xyz789.ngrok-free.app

# 6. Faça login

# 7. Vá em Configurações
# - Clique em "Ngrok"
# - Clique em "Editar URLs"
# - Backend: cole https://abc123.ngrok-free.app
# - Frontend: cole https://xyz789.ngrok-free.app
# - Clique em "Salvar URLs Customizadas"

# 8. Compartilhe a URL do frontend com o cliente
# https://xyz789.ngrok-free.app
```

### Cenário 3: Deploy em VPS

```bash
# 1. No servidor VPS, instale dependências
sudo apt update
sudo apt install php mysql-server nginx

# 2. Configure o backend
cd /var/www/zucropay/backend
php -S 0.0.0.0:8000 router.php &

# 3. Configure o frontend (build)
cd /var/www/zucropay
npm run build
# Configure nginx para servir a pasta dist

# 4. Acesse via IP ou domínio
# http://seu-ip-vps

# 5. Faça login

# 6. Vá em Configurações
# - Clique em "VPS"
# - Clique em "Editar URLs"
# - Backend: http://seu-ip-vps:8000
# - Frontend: http://seu-ip-vps
# - Clique em "Salvar URLs Customizadas"

# 7. Sistema configurado para produção
```

## 🐛 Troubleshooting

### Problema: "Produto não encontrado" no checkout

**Causa:** Backend URL incorreta ou ngrok headers faltando

**Solução:**
1. Vá em Configurações
2. Verifique a URL do Backend
3. Se usar ngrok, certifique-se que está no modo "Ngrok"
4. Teste a URL do backend no navegador:
   ```
   https://sua-url-backend/products.php
   ```
5. Se retornar JSON, está correto

---

### Problema: CORS error

**Causa:** Backend não está enviando headers CORS corretos

**Solução:**
1. Certifique-se que `router.php` tem os headers CORS no topo
2. Reinicie o backend:
   ```powershell
   cd C:\Users\Mourinha\Desktop\zucropay\backend
   php -S localhost:8000 router.php
   ```
3. Limpe o cache do navegador (Ctrl+Shift+Delete)

---

### Problema: Ngrok mostra página de aviso

**Causa:** Headers especiais não estão sendo enviados

**Solução:**
1. Vá em Configurações
2. Certifique-se que o modo "Ngrok" está ativo
3. O sistema adiciona automaticamente o header `ngrok-skip-browser-warning`
4. Se persistir, abra Console do navegador (F12) e verifique os headers da requisição

---

### Problema: Mudei a configuração mas continua usando a antiga

**Causa:** Cache do navegador

**Solução:**
1. Recarregue a página (Ctrl+R)
2. Ou force reload (Ctrl+Shift+R)
3. Ou limpe o cache (Ctrl+Shift+Delete)
4. Ou abra uma aba anônima

---

### Problema: Túneis ngrok sempre mudam

**Causa:** Ngrok free gera URLs novas a cada reinício

**Solução:**
1. Sempre que reiniciar ngrok, copie as novas URLs
2. Vá em Configurações → Editar URLs
3. Atualize as URLs
4. Ou considere assinar o plano pago do ngrok (URLs fixas)

---

### Problema: VPS não acessa backend

**Causa:** Firewall bloqueando porta 8000

**Solução:**
```bash
# No servidor VPS
sudo ufw allow 8000/tcp
sudo ufw reload
```

---

### Problema: "Resposta inválida do servidor"

**Causa:** Backend retornando HTML ao invés de JSON

**Solução:**
1. Abra Console do navegador (F12)
2. Veja a mensagem de erro completa
3. Verifique se o backend está rodando:
   ```powershell
   curl http://localhost:8000/products.php
   ```
4. Se retornar HTML, o PHP tem erro. Verifique os logs.

## 🔒 Segurança

### Desenvolvimento (Localhost)
```typescript
// Headers enviados:
{
  'Content-Type': 'application/json',
  'Authorization': 'Bearer seu-token'
}
```

### Ngrok (Testes Externos)
```typescript
// Headers enviados:
{
  'Content-Type': 'application/json',
  'Authorization': 'Bearer seu-token',
  'ngrok-skip-browser-warning': '69420' // ← Adicionado automaticamente
}
```

### Produção (VPS)
```typescript
// Headers enviados:
{
  'Content-Type': 'application/json',
  'Authorization': 'Bearer seu-token'
}

// Backend deve ter CORS restrito:
header('Access-Control-Allow-Origin: https://seu-dominio.com'); // Não usar *
```

## 📊 Vantagens do Sistema

### Antes (Hardcoded)
```typescript
// api.ts
const API_BASE_URL = 'https://abc.ngrok-free.app'; // ❌ Hardcoded

// Para mudar de ambiente:
// 1. Editar api.ts
// 2. Mudar URL manualmente
// 3. Lembrar de adicionar headers ngrok
// 4. Reiniciar dev server
// 5. Commitar mudanças (RUIM!)
```

### Depois (Configuração Central)
```typescript
// api.ts
const API_BASE_URL = getBackendUrl(); // ✅ Dinâmico

// Para mudar de ambiente:
// 1. Clicar em Configurações
// 2. Escolher modo (Localhost, Ngrok, VPS)
// 3. Pronto! Muda instantaneamente
// 4. Não precisa reiniciar nada
// 5. Não precisa commitar nada
```

### Benefícios
- ✅ Sem editar código
- ✅ Sem commits desnecessários
- ✅ Sem conflitos de merge
- ✅ Mudança instantânea
- ✅ Interface visual
- ✅ Headers automáticos
- ✅ Validação de erros
- ✅ Fácil para não-desenvolvedores

## 🎓 Entendendo a Estrutura

```typescript
// config.ts - Configuração Central
export interface SystemConfig {
  mode: 'localhost' | 'ngrok' | 'vps';    // Modo atual
  backendUrl: string;                      // URL do backend
  frontendUrl: string;                     // URL do frontend
  description: string;                     // Descrição
}

// Salvo no localStorage como:
{
  "zucropay_system_config": {
    "mode": "ngrok",
    "backendUrl": "https://abc.ngrok-free.app",
    "frontendUrl": "https://xyz.ngrok-free.app",
    "description": "Ngrok Tunnels..."
  }
}

// Funções principais:
getSystemConfig()           // Ler configuração atual
setSystemConfig(config)     // Salvar configuração
changeEnvironmentMode(mode) // Mudar modo (localhost/ngrok/vps)
updateCustomUrls(back, front) // URLs customizadas
getBackendUrl()            // URL do backend configurada
getRequiredHeaders()       // Headers baseados no modo
isUsingNgrok()            // true se modo ngrok
resetToDefault()          // Volta para localhost
```

## 📖 Referências

- **Configuração Central**: `src/config/config.ts`
- **Página de Configurações**: `src/pages/Settings/Settings.tsx`
- **API Service**: `src/services/api.ts`
- **Roteamento**: `src/App.tsx`
- **Menu Lateral**: `src/components/Layout/Sidebar.tsx`

## 🚀 Próximos Passos

1. **Teste o sistema em modo localhost**
2. **Teste com ngrok para um colega/cliente**
3. **Configure para produção quando necessário**
4. **Documente suas URLs de produção**
5. **Considere usar variáveis de ambiente no backend também**

## 💡 Dicas Finais

- 📌 Sempre mantenha os túneis ngrok rodando enquanto estiver testando
- 📌 Copie as URLs ngrok assim que iniciar os túneis
- 📌 Configure o modo correto ANTES de compartilhar com clientes
- 📌 Use localhost para desenvolvimento diário
- 📌 Use ngrok para demonstrações temporárias
- 📌 Use VPS para produção permanente
- 📌 Resetar para padrão resolve 90% dos problemas de configuração

---

**Sistema de Configuração Central ZucroPay v1.0**
*Facilitando o gerenciamento de ambientes desde 2025* 🚀
