# 🔍 DEBUG COMPLETO - Encontrar o Problema

Execute estes comandos **um por um** no Console do navegador (F12 > Console):

---

## 1️⃣ Verificar se o Token Existe

```javascript
const token = localStorage.getItem('zucropay_token');
console.log('Token existe?', token ? 'SIM ✅' : 'NÃO ❌');
console.log('Token:', token);
```

**Resultado esperado**: Deve mostrar um token longo (JWT)

---

## 2️⃣ Testar Endpoint de Debug

```javascript
fetch('http://localhost:8000/debug-auth.php', {
  headers: {
    'Authorization': 'Bearer ' + localStorage.getItem('zucropay_token')
  }
})
.then(res => res.json())
.then(data => {
  console.log('=== DEBUG DE AUTENTICAÇÃO ===');
  console.log(data);
  
  if (data.error) {
    console.error('❌ ERRO:', data.error);
  }
  
  if (data.user_id) {
    console.log('✅ Token VÁLIDO! User ID:', data.user_id);
  }
});
```

---

## 3️⃣ Testar Criação de Produto Diretamente

```javascript
fetch('http://localhost:8000/products.php', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + localStorage.getItem('zucropay_token')
  },
  body: JSON.stringify({
    name: 'Produto Teste Debug',
    description: 'Teste via console',
    price: 99.90,
    active: true
  })
})
.then(res => {
  console.log('Status:', res.status);
  return res.json();
})
.then(data => {
  console.log('Resposta:', data);
  if (data.success) {
    console.log('✅ PRODUTO CRIADO COM SUCESSO!');
  } else {
    console.error('❌ ERRO:', data.message);
  }
})
.catch(err => console.error('Erro na requisição:', err));
```

---

## 4️⃣ Verificar Headers Enviados

```javascript
fetch('http://localhost:8000/debug-auth.php', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + localStorage.getItem('zucropay_token')
  }
})
.then(res => res.json())
.then(data => {
  console.log('=== HEADERS RECEBIDOS PELO BACKEND ===');
  console.log('Todos os headers:', data.headers_all);
  console.log('Authorization header:', data.server_auth);
  console.log('Extração do Bearer:', data.bearer_extraction);
  console.log('Token decodificado:', data.token_decoded);
  
  if (data.error) {
    console.error('❌ PROBLEMA ENCONTRADO:');
    console.error(data.error);
  }
});
```

---

## 5️⃣ Forçar Novo Login e Salvar Token

```javascript
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
  console.log('Resposta do login:', data);
  
  if (data.success && data.token) {
    console.log('✅ Login bem-sucedido!');
    console.log('Token recebido:', data.token.substring(0, 50) + '...');
    
    // Salvar token
    localStorage.setItem('zucropay_token', data.token);
    console.log('✅ Token salvo no localStorage');
    
    // Testar imediatamente
    fetch('http://localhost:8000/products.php', {
      headers: {
        'Authorization': 'Bearer ' + data.token
      }
    })
    .then(res => res.json())
    .then(products => {
      console.log('✅ Produtos acessados com sucesso!');
      console.log('Produtos:', products);
    })
    .catch(err => {
      console.error('❌ Erro ao acessar produtos:', err);
    });
  } else {
    console.error('❌ Erro no login:', data.message);
  }
})
.catch(err => console.error('❌ Erro na requisição de login:', err));
```

---

## 📋 RESULTADOS ESPERADOS

### Se tudo estiver OK:
- ✅ Token existe no localStorage
- ✅ Debug mostra `user_id`
- ✅ Produto criado com sucesso
- ✅ Headers recebidos corretamente

### Se houver problema:
- ❌ Token não existe → Fazer login novamente
- ❌ Token inválido → Token expirado ou corrompido
- ❌ Headers não recebidos → Problema no CORS ou servidor
- ❌ 401 persistente → Problema na verificação do token

---

## 🎯 DEPOIS DE EXECUTAR

**Me envie os resultados do console!** Especialmente:
1. Resultado do comando 2 (debug-auth)
2. Resultado do comando 3 (criar produto)
3. Qualquer erro que aparecer

Com essas informações vou identificar exatamente onde está o problema! 🔍
