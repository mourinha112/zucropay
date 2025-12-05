import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  IconButton,
  Divider,
} from '@mui/material';
import {
  Code as CodeIcon,
  IntegrationInstructions as IntegrationIcon,
  ShoppingCart as ShoppingCartIcon,
  Web as WebIcon,
  Close as CloseIcon,
  ContentCopy as CopyIcon,
  CheckCircle as CheckIcon,
} from '@mui/icons-material';
import Header from '../../components/Header/Header';
import { useNavigate } from 'react-router-dom';

interface IntegrationCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  status: 'active' | 'available' | 'configured';
  onConnect?: () => void;
  features?: string[];
}

const IntegrationCard: React.FC<IntegrationCardProps> = ({
  title,
  description,
  icon,
  status,
  onConnect,
  features = [],
}) => {
  const getStatusColor = () => {
    switch (status) {
      case 'active':
      case 'configured':
        return 'success';
      case 'available':
        return 'primary';
      default:
        return 'default';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'active':
      case 'configured':
        return 'Disponível';
      case 'available':
        return 'Disponível';
      default:
        return '';
    }
  };

  return (
    <Paper
      sx={{
        p: 3,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        transition: 'all 0.3s ease',
        border: status === 'configured' ? '2px solid #4caf50' : 'none',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 6,
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #5818C8 0%, #7B2FF7 100%)',
            color: 'white',
          }}
        >
          {icon}
        </Box>
        <Chip label={getStatusText()} color={getStatusColor()} size="small" />
      </Box>

      <Typography variant="h6" fontWeight={600}>
        {title}
      </Typography>

      <Typography variant="body2" color="text.secondary">
        {description}
      </Typography>

      {features.length > 0 && (
        <Box>
          {features.map((feature, index) => (
            <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <CheckIcon sx={{ fontSize: 16, color: 'success.main' }} />
              <Typography variant="body2">{feature}</Typography>
            </Box>
          ))}
        </Box>
      )}

      <Button
        variant="contained"
        fullWidth
        onClick={onConnect}
        sx={{ mt: 'auto' }}
      >
        Ver Documentação
      </Button>
    </Paper>
  );
};

const Integrations: React.FC = () => {
  const navigate = useNavigate();
  const [openApiKeyDialog, setOpenApiKeyDialog] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  // Carregar API Keys do backend
  React.useEffect(() => {
    loadApiKeys();
  }, []);

  const loadApiKeys = async () => {
    try {
      const token = localStorage.getItem('zucropay_token');
      const response = await fetch('http://localhost:8000/api-keys.php', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      if (data.success && data.apiKeys.length > 0) {
        setApiKeys(data.apiKeys); // Store keys
        setApiKey(data.apiKeys[0].api_key_full); // Primeira chave
        console.log('Loaded API Keys:', apiKeys);
      } else {
        // Se não tem nenhuma chave, criar uma automaticamente
        await createApiKey();
      }
    } catch (error) {
      console.error('Erro ao carregar API Keys:', error);
    } finally {
      setLoading(false);
    }
  };

  const createApiKey = async () => {
    try {
      const token = localStorage.getItem('zucropay_token');
      const response = await fetch('http://localhost:8000/api-keys.php', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: 'Chave Principal' })
      });
      
      const data = await response.json();
      if (data.success) {
        setApiKey(data.apiKey.api_key);
        loadApiKeys(); // Recarregar lista
      }
    } catch (error) {
      console.error('Erro ao criar API Key:', error);
    }
  };

  const handleCopyApiKey = () => {
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleViewDocs = () => {
    navigate('/api-docs');
  };

  return (
    <>
      <Header />
      <Box sx={{ minHeight: '100vh', backgroundColor: '#f5f5f5', pt: 10 }}>
        <Box sx={{ maxWidth: '1200px', mx: 'auto', p: 3 }}>
          <Box sx={{ mb: 4 }}>
            <Typography variant="h4" fontWeight={600} gutterBottom>
              🔌 Integrações
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Integre o ZucroPay em sua loja virtual ou aplicação
            </Typography>
          </Box>

          {/* API Key Section */}
          <Paper sx={{ p: 3, mb: 4, background: 'linear-gradient(135deg, #5818C8 0%, #7B2FF7 100%)' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'white' }}>
              <Box>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  🔑 Sua API Key
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Use esta chave para autenticar suas requisições
                </Typography>
              </Box>
              <Button
                variant="contained"
                sx={{ bgcolor: 'white', color: '#5818C8', '&:hover': { bgcolor: '#f5f5f5' } }}
                onClick={() => setOpenApiKeyDialog(true)}
              >
                Ver Chave
              </Button>
            </Box>
          </Paper>

          {/* Alerts */}
          <Alert severity="success" sx={{ mb: 2, bgcolor: '#e8f5e9', border: 2, borderColor: '#4caf50' }}>
            <Typography variant="body2" fontWeight={600}>
              ✅ <strong>Integração Simples!</strong> Agora você pode integrar pagamentos <strong>sem configurar banco de dados</strong>!{' '}
              <Button
                size="small"
                onClick={handleViewDocs}
                sx={{ textTransform: 'none', p: 0, minWidth: 'auto', verticalAlign: 'baseline', fontWeight: 600 }}
              >
                Ver SDK JavaScript
              </Button>
            </Typography>
          </Alert>

          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              📚 Veja a{' '}
              <Button
                size="small"
                onClick={handleViewDocs}
                sx={{ textTransform: 'none', p: 0, minWidth: 'auto', verticalAlign: 'baseline' }}
              >
                Documentação Completa
              </Button>
              {' '}com exemplos para WordPress, WooCommerce, React e HTML puro.
            </Typography>
          </Alert>

          <Alert severity="warning" sx={{ mb: 4 }}>
            <Typography variant="body2">
              🔔 Configure{' '}
              <Button
                size="small"
                onClick={() => navigate('/webhooks')}
                sx={{ textTransform: 'none', p: 0, minWidth: 'auto', verticalAlign: 'baseline' }}
              >
                Webhooks
              </Button>
              {' '}para receber notificações automáticas de pagamentos confirmados.
            </Typography>
          </Alert>

          {/* SDK JavaScript - Destaque Principal */}
          <Paper 
            sx={{ 
              p: 4, 
              mb: 4,
              background: 'linear-gradient(135deg, #5818C8 0%, #7B2FF7 100%)',
              color: 'white',
              borderRadius: 3,
              position: 'relative',
              overflow: 'hidden',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: -50,
                right: -50,
                width: 200,
                height: 200,
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '50%',
              }
            }}
          >
            <Box sx={{ position: 'relative', zIndex: 1 }}>
              <Chip 
                label="⚡ RECOMENDADO" 
                sx={{ 
                  bgcolor: '#FFD700', 
                  color: '#000', 
                  fontWeight: 700,
                  mb: 2 
                }} 
              />
              <Typography variant="h4" fontWeight={700} gutterBottom>
                🚀 SDK JavaScript (Integração Simples)
              </Typography>
              <Typography variant="h6" sx={{ mb: 3, opacity: 0.95 }}>
                Integre pagamentos em <strong>5 minutos</strong> sem precisar configurar banco de dados!
              </Typography>
              
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2, mb: 3 }}>
                <Box sx={{ bgcolor: 'rgba(255,255,255,0.2)', p: 2, borderRadius: 2 }}>
                  <Typography variant="body2" fontWeight={600}>✅ Sem Banco de Dados</Typography>
                  <Typography variant="caption">Tudo gerenciado pelo ZucroPay</Typography>
                </Box>
                <Box sx={{ bgcolor: 'rgba(255,255,255,0.2)', p: 2, borderRadius: 2 }}>
                  <Typography variant="body2" fontWeight={600}>✅ 10 Linhas de Código</Typography>
                  <Typography variant="caption">Copiar, colar, pronto!</Typography>
                </Box>
                <Box sx={{ bgcolor: 'rgba(255,255,255,0.2)', p: 2, borderRadius: 2 }}>
                  <Typography variant="body2" fontWeight={600}>✅ Modal Incluído</Typography>
                  <Typography variant="caption">QR Code PIX automático</Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Button
                  variant="contained"
                  size="large"
                  onClick={handleViewDocs}
                  sx={{ 
                    bgcolor: 'white', 
                    color: '#5818C8',
                    fontWeight: 600,
                    '&:hover': { bgcolor: '#f5f5f5', transform: 'translateY(-2px)' },
                    transition: 'all 0.3s'
                  }}
                >
                  📖 Ver Documentação e Exemplos
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  href="/exemplos-sdk.html"
                  target="_blank"
                  sx={{ 
                    borderColor: 'white',
                    color: 'white',
                    fontWeight: 600,
                    '&:hover': { 
                      borderColor: 'white', 
                      bgcolor: 'rgba(255,255,255,0.1)',
                      transform: 'translateY(-2px)'
                    },
                    transition: 'all 0.3s'
                  }}
                >
                  💻 Testar Agora (Demos)
                </Button>
              </Box>
            </Box>
          </Paper>

          {/* Outras Integrações */}
          <Typography variant="h5" fontWeight={600} gutterBottom sx={{ mb: 3 }}>
            📦 Outras Opções de Integração
          </Typography>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
              gap: 6, // Aumentado de 5 para 6 - ainda mais espaço
              mb: 4,
            }}
          >
            {/* API REST */}
            <IntegrationCard
              title="API REST Completa"
              description="Integre pagamentos em qualquer plataforma usando nossa API REST documentada"
              icon={<IntegrationIcon />}
              status="configured"
              onConnect={handleViewDocs}
              features={[
                'PIX, Boleto e Cartão',
                'Webhooks em tempo real',
                'SDKs para PHP, JS, Python',
                'Documentação completa',
              ]}
            />

            {/* E-commerce / Loja Virtual */}
            <IntegrationCard
              title="E-commerce / Loja Virtual"
              description="Integração completa para lojas virtuais com checkout personalizado"
              icon={<ShoppingCartIcon />}
              status="available"
              onConnect={handleViewDocs}
              features={[
                'Checkout personalizado',
                'Link de pagamento direto',
                'Gestão de produtos',
                'Relatórios de vendas',
              ]}
            />

            {/* WordPress/WooCommerce */}
            <IntegrationCard
              title="WordPress / WooCommerce"
              description="Plugin pronto para integrar ZucroPay em sua loja WooCommerce"
              icon={<WebIcon />}
              status="available"
              onConnect={handleViewDocs}
              features={[
                'Plugin WordPress pronto',
                'Configuração em 5 minutos',
                'Suporte a múltiplos métodos',
                'Atualização automática de pedidos',
              ]}
            />

            {/* Custom Integration */}
            <IntegrationCard
              title="Integração Personalizada"
              description="Desenvolva sua própria integração usando nossa API flexível"
              icon={<CodeIcon />}
              status="available"
              onConnect={handleViewDocs}
              features={[
                'API RESTful completa',
                'Exemplos de código',
                'Suporte técnico',
                'Ambiente de sandbox',
              ]}
            />
          </Box>

          {/* How to Integrate Section */}
          <Paper sx={{ p: 4, mt: 6 }}>
            <Typography variant="h5" fontWeight={600} gutterBottom>
              🚀 Como Integrar (Método Simples)
            </Typography>
            <Divider sx={{ my: 2 }} />

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
                gap: 4,
                mb: 3,
              }}
            >
              <Box
                sx={{
                  p: 3,
                  borderRadius: 2,
                  bgcolor: '#f3e5f5',
                  height: '100%',
                }}
              >
                <Typography variant="h6" fontWeight={600} gutterBottom color="primary">
                  1️⃣ Incluir SDK
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Adicione o script no seu HTML:
                </Typography>
                <Box sx={{ bgcolor: '#fff', p: 1.5, borderRadius: 1, fontSize: '0.75rem', fontFamily: 'monospace' }}>
                  &lt;script src="zucropay-sdk.js"&gt;&lt;/script&gt;
                </Box>
              </Box>

              <Box
                sx={{
                  p: 3,
                  borderRadius: 2,
                  bgcolor: '#e3f2fd',
                  height: '100%',
                }}
              >
                <Typography variant="h6" fontWeight={600} gutterBottom color="primary">
                  2️⃣ Obter API Key
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Clique no botão "Ver Chave" acima para copiar sua API Key (gerada automaticamente).
                </Typography>
              </Box>

              <Box
                sx={{
                  p: 3,
                  borderRadius: 2,
                  bgcolor: '#e8f5e9',
                  height: '100%',
                }}
              >
                <Typography variant="h6" fontWeight={600} gutterBottom sx={{ color: '#5818C8' }}>
                  3️⃣ Criar Botão
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Em 3 linhas de código:
                </Typography>
                <Box sx={{ bgcolor: '#fff', p: 1.5, borderRadius: 1, fontSize: '0.65rem', fontFamily: 'monospace' }}>
                  new ZucroPay('sua_api_key')<br/>.createButton('div-id', &#123;...&#125;)
                </Box>
              </Box>
            </Box>

            <Alert severity="success" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>Pronto!</strong> Sem banco de dados, sem PHP, sem webhook obrigatório. Em 5 minutos você está recebendo pagamentos! 🎉
              </Typography>
            </Alert>
          </Paper>

          {/* Comparação */}
          <Paper sx={{ p: 4, mt: 4, bgcolor: '#fafafa' }}>
            <Typography variant="h5" fontWeight={600} gutterBottom>
              📊 Por que escolher a Integração Simples?
            </Typography>
            <Divider sx={{ my: 2 }} />

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 3 }}>
              <Box>
                <Typography variant="subtitle1" fontWeight={600} color="error" gutterBottom>
                  ❌ Integração Tradicional (Complexa)
                </Typography>
                <Box component="ul" sx={{ pl: 3, '& li': { mb: 0.5 } }}>
                  <li><Typography variant="body2">Configurar banco de dados MySQL</Typography></li>
                  <li><Typography variant="body2">Escrever código PHP no servidor</Typography></li>
                  <li><Typography variant="body2">Configurar webhook obrigatório</Typography></li>
                  <li><Typography variant="body2">Validar assinaturas HMAC</Typography></li>
                  <li><Typography variant="body2">~200 linhas de código</Typography></li>
                  <li><Typography variant="body2">~2 horas de setup</Typography></li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle1" fontWeight={600} color="success.main" gutterBottom>
                  ✅ Integração Simples (SDK)
                </Typography>
                <Box component="ul" sx={{ pl: 3, '& li': { mb: 0.5 } }}>
                  <li><Typography variant="body2">❌ Não precisa banco de dados</Typography></li>
                  <li><Typography variant="body2">❌ Não precisa código PHP</Typography></li>
                  <li><Typography variant="body2">⚠️ Webhook opcional</Typography></li>
                  <li><Typography variant="body2">✅ Validação automática</Typography></li>
                  <li><Typography variant="body2">✅ ~10 linhas de código</Typography></li>
                  <li><Typography variant="body2">✅ ~5 minutos de setup</Typography></li>
                </Box>
              </Box>
            </Box>
          </Paper>
        </Box>
      </Box>

      {/* API Key Dialog */}
      <Dialog open={openApiKeyDialog} onClose={() => setOpenApiKeyDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" fontWeight={600}>
              🔑 Sua API Key
            </Typography>
            <IconButton onClick={() => setOpenApiKeyDialog(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 3 }}>
            Mantenha sua API Key em segredo! Não compartilhe ou exponha no código frontend.
          </Alert>

          <Typography variant="body2" color="text.secondary" gutterBottom>
            Chave de Produção:
          </Typography>
          {loading ? (
            <Alert severity="info">Carregando sua API Key...</Alert>
          ) : apiKey ? (
            <>
              <TextField
                fullWidth
                value={apiKey}
                InputProps={{
                  readOnly: true,
                  endAdornment: (
                    <IconButton onClick={handleCopyApiKey}>
                      <CopyIcon />
                    </IconButton>
                  ),
                }}
                sx={{ mb: 2 }}
              />
              {copied && (
                <Alert severity="success">
                  API Key copiada para área de transferência!
                </Alert>
              )}
            </>
          ) : (
            <Alert severity="warning">
              Erro ao carregar API Key. Tente recarregar a página.
            </Alert>
          )}

          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Use esta chave no header de autorização:
          </Typography>
          <Paper
            sx={{
              p: 2,
              mt: 1,
              bgcolor: '#1e1e1e',
              color: '#d4d4d4',
              fontFamily: 'monospace',
              fontSize: '0.875rem',
            }}
          >
            Authorization: Bearer {apiKey}
          </Paper>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleViewDocs} variant="contained">
            Ver Documentação
          </Button>
          <Button onClick={() => setOpenApiKeyDialog(false)}>Fechar</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default Integrations;
