import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  IconButton,
  Alert,
  Divider,
  Chip,
  Stack,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  TextField,
  InputAdornment,
  Snackbar,
} from '@mui/material';
import {
  ContentCopy as CopyIcon,
  ExpandMore as ExpandMoreIcon,
  Code as CodeIcon,
  Webhook as WebhookIcon,
  Key as KeyIcon,
  CheckCircle as CheckIcon,
  PlayArrow as PlayIcon,
  Api as ApiIcon,
  Security as SecurityIcon,
  ShoppingCart as ShopIcon,
} from '@mui/icons-material';
import Header from '../../components/Header/Header';
import * as api from '../../services/api-supabase';

const ApiDocs: React.FC = () => {
  const [copied, setCopied] = useState(false);
  const [copiedText, setCopiedText] = useState('');
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [webhookUrl, setWebhookUrl] = useState('');

  const API_BASE_URL = 'https://dashboard.appzucropay.com/api';

  useEffect(() => {
    loadApiKeys();
  }, []);

  const loadApiKeys = async () => {
    try {
      const keys = await api.getApiKeys();
      setApiKeys(keys);
    } catch (error) {
      console.error('Error loading API keys:', error);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setCopied(true);
  };

  const CodeBlock = ({ code, language = 'javascript', label }: { code: string; language?: string; label: string }) => (
    <Box sx={{ position: 'relative', mb: 2 }}>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        bgcolor: '#1e293b',
        px: 2,
        py: 1,
        borderRadius: '12px 12px 0 0',
      }}>
        <Chip 
          label={language} 
          size="small" 
          sx={{ 
            bgcolor: 'rgba(255,255,255,0.1)', 
            color: '#94a3b8',
            fontSize: 11,
            height: 24,
          }} 
        />
        <IconButton
          size="small"
          onClick={() => copyToClipboard(code, label)}
          sx={{ color: '#94a3b8', '&:hover': { color: 'white' } }}
        >
          <CopyIcon fontSize="small" />
        </IconButton>
      </Box>
      <Box
        sx={{
          bgcolor: '#0f172a',
          color: '#e2e8f0',
          p: 2.5,
          borderRadius: '0 0 12px 12px',
          fontFamily: '"Fira Code", "Monaco", monospace',
          fontSize: '0.85rem',
          lineHeight: 1.7,
          overflow: 'auto',
          maxHeight: 500,
        }}
      >
        <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          <code>{code}</code>
        </pre>
      </Box>
    </Box>
  );

  const EndpointCard = ({ 
    method, 
    endpoint, 
    title, 
    description, 
    requestBody, 
    responseBody 
  }: { 
    method: 'GET' | 'POST'; 
    endpoint: string; 
    title: string;
    description: string;
    requestBody?: string;
    responseBody: string;
  }) => (
    <Accordion sx={{ 
      borderRadius: '12px !important', 
      mb: 2, 
      overflow: 'hidden',
      '&:before': { display: 'none' },
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      border: '1px solid #e2e8f0',
    }}>
      <AccordionSummary 
        expandIcon={<ExpandMoreIcon />}
        sx={{ 
          bgcolor: '#f8fafc',
          '&:hover': { bgcolor: '#f1f5f9' },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
          <Chip 
            label={method} 
            size="small" 
            sx={{ 
              bgcolor: method === 'POST' ? '#22c55e' : '#3b82f6',
              color: 'white',
              fontWeight: 700,
              minWidth: 60,
            }} 
          />
          <Typography fontWeight={600} sx={{ fontFamily: 'monospace', color: '#334155' }}>
            {endpoint}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto', mr: 2 }}>
            {title}
          </Typography>
        </Box>
      </AccordionSummary>
      <AccordionDetails sx={{ bgcolor: 'white', pt: 3 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {description}
        </Typography>
        
        {requestBody && (
          <>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5, color: '#475569' }}>
              📤 Request Body
            </Typography>
            <CodeBlock code={requestBody} language="json" label="Request" />
          </>
        )}
        
        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5, color: '#475569' }}>
          📥 Response
        </Typography>
        <CodeBlock code={responseBody} language="json" label="Response" />
      </AccordionDetails>
    </Accordion>
  );

  return (
    <>
      <Header />
      <Box sx={{ minHeight: '100vh', bgcolor: '#f8fafc', pt: 10, pb: 6 }}>
        <Box sx={{ maxWidth: 1100, mx: 'auto', px: 3 }}>
          {/* Hero Header */}
          <Box sx={{ 
            textAlign: 'center', 
            mb: 5,
            py: 4,
          }}>
            <Box sx={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: 1.5, 
              mb: 2,
              px: 3,
              py: 1,
              bgcolor: '#eff6ff',
              borderRadius: 3,
            }}>
              <ApiIcon sx={{ color: '#3b82f6' }} />
              <Typography variant="body2" fontWeight={600} color="#3b82f6">
                API REST v1.0
              </Typography>
            </Box>
            
            <Typography variant="h3" fontWeight={800} sx={{ mb: 1.5, color: '#0f172a' }}>
              Documentação da API
            </Typography>
            <Typography variant="h6" color="text.secondary" fontWeight={400} sx={{ maxWidth: 600, mx: 'auto' }}>
              Integre pagamentos PIX, Boleto e Cartão em minutos
            </Typography>
          </Box>

          {/* Quick Start */}
          <Paper sx={{ 
            p: 4, 
            borderRadius: 4, 
            mb: 4,
            background: 'linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)',
            color: 'white',
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
              <Box sx={{ 
                width: 48, 
                height: 48, 
                borderRadius: 2, 
                bgcolor: 'rgba(255,255,255,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <PlayIcon sx={{ fontSize: 28 }} />
              </Box>
              <Box>
                <Typography variant="h5" fontWeight={700}>
                  🚀 Início Rápido
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.8 }}>
                  Comece a receber pagamentos em 5 minutos
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
              <Box sx={{ 
                bgcolor: 'rgba(255,255,255,0.05)', 
                borderRadius: 3, 
                p: 3,
                border: '1px solid rgba(255,255,255,0.1)',
              }}>
                <Typography variant="subtitle2" sx={{ mb: 2, opacity: 0.7 }}>
                  1️⃣ URL Base da API
                </Typography>
                <Box sx={{ 
                  bgcolor: 'rgba(0,0,0,0.3)', 
                  p: 2, 
                  borderRadius: 2,
                  fontFamily: 'monospace',
                  fontSize: 14,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <span>{API_BASE_URL}</span>
                  <IconButton 
                    size="small" 
                    onClick={() => copyToClipboard(API_BASE_URL, 'URL Base')}
                    sx={{ color: 'white' }}
                  >
                    <CopyIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Box>

              <Box sx={{ 
                bgcolor: 'rgba(255,255,255,0.05)', 
                borderRadius: 3, 
                p: 3,
                border: '1px solid rgba(255,255,255,0.1)',
              }}>
                <Typography variant="subtitle2" sx={{ mb: 2, opacity: 0.7 }}>
                  2️⃣ Sua API Key
                </Typography>
                <Box sx={{ 
                  bgcolor: 'rgba(0,0,0,0.3)', 
                  p: 2, 
                  borderRadius: 2,
                  fontFamily: 'monospace',
                  fontSize: 14,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <span>{apiKeys.length > 0 ? apiKeys[0].api_key : 'Crie em Integrações →'}</span>
                  {apiKeys.length > 0 && (
                    <IconButton 
                      size="small" 
                      onClick={() => copyToClipboard(apiKeys[0].api_key, 'API Key')}
                      sx={{ color: 'white' }}
                    >
                      <CopyIcon fontSize="small" />
                    </IconButton>
                  )}
                </Box>
              </Box>
            </Box>

            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle2" sx={{ mb: 2, opacity: 0.7 }}>
                3️⃣ Criar seu primeiro pagamento
              </Typography>
              <CodeBlock
                label="cURL"
                language="bash"
                code={`curl -X POST ${API_BASE_URL}/create-payment \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: ${apiKeys.length > 0 ? apiKeys[0].api_key : 'SUA_API_KEY'}" \\
  -d '{
    "amount": 99.90,
    "customer": {
      "name": "João Silva",
      "email": "joao@email.com",
      "cpfCnpj": "12345678900"
    },
    "description": "Produto XYZ",
    "billingType": "PIX"
  }'`}
              />
            </Box>
          </Paper>

          {/* API Endpoints */}
          <Paper sx={{ p: 4, borderRadius: 4, mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
              <CodeIcon sx={{ fontSize: 32, color: '#6366f1' }} />
              <Box>
                <Typography variant="h5" fontWeight={700}>
                  Endpoints da API
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Todos os endpoints disponíveis para integração
                </Typography>
              </Box>
            </Box>

            <EndpointCard
              method="POST"
              endpoint="/api/create-payment"
              title="Criar Pagamento"
              description="Cria um novo pagamento PIX, Boleto ou Cartão de Crédito. Retorna o QR Code PIX ou URL do boleto."
              requestBody={`{
  "amount": 99.90,
  "customer": {
    "name": "João Silva",
    "email": "joao@email.com",
    "cpfCnpj": "12345678900",
    "phone": "11999999999"
  },
  "description": "Descrição do produto",
  "billingType": "PIX",
  "externalReference": "PEDIDO-123"
}`}
              responseBody={`{
  "success": true,
  "payment": {
    "id": "pay_abc123def456",
    "status": "PENDING",
    "value": 99.90,
    "billingType": "PIX",
    "dueDate": "2025-12-18"
  },
  "pix": {
    "qrCode": "iVBORw0KGgoAAAANS...",
    "copyPaste": "00020126580014br.gov.bcb.pix..."
  },
  "checkoutUrl": "https://..."
}`}
            />

            <EndpointCard
              method="GET"
              endpoint="/api/check-payment?id=xxx"
              title="Consultar Pagamento"
              description="Consulta o status de um pagamento específico pelo ID."
              responseBody={`{
  "success": true,
  "payment": {
    "id": "pay_abc123def456",
    "status": "RECEIVED",
    "value": 99.90,
    "billingType": "PIX",
    "paymentDate": "2025-12-15",
    "confirmedDate": "2025-12-15T10:30:00Z"
  }
}`}
            />
          </Paper>

          {/* Integration Examples */}
          <Paper sx={{ p: 4, borderRadius: 4, mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
              <ShopIcon sx={{ fontSize: 32, color: '#22c55e' }} />
              <Box>
                <Typography variant="h5" fontWeight={700}>
                  Exemplos de Integração
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Código pronto para copiar e usar
                </Typography>
              </Box>
            </Box>

            <Accordion sx={{ 
              borderRadius: '12px !important', 
              mb: 2, 
              overflow: 'hidden',
              '&:before': { display: 'none' },
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              border: '1px solid #e2e8f0',
            }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography fontWeight={600}>JavaScript / React / Next.js</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <CodeBlock
                  label="JavaScript"
                  language="javascript"
                  code={`// Criar pagamento PIX
async function criarPagamentoPix(valor, cliente) {
  const response = await fetch('${API_BASE_URL}/create-payment', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': 'SUA_API_KEY'
    },
    body: JSON.stringify({
      amount: valor,
      customer: {
        name: cliente.nome,
        email: cliente.email,
        cpfCnpj: cliente.cpf
      },
      description: 'Meu Produto',
      billingType: 'PIX',
      externalReference: 'PEDIDO-' + Date.now()
    })
  });

  const data = await response.json();

  if (data.success) {
    // Exibir QR Code
    const qrCodeImg = 'data:image/png;base64,' + data.pix.qrCode;
    document.getElementById('qrcode').src = qrCodeImg;
    
    // Código PIX para copiar
    document.getElementById('pixCode').textContent = data.pix.copyPaste;
    
    // Verificar pagamento a cada 5 segundos
    const checkPayment = setInterval(async () => {
      const status = await verificarPagamento(data.payment.id);
      if (status === 'RECEIVED' || status === 'CONFIRMED') {
        clearInterval(checkPayment);
        alert('Pagamento confirmado!');
        window.location.href = '/obrigado';
      }
    }, 5000);
  }
}

// Verificar status do pagamento
async function verificarPagamento(paymentId) {
  const response = await fetch(\`${API_BASE_URL}/check-payment?id=\${paymentId}\`, {
    headers: { 'X-API-Key': 'SUA_API_KEY' }
  });
  const data = await response.json();
  return data.payment.status;
}`}
                />
              </AccordionDetails>
            </Accordion>

            <Accordion sx={{ 
              borderRadius: '12px !important', 
              mb: 2, 
              overflow: 'hidden',
              '&:before': { display: 'none' },
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              border: '1px solid #e2e8f0',
            }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography fontWeight={600}>PHP</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <CodeBlock
                  label="PHP"
                  language="php"
                  code={`<?php
// Criar pagamento PIX
function criarPagamentoPix($valor, $cliente) {
    $curl = curl_init();
    
    curl_setopt_array($curl, [
        CURLOPT_URL => '${API_BASE_URL}/create-payment',
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'X-API-Key: SUA_API_KEY'
        ],
        CURLOPT_POSTFIELDS => json_encode([
            'amount' => $valor,
            'customer' => [
                'name' => $cliente['nome'],
                'email' => $cliente['email'],
                'cpfCnpj' => $cliente['cpf']
            ],
            'description' => 'Meu Produto',
            'billingType' => 'PIX',
            'externalReference' => 'PEDIDO-' . time()
        ])
    ]);
    
    $response = curl_exec($curl);
    curl_close($curl);
    
    return json_decode($response, true);
}

// Exemplo de uso
$cliente = [
    'nome' => 'João Silva',
    'email' => 'joao@email.com',
    'cpf' => '12345678900'
];

$resultado = criarPagamentoPix(99.90, $cliente);

if ($resultado['success']) {
    // Exibir QR Code
    echo '<img src="data:image/png;base64,' . $resultado['pix']['qrCode'] . '">';
    
    // Código PIX
    echo '<p>Copie o código: ' . $resultado['pix']['copyPaste'] . '</p>';
}
?>`}
                />
              </AccordionDetails>
            </Accordion>

            <Accordion sx={{ 
              borderRadius: '12px !important', 
              mb: 2, 
              overflow: 'hidden',
              '&:before': { display: 'none' },
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              border: '1px solid #e2e8f0',
            }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography fontWeight={600}>Python</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <CodeBlock
                  label="Python"
                  language="python"
                  code={`import requests
import json

API_KEY = 'SUA_API_KEY'
API_URL = '${API_BASE_URL}'

def criar_pagamento_pix(valor, cliente):
    headers = {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY
    }
    
    payload = {
        'amount': valor,
        'customer': {
            'name': cliente['nome'],
            'email': cliente['email'],
            'cpfCnpj': cliente['cpf']
        },
        'description': 'Meu Produto',
        'billingType': 'PIX',
        'externalReference': f'PEDIDO-{int(time.time())}'
    }
    
    response = requests.post(
        f'{API_URL}/create-payment',
        headers=headers,
        json=payload
    )
    
    return response.json()

# Exemplo de uso
cliente = {
    'nome': 'João Silva',
    'email': 'joao@email.com',
    'cpf': '12345678900'
}

resultado = criar_pagamento_pix(99.90, cliente)

if resultado['success']:
    print(f"QR Code: data:image/png;base64,{resultado['pix']['qrCode']}")
    print(f"Código PIX: {resultado['pix']['copyPaste']}")`}
                />
              </AccordionDetails>
            </Accordion>
          </Paper>

          {/* Webhooks */}
          <Paper sx={{ p: 4, borderRadius: 4, mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
              <WebhookIcon sx={{ fontSize: 32, color: '#f59e0b' }} />
              <Box>
                <Typography variant="h5" fontWeight={700}>
                  Webhooks
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Receba notificações quando um pagamento for confirmado
                </Typography>
              </Box>
            </Box>

            <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
              <Typography variant="body2">
                <strong>URL do Webhook ZucroPay:</strong>{' '}
                <code style={{ 
                  background: '#e0f2fe', 
                  padding: '2px 8px', 
                  borderRadius: 4,
                  fontFamily: 'monospace'
                }}>
                  {API_BASE_URL}/asaas-webhook
                </code>
                <br /><br />
                Configure este URL na Asaas para receber notificações. Depois configure seu webhook em <strong>Integrações → Webhooks</strong> para receber no seu sistema.
              </Typography>
            </Alert>

            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
              Eventos Disponíveis:
            </Typography>
            
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: 3 }}>
              {[
                { event: 'PAYMENT_RECEIVED', desc: 'Pagamento confirmado' },
                { event: 'PAYMENT_PENDING', desc: 'Aguardando pagamento' },
                { event: 'PAYMENT_OVERDUE', desc: 'Pagamento vencido' },
                { event: 'PAYMENT_REFUNDED', desc: 'Pagamento estornado' },
              ].map((item) => (
                <Box key={item.event} sx={{ 
                  bgcolor: '#f8fafc', 
                  p: 2, 
                  borderRadius: 2,
                  border: '1px solid #e2e8f0',
                }}>
                  <Typography variant="body2" fontWeight={700} sx={{ fontFamily: 'monospace', color: '#6366f1' }}>
                    {item.event}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {item.desc}
                  </Typography>
                </Box>
              ))}
            </Box>

            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
              Exemplo de Payload:
            </Typography>
            <CodeBlock
              label="Webhook Payload"
              language="json"
              code={`{
  "event": "PAYMENT_RECEIVED",
  "payment": {
    "id": "pay_abc123def456",
    "status": "RECEIVED",
    "value": 99.90,
    "billingType": "PIX",
    "customer": {
      "name": "João Silva",
      "email": "joao@email.com"
    },
    "externalReference": "PEDIDO-123",
    "paymentDate": "2025-12-15",
    "confirmedDate": "2025-12-15T10:30:00Z"
  }
}`}
            />

            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2, mt: 3 }}>
              Implementação do Webhook (PHP):
            </Typography>
            <CodeBlock
              label="PHP Webhook Handler"
              language="php"
              code={`<?php
// webhook.php - Recebe notificações de pagamento

$payload = file_get_contents('php://input');
$data = json_decode($payload, true);

// Log para debug
file_put_contents('webhook.log', date('Y-m-d H:i:s') . " - " . $payload . "\\n", FILE_APPEND);

// Processar evento
switch ($data['event']) {
    case 'PAYMENT_RECEIVED':
        $paymentId = $data['payment']['id'];
        $externalRef = $data['payment']['externalReference'];
        
        // Atualizar seu banco de dados
        $pdo->prepare("UPDATE pedidos SET status = 'pago' WHERE id = ?")->execute([$externalRef]);
        
        // Enviar email de confirmação
        mail($data['payment']['customer']['email'], 'Pagamento Confirmado!', 'Obrigado pela compra!');
        
        // Liberar produto/serviço
        liberarProduto($externalRef);
        break;
        
    case 'PAYMENT_OVERDUE':
        // Pagamento vencido
        notificarCliente($data['payment']['externalReference']);
        break;
}

// IMPORTANTE: Sempre retornar 200
http_response_code(200);
echo json_encode(['received' => true]);
?>`}
            />
          </Paper>

          {/* Status Codes */}
          <Paper sx={{ p: 4, borderRadius: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
              <SecurityIcon sx={{ fontSize: 32, color: '#dc2626' }} />
              <Box>
                <Typography variant="h5" fontWeight={700}>
                  Status e Erros
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Códigos HTTP e status de pagamento
                </Typography>
              </Box>
            </Box>

            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
              Códigos HTTP:
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 2, mb: 4 }}>
              {[
                { code: '200', desc: 'Sucesso', color: '#22c55e' },
                { code: '400', desc: 'Dados inválidos', color: '#f59e0b' },
                { code: '401', desc: 'API Key inválida', color: '#dc2626' },
                { code: '404', desc: 'Não encontrado', color: '#dc2626' },
                { code: '500', desc: 'Erro interno', color: '#dc2626' },
              ].map((item) => (
                <Box key={item.code} sx={{ 
                  bgcolor: '#f8fafc', 
                  p: 2, 
                  borderRadius: 2,
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                }}>
                  <Chip label={item.code} size="small" sx={{ bgcolor: item.color, color: 'white', fontWeight: 700 }} />
                  <Typography variant="body2">{item.desc}</Typography>
                </Box>
              ))}
            </Box>

            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
              Status de Pagamento:
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
              {[
                { status: 'PENDING', desc: 'Aguardando pagamento', color: '#f59e0b' },
                { status: 'RECEIVED', desc: 'Pagamento recebido', color: '#22c55e' },
                { status: 'CONFIRMED', desc: 'Pagamento confirmado', color: '#22c55e' },
                { status: 'OVERDUE', desc: 'Pagamento vencido', color: '#dc2626' },
                { status: 'REFUNDED', desc: 'Pagamento estornado', color: '#6366f1' },
                { status: 'REFUND_REQUESTED', desc: 'Estorno solicitado', color: '#6366f1' },
              ].map((item) => (
                <Box key={item.status} sx={{ 
                  bgcolor: '#f8fafc', 
                  p: 2, 
                  borderRadius: 2,
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                }}>
                  <Chip label={item.status} size="small" sx={{ bgcolor: item.color, color: 'white', fontWeight: 700, minWidth: 120 }} />
                  <Typography variant="body2">{item.desc}</Typography>
                </Box>
              ))}
            </Box>
          </Paper>
        </Box>
      </Box>

      <Snackbar
        open={copied}
        autoHideDuration={2000}
        onClose={() => setCopied(false)}
        message={`✓ ${copiedText} copiado!`}
      />
    </>
  );
};

export default ApiDocs;
