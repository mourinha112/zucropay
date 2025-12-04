# 🔑 CORRIGIR SENHAS - SOLUÇÃO RÁPIDA

## ⚠️ Problema: "Email ou senha incorretos" (401)

O hash da senha no banco está incorreto. Vamos corrigir!

---

## ✅ SOLUÇÃO 1: Executar SQL (MAIS RÁPIDO)

### Copie e execute no MySQL:

```sql
USE zucropay;

UPDATE users SET password_hash = '$2y$10$ByaUT5ncalH1c38uDbQ7D.zzkaAV3wajxQrzD4W3Dqdckf3/Xux3e' WHERE email IN ('admin@zucropay.com', 'joao@example.com');

UPDATE users SET password_hash = '$2y$10$hKuOU9r4pvsuiSqiDY4wOeFYfWn08lx89ZoZk9hY2RMOMHwyTGrsG' WHERE email = 'zucro@zucro.com';

SELECT id, name, email FROM users;
```

---

## ✅ SOLUÇÃO 2: Via PowerShell (AUTOMÁTICO)

Execute este comando no PowerShell:

```powershell
Get-Content c:\Users\Mourinha\Desktop\zucropay\backend\update-passwords.sql | mysql -u root -p zucropay
```

Digite a senha do MySQL quando solicitado.

---

## ✅ SOLUÇÃO 3: Via MySQL Workbench

1. Abra MySQL Workbench
2. Conecte ao servidor
3. Selecione o banco `zucropay`
4. Cole e execute o SQL da **Solução 1**

---

## 🎯 Depois de Atualizar:

1. **Recarregue a página** do frontend (F5)
2. **Faça login** com:
   - Email: `zucro@zucro.com`
   - Senha: `zucro2025`

---

## ✅ Verificar se Funcionou:

Execute no MySQL:

```sql
USE zucropay;
SELECT id, name, email, balance FROM users WHERE email = 'zucro@zucro.com';
```

Resultado esperado:
```
+----+------------+-----------------+---------+
| id | name       | email           | balance |
+----+------------+-----------------+---------+
|  3 | Zucro Test | zucro@zucro.com | 2000.00 |
+----+------------+-----------------+---------+
```

---

## 📋 Credenciais Corretas:

| Email | Senha | Saldo |
|-------|-------|-------|
| **zucro@zucro.com** | **zucro2025** | R$ 2.000,00 |
| admin@zucropay.com | 123456 | R$ 1.000,00 |
| joao@example.com | 123456 | R$ 500,00 |

---

## 🎉 Pronto!

Depois de atualizar, o login deve funcionar perfeitamente! 🚀
