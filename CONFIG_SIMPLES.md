# 🔧 Configuração Rápida do Sistema

## 📍 Como Configurar

Abra o arquivo: **`src/config/config.ts`**

### 1️⃣ Escolha o Modo Ativo

Descomente apenas UMA linha:

```typescript
// 👉 ESCOLHA O MODO ATIVO (descomente apenas 1 linha):
// const ACTIVE_MODE = 'localhost';  // Desenvolvimento local
const ACTIVE_MODE = 'ngrok';      // ← Ngrok ativo
// const ACTIVE_MODE = 'vps';        // Produção
```

### 2️⃣ Configure as URLs

Edite as URLs do modo que você vai usar:

```typescript
const CONFIGS = {
  // 🖥️ LOCALHOST - Desenvolvimento Local
  localhost: {
    backendUrl: 'http://localhost:8000',
    frontendUrl: 'http://localhost:5173',
  },

  // ☁️ NGROK - Testes Externos
  ngrok: {
    backendUrl: 'https://abc123.ngrok-free.app',  // ← Cole sua URL aqui
    frontendUrl: 'https://xyz789.ngrok-free.app', // ← Cole sua URL aqui
  },

  // 🌐 VPS - Produção
  vps: {
    backendUrl: 'http://192.168.1.100:8000',  // ← Cole seu IP/domínio
    frontendUrl: 'http://192.168.1.100',      // ← Cole seu IP/domínio
  },
};
```

### 3️⃣ Salve o Arquivo

- Salve com `Ctrl+S`
- O Vite detecta automaticamente e recarrega
- **Pronto!** Sistema já está usando a nova configuração

## 🎯 Cenários de Uso

### Desenvolvimento Local (Dia a Dia)
```typescript
const ACTIVE_MODE = 'localhost';  // ← Descomente esta

// Não precisa mudar as URLs, já estão corretas:
localhost: {
  backendUrl: 'http://localhost:8000',
  frontendUrl: 'http://localhost:5173',
}
```

### Demonstração para Cliente (Ngrok)
```bash
# 1. Inicie os túneis
ngrok http 8000  # Backend
ngrok http 5173  # Frontend
# Copie as URLs geradas
```

```typescript
const ACTIVE_MODE = 'ngrok';  // ← Descomente esta

ngrok: {
  backendUrl: 'https://abc123.ngrok-free.app',  // ← Cole a URL do backend
  frontendUrl: 'https://xyz789.ngrok-free.app', // ← Cole a URL do frontend
}
```

### Produção (VPS/Servidor)
```typescript
const ACTIVE_MODE = 'vps';  // ← Descomente esta

vps: {
  backendUrl: 'http://123.456.789.0:8000',  // ← Seu IP/domínio
  frontendUrl: 'http://123.456.789.0',      // ← Seu IP/domínio
}
```

## ✨ O Que Acontece Automaticamente

- ✅ Todas as requisições usam a URL configurada
- ✅ Se modo = 'ngrok': adiciona header `ngrok-skip-browser-warning` automaticamente
- ✅ Sem necessidade de editar `api.ts` ou outros arquivos
- ✅ Sem necessidade de passar pelo login
- ✅ Hot reload automático (Vite detecta mudanças)

## 🔄 Fluxo Rápido para Ngrok

```bash
# 1. Inicie ngrok backend (Terminal 1)
cd C:\Users\Mourinha\Desktop\zucropay\backend
ngrok http 8000
# Copie: https://abc123.ngrok-free.app

# 2. Inicie ngrok frontend (Terminal 2)
ngrok http 5173
# Copie: https://xyz789.ngrok-free.app

# 3. Edite config.ts
# - Descomente: const ACTIVE_MODE = 'ngrok';
# - Cole as URLs no objeto ngrok
# - Salve (Ctrl+S)

# 4. Compartilhe a URL do frontend com o cliente
# https://xyz789.ngrok-free.app
```

## ⚠️ Lembre-se

- **Ngrok Free:** As URLs mudam toda vez que você reinicia. Precisa atualizar em `config.ts`
- **Apenas 1 modo ativo:** Descomente só uma linha do `ACTIVE_MODE`
- **Hot Reload:** Depois de salvar, aguarde 2-3 segundos para o Vite recarregar

## 🐛 Troubleshooting

### "Produto não encontrado"
→ Verifique se a `backendUrl` está correta em `config.ts`

### "CORS Error"
→ Reinicie o backend: `php -S localhost:8000 router.php`

### "Ngrok warning page"
→ Certifique-se que `ACTIVE_MODE = 'ngrok'` (o sistema adiciona o header automaticamente)

### Mudei config.ts mas não atualizou
→ Aguarde 2-3 segundos ou force reload: `Ctrl+Shift+R`

## 📝 Resumo

1. **Edite:** `src/config/config.ts`
2. **Descomente:** Uma linha do `ACTIVE_MODE`
3. **Configure:** URLs do modo escolhido
4. **Salve:** `Ctrl+S`
5. **Pronto!** 🎉

---

**Arquivo de configuração:** `src/config/config.ts`
**Tempo para mudar de ambiente:** < 1 minuto
**Precisa reiniciar?** Não, Vite recarrega automaticamente
