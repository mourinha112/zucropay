# 🔧 Correção: Imagens não aparecem após upload

## ❌ Problema
- Upload diz "sucesso" ✅
- Mas imagem não aparece na página de produtos ❌
- Imagem não aparece no checkout ❌

## 🔍 Causa
O servidor PHP embutido (`php -S`) não está configurado para servir arquivos estáticos da pasta `public`.

---

## ✅ SOLUÇÃO RÁPIDA

### 1️⃣ Parar o servidor atual
```powershell
# No terminal onde o PHP está rodando
# Pressione: Ctrl + C
```

### 2️⃣ Iniciar com o novo script
```powershell
cd C:\Users\Mourinha\Desktop\zucropay\backend
.\start-server-fixed.ps1
```

**OU (se o PowerShell der erro):**
```cmd
cd C:\Users\Mourinha\Desktop\zucropay\backend
start-server-fixed.bat
```

### 3️⃣ Recarregar a página de produtos
```
- Pressione F5 na página
- Ou feche e abra novamente
```

### 4️⃣ Testar novamente
- Criar/editar produto
- Upload de imagem
- Ver imagem aparecer imediatamente

---

## 🎯 O que mudou?

### ANTES:
```bash
php -S localhost:8000
```
❌ Não serve arquivos de `/public/uploads/`

### AGORA:
```bash
php -S localhost:8000 router.php
```
✅ Serve arquivos de `/public/uploads/`
✅ Serve imagens, CSS, JS
✅ Configurado cache adequado

---

## 📁 Estrutura de Arquivos

```
zucropay/
├── backend/
│   ├── router.php                    ← NOVO! Router para servir arquivos
│   ├── start-server-fixed.bat        ← NOVO! Script Windows
│   ├── start-server-fixed.ps1        ← NOVO! Script PowerShell
│   └── upload-image.php
└── public/
    └── uploads/
        └── products/
            ├── product_1_123456.jpg  ← Imagens salvas aqui
            ├── product_2_789012.png
            └── ...
```

---

## 🧪 Teste Completo

### Passo 1: Reiniciar servidor
```powershell
# 1. Parar servidor antigo (Ctrl+C)

# 2. Iniciar novo servidor
cd C:\Users\Mourinha\Desktop\zucropay\backend
.\start-server-fixed.ps1
```

**Você deve ver:**
```
========================================
 ZUCROPAY - Iniciando Servidor Backend
========================================

[*] Servidor rodando em: http://localhost:8000
[*] Arquivos estaticos servidos de: ../public
[*] Para parar: Ctrl + C

========================================

PHP 8.x.x Development Server (http://localhost:8000) started
```

### Passo 2: Testar URL de imagem existente
```
1. Vá para: http://localhost:8000/uploads/products/
2. Você deve ver a lista de arquivos
3. Clique em qualquer imagem
4. Deve abrir/baixar a imagem
```

### Passo 3: Testar upload novo
```
1. Abra: http://localhost:5173
2. Login: zucro@zucro.com / zucro2025
3. Produtos → Novo Produto
4. Preencha nome e preço
5. Escolher Imagem → Selecione imagem
6. Deve aparecer preview
7. Clique em "Criar"
8. ✅ Imagem deve aparecer no card do produto!
```

### Passo 4: Verificar no checkout
```
1. Gerar link do produto (se ainda não tiver)
2. Copiar link
3. Abrir em aba anônima
4. ✅ Imagem deve aparecer no topo!
```

---

## 🔧 Se ainda não funcionar

### Verificação 1: Servidor está rodando com router?
```powershell
# No terminal do servidor, você deve ver:
PHP 8.x.x Development Server (http://localhost:8000) started

# Quando acessar uma imagem, deve aparecer:
[200]: GET /uploads/products/product_1_123456.jpg
```

### Verificação 2: Arquivo existe?
```powershell
cd C:\Users\Mourinha\Desktop\zucropay\public\uploads\products
dir
```

**Deve listar arquivos como:**
```
product_1_1234567890.jpg
product_2_1234567891.png
...
```

### Verificação 3: URL está correta?
```javascript
// No console do navegador (F12)
console.log(productData.imageUrl);

// Deve ser algo como:
"http://localhost:8000/uploads/products/product_1_123456.jpg"
```

### Verificação 4: Teste direto no navegador
```
Abra: http://localhost:8000/uploads/products/product_1_123456.jpg
```

- ✅ Se abrir a imagem → Servidor funcionando
- ❌ Se der 404 → Arquivo não existe ou servidor sem router
- ❌ Se der erro de conexão → Servidor não está rodando

---

## 🚀 Automatizar Inicialização

### Criar atalho para iniciar tudo:

**Arquivo: `INICIAR_ZUCROPAY.bat`**
```batch
@echo off
echo Iniciando ZucroPay...

start "Backend" cmd /k "cd C:\Users\Mourinha\Desktop\zucropay\backend && start-server-fixed.bat"
timeout /t 2 /nobreak > nul

start "Frontend" cmd /k "cd C:\Users\Mourinha\Desktop\zucropay && npm run dev"

echo.
echo ========================================
echo  ZucroPay iniciado com sucesso!
echo ========================================
echo.
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:5173
echo.
pause
```

**Usar:**
```
Duplo clique no arquivo INICIAR_ZUCROPAY.bat
```

---

## 📊 Debug de Imagens

### Adicionar log no backend (router.php):

Já está configurado! Quando acessar uma imagem, vai aparecer no terminal:

```
[Wed Oct 01 12:34:56 2025] GET /uploads/products/product_1_123456.jpg
[Wed Oct 01 12:34:56 2025] 200 OK
```

### Adicionar log no frontend:

**Products.tsx - após upload:**
```typescript
const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
  // ... código existente ...
  
  try {
    const result = await api.uploadImage(file);
    const imageUrl = `http://localhost:8000${result.url}`;
    
    console.log('✅ Upload concluído!');
    console.log('URL:', imageUrl);
    console.log('Filename:', result.filename);
    
    setFormData({ ...formData, imageUrl });
    setImagePreview(imageUrl);
    showSnackbar('Imagem enviada com sucesso!', 'success');
  } catch (error: any) {
    console.error('❌ Erro no upload:', error);
    showSnackbar(error.message || 'Erro ao fazer upload da imagem', 'error');
  }
};
```

---

## 🎨 Preview de Imagem

### Como funciona:

1. **Upload:**
   ```
   Usuário seleciona imagem
   ↓
   Frontend envia para /upload-image.php
   ↓
   Backend salva em /public/uploads/products/
   ↓
   Retorna URL: /uploads/products/product_X.jpg
   ```

2. **Preview imediato:**
   ```
   URL recebida
   ↓
   setImagePreview(`http://localhost:8000${url}`)
   ↓
   <Box backgroundImage={imagePreview} />
   ↓
   Imagem aparece no modal
   ```

3. **Salvar produto:**
   ```
   formData.imageUrl = imageUrl completa
   ↓
   POST /products.php
   ↓
   Salva no banco: image_url = url
   ↓
   loadProducts() recarrega lista
   ↓
   Imagem aparece no card
   ```

4. **Checkout:**
   ```
   GET /public-payment-link.php?id=xxx
   ↓
   Retorna: productImage = url
   ↓
   <Box backgroundImage={productImage} />
   ↓
   Imagem aparece no checkout
   ```

---

## ✅ Checklist Final

- [ ] Servidor rodando com `router.php`
- [ ] Pasta `/public/uploads/products/` existe
- [ ] Imagens salvas na pasta
- [ ] URL no banco está correta
- [ ] Preview aparece no modal
- [ ] Imagem aparece no card do produto
- [ ] Imagem aparece no checkout
- [ ] Browser console sem erros 404

---

## 🆘 Solução de Emergência

Se NADA funcionar, rode isso:

```powershell
# 1. Parar tudo
# Ctrl+C em todos os terminais

# 2. Limpar tudo
cd C:\Users\Mourinha\Desktop\zucropay
rmdir /s public\uploads\products
mkdir public\uploads\products

# 3. Reiniciar backend
cd backend
.\start-server-fixed.ps1

# 4. Em outro terminal, reiniciar frontend
cd C:\Users\Mourinha\Desktop\zucropay
npm run dev

# 5. Limpar cache do navegador
# F12 → Application → Clear Storage → Clear Site Data

# 6. Fazer login novamente
# zucro@zucro.com / zucro2025

# 7. Testar upload novo
```

---

**Agora sim vai funcionar! 🚀**

Use os novos scripts de inicialização:
- `start-server-fixed.bat` (Windows CMD)
- `start-server-fixed.ps1` (PowerShell)

Eles já estão configurados para servir arquivos estáticos corretamente!
