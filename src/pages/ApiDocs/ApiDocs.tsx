import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Button,
  IconButton,
  Alert,
  Divider,
  Chip,
  Stack,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  ContentCopy as CopyIcon,
  ExpandMore as ExpandMoreIcon,
  Code as CodeIcon,
  IntegrationInstructions as IntegrationIcon,
  Security as SecurityIcon,
  Webhook as WebhookIcon,
  Description as DocsIcon,
} from '@mui/icons-material';
import Header from '../../components/Header/Header';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const ApiDocs: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [copiedText, setCopiedText] = useState('');

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(''), 2000);
  };

  const apiBaseUrl = window.location.origin.replace('5173', '8000');

  const CodeBlock = ({ code, language = 'javascript', label }: { code: string; language?: string; label: string }) => (
    <Paper
      sx={{
        bgcolor: '#1e1e1e',
        color: '#d4d4d4',
        p: 2,
        borderRadius: 2,
        position: 'relative',
        fontFamily: 'monospace',
        fontSize: '0.875rem',
        overflow: 'auto',
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Chip label={language} size="small" sx={{ bgcolor: '#2d2d2d', color: '#fff' }} />
        <IconButton
          size="small"
          onClick={() => copyToClipboard(code, label)}
          sx={{ color: '#fff' }}
        >
          <CopyIcon fontSize="small" />
        </IconButton>
      </Box>
      <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
        <code>{code}</code>
      </pre>
    </Paper>
  );

  return (
    <>
      <Header />
      <Box sx={{ minHeight: '100vh', backgroundColor: '#f5f5f5', pt: 10 }}>
        <Box sx={{ maxWidth: '1200px', mx: 'auto', p: 3 }}>
          {/* Header */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h4" fontWeight={600} gutterBottom>
              📚 Documentação da API
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Integre o ZucroPay em sua aplicação de forma rápida e segura
            </Typography>
          </Box>

          {copiedText && (
            <Alert severity="success" sx={{ mb: 3 }}>
              {copiedText} copiado para área de transferência!
            </Alert>
          )}

          {/* Tabs */}
          <Paper sx={{ mb: 3, borderRadius: 2 }}>
            <Tabs value={tabValue} onChange={handleTabChange} variant="scrollable" scrollButtons="auto">
              <Tab icon={<IntegrationIcon />} label="Integração Simples (SDK)" iconPosition="start" />
              <Tab icon={<CodeIcon />} label="API REST" iconPosition="start" />
              <Tab icon={<WebhookIcon />} label="Webhooks (Opcional)" iconPosition="start" />
              <Tab icon={<DocsIcon />} label="Integração Avançada" iconPosition="start" />
              <Tab icon={<SecurityIcon />} label="Autenticação" iconPosition="start" />
            </Tabs>
          </Paper>

          {/* Tab 1: Integração Simples (SDK) */}
          <TabPanel value={tabValue} index={0}>
            <Stack spacing={3}>
              <Alert severity="success" icon={<IntegrationIcon />}>
                <Typography variant="subtitle1" fontWeight={600}>
                  ✅ Integração Simples - Sem Precisar Configurar Banco de Dados!
                </Typography>
                <Typography variant="body2">
                  Use nossa biblioteca JavaScript pronta. Igual a Stripe, Mercado Pago, PagSeguro, etc.
                </Typography>
              </Alert>

              <Paper sx={{ p: 4, borderRadius: 2 }}>
                <Typography variant="h5" fontWeight={600} gutterBottom>
                  🚀 Integração em 3 Passos
                </Typography>

                <Box sx={{ mt: 3 }}>
                  <Typography variant="h6" color="primary" gutterBottom>
                    1️⃣ Incluir o SDK
                  </Typography>
                  <CodeBlock
                    label="HTML"
                    language="html"
                    code={`<!-- Adicione no seu HTML -->
<script src="http://localhost:5173/zucropay-sdk.js"></script>`}
                  />
                </Box>

                <Box sx={{ mt: 3 }}>
                  <Typography variant="h6" color="primary" gutterBottom>
                    2️⃣ Pegar sua API Key
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Acesse <strong>Integrações</strong> no menu e copie sua API Key (gerada automaticamente).
                  </Typography>
                </Box>

                <Box sx={{ mt: 3 }}>
                  <Typography variant="h6" color="primary" gutterBottom>
                    3️⃣ Criar Botão de Pagamento
                  </Typography>
                  <CodeBlock
                    label="JavaScript"
                    language="javascript"
                    code={`// Container do botão
<div id="payment-button"></div>

<script>
  // Inicializar SDK
  const zucropay = new ZucroPay('SUA_API_KEY_AQUI');
  
  // Criar botão
  zucropay.createButton('payment-button', {
    amount: 99.90,
    customer: {
      name: 'João Silva',
      email: 'joao@example.com',
      document: '12345678900'  // CPF
    },
    description: 'Produto XYZ'
  });
</script>`}
                  />
                </Box>

                <Alert severity="info" sx={{ mt: 3 }}>
                  <Typography variant="body2">
                    <strong>Pronto!</strong> O botão aparece na página e ao clicar abre um modal com QR Code PIX. 
                    Sem precisar configurar banco de dados, servidor ou webhook. 🎉
                  </Typography>
                </Alert>
              </Paper>

              <Paper sx={{ p: 4, borderRadius: 2 }}>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  🎨 Botão Customizado
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Personalize cores, textos e callbacks:
                </Typography>

                <CodeBlock
                  label="JavaScript Avançado"
                  language="javascript"
                  code={`const zucropay = new ZucroPay('SUA_API_KEY');

zucropay.createButton('meu-botao', {
  amount: 149.90,
  customer: {
    name: 'Maria Santos',
    email: 'maria@example.com',
    document: '98765432100'
  },
  external_reference: 'PEDIDO-123'  // Seu ID interno
}, {
  text: '🛒 Comprar Agora - R$ 149,90',
  color: '#FF6B6B',        // Cor do botão
  hoverColor: '#FF5252',   // Cor ao passar mouse
  
  onSuccess: (result) => {
    console.log('Pagamento criado!', result);
    // Redirecionar, mostrar mensagem, etc
    alert('Pagamento gerado! ID: ' + result.payment.id);
  },
  
  onError: (error) => {
    console.error('Erro:', error);
    alert('Erro ao processar pagamento');
  }
});`}
                />
              </Paper>

              <Paper sx={{ p: 4, borderRadius: 2 }}>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  📝 Formulário Completo
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Ou crie um formulário de checkout completo com todos os campos:
                </Typography>

                <CodeBlock
                  label="Formulário de Checkout"
                  language="javascript"
                  code={`<div id="checkout-form"></div>

<script>
  const zucropay = new ZucroPay('SUA_API_KEY');
  
  zucropay.createCheckoutForm('checkout-form', {
    amount: 199.90,
    title: '💳 Finalizar Compra',
    description: 'Curso de Marketing Digital',
    orderId: 'ORDER-12345',
    
    onSuccess: (result) => {
      // Redirecionar para página de obrigado
      window.location.href = '/obrigado?payment=' + result.payment.id;
    }
  });
</script>`}
                />

                <Box sx={{ mt: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                  <Typography variant="body2">
                    ✨ O formulário coleta <strong>Nome, Email e CPF</strong> automaticamente e exibe o QR Code PIX após o envio.
                  </Typography>
                </Box>
              </Paper>

              <Paper sx={{ p: 4, borderRadius: 2 }}>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  🛒 Integração com E-commerce
                </Typography>
                
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography fontWeight={600}>WordPress / WooCommerce</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <CodeBlock
                      label="PHP - functions.php"
                      language="php"
                      code={`// Adicionar botão na página de obrigado
add_action('woocommerce_thankyou', 'zucropay_payment_button');

function zucropay_payment_button($order_id) {
  $order = wc_get_order($order_id);
  ?>
  <script src="http://localhost:5173/zucropay-sdk.js"></script>
  <div id="zucropay-btn"></div>
  <script>
    new ZucroPay('<?php echo get_option('zucropay_api_key'); ?>')
      .createButton('zucropay-btn', {
        amount: <?php echo $order->get_total(); ?>,
        customer: {
          name: '<?php echo $order->get_billing_first_name() . ' ' . $order->get_billing_last_name(); ?>',
          email: '<?php echo $order->get_billing_email(); ?>',
          document: '<?php echo get_post_meta($order_id, '_billing_cpf', true); ?>'
        },
        external_reference: '<?php echo $order_id; ?>'
      });
  </script>
  <?php
}`}
                    />
                  </AccordionDetails>
                </Accordion>

                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography fontWeight={600}>HTML Puro (Qualquer Site)</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <CodeBlock
                      label="HTML Completo"
                      language="html"
                      code={`<!DOCTYPE html>
<html>
<head>
  <title>Minha Loja</title>
</head>
<body>
  <h1>Produto: Curso Online</h1>
  <p>Preço: R$ 99,90</p>
  
  <div id="payment"></div>

  <script src="http://localhost:5173/zucropay-sdk.js"></script>
  <script>
    new ZucroPay('sua_api_key_aqui').createButton('payment', {
      amount: 99.90,
      customer: {
        name: 'Cliente Teste',
        email: 'cliente@example.com',
        document: '12345678900'
      },
      description: 'Curso Online'
    });
  </script>
</body>
</html>`}
                    />
                  </AccordionDetails>
                </Accordion>

                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography fontWeight={600}>React / Next.js</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <CodeBlock
                      label="React Component"
                      language="javascript"
                      code={`import { useEffect } from 'react';

function CheckoutButton() {
  useEffect(() => {
    // Carregar SDK
    const script = document.createElement('script');
    script.src = 'http://localhost:5173/zucropay-sdk.js';
    script.onload = () => {
      const zucropay = new window.ZucroPay(process.env.NEXT_PUBLIC_ZUCROPAY_API_KEY);
      zucropay.createButton('payment-btn', {
        amount: 99.90,
        customer: {
          name: 'Cliente',
          email: 'email@example.com',
          document: '12345678900'
        }
      });
    };
    document.body.appendChild(script);
  }, []);

  return <div id="payment-btn"></div>;
}

export default CheckoutButton;`}
                    />
                  </AccordionDetails>
                </Accordion>
              </Paper>

              <Paper sx={{ p: 4, borderRadius: 2, bgcolor: '#f3e5f5' }}>
                <Typography variant="h6" fontWeight={600} gutterBottom color="primary">
                  🎯 Por que usar o SDK?
                </Typography>
                <Box component="ul" sx={{ pl: 3, '& li': { mb: 1 } }}>
                  <li><Typography variant="body2">✅ <strong>Sem banco de dados:</strong> Tudo gerenciado pelo ZucroPay</Typography></li>
                  <li><Typography variant="body2">✅ <strong>Sem código PHP:</strong> Apenas JavaScript no frontend</Typography></li>
                  <li><Typography variant="body2">✅ <strong>Webhook opcional:</strong> Funciona sem configurar</Typography></li>
                  <li><Typography variant="body2">✅ <strong>5 minutos para integrar:</strong> Copiar, colar, pronto!</Typography></li>
                  <li><Typography variant="body2">✅ <strong>Modal pronto:</strong> Interface completa com QR Code PIX</Typography></li>
                  <li><Typography variant="body2">✅ <strong>Verificação automática:</strong> Detecta quando PIX é pago</Typography></li>
                </Box>
              </Paper>

              <Paper sx={{ p: 4, borderRadius: 2, border: 2, borderColor: 'primary.main' }}>
                <Typography variant="h6" fontWeight={600} gutterBottom color="primary">
                  📖 Ver Exemplos Completos
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Acesse a página de exemplos com código funcionando:
                </Typography>
                <Button
                  variant="contained"
                  size="large"
                  href="/exemplos-sdk.html"
                  target="_blank"
                  sx={{ mt: 2 }}
                >
                  🚀 Ver Exemplos Funcionando
                </Button>
              </Paper>
            </Stack>
          </TabPanel>

          {/* Tab 2: API REST */}
          <TabPanel value={tabValue} index={1}>
            <Stack spacing={3}>
              <Alert severity="info">
                <Typography variant="subtitle1" fontWeight={600}>
                  🔧 API REST - Para Integração Personalizada
                </Typography>
                <Typography variant="body2">
                  Use a API REST diretamente se precisar de controle total do fluxo de pagamento.
                </Typography>
              </Alert>

              <Paper sx={{ p: 4, borderRadius: 2 }}>
                <Typography variant="h5" fontWeight={600} gutterBottom>
                  🚀 Começando
                </Typography>
                <Typography variant="body1" color="text.secondary" paragraph>
                  Para usar a API REST, você precisa:
                </Typography>

                <Box component="ol" sx={{ pl: 3 }}>
                  <li>
                    <Typography variant="body1" paragraph>
                      <strong>Obter sua API Key</strong> - Disponível no dashboard em Integrações
                    </Typography>
                  </li>
                  <li>
                    <Typography variant="body1" paragraph>
                      <strong>URL base da API:</strong>
                    </Typography>
                    <CodeBlock
                      label="URL Base"
                      code={apiBaseUrl}
                      language="text"
                    />
                  </li>
                  <li>
                    <Typography variant="body1" paragraph>
                      <strong>Incluir o header X-API-Key</strong> em todas as requisições
                    </Typography>
                  </li>
                </Box>
              </Paper>

              <Paper sx={{ p: 4, borderRadius: 2 }}>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  📝 Criar Pagamento
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Endpoint para criar um novo pagamento:
                </Typography>

                <CodeBlock
                  label="cURL"
                  language="bash"
                  code={`curl -X POST ${apiBaseUrl}/api/v1/payments/create.php \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: sua_api_key_aqui" \\
  -d '{
    "amount": 99.90,
    "customer": {
      "name": "João Silva",
      "email": "joao@example.com",
      "document": "12345678900"
    },
    "description": "Produto XYZ",
    "external_reference": "PEDIDO-123"
  }'`}
                />

                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                    Resposta:
                  </Typography>
                  <CodeBlock
                    label="JSON Response"
                    language="json"
                    code={`{
  "success": true,
  "payment": {
    "id": "pay_abc123def456",
    "status": "PENDING",
    "amount": 99.90,
    "customer": {
      "name": "João Silva",
      "email": "joao@example.com"
    },
    "external_reference": "PEDIDO-123",
    "created_at": "2025-10-02 15:30:00"
  },
  "pix": {
    "qr_code_base64": "iVBORw0KGgoAAAANS...",
    "copy_paste": "00020126580014br.gov.bcb.pix..."
  },
  "checkout_url": "http://localhost:5173/checkout/pay_abc123def456"
}`}
                  />
                </Box>
              </Paper>

              <Paper sx={{ p: 4, borderRadius: 2 }}>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  🔍 Consultar Pagamento
                </Typography>
                <CodeBlock
                  label="JavaScript/Fetch"
                  language="javascript"
                  code={`// Verificar status do pagamento
const response = await fetch('${apiBaseUrl}/payments/pay_abc123', {
  headers: {
    'X-API-Key': 'sua_api_key_aqui'
  }
});

const data = await response.json();
console.log('Status:', data.payment.status);
// PENDING, RECEIVED, CONFIRMED`}
                />
              </Paper>
            </Stack>
          </TabPanel>

          {/* Tab 3: Webhooks (antes era Tab 4) */}
          <TabPanel value={tabValue} index={2}>
            <Stack spacing={3}>
              <Paper sx={{ p: 4, borderRadius: 2 }}>
                <Typography variant="h5" fontWeight={600} gutterBottom>
                  🚀 Começando
                </Typography>
                <Typography variant="body1" color="text.secondary" paragraph>
                  Para integrar o ZucroPay em sua aplicação, você precisa:
                </Typography>

                <Box component="ol" sx={{ pl: 3 }}>
                  <li>
                    <Typography variant="body1" paragraph>
                      <strong>Obter sua API Key</strong> - Disponível no dashboard
                    </Typography>
                  </li>
                  <li>
                    <Typography variant="body1" paragraph>
                      <strong>Configurar a URL base da API:</strong>
                    </Typography>
                    <CodeBlock
                      label="URL Base"
                      code={apiBaseUrl}
                      language="text"
                    />
                  </li>
                  <li>
                    <Typography variant="body1" paragraph>
                      <strong>Fazer sua primeira requisição</strong>
                    </Typography>
                  </li>
                </Box>
              </Paper>

              <Paper sx={{ p: 4, borderRadius: 2 }}>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  📝 Exemplo: Criar um Pagamento
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Exemplo básico de como criar um pagamento usando JavaScript/Fetch:
                </Typography>

                <CodeBlock
                  label="Código JavaScript"
                  language="javascript"
                  code={`// Criar um pagamento
const response = await fetch('${apiBaseUrl}/payments.php', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer SEU_TOKEN_JWT'
  },
  body: JSON.stringify({
    billingType: 'PIX', // ou 'BOLETO', 'CREDIT_CARD'
    value: 100.00,
    customer: {
      name: 'João Silva',
      cpfCnpj: '12345678900',
      email: 'joao@email.com',
      mobilePhone: '11999999999'
    },
    description: 'Pedido #123'
  })
});

const data = await response.json();
console.log(data);
// Retorna: { success: true, payment: {...}, pixQrCode: "...", pixCopyPaste: "..." }`}
                />
              </Paper>

              <Paper sx={{ p: 4, borderRadius: 2, bgcolor: '#e3f2fd' }}>
                <Typography variant="h6" fontWeight={600} gutterBottom color="primary">
                  💡 Dica Importante
                </Typography>
                <Typography variant="body2">
                  Sempre valide os pagamentos através de webhooks para garantir a segurança. Nunca confie apenas em callbacks do frontend!
                </Typography>
              </Paper>

              {/* Exemplo Completo de Loja Virtual */}
              <Paper sx={{ p: 4, borderRadius: 2, bgcolor: '#e8f5e9' }}>
                <Typography variant="h5" fontWeight={600} gutterBottom color="success.main">
                  🛒 Exemplo Completo: Loja Virtual com Webhook
                </Typography>
                <Typography variant="body1" color="text.secondary" paragraph>
                  Este é um exemplo funcional completo de integração do ZucroPay em uma loja virtual, incluindo:
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li><Typography>✅ Criação do pagamento</Typography></li>
                  <li><Typography>✅ Exibição do QR Code PIX</Typography></li>
                  <li><Typography>✅ Webhook para confirmação automática</Typography></li>
                  <li><Typography>✅ Atualização do status do pedido</Typography></li>
                  <li><Typography>✅ Liberação automática do produto</Typography></li>
                </Box>

                <Typography variant="h6" fontWeight={600} gutterBottom sx={{ mt: 3 }}>
                  1. Configurar Webhook (Painel ZucroPay)
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Primeiro, configure seu webhook no painel ZucroPay em <strong>Integrações → Webhooks</strong>:
                </Typography>
                <CodeBlock
                  label="URL do Webhook"
                  language="text"
                  code={`https://sua-loja.com.br/webhook-zucropay.php`}
                />

                <Typography variant="h6" fontWeight={600} gutterBottom sx={{ mt: 3 }}>
                  2. Criar Banco de Dados
                </Typography>
                <CodeBlock
                  label="SQL"
                  language="sql"
                  code={`CREATE TABLE pedidos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  produto_nome VARCHAR(200),
  valor DECIMAL(10,2),
  cliente_email VARCHAR(200),
  zucropay_payment_id VARCHAR(100),
  status ENUM('pendente', 'pago', 'cancelado') DEFAULT 'pendente',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`}
                />

                <Typography variant="h6" fontWeight={600} gutterBottom sx={{ mt: 3 }}>
                  3. Página de Checkout (checkout.php)
                </Typography>
                <CodeBlock
                  label="PHP - Checkout"
                  language="php"
                  code={`<?php
// checkout.php - Página de checkout da sua loja

require_once 'config.php';

// Dados do produto (você pode buscar do banco)
$produto = [
    'nome' => 'Curso de PHP Avançado',
    'preco' => 297.00
];

// Dados do cliente do formulário
$cliente = [
    'name' => $_POST['nome'],
    'cpfCnpj' => $_POST['cpf'],
    'email' => $_POST['email'],
    'mobilePhone' => $_POST['telefone']
];

// 1. Salvar pedido no banco como PENDENTE
$stmt = $pdo->prepare("
    INSERT INTO pedidos (produto_nome, valor, cliente_email, status)
    VALUES (?, ?, ?, 'pendente')
");
$stmt->execute([$produto['nome'], $produto['preco'], $cliente['email']]);
$pedido_id = $pdo->lastInsertId();

// 2. Criar pagamento no ZucroPay
$curl = curl_init();
curl_setopt_array($curl, [
    CURLOPT_URL => '${apiBaseUrl}/payments.php',
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        'Authorization: Bearer ' . ZUCROPAY_API_KEY
    ],
    CURLOPT_POSTFIELDS => json_encode([
        'billingType' => 'PIX',
        'value' => $produto['preco'],
        'customer' => $cliente,
        'description' => $produto['nome'],
        'externalReference' => $pedido_id // SEU ID interno
    ])
]);

$response = curl_exec($curl);
$payment = json_decode($response, true);
curl_close($curl);

if ($payment['success']) {
    // 3. Salvar ID do pagamento no banco
    $stmt = $pdo->prepare("
        UPDATE pedidos 
        SET zucropay_payment_id = ? 
        WHERE id = ?
    ");
    $stmt->execute([$payment['payment']['id'], $pedido_id]);
    
    // 4. Exibir QR Code PIX para o cliente
    ?>
    <!DOCTYPE html>
    <html>
    <head>
        <title>Pagamento - <?= $produto['nome'] ?></title>
        <style>
            .container { max-width: 600px; margin: 50px auto; text-align: center; }
            .qrcode { max-width: 300px; margin: 20px auto; }
            .pix-code { 
                background: #f5f5f5; 
                padding: 15px; 
                border-radius: 8px;
                word-break: break-all;
                font-family: monospace;
            }
            .btn-copy { 
                margin-top: 10px;
                padding: 10px 20px;
                background: #4CAF50;
                color: white;
                border: none;
                border-radius: 5px;
                cursor: pointer;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h2>🛒 Finalize seu Pagamento</h2>
            <p><strong><?= $produto['nome'] ?></strong></p>
            <p>Valor: R$ <?= number_format($produto['preco'], 2, ',', '.') ?></p>
            
            <h3>📱 Escaneie o QR Code:</h3>
            <img src="data:image/png;base64,<?= $payment['pixQrCode'] ?>" 
                 class="qrcode" 
                 alt="QR Code PIX">
            
            <h3>💳 Ou use o Código PIX:</h3>
            <div class="pix-code" id="pix-code">
                <?= $payment['pixCopyPaste'] ?>
            </div>
            <button class="btn-copy" onclick="copiarPix()">
                📋 Copiar Código PIX
            </button>
            
            <p id="status" style="margin-top: 30px; font-weight: bold;">
                ⏳ Aguardando pagamento...
            </p>
        </div>
        
        <script>
        // Copiar código PIX
        function copiarPix() {
            const codigo = document.getElementById('pix-code').textContent;
            navigator.clipboard.writeText(codigo);
            alert('✅ Código PIX copiado!');
        }
        
        // Verificar pagamento a cada 3 segundos
        const pedidoId = <?= $pedido_id ?>;
        const checkInterval = setInterval(async () => {
            const response = await fetch('verificar-pagamento.php?pedido_id=' + pedidoId);
            const data = await response.json();
            
            if (data.status === 'pago') {
                clearInterval(checkInterval);
                document.getElementById('status').innerHTML = 
                    '✅ <span style="color: green;">Pagamento Confirmado!</span>';
                setTimeout(() => {
                    window.location.href = 'obrigado.php?pedido_id=' + pedidoId;
                }, 2000);
            }
        }, 3000);
        </script>
    </body>
    </html>
    <?php
} else {
    echo '<h2>❌ Erro ao processar pagamento</h2>';
    echo '<p>' . ($payment['message'] ?? 'Erro desconhecido') . '</p>';
}
?>`}
                />

                <Typography variant="h6" fontWeight={600} gutterBottom sx={{ mt: 3 }}>
                  4. Webhook (webhook-zucropay.php)
                </Typography>
                <CodeBlock
                  label="PHP - Webhook"
                  language="php"
                  code={`<?php
// webhook-zucropay.php - Recebe notificações do ZucroPay

require_once 'config.php';

// 1. Receber payload do webhook
$payload = file_get_contents('php://input');
$data = json_decode($payload, true);

// 2. Validar assinatura (IMPORTANTE para segurança)
$signature = $_SERVER['HTTP_X_ZUCROPAY_SIGNATURE'] ?? '';
$expectedSignature = hash_hmac('sha256', $payload, ZUCROPAY_WEBHOOK_SECRET);

if (!hash_equals($expectedSignature, $signature)) {
    http_response_code(401);
    exit('Assinatura inválida');
}

// 3. Log do webhook (para debug)
file_put_contents(
    'webhook-logs.txt', 
    date('Y-m-d H:i:s') . " - " . $payload . "\\n\\n", 
    FILE_APPEND
);

// 4. Processar evento
switch ($data['event']) {
    case 'PAYMENT_RECEIVED':
        // Pagamento foi CONFIRMADO!
        $paymentId = $data['payment']['id'];
        $externalRef = $data['payment']['externalReference'];
        $value = $data['payment']['value'];
        
        // Atualizar pedido no banco
        $stmt = $pdo->prepare("
            UPDATE pedidos 
            SET status = 'pago'
            WHERE id = ? AND zucropay_payment_id = ?
        ");
        $stmt->execute([$externalRef, $paymentId]);
        
        // Buscar dados do pedido
        $stmt = $pdo->prepare("SELECT * FROM pedidos WHERE id = ?");
        $stmt->execute([$externalRef]);
        $pedido = $stmt->fetch();
        
        if ($pedido) {
            // 📧 Enviar email de confirmação
            $assunto = "✅ Pagamento Confirmado - Pedido #{$externalRef}";
            $mensagem = "
                Olá!
                
                Seu pagamento de R$ " . number_format($value, 2, ',', '.') . " foi confirmado!
                
                Produto: {$pedido['produto_nome']}
                Pedido: #{$externalRef}
                
                Seu acesso foi liberado automaticamente.
                
                Obrigado pela compra!
            ";
            mail($pedido['cliente_email'], $assunto, $mensagem);
            
            // 🎁 Liberar produto digital (exemplo)
            liberarAcessoCurso($pedido['cliente_email'], $pedido['produto_nome']);
            
            // 📊 Registrar no analytics
            registrarVenda($externalRef, $value);
        }
        
        // Log de sucesso
        error_log("✅ Pagamento {$paymentId} confirmado - Pedido {$externalRef}");
        break;
        
    case 'PAYMENT_PENDING':
        // Pagamento criado, aguardando confirmação
        error_log("⏳ Pagamento pendente: " . $data['payment']['id']);
        break;
        
    case 'PAYMENT_OVERDUE':
        // Pagamento venceu (boleto, por exemplo)
        $externalRef = $data['payment']['externalReference'];
        
        $stmt = $pdo->prepare("
            UPDATE pedidos 
            SET status = 'cancelado' 
            WHERE id = ?
        ");
        $stmt->execute([$externalRef]);
        
        error_log("⚠️ Pagamento vencido: " . $data['payment']['id']);
        break;
}

// 5. SEMPRE retornar 200 OK
http_response_code(200);
echo json_encode(['received' => true]);

// Funções auxiliares
function liberarAcessoCurso($email, $curso) {
    // Implementar lógica de liberação do curso
    // Ex: criar usuário na plataforma EAD, enviar credenciais, etc
}

function registrarVenda($pedidoId, $valor) {
    // Registrar no Google Analytics, Facebook Pixel, etc
}
?>`}
                />

                <Typography variant="h6" fontWeight={600} gutterBottom sx={{ mt: 3 }}>
                  5. Verificar Status do Pagamento (verificar-pagamento.php)
                </Typography>
                <CodeBlock
                  label="PHP - Verificação"
                  language="php"
                  code={`<?php
// verificar-pagamento.php - Verifica status do pedido

require_once 'config.php';

$pedidoId = $_GET['pedido_id'] ?? null;

if (!$pedidoId) {
    echo json_encode(['success' => false]);
    exit;
}

$stmt = $pdo->prepare("SELECT status FROM pedidos WHERE id = ?");
$stmt->execute([$pedidoId]);
$pedido = $stmt->fetch();

echo json_encode([
    'success' => true,
    'status' => $pedido['status'] ?? 'pendente'
]);
?>`}
                />

                <Typography variant="h6" fontWeight={600} gutterBottom sx={{ mt: 3 }}>
                  6. Configuração (config.php)
                </Typography>
                <CodeBlock
                  label="PHP - Config"
                  language="php"
                  code={`<?php
// config.php - Configurações

// Suas credenciais ZucroPay
define('ZUCROPAY_API_KEY', 'zucropay_live_sua_chave_aqui');
define('ZUCROPAY_WEBHOOK_SECRET', 'seu_webhook_secret_aqui');

// Banco de dados
$pdo = new PDO(
    'mysql:host=localhost;dbname=sua_loja',
    'usuario',
    'senha',
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
);
?>`}
                />

                <Alert severity="success" sx={{ mt: 3 }}>
                  <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                    ✅ Sistema Completo Implementado!
                  </Typography>
                  <Typography variant="body2">
                    Com este código você tem uma integração <strong>100% funcional</strong> que:
                    <br />• Cria o pagamento no ZucroPay
                    <br />• Exibe QR Code PIX para o cliente
                    <br />• Recebe confirmação automática via webhook
                    <br />• Atualiza o status do pedido no banco
                    <br />• Envia email de confirmação
                    <br />• Libera o produto automaticamente
                  </Typography>
                </Alert>
              </Paper>
            </Stack>
          </TabPanel>

          {/* Tab 2: Integrações */}
          <TabPanel value={tabValue} index={1}>
            <Stack spacing={3}>
              {/* Integração E-commerce */}
              <Paper sx={{ p: 4, borderRadius: 2 }}>
                <Typography variant="h5" fontWeight={600} gutterBottom>
                  🛒 Integração E-commerce / Loja Virtual
                </Typography>
                <Typography variant="body1" color="text.secondary" paragraph>
                  Integre o ZucroPay em sua loja virtual para aceitar pagamentos via PIX, Boleto e Cartão.
                </Typography>

                <Divider sx={{ my: 3 }} />

                <Typography variant="h6" fontWeight={600} gutterBottom>
                  Passo 1: Criar o Checkout
                </Typography>
                <CodeBlock
                  label="PHP E-commerce"
                  language="php"
                  code={`<?php
// checkout.php - Página de checkout da sua loja

$produto_id = $_GET['produto_id'];
$produto = buscarProduto($produto_id); // Sua função

// Dados do cliente do formulário
$cliente = [
    'name' => $_POST['nome'],
    'cpfCnpj' => $_POST['cpf'],
    'email' => $_POST['email'],
    'mobilePhone' => $_POST['telefone']
];

// Criar pagamento no ZucroPay
$curl = curl_init();
curl_setopt_array($curl, [
    CURLOPT_URL => '${apiBaseUrl}/payments.php',
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        'Authorization: Bearer ' . SEU_TOKEN_JWT
    ],
    CURLOPT_POSTFIELDS => json_encode([
        'billingType' => 'PIX',
        'value' => $produto['preco'],
        'customer' => $cliente,
        'description' => 'Pedido #' . $pedido_id,
        'externalReference' => $pedido_id // Seu ID interno
    ])
]);

$response = curl_exec($curl);
$payment = json_decode($response, true);

if ($payment['success']) {
    // Exibir QR Code PIX
    echo '<img src="data:image/png;base64,' . $payment['pixQrCode'] . '">';
    echo '<p>Código PIX: ' . $payment['pixCopyPaste'] . '</p>';
    
    // Salvar ID do pagamento no seu banco
    salvarPagamento($pedido_id, $payment['payment']['id']);
}
?>`}
                />

                <Divider sx={{ my: 3 }} />

                <Typography variant="h6" fontWeight={600} gutterBottom>
                  Passo 2: Configurar Webhook
                </Typography>
                <CodeBlock
                  label="PHP Webhook"
                  language="php"
                  code={`<?php
// webhook.php - Recebe notificações de pagamento

$payload = file_get_contents('php://input');
$data = json_decode($payload, true);

// Validar webhook (opcional mas recomendado)
$signature = $_SERVER['HTTP_X_ZUCROPAY_SIGNATURE'] ?? '';
if (!validarAssinatura($payload, $signature)) {
    http_response_code(401);
    exit;
}

// Processar evento
switch ($data['event']) {
    case 'PAYMENT_RECEIVED':
        $payment_id = $data['payment']['id'];
        $external_reference = $data['payment']['externalReference'];
        
        // Atualizar pedido no seu sistema
        atualizarStatusPedido($external_reference, 'pago');
        
        // Enviar email de confirmação
        enviarEmailConfirmacao($external_reference);
        
        // Liberar produto digital, etc
        liberarProduto($external_reference);
        break;
        
    case 'PAYMENT_OVERDUE':
        // Pagamento vencido
        notificarClienteAtraso($data['payment']['externalReference']);
        break;
}

http_response_code(200);
echo json_encode(['received' => true]);
?>`}
                />

                <Divider sx={{ my: 3 }} />

                <Typography variant="h6" fontWeight={600} gutterBottom>
                  Exemplo Completo em JavaScript (Frontend)
                </Typography>
                <CodeBlock
                  label="JavaScript Checkout"
                  language="javascript"
                  code={`// checkout.js - Página de checkout em React/Vue/Angular

async function finalizarCompra(carrinho, cliente) {
  try {
    // 1. Calcular total
    const total = carrinho.reduce((sum, item) => sum + item.preco * item.qtd, 0);
    
    // 2. Criar pagamento
    const response = await fetch('${apiBaseUrl}/payments.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + localStorage.getItem('token')
      },
      body: JSON.stringify({
        billingType: 'PIX',
        value: total,
        customer: {
          name: cliente.nome,
          cpfCnpj: cliente.cpf,
          email: cliente.email,
          mobilePhone: cliente.telefone
        },
        description: \`Pedido #\${gerarNumeroPedido()}\`,
        externalReference: gerarIdUnico()
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      // 3. Exibir QR Code PIX
      document.getElementById('qrcode').src = 
        'data:image/png;base64,' + data.pixQrCode;
      
      document.getElementById('pix-code').textContent = 
        data.pixCopyPaste;
      
      // 4. Verificar pagamento a cada 5 segundos
      const checkInterval = setInterval(async () => {
        const status = await verificarPagamento(data.payment.id);
        
        if (status === 'RECEIVED') {
          clearInterval(checkInterval);
          mostrarSucesso();
          redirecionarParaObrigado();
        }
      }, 5000);
    }
  } catch (error) {
    console.error('Erro ao criar pagamento:', error);
    mostrarErro('Falha ao processar pagamento');
  }
}

// Copiar código PIX
function copiarCodigoPix() {
  const codigo = document.getElementById('pix-code').textContent;
  navigator.clipboard.writeText(codigo);
  alert('Código PIX copiado!');
}`}
                />
              </Paper>

              {/* Integração WordPress/WooCommerce */}
              <Paper sx={{ p: 4, borderRadius: 2 }}>
                <Typography variant="h5" fontWeight={600} gutterBottom>
                  🔌 Plugin WordPress / WooCommerce
                </Typography>
                <Typography variant="body1" color="text.secondary" paragraph>
                  Integre facilmente com WordPress e WooCommerce:
                </Typography>

                <CodeBlock
                  label="WordPress Plugin"
                  language="php"
                  code={`<?php
/**
 * Plugin Name: ZucroPay Gateway
 * Description: Aceite pagamentos via ZucroPay
 * Version: 1.0.0
 */

add_filter('woocommerce_payment_gateways', 'add_zucropay_gateway');

function add_zucropay_gateway($gateways) {
    $gateways[] = 'WC_Gateway_ZucroPay';
    return $gateways;
}

add_action('plugins_loaded', 'init_zucropay_gateway');

function init_zucropay_gateway() {
    class WC_Gateway_ZucroPay extends WC_Payment_Gateway {
        
        public function __construct() {
            $this->id = 'zucropay';
            $this->method_title = 'ZucroPay';
            $this->method_description = 'Aceite PIX, Boleto e Cartão';
            
            $this->init_form_fields();
            $this->init_settings();
            
            $this->title = $this->get_option('title');
            $this->api_key = $this->get_option('api_key');
            
            add_action('woocommerce_update_options_payment_gateways_' . 
                $this->id, [$this, 'process_admin_options']);
        }
        
        public function process_payment($order_id) {
            $order = wc_get_order($order_id);
            
            // Criar pagamento no ZucroPay
            $response = wp_remote_post('${apiBaseUrl}/payments.php', [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->api_key,
                    'Content-Type' => 'application/json'
                ],
                'body' => json_encode([
                    'billingType' => 'PIX',
                    'value' => $order->get_total(),
                    'customer' => [
                        'name' => $order->get_billing_first_name() . ' ' . 
                                 $order->get_billing_last_name(),
                        'email' => $order->get_billing_email(),
                        'cpfCnpj' => get_post_meta($order_id, '_billing_cpf', true),
                        'mobilePhone' => $order->get_billing_phone()
                    ],
                    'externalReference' => $order_id
                ])
            ]);
            
            $data = json_decode(wp_remote_retrieve_body($response), true);
            
            if ($data['success']) {
                // Salvar dados do pagamento
                update_post_meta($order_id, '_zucropay_payment_id', 
                    $data['payment']['id']);
                update_post_meta($order_id, '_zucropay_pix_code', 
                    $data['pixCopyPaste']);
                
                return [
                    'result' => 'success',
                    'redirect' => $this->get_return_url($order)
                ];
            }
            
            wc_add_notice('Erro ao processar pagamento', 'error');
            return;
        }
    }
}
?>`}
                />
              </Paper>
            </Stack>
          </TabPanel>

          {/* Tab 3: Referência API */}
          <TabPanel value={tabValue} index={2}>
            <Stack spacing={2}>
              <Typography variant="h5" fontWeight={600} gutterBottom>
                📖 Endpoints da API
              </Typography>

              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                    <Chip label="POST" color="success" size="small" />
                    <Typography fontWeight={600}>/payments.php</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto' }}>
                      Criar Pagamento
                    </Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Stack spacing={2}>
                    <Typography variant="subtitle2" fontWeight={600}>
                      Request Body:
                    </Typography>
                    <CodeBlock
                      label="Request"
                      language="json"
                      code={`{
  "billingType": "PIX", // PIX, BOLETO, CREDIT_CARD
  "value": 100.00,
  "customer": {
    "name": "João Silva",
    "cpfCnpj": "12345678900",
    "email": "joao@email.com",
    "mobilePhone": "11999999999"
  },
  "description": "Descrição do pagamento",
  "externalReference": "seu-id-interno", // Opcional
  "dueDate": "2025-12-31" // Opcional, para boleto
}`}
                    />
                    <Typography variant="subtitle2" fontWeight={600}>
                      Response:
                    </Typography>
                    <CodeBlock
                      label="Response"
                      language="json"
                      code={`{
  "success": true,
  "payment": {
    "id": "pay_abc123",
    "status": "PENDING",
    "value": 100.00,
    "billingType": "PIX"
  },
  "pixQrCode": "iVBORw0KG...", // Base64 da imagem
  "pixCopyPaste": "00020126580014br.gov.bcb.pix...",
  "invoiceUrl": "https://..." // Para boleto
}`}
                    />
                  </Stack>
                </AccordionDetails>
              </Accordion>

              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                    <Chip label="GET" color="primary" size="small" />
                    <Typography fontWeight={600}>/payments.php</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto' }}>
                      Listar Pagamentos
                    </Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Stack spacing={2}>
                    <Typography variant="subtitle2" fontWeight={600}>
                      Response:
                    </Typography>
                    <CodeBlock
                      label="Response"
                      language="json"
                      code={`{
  "success": true,
  "payments": [
    {
      "id": "pay_abc123",
      "customer_name": "João Silva",
      "value": 100.00,
      "status": "RECEIVED",
      "billing_type": "PIX",
      "created_at": "2025-10-02 10:30:00"
    }
  ]
}`}
                    />
                  </Stack>
                </AccordionDetails>
              </Accordion>

              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                    <Chip label="GET" color="primary" size="small" />
                    <Typography fontWeight={600}>/payments.php?id=:id</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto' }}>
                      Consultar Pagamento
                    </Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Stack spacing={2}>
                    <Typography variant="body2" color="text.secondary">
                      Consulta o status de um pagamento específico
                    </Typography>
                    <CodeBlock
                      label="Response"
                      language="json"
                      code={`{
  "success": true,
  "payment": {
    "id": "pay_abc123",
    "status": "RECEIVED",
    "value": 100.00,
    "billingType": "PIX",
    "customer": {
      "name": "João Silva",
      "email": "joao@email.com"
    },
    "created_at": "2025-10-02 10:30:00",
    "paid_at": "2025-10-02 10:35:00"
  }
}`}
                    />
                  </Stack>
                </AccordionDetails>
              </Accordion>

              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                    <Chip label="POST" color="success" size="small" />
                    <Typography fontWeight={600}>/products.php</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto' }}>
                      Criar Produto
                    </Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Stack spacing={2}>
                    <CodeBlock
                      label="Request"
                      language="json"
                      code={`{
  "name": "Produto Exemplo",
  "description": "Descrição do produto",
  "price": 99.90,
  "image_url": "https://..."
}`}
                    />
                  </Stack>
                </AccordionDetails>
              </Accordion>

              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                    <Chip label="GET" color="primary" size="small" />
                    <Typography fontWeight={600}>/balance.php</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto' }}>
                      Consultar Saldo
                    </Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Stack spacing={2}>
                    <CodeBlock
                      label="Response"
                      language="json"
                      code={`{
  "success": true,
  "balance": 1500.50,
  "available": 1200.00,
  "pending": 300.50
}`}
                    />
                  </Stack>
                </AccordionDetails>
              </Accordion>
            </Stack>
          </TabPanel>

          {/* Tab 4: Webhooks */}
          <TabPanel value={tabValue} index={3}>
            <Stack spacing={3}>
              <Paper sx={{ p: 4, borderRadius: 2 }}>
                <Typography variant="h5" fontWeight={600} gutterBottom>
                  🔔 Webhooks
                </Typography>
                <Typography variant="body1" color="text.secondary" paragraph>
                  Receba notificações em tempo real sobre eventos de pagamento.
                </Typography>

                <Alert severity="info" sx={{ mb: 3 }}>
                  Configure sua URL de webhook em{' '}
                  <Button
                    size="small"
                    onClick={() => window.location.href = '/webhooks'}
                    sx={{ textTransform: 'none', p: 0, minWidth: 'auto', verticalAlign: 'baseline', fontWeight: 600 }}
                  >
                    Configurações → Webhooks
                  </Button>
                </Alert>

                <Typography variant="h6" fontWeight={600} gutterBottom>
                  Eventos Disponíveis:
                </Typography>

                <Box component="ul" sx={{ pl: 3 }}>
                  <li><Typography><strong>PAYMENT_RECEIVED</strong> - Pagamento confirmado</Typography></li>
                  <li><Typography><strong>PAYMENT_PENDING</strong> - Pagamento pendente</Typography></li>
                  <li><Typography><strong>PAYMENT_OVERDUE</strong> - Pagamento vencido</Typography></li>
                  <li><Typography><strong>PAYMENT_REFUNDED</strong> - Pagamento estornado</Typography></li>
                </Box>

                <Divider sx={{ my: 3 }} />

                <Typography variant="h6" fontWeight={600} gutterBottom>
                  Estrutura do Webhook:
                </Typography>
                <CodeBlock
                  label="Webhook Payload"
                  language="json"
                  code={`{
  "event": "PAYMENT_RECEIVED",
  "payment": {
    "id": "pay_abc123",
    "status": "RECEIVED",
    "value": 100.00,
    "billingType": "PIX",
    "customer": {
      "name": "João Silva",
      "email": "joao@email.com"
    },
    "externalReference": "seu-id-interno",
    "paid_at": "2025-10-02 10:35:00"
  },
  "timestamp": "2025-10-02T10:35:00Z"
}`}
                />

                <Divider sx={{ my: 3 }} />

                <Typography variant="h6" fontWeight={600} gutterBottom>
                  Implementação do Webhook:
                </Typography>
                <CodeBlock
                  label="PHP Webhook Handler"
                  language="php"
                  code={`<?php
// webhook-handler.php

// Receber payload
$payload = file_get_contents('php://input');
$data = json_decode($payload, true);

// Validar assinatura (recomendado)
$signature = $_SERVER['HTTP_X_ZUCROPAY_SIGNATURE'] ?? '';
$expectedSignature = hash_hmac('sha256', $payload, YOUR_WEBHOOK_SECRET);

if (!hash_equals($expectedSignature, $signature)) {
    http_response_code(401);
    exit('Assinatura inválida');
}

// Processar evento
switch ($data['event']) {
    case 'PAYMENT_RECEIVED':
        // Pagamento confirmado
        $paymentId = $data['payment']['id'];
        $externalRef = $data['payment']['externalReference'];
        
        // Atualizar seu banco de dados
        $pdo->prepare("
            UPDATE pedidos 
            SET status = 'pago', 
                payment_id = ? 
            WHERE id = ?
        ")->execute([$paymentId, $externalRef]);
        
        // Enviar email de confirmação
        mail($data['payment']['customer']['email'], 
             'Pagamento Confirmado', 
             'Seu pagamento foi confirmado!');
        
        // Log
        error_log("Pagamento $paymentId confirmado");
        break;
        
    case 'PAYMENT_OVERDUE':
        // Pagamento vencido
        notificarClienteVencimento($data['payment']);
        break;
        
    case 'PAYMENT_REFUNDED':
        // Pagamento estornado
        processarEstorno($data['payment']);
        break;
}

// Sempre retornar 200
http_response_code(200);
echo json_encode(['received' => true]);
?>`}
                />
              </Paper>

              <Paper sx={{ p: 4, borderRadius: 2, bgcolor: '#fff3e0' }}>
                <Typography variant="h6" fontWeight={600} gutterBottom color="warning.main">
                  ⚠️ Segurança
                </Typography>
                <Typography variant="body2">
                  • Sempre valide a assinatura do webhook<br />
                  • Use HTTPS na URL do webhook<br />
                  • Retorne status 200 rapidamente (processe em background se necessário)<br />
                  • Implemente retry logic para falhas<br />
                  • Não confie em dados do frontend, sempre valide pelo webhook
                </Typography>
              </Paper>
            </Stack>
          </TabPanel>

          {/* Tab 5: Autenticação */}
          <TabPanel value={tabValue} index={4}>
            <Stack spacing={3}>
              <Paper sx={{ p: 4, borderRadius: 2 }}>
                <Typography variant="h5" fontWeight={600} gutterBottom>
                  🔐 Autenticação
                </Typography>
                <Typography variant="body1" color="text.secondary" paragraph>
                  A API ZucroPay usa autenticação via JWT (JSON Web Token).
                </Typography>

                <Divider sx={{ my: 3 }} />

                <Typography variant="h6" fontWeight={600} gutterBottom>
                  Obtendo seu Token:
                </Typography>
                <CodeBlock
                  label="Login"
                  language="javascript"
                  code={`// 1. Fazer login
const response = await fetch('${apiBaseUrl}/login.php', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'seu@email.com',
    password: 'sua-senha'
  })
});

const data = await response.json();
const token = data.token;

// 2. Salvar token (exemplo: localStorage)
localStorage.setItem('token', token);

// 3. Usar token em todas as requisições
const payments = await fetch('${apiBaseUrl}/payments.php', {
  headers: {
    'Authorization': 'Bearer ' + token
  }
});`}
                />

                <Divider sx={{ my: 3 }} />

                <Typography variant="h6" fontWeight={600} gutterBottom>
                  Headers Necessários:
                </Typography>
                <CodeBlock
                  label="Headers"
                  language="text"
                  code={`Authorization: Bearer SEU_TOKEN_JWT
Content-Type: application/json`}
                />

                <Divider sx={{ my: 3 }} />

                <Typography variant="h6" fontWeight={600} gutterBottom>
                  Tratamento de Erros:
                </Typography>
                <CodeBlock
                  label="Error Handling"
                  language="javascript"
                  code={`async function chamarAPI() {
  try {
    const response = await fetch('${apiBaseUrl}/payments.php', {
      headers: {
        'Authorization': 'Bearer ' + localStorage.getItem('token')
      }
    });
    
    if (response.status === 401) {
      // Token expirado ou inválido
      console.log('Faça login novamente');
      window.location.href = '/login';
      return;
    }
    
    if (!response.ok) {
      throw new Error('Erro na API');
    }
    
    const data = await response.json();
    return data;
    
  } catch (error) {
    console.error('Erro:', error);
  }
}`}
                />
              </Paper>

              <Paper sx={{ p: 4, borderRadius: 2, bgcolor: '#e8f5e9' }}>
                <Typography variant="h6" fontWeight={600} gutterBottom color="success.main">
                  ✅ Boas Práticas
                </Typography>
                <Typography variant="body2">
                  • Nunca exponha seu token no código frontend<br />
                  • Use variáveis de ambiente para credenciais<br />
                  • Implemente refresh token se necessário<br />
                  • Sempre use HTTPS em produção<br />
                  • Monitore tentativas de acesso não autorizado
                </Typography>
              </Paper>
            </Stack>
          </TabPanel>
        </Box>
      </Box>
    </>
  );
};

export default ApiDocs;
