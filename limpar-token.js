// Script para limpar token e forçar novo login
// Cole no Console do navegador (F12 > Console)

// Limpar token antigo
localStorage.removeItem('zucropay_token');
console.log('✅ Token removido');

// Recarregar página
window.location.href = '/login';
console.log('✅ Redirecionando para login...');
