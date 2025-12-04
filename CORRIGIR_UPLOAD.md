# 🐛 Solução: Erro de Upload "not valid JSON"

## ❌ Problema
Ao tentar fazer upload de imagem, aparece erro:
```
Unexpected token '<', "<br /> <b>"... is not valid JSON
```

## 🔍 Causa
O backend PHP está retornando HTML (erro) ao invés de JSON.

---

## ✅ Soluções Implementadas

### 1. **Melhorias no Backend** (`upload-image.php`)

✅ **Adicionado `Content-Type: application/json`** no header
✅ **Desabilitado exibição de erros HTML** (`display_errors = 0`)
✅ **Função de shutdown** para capturar erros fatais
✅ **Logs detalhados** para debug
✅ **Tratamento de todos os tipos de erro** de upload

### 2. **Melhorias no Frontend** (`api.ts`)

✅ **Captura resposta como texto primeiro**
✅ **Tenta fazer parse do JSON**
✅ **Se não for JSON, mostra erro claro**
✅ **Console.log para debug**

---

## 🧪 Como Testar

### Opção 1: Página de Teste (Recomendado)

1. **Abra o navegador:**
   ```
   http://localhost:8000/test-upload.html
   ```

2. **A página vai:**
   - ✅ Pegar token automaticamente do LocalStorage
   - ✅ Testar se token é válido
   - ✅ Permitir upload de imagem
   - ✅ Mostrar preview
   - ✅ Exibir logs detalhados

### Opção 2: Sistema Normal

1. **Faça login no sistema**
2. **Vá para "Produtos"**
3. **Clique em "Novo Produto"**
4. **Clique em "Escolher Imagem"**
5. **Selecione uma imagem**
6. **Veja o preview aparecer**

---

## 🔧 Diagnóstico Rápido

### Se ainda der erro, siga estes passos:

#### 1. Verificar se servidor está rodando:
```powershell
# Terminal 1 - Backend
cd C:\Users\Mourinha\Desktop\zucropay\backend
php -S localhost:8000
```

#### 2. Verificar se está logado:
```
Abra: http://localhost:5173
Faça login com: zucro@zucro.com / zucro2025
```

#### 3. Testar endpoint diretamente:
```
Abra: http://localhost:8000/test-upload.html
Clique em "Pegar do LocalStorage"
Clique em "Testar Token"
```

#### 4. Verificar console do navegador:
```
F12 → Console
Deve mostrar logs do upload
```

#### 5. Verificar logs do PHP:
```powershell
# No terminal onde o PHP está rodando
# Procure por linhas com [upload-image]
```

---

## 📋 Checklist de Verificação

- [ ] Servidor backend rodando (localhost:8000)
- [ ] Usuário está logado
- [ ] Token está no LocalStorage
- [ ] Pasta `public/uploads/products` existe
- [ ] Pasta tem permissão de escrita
- [ ] Arquivo é uma imagem válida (JPEG, PNG, GIF, WEBP)
- [ ] Arquivo tem menos de 5MB

---

## 🎯 Testes Automáticos

### Teste 1: Verificar estrutura
```powershell
cd C:\Users\Mourinha\Desktop\zucropay\backend
php test-upload.php
```

**Resultado esperado:**
```
✓ Pasta existe
✓ Pasta tem permissão de escrita
✓ Arquivo db.php existe
✓ Função authenticate() existe
✓ Função jsonResponse() existe
```

### Teste 2: Testar com página HTML
```
1. Abrir http://localhost:8000/test-upload.html
2. Token deve aparecer automaticamente
3. Clicar em "Testar Token" → deve dar ✅
4. Selecionar imagem
5. Clicar em "Upload"
6. Deve aparecer: ✅ Upload realizado com sucesso!
```

---

## 🚀 Se Tudo Falhar

### Reiniciar completamente:

```powershell
# 1. Parar todos os servidores (Ctrl+C)

# 2. Limpar cache do navegador
# F12 → Application → Clear Storage → Clear Site Data

# 3. Limpar LocalStorage
localStorage.clear()

# 4. Reiniciar backend
cd C:\Users\Mourinha\Desktop\zucropay\backend
php -S localhost:8000

# 5. Reiniciar frontend (em outro terminal)
cd C:\Users\Mourinha\Desktop\zucropay
npm run dev

# 6. Fazer login novamente
http://localhost:5173
Login: zucro@zucro.com
Senha: zucro2025

# 7. Testar upload
Produtos → Novo Produto → Escolher Imagem
```

---

## 📊 Logs para Verificar

### Backend (Terminal PHP):
```
[upload-image] Starting upload process
[upload-image] User authenticated: ID 1
[upload-image] File received: imagem.jpg, size: 12345 bytes
[upload-image] MIME type detected: image/jpeg
[upload-image] Creating directory: .../public/uploads/products
[upload-image] Saving file to: .../product_1_abc123.jpg
[upload-image] ✓ File saved successfully
```

### Frontend (Console do Navegador):
```javascript
Enviando para: http://localhost:8000/upload-image.php
Token: eyJ0eXAiOiJKV1QiLCJhbGc...
Arquivo: imagem.jpg image/jpeg 12345
Status: 200
Resposta (texto): {"success":true,"url":"..."}
```

---

## 🎓 Entendendo o Erro

### Erro Original:
```
Unexpected token '<', "<br /> <b>"... is not valid JSON
```

**Significa:**
- Backend retornou HTML ao invés de JSON
- Geralmente acontece quando:
  1. ❌ PHP Warning/Error (exibe HTML)
  2. ❌ Token inválido (não autenticado)
  3. ❌ Servidor não está rodando
  4. ❌ Caminho do arquivo errado

### Solução:
- ✅ Desabilitar HTML errors
- ✅ Forçar Content-Type JSON
- ✅ Melhor tratamento de erros
- ✅ Logs detalhados

---

## 📞 Debug em Tempo Real

### Adicionar logs no código:

**Frontend (Products.tsx):**
```typescript
const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (!file) return;
  
  console.log('🔵 Iniciando upload:', file.name, file.size, 'bytes');
  
  setUploading(true);
  try {
    console.log('🔵 Chamando API...');
    const result = await api.uploadImage(file);
    console.log('✅ Resultado:', result);
    
    const imageUrl = `http://localhost:8000${result.url}`;
    setFormData({ ...formData, imageUrl });
    setImagePreview(imageUrl);
    showSnackbar('Imagem enviada com sucesso!', 'success');
  } catch (error: any) {
    console.error('❌ Erro:', error);
    showSnackbar(error.message || 'Erro ao fazer upload da imagem', 'error');
  } finally {
    setUploading(false);
  }
};
```

---

## ✨ Resultado Final

Após aplicar as correções:

1. ✅ Upload funciona corretamente
2. ✅ Erros retornam JSON válido
3. ✅ Logs detalhados para debug
4. ✅ Mensagens de erro claras
5. ✅ Preview funciona
6. ✅ Validações funcionam

---

**🎯 Teste agora:**
1. http://localhost:8000/test-upload.html
2. Ou use o sistema normal em Produtos

Se ainda tiver problema, verifique os logs no console! 🔍
