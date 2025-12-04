// ✅ COPIE E COLE ESTE CÓDIGO NO CONSOLE DO NAVEGADOR (F12)

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
  console.log('✅ Login:', data);
  
  if (data.success && data.token) {
    // Salvar novo token
    localStorage.setItem('zucropay_token', data.token);
    console.log('✅ Token salvo!');
    
    // Testar criação de produto
    return fetch('http://localhost:8000/products.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + data.token
      },
      body: JSON.stringify({
        name: 'Curso de JavaScript',
        description: 'Curso completo do zero ao avançado',
        price: 197.00,
        active: true
      })
    });
  }
})
.then(res => res.json())
.then(product => {
  console.log('✅ PRODUTO CRIADO COM SUCESSO!', product);
})
.catch(err => console.error('❌ Erro:', err));
