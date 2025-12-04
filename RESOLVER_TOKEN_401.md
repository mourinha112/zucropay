# 🔧 RESOLVER ERRO 401 - Token Inválido

## ⚠️ Problema
Você fez login mas ao criar produtos aparece erro **401 (Unauthorized)**.

**Causa**: Token JWT antigo/inválido no navegador.

---

## ✅ SOLUÇÃO RÁPIDA (3 passos)

### 1️⃣ Abrir Console do Navegador
- Pressione **F12**
- Clique na aba **Console**

### 2️⃣ Copiar e Colar este Código
```javascript
localStorage.removeItem('zucropay_token');
window.location.href = '/login';
```

### 3️⃣ Fazer Login Novamente
- Email: `zucro@zucro.com`
- Senha: `zucro2025`

---

## ✅ SOLUÇÃO ALTERNATIVA

### Limpar Cache do Navegador:
1. **Chrome/Edge**: `Ctrl + Shift + Delete`
2. Marcar: **Cookies e dados de sites**
3. Clicar em **Limpar dados**
4. Recarregar página: `Ctrl + F5`
5. Fazer login novamente

---

## 🔍 Verificar se o Token Está Salvo

Após fazer login, abra o Console (F12) e digite:

```javascript
console.log(localStorage.getItem('zucropay_token'));
```

**Resultado esperado**: Deve mostrar um token longo (JWT)

**Se mostrar `null`**: O login não está salvando o token. Veja solução abaixo.

---

## 🐛 Se o Login NÃO Salvar o Token

Vamos verificar o código de login. Execute no Console:

```javascript
// Fazer login manual via console
fetch('http://localhost:8000/login.php', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'zucro@zucro.com',
    password: 'zucro2025'
  })
})
.then(res => res.json())
.then(data => {
  console.log('Resposta:', data);
  if (data.token) {
    localStorage.setItem('zucropay_token', data.token);
    console.log('✅ Token salvo!');
    window.location.href = '/';
  }
});
```

---

## 📋 Checklist de Verificação

Após fazer login, teste:

1. **Token salvo?**
```javascript
console.log(localStorage.getItem('zucropay_token'));
```

2. **Backend respondendo?**
```javascript
fetch('http://localhost:8000/products.php', {
  headers: {
    'Authorization': 'Bearer ' + localStorage.getItem('zucropay_token')
  }
})
.then(res => res.json())
.then(data => console.log('Produtos:', data));
```

3. **Resposta esperada**: Lista de produtos (pode ser vazia `[]`)

---

## 🎯 Depois de Corrigir

Você poderá:
- ✅ Criar produtos
- ✅ Gerar links de pagamento
- ✅ Ver estatísticas
- ✅ Gerenciar finanças

---

## 📞 Se Ainda Não Funcionar

Verifique:
1. **Senha do banco foi atualizada?** (ver `CORRIGIR_SENHA.md`)
2. **Backend está rodando?** (`http://localhost:8000`)
3. **Frontend está rodando?** (`http://localhost:5173`)

---

**Tente a Solução Rápida primeiro!** 🚀
