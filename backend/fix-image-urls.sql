-- ===================================
-- CORRIGIR URLS DE IMAGENS ANTIGAS
-- ===================================
-- Este script atualiza as URLs de imagens que foram salvas com caminho relativo
-- para URLs completas com o domínio do backend

-- ===================================
-- DESENVOLVIMENTO (localhost)
-- ===================================

-- Atualizar URLs de produtos
UPDATE products 
SET image_url = CONCAT('http://localhost:8000', image_url)
WHERE image_url LIKE '/uploads/products/%'
AND image_url NOT LIKE 'http%';

-- Atualizar URLs de customizações (se houver)
UPDATE checkout_customization 
SET settings = REPLACE(settings, '"/uploads/', '"http://localhost:8000/uploads/')
WHERE settings LIKE '%"/uploads/%';

-- Verificar resultado
SELECT id, name, image_url 
FROM products 
WHERE image_url LIKE 'http://localhost:8000/uploads%'
LIMIT 10;

-- ===================================
-- PRODUÇÃO (quando fizer deploy)
-- ===================================
-- DESCOMENTE E TROQUE A URL ABAIXO PELA URL REAL DO SEU BACKEND EM PRODUÇÃO

-- UPDATE products 
-- SET image_url = CONCAT('https://api.seudominio.com', image_url)
-- WHERE image_url LIKE '/uploads/products/%'
-- AND image_url NOT LIKE 'http%';

-- UPDATE checkout_customization 
-- SET settings = REPLACE(settings, '"/uploads/', '"https://api.seudominio.com/uploads/')
-- WHERE settings LIKE '%"/uploads/%';

-- ===================================
-- REVERTER (caso precise)
-- ===================================
-- Para voltar para URLs relativas:

-- UPDATE products 
-- SET image_url = REPLACE(image_url, 'http://localhost:8000', '')
-- WHERE image_url LIKE 'http://localhost:8000/uploads%';

-- UPDATE checkout_customization 
-- SET settings = REPLACE(settings, '"http://localhost:8000/uploads/', '"/uploads/')
-- WHERE settings LIKE '%"http://localhost:8000/uploads/%';

COMMIT;
