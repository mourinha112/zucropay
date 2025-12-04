<?php
// Gerar hash correto para as senhas

echo "===========================================\n";
echo " GERAR HASH DE SENHAS - ZUCROPAY\n";
echo "===========================================\n\n";

// Senhas para gerar
$passwords = [
    'zucro2025' => 'Senha do usuário zucro@zucro.com',
    '123456' => 'Senha dos usuários admin e joao',
];

foreach ($passwords as $password => $description) {
    $hash = password_hash($password, PASSWORD_DEFAULT);
    echo "Senha: $password\n";
    echo "Descrição: $description\n";
    echo "Hash: $hash\n";
    echo "-------------------------------------------\n\n";
}

// Atualizar banco de dados
echo "===========================================\n";
echo " COMANDOS SQL PARA ATUALIZAR\n";
echo "===========================================\n\n";

echo "USE zucropay;\n\n";

// Hash para 123456
$hash123456 = password_hash('123456', PASSWORD_DEFAULT);
echo "-- Atualizar senha '123456' para admin e joao\n";
echo "UPDATE users SET password_hash = '$hash123456' WHERE email IN ('admin@zucropay.com', 'joao@example.com');\n\n";

// Hash para zucro2025
$hashZucro = password_hash('zucro2025', PASSWORD_DEFAULT);
echo "-- Atualizar senha 'zucro2025' para zucro\n";
echo "UPDATE users SET password_hash = '$hashZucro' WHERE email = 'zucro@zucro.com';\n\n";

// Verificar usuários
echo "-- Verificar usuários\n";
echo "SELECT id, name, email, balance FROM users;\n\n";

echo "===========================================\n";
echo " Copie os comandos UPDATE acima e execute no MySQL!\n";
echo "===========================================\n";
?>
