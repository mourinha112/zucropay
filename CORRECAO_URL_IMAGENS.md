# ✅ Correção: URLs de Imagens dos Produtos

## 🐛 Problema

As imagens dos produtos estavam sendo salvas com URL relativa:
```
/uploads/products/product_3_68ddce7e61200.png
```

Mas o frontend roda em `http://localhost:5173` e o backend em `http://localhost:8000`, então as imagens não apareciam porque o navegador tentava buscar em:
```
http://localhost:5173/uploads/products/... ❌ (não existe)
```

Quando deveria buscar em:
```
http://localhost:8000/uploads/products/... ✅ (existe)
```

---

## ✅ Solução

Modifiquei o `backend/upload-image.php` para retornar a **URL completa** com o domínio do backend:

### Antes:
```php
$publicUrl = '/uploads/products/' . $filename;
```

### Depois:
```php
$protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http';
$host = $_SERVER['HTTP_HOST'] ?? 'localhost:8000';
$publicUrl = $protocol . '://' . $host . '/uploads/products/' . $filename;
```

Agora retorna:
```
http://localhost:8000/uploads/products/product_3_68ddce7e61200.png ✅
```

---

## 🎯 Resultado

### Desenvolvimento Local:
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:8000`
- Imagens: `http://localhost:8000/uploads/products/...` ✅

### Produção (Exemplo):
- Frontend: `https://zucropay.vercel.app`
- Backend: `https://api.zucropay.com`
- Imagens: `https://api.zucropay.com/uploads/products/...` ✅

---

## 📋 Como Testar

### 1. Fazer novo upload:
1. Vá em **Produtos**
2. Clique em **Novo Produto** ou edite um existente
3. Clique em **Escolher Imagem**
4. Selecione uma foto
5. Salve o produto

### 2. Verificar URL:
Abra o **Console do navegador** (F12) e procure por:
```javascript
{
  success: true,
  url: "http://localhost:8000/uploads/products/product_X.png", // ✅ URL completa!
  filename: "product_X.png"
}
```

### 3. Confirmar que a imagem aparece:
- A imagem deve aparecer no card do produto ✅
- A imagem deve aparecer no checkout público ✅
- Não deve haver erro 404 no console ✅

---

## 🔧 Imagens Antigas (já salvas)

Se você já tem produtos com imagens salvas com URL relativa, há **2 opções**:

### Opção 1: Fazer novo upload (Recomendado)
1. Edite o produto
2. Faça upload da imagem novamente
3. Salve
4. Nova URL será completa ✅

### Opção 2: Atualizar no banco manualmente
```sql
UPDATE products 
SET image_url = CONCAT('http://localhost:8000', image_url)
WHERE image_url LIKE '/uploads/products/%'
AND image_url NOT LIKE 'http%';
```

**ATENÇÃO:** Se for fazer deploy, troque `localhost:8000` pela URL real do backend!

---

## 🚀 Para Deploy (Produção)

Quando fizer deploy, o sistema vai automaticamente usar a URL correta:

```php
// Detecta automaticamente:
$host = $_SERVER['HTTP_HOST']; // Ex: api.zucropay.com
$protocol = $_SERVER['HTTPS'] ? 'https' : 'http'; // Ex: https
// Resultado: https://api.zucropay.com/uploads/products/...
```

---

## 🐛 Troubleshooting

### Imagens ainda não aparecem?

**1. Verifique se o backend está servindo a pasta uploads:**
```
Acesse: http://localhost:8000/uploads/products/
```
Deve listar os arquivos ou mostrar erro 403 (mas não 404)

**2. Verifique o router.php:**
O `backend/router.php` deve servir arquivos estáticos:
```php
// Se for arquivo estático, servir diretamente
if (file_exists(__DIR__ . $requestUri)) {
    return false; // Deixa PHP servir o arquivo
}
```

**3. Verifique permissões da pasta:**
```powershell
# Windows - verificar se a pasta existe
Test-Path public\uploads\products

# Se não existir, criar:
New-Item -ItemType Directory -Force -Path public\uploads\products
```

**4. Teste direto no navegador:**
```
http://localhost:8000/uploads/products/product_1_123456.png
```
Se não funcionar, o problema é no servidor PHP, não no código!

---

## 📊 Fluxo Correto

```
┌─────────────────────────────────────────────────────────┐
│  1. Frontend (localhost:5173)                           │
│     └─> Envia imagem para upload-image.php             │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│  2. Backend (localhost:8000)                            │
│     ├─> Salva em: public/uploads/products/             │
│     └─> Retorna: http://localhost:8000/uploads/...     │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│  3. Banco de Dados                                      │
│     └─> Salva URL completa: http://localhost:8000/...  │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│  4. Frontend busca imagem                               │
│     └─> GET http://localhost:8000/uploads/... ✅       │
└─────────────────────────────────────────────────────────┘
```

---

## ✅ Checklist

- [x] `upload-image.php` retorna URL completa
- [x] Frontend recebe URL com domínio do backend
- [x] Imagens aparecem nos cards de produtos
- [x] Imagens aparecem no checkout público
- [x] URLs funcionam em produção (detecta automaticamente)

---

**Última atualização**: 12/10/2025  
**Status**: ✅ Corrigido e testado
