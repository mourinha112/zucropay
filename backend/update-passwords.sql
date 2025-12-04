-- ========================================
-- ATUALIZAR SENHAS DOS USUÁRIOS
-- ========================================

USE zucropay;

-- Atualizar senha '123456' para admin e joao
UPDATE users SET password_hash = '$2y$10$ByaUT5ncalH1c38uDbQ7D.zzkaAV3wajxQrzD4W3Dqdckf3/Xux3e' WHERE email IN ('admin@zucropay.com', 'joao@example.com');

-- Atualizar senha 'zucro2025' para zucro
UPDATE users SET password_hash = '$2y$10$hKuOU9r4pvsuiSqiDY4wOeFYfWn08lx89ZoZk9hY2RMOMHwyTGrsG' WHERE email = 'zucro@zucro.com';

-- Verificar usuários atualizados
SELECT id, name, email, balance, 
       CASE 
           WHEN email = 'zucro@zucro.com' THEN 'zucro2025'
           ELSE '123456'
       END as senha
FROM users;

-- Resultado esperado:
-- +----+------------------+---------------------+---------+-----------+
-- | id | name             | email               | balance | senha     |
-- +----+------------------+---------------------+---------+-----------+
-- |  1 | Admin ZucroPay   | admin@zucropay.com  | 1000.00 | 123456    |
-- |  2 | João Silva       | joao@example.com    |  500.00 | 123456    |
-- |  3 | Zucro Test       | zucro@zucro.com     | 2000.00 | zucro2025 |
-- +----+------------------+---------------------+---------+-----------+
