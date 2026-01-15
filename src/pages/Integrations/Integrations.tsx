import React, { useState, useEffect } from 'react';
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
  Tabs,
  Tab,
  Grid,
  Card,
  CardContent,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tooltip,
  Snackbar,
  CircularProgress,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Code as CodeIcon,
  IntegrationInstructions as IntegrationIcon,
  ShoppingCart as ShoppingCartIcon,
  Close as CloseIcon,
  ContentCopy as CopyIcon,
  Key as KeyIcon,
  Webhook as WebhookIcon,
  PlayArrow as PlayIcon,
  ExpandMore as ExpandMoreIcon,
  Api as ApiIcon,
  Link as LinkIcon,
  Security as SecurityIcon,
  Speed as SpeedIcon,
  Settings as SettingsIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Send as SendIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import Header from '../../components/Header/Header';
import { useNavigate } from 'react-router-dom';
import * as api from '../../services/api-supabase';

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

const Integrations: React.FC = () => {
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  
  // API Key Dialog
  const [openKeyDialog, setOpenKeyDialog] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [showKey, setShowKey] = useState<string | null>(null);
  
  // Test API
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [testForm, setTestForm] = useState({
    amount: '10.00',
    customerName: 'Cliente Teste',
    customerEmail: 'teste@email.com',
    customerCpf: '12345678900',
    description: 'Teste de integração',
    billingType: 'PIX',
    // Campos para cartao de credito (dados de teste EfiBank)
    cardNumber: '4012001038443335',
    cardCvv: '123',
    cardExpMonth: '12',
    cardExpYear: '2028',
    cardHolderName: 'TESTE CARTAO',
    installments: '1',
  });

  const API_BASE_URL = 'https://dashboard.appzucropay.com/api';

  useEffect(() => {
    loadApiKeys();
  }, []);

  const loadApiKeys = async () => {
    try {
      const result = await api.getApiKeys();
      if (result.success) {
        setApiKeys(result.apiKeys || []);
        // Se não tem nenhuma chave, criar uma automaticamente
        if (result.apiKeys.length === 0) {
          await handleCreateApiKey('Chave Principal');
        }
      }
    } catch (error) {
      console.error('Erro ao carregar API Keys:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateApiKey = async (name?: string) => {
    try {
      const result = await api.createApiKey(name || newKeyName || 'Nova Chave');
      if (result.success) {
        showSnackbar('API Key criada com sucesso!');
        loadApiKeys();
        setOpenKeyDialog(false);
        setNewKeyName('');
      }
    } catch (error) {
      console.error('Erro ao criar API Key:', error);
      showSnackbar('Erro ao criar API Key', 'error');
    }
  };

  const handleDeleteApiKey = async (id: string) => {
    if (!confirm('Tem certeza que deseja deletar esta chave? Integrações que usam essa chave pararão de funcionar.')) {
      return;
    }
    try {
      const result = await api.deleteApiKey(id);
      if (result.success) {
        showSnackbar('API Key deletada');
        loadApiKeys();
      }
    } catch (error) {
      showSnackbar('Erro ao deletar API Key', 'error');
    }
  };

  const copyToClipboard = (text: string, label: string = 'Copiado') => {
    navigator.clipboard.writeText(text);
    showSnackbar(`${label} para a área de transferência!`);
  };

  const showSnackbar = (message: string, severity: 'success' | 'error' = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleTestApi = async () => {
    if (!apiKeys.length) {
      showSnackbar('Crie uma API Key primeiro', 'error');
      return;
    }

    setTestLoading(true);
    setTestResult(null);

    try {
      // Montar dados base do pagamento
      const paymentData: any = {
        amount: parseFloat(testForm.amount),
        customer: {
          name: testForm.customerName,
          email: testForm.customerEmail,
          cpfCnpj: testForm.customerCpf,
          phone: '11999999999',
          address: {
            street: 'Rua Teste',
            number: '123',
            neighborhood: 'Centro',
            city: 'Sao Paulo',
            state: 'SP',
            zipcode: '01001000',
          },
        },
        description: testForm.description,
        billingType: testForm.billingType,
        externalReference: `TEST-${Date.now()}`,
      };

      // Se for cartao de credito, adicionar dados do cartao
      if (testForm.billingType === 'CREDIT_CARD') {
        paymentData.installments = parseInt(testForm.installments) || 1;
        paymentData.creditCard = {
          number: testForm.cardNumber,
          cvv: testForm.cardCvv,
          expiration_month: testForm.cardExpMonth,
          expiration_year: testForm.cardExpYear,
          holder_name: testForm.cardHolderName,
        };
      }

      const response = await fetch(`${API_BASE_URL}/create-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKeys[0].api_key,
        },
        body: JSON.stringify(paymentData),
      });

      const data = await response.json();
      setTestResult(data);
    } catch (error: any) {
      setTestResult({ success: false, error: error.message });
    } finally {
      setTestLoading(false);
    }
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
          sx={{ bgcolor: 'rgba(255,255,255,0.1)', color: '#94a3b8', fontSize: 11, height: 24 }} 
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
          fontSize: '0.8rem',
          lineHeight: 1.7,
          overflow: 'auto',
          maxHeight: 400,
        }}
      >
        <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          <code>{code}</code>
        </pre>
      </Box>
    </Box>
  );

  return (
    <>
      <Header />
      <Box sx={{ minHeight: '100vh', backgroundColor: '#f8fafc', pt: 10 }}>
        <Box sx={{ maxWidth: '1200px', mx: 'auto', p: 3 }}>
          {/* Hero Header */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h4" fontWeight={700} gutterBottom sx={{ color: '#0f172a' }}>
              Integracao ZucroPay
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 700 }}>
              Integre pagamentos PIX, Boleto e Cartao de Credito em sua loja virtual ou aplicacao. 
              Escolha o metodo que melhor se adapta ao seu projeto.
            </Typography>
          </Box>

          {/* Quick Stats */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', color: 'white' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <KeyIcon sx={{ fontSize: 40, opacity: 0.8 }} />
                    <Box>
                      <Typography variant="h4" fontWeight={700}>{apiKeys.length}</Typography>
                      <Typography variant="body2" sx={{ opacity: 0.9 }}>API Keys Ativas</Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)', color: 'white' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <SpeedIcon sx={{ fontSize: 40, opacity: 0.8 }} />
                    <Box>
                      <Typography variant="h4" fontWeight={700}>5min</Typography>
                      <Typography variant="body2" sx={{ opacity: 0.9 }}>Tempo de Setup</Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', color: 'white' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <SecurityIcon sx={{ fontSize: 40, opacity: 0.8 }} />
                    <Box>
                      <Typography variant="h4" fontWeight={700}>SSL</Typography>
                      <Typography variant="body2" sx={{ opacity: 0.9 }}>Conexao Segura</Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ background: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)', color: 'white' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <ApiIcon sx={{ fontSize: 40, opacity: 0.8 }} />
                    <Box>
                      <Typography variant="h4" fontWeight={700}>REST</Typography>
                      <Typography variant="body2" sx={{ opacity: 0.9 }}>API Moderna</Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Main Tabs */}
          <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
            <Tabs 
              value={tabValue} 
              onChange={(_, v) => setTabValue(v)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{ 
                bgcolor: '#f1f5f9', 
                px: 2,
                '& .MuiTab-root': { fontWeight: 600, textTransform: 'none', py: 2 }
              }}
            >
              <Tab icon={<PlayIcon />} label="Tutorial" iconPosition="start" />
              <Tab icon={<LinkIcon />} label="Sem Programar" iconPosition="start" />
              <Tab icon={<KeyIcon />} label="API Keys" iconPosition="start" />
              <Tab icon={<CodeIcon />} label="Para Devs" iconPosition="start" />
              <Tab icon={<SettingsIcon />} label="Testar API" iconPosition="start" />
            </Tabs>

            {/* Tab 0: Tutorial */}
            <TabPanel value={tabValue} index={0}>
              <Box sx={{ px: 3 }}>
                <Typography variant="h5" fontWeight={700} gutterBottom>
                  Como Integrar o ZucroPay?
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                  Existem 2 formas de usar o ZucroPay para receber pagamentos. Escolha a que melhor se adapta a voce:
                </Typography>

                {/* Comparação Visual */}
                <Grid container spacing={4} sx={{ mb: 4 }}>
                  {/* Opção 1: Sem Programar */}
                  <Grid item xs={12} md={6}>
                    <Paper sx={{ 
                      p: 4, 
                      height: '100%', 
                      border: '3px solid #22c55e',
                      borderRadius: 4,
                      position: 'relative',
                      overflow: 'hidden',
                    }}>
                      <Chip 
                        label="RECOMENDADO PARA INICIANTES" 
                        sx={{ 
                          position: 'absolute', 
                          top: 16, 
                          right: -30,
                          transform: 'rotate(45deg)',
                          bgcolor: '#22c55e', 
                          color: 'white', 
                          fontWeight: 700,
                          fontSize: '0.65rem',
                        }} 
                      />
                      <Box sx={{ textAlign: 'center', mb: 3 }}>
                        <Box sx={{ 
                          width: 80, height: 80, borderRadius: '50%',
                          bgcolor: '#dcfce7', 
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          margin: '0 auto 16px',
                        }}>
                          <LinkIcon sx={{ fontSize: 40, color: '#22c55e' }} />
                        </Box>
                        <Typography variant="h5" fontWeight={700} color="#22c55e">
                          Sem Programar
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Ideal para quem nao sabe programar
                        </Typography>
                      </Box>

                      <Divider sx={{ my: 2 }} />

                      <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                          Como funciona:
                        </Typography>
                        <Box component="ol" sx={{ pl: 2.5, m: 0, '& li': { mb: 1 } }}>
                          <li><Typography variant="body2">Crie um produto no ZucroPay</Typography></li>
                          <li><Typography variant="body2">Copie o link gerado</Typography></li>
                          <li><Typography variant="body2">Envie para seu cliente (WhatsApp, Instagram, etc)</Typography></li>
                          <li><Typography variant="body2">Cliente paga e voce recebe!</Typography></li>
                        </Box>
                      </Box>

                      <Box sx={{ bgcolor: '#f0fdf4', p: 2, borderRadius: 2, mb: 2 }}>
                        <Typography variant="body2" fontWeight={600} color="#16a34a">
                          Perfeito para:
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Vendas por redes sociais, WhatsApp, Instagram, links bio, email marketing
                        </Typography>
                      </Box>

                      <Button 
                        variant="contained" 
                        fullWidth 
                        size="large"
                        sx={{ bgcolor: '#22c55e', '&:hover': { bgcolor: '#16a34a' } }}
                        onClick={() => setTabValue(1)}
                      >
                        Ver Tutorial Completo
                      </Button>
                    </Paper>
                  </Grid>

                  {/* Opção 2: Com Programação */}
                  <Grid item xs={12} md={6}>
                    <Paper sx={{ 
                      p: 4, 
                      height: '100%', 
                      border: '3px solid #6366f1',
                      borderRadius: 4,
                    }}>
                      <Box sx={{ textAlign: 'center', mb: 3 }}>
                        <Box sx={{ 
                          width: 80, height: 80, borderRadius: '50%',
                          bgcolor: '#e0e7ff', 
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          margin: '0 auto 16px',
                        }}>
                          <CodeIcon sx={{ fontSize: 40, color: '#6366f1' }} />
                        </Box>
                        <Typography variant="h5" fontWeight={700} color="#6366f1">
                          Para Desenvolvedores
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Ideal para lojas virtuais e sistemas
                        </Typography>
                      </Box>

                      <Divider sx={{ my: 2 }} />

                      <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                          Como funciona:
                        </Typography>
                        <Box component="ol" sx={{ pl: 2.5, m: 0, '& li': { mb: 1 } }}>
                          <li><Typography variant="body2">Gere uma API Key</Typography></li>
                          <li><Typography variant="body2">Chame nossa API via codigo</Typography></li>
                          <li><Typography variant="body2">Exiba o QR Code PIX na sua loja</Typography></li>
                          <li><Typography variant="body2">Receba webhook quando pagar</Typography></li>
                        </Box>
                      </Box>

                      <Box sx={{ bgcolor: '#eef2ff', p: 2, borderRadius: 2, mb: 2 }}>
                        <Typography variant="body2" fontWeight={600} color="#4f46e5">
                          Perfeito para:
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Lojas virtuais, apps, sistemas de gestao, automacoes
                        </Typography>
                      </Box>

                      <Button 
                        variant="contained" 
                        fullWidth 
                        size="large"
                        sx={{ bgcolor: '#6366f1', '&:hover': { bgcolor: '#4f46e5' } }}
                        onClick={() => setTabValue(3)}
                      >
                        Ver Documentacao API
                      </Button>
                    </Paper>
                  </Grid>
                </Grid>

                {/* Resumo Visual */}
                <Paper sx={{ p: 4, bgcolor: '#f8fafc', borderRadius: 3 }}>
                  <Typography variant="h6" fontWeight={600} gutterBottom textAlign="center">
                    Resumo: Qual escolher?
                  </Typography>
                  <Grid container spacing={3} sx={{ mt: 2 }}>
                    <Grid item xs={12} md={6}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                        <Box sx={{ width: 40, height: 40, borderRadius: '50%', bgcolor: '#22c55e', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>1</Box>
                        <Box>
                          <Typography variant="subtitle2" fontWeight={600}>Sem Programar</Typography>
                          <Typography variant="caption" color="text.secondary">Vendas por link/redes sociais</Typography>
                        </Box>
                      </Box>
                      <Box sx={{ pl: 7 }}>
                        <Typography variant="body2">• Nao precisa saber programar</Typography>
                        <Typography variant="body2">• Pronto em 2 minutos</Typography>
                        <Typography variant="body2">• Compartilhe link por WhatsApp</Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                        <Box sx={{ width: 40, height: 40, borderRadius: '50%', bgcolor: '#6366f1', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>2</Box>
                        <Box>
                          <Typography variant="subtitle2" fontWeight={600}>API (Programadores)</Typography>
                          <Typography variant="caption" color="text.secondary">Integracao em sistemas</Typography>
                        </Box>
                      </Box>
                      <Box sx={{ pl: 7 }}>
                        <Typography variant="body2">• Precisa saber programar</Typography>
                        <Typography variant="body2">• Setup em 30 minutos</Typography>
                        <Typography variant="body2">• Checkout dentro do seu site</Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </Paper>
              </Box>
            </TabPanel>

            {/* Tab 1: Sem Programar */}
            <TabPanel value={tabValue} index={1}>
              <Box sx={{ px: 3 }}>
                <Typography variant="h5" fontWeight={700} gutterBottom>
                  Tutorial: Vendendo SEM Programar
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                  Siga este passo a passo para comecar a vender em menos de 5 minutos!
                </Typography>

                {/* Passo 1 */}
                <Paper sx={{ p: 4, mb: 3, border: '2px solid #e2e8f0', borderRadius: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 3 }}>
                    <Box sx={{ 
                      width: 60, height: 60, borderRadius: '50%',
                      bgcolor: '#22c55e', color: 'white',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 24, fontWeight: 700, flexShrink: 0,
                    }}>
                      1
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" fontWeight={700} gutterBottom>
                        Crie seu Produto
                      </Typography>
                      <Typography variant="body2" color="text.secondary" paragraph>
                        Va ate a pagina de <strong>Produtos</strong> e clique em <strong>"Novo Produto"</strong>. 
                        Preencha o nome, preco e descricao do que voce esta vendendo.
                      </Typography>
                      <Box sx={{ bgcolor: '#f0fdf4', p: 2, borderRadius: 2, mb: 2 }}>
                        <Typography variant="body2">
                          <strong>Exemplo:</strong> Nome: "Curso de Ingles", Preco: R$ 197,00
                        </Typography>
                      </Box>
                      <Button 
                        variant="outlined" 
                        color="success"
                        onClick={() => navigate('/produtos')}
                      >
                        Ir para Produtos
                      </Button>
                    </Box>
                  </Box>
                </Paper>

                {/* Passo 2 */}
                <Paper sx={{ p: 4, mb: 3, border: '2px solid #e2e8f0', borderRadius: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 3 }}>
                    <Box sx={{ 
                      width: 60, height: 60, borderRadius: '50%',
                      bgcolor: '#22c55e', color: 'white',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 24, fontWeight: 700, flexShrink: 0,
                    }}>
                      2
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" fontWeight={700} gutterBottom>
                        Copie o Link de Pagamento
                      </Typography>
                      <Typography variant="body2" color="text.secondary" paragraph>
                        Apos criar o produto, clique no botao <strong>"Copiar Link"</strong>. 
                        Esse link leva direto para a pagina de pagamento do seu produto.
                      </Typography>
                      <Box sx={{ bgcolor: '#f8fafc', p: 2, borderRadius: 2, fontFamily: 'monospace', fontSize: '0.85rem', mb: 2 }}>
                        https://dashboard.appzucropay.com/checkout/abc123...
                      </Box>
                      <Alert severity="info" sx={{ borderRadius: 2 }}>
                        <Typography variant="body2">
                          <strong>Dica:</strong> Voce pode personalizar a aparencia do checkout clicando em "Personalizar"
                        </Typography>
                      </Alert>
                    </Box>
                  </Box>
                </Paper>

                {/* Passo 3 */}
                <Paper sx={{ p: 4, mb: 3, border: '2px solid #e2e8f0', borderRadius: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 3 }}>
                    <Box sx={{ 
                      width: 60, height: 60, borderRadius: '50%',
                      bgcolor: '#22c55e', color: 'white',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 24, fontWeight: 700, flexShrink: 0,
                    }}>
                      3
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" fontWeight={700} gutterBottom>
                        Compartilhe com seus Clientes
                      </Typography>
                      <Typography variant="body2" color="text.secondary" paragraph>
                        Envie o link para seus clientes por qualquer canal:
                      </Typography>
                      <Grid container spacing={2} sx={{ mb: 2 }}>
                        {[
                          { icon: '📱', name: 'WhatsApp', desc: 'Envie no chat ou status' },
                          { icon: '📸', name: 'Instagram', desc: 'Link na bio ou stories' },
                          { icon: '📧', name: 'Email', desc: 'Email marketing' },
                          { icon: '🌐', name: 'Site', desc: 'Botao no seu site' },
                        ].map((item) => (
                          <Grid item xs={6} sm={3} key={item.name}>
                            <Box sx={{ textAlign: 'center', p: 2, bgcolor: '#f8fafc', borderRadius: 2 }}>
                              <Typography variant="h4">{item.icon}</Typography>
                              <Typography variant="subtitle2" fontWeight={600}>{item.name}</Typography>
                              <Typography variant="caption" color="text.secondary">{item.desc}</Typography>
                            </Box>
                          </Grid>
                        ))}
                      </Grid>
                    </Box>
                  </Box>
                </Paper>

                {/* Passo 4 */}
                <Paper sx={{ p: 4, mb: 3, border: '2px solid #e2e8f0', borderRadius: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 3 }}>
                    <Box sx={{ 
                      width: 60, height: 60, borderRadius: '50%',
                      bgcolor: '#22c55e', color: 'white',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 24, fontWeight: 700, flexShrink: 0,
                    }}>
                      4
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" fontWeight={700} gutterBottom>
                        Cliente Paga e Voce Recebe!
                      </Typography>
                      <Typography variant="body2" color="text.secondary" paragraph>
                        Quando o cliente acessar o link, ele vera uma pagina de checkout bonita com:
                      </Typography>
                      <Box component="ul" sx={{ pl: 2, m: 0, mb: 2, '& li': { mb: 1 } }}>
                        <li><Typography variant="body2"><strong>QR Code PIX</strong> - Cliente escaneia e paga na hora</Typography></li>
                        <li><Typography variant="body2"><strong>Codigo PIX</strong> - Para copiar e colar no app do banco</Typography></li>
                        <li><Typography variant="body2"><strong>Confirmacao automatica</strong> - Quando pagar, aparece na tela</Typography></li>
                      </Box>
                      <Alert severity="success" sx={{ borderRadius: 2 }}>
                        <Typography variant="body2">
                          <strong>Pronto!</strong> O dinheiro cai na sua conta ZucroPay e voce pode sacar quando quiser!
                        </Typography>
                      </Alert>
                    </Box>
                  </Box>
                </Paper>

                {/* Onde ver vendas */}
                <Paper sx={{ p: 4, bgcolor: '#fef3c7', borderRadius: 3 }}>
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    Onde vejo minhas vendas?
                  </Typography>
                  <Typography variant="body2" paragraph>
                    Todas as vendas aparecem em tempo real na pagina <strong>Vendas</strong>. 
                    Voce tambem recebe notificacao por email quando uma venda e confirmada.
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <Button variant="contained" sx={{ bgcolor: '#d97706', '&:hover': { bgcolor: '#b45309' } }} onClick={() => navigate('/vendas')}>
                      Ver Minhas Vendas
                    </Button>
                    <Button variant="outlined" sx={{ borderColor: '#d97706', color: '#d97706' }} onClick={() => navigate('/financas')}>
                      Ver Saldo e Saques
                    </Button>
                  </Box>
                </Paper>
              </Box>
            </TabPanel>

            {/* Tab 2: API Keys */}
            <TabPanel value={tabValue} index={2}>
              <Box sx={{ px: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Box>
                    <Typography variant="h5" fontWeight={700} gutterBottom>
                      Suas API Keys
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Use estas chaves para autenticar requisicoes a API do ZucroPay
                    </Typography>
                  </Box>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => setOpenKeyDialog(true)}
                  >
                    Nova API Key
                  </Button>
                </Box>

                <Alert severity="warning" sx={{ mb: 3, borderRadius: 2 }}>
                  <Typography variant="body2">
                    <strong>Importante:</strong> Mantenha suas API Keys em segredo. Nunca exponha no codigo frontend ou repositorios publicos.
                  </Typography>
                </Alert>

                {loading ? (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <CircularProgress />
                  </Box>
                ) : apiKeys.length === 0 ? (
                  <Paper sx={{ p: 4, textAlign: 'center', bgcolor: '#f8fafc' }}>
                    <KeyIcon sx={{ fontSize: 64, color: '#cbd5e1', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                      Nenhuma API Key
                    </Typography>
                    <Typography variant="body2" color="text.secondary" paragraph>
                      Crie sua primeira API Key para comecar a integrar
                    </Typography>
                    <Button variant="contained" onClick={() => setOpenKeyDialog(true)}>
                      Criar API Key
                    </Button>
                  </Paper>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {apiKeys.map((key) => (
                      <Paper key={key.id} sx={{ p: 3, border: '1px solid #e2e8f0' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="subtitle1" fontWeight={600}>
                              {key.name || 'API Key'}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                              <Typography 
                                variant="body2" 
                                sx={{ 
                                  fontFamily: 'monospace', 
                                  bgcolor: '#f1f5f9', 
                                  px: 2, 
                                  py: 0.5, 
                                  borderRadius: 1,
                                  fontSize: '0.85rem',
                                }}
                              >
                                {showKey === key.id ? key.api_key : `${key.api_key.substring(0, 20)}${'•'.repeat(20)}`}
                              </Typography>
                              <Tooltip title={showKey === key.id ? 'Ocultar' : 'Mostrar'}>
                                <IconButton size="small" onClick={() => setShowKey(showKey === key.id ? null : key.id)}>
                                  {showKey === key.id ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Copiar">
                                <IconButton size="small" onClick={() => copyToClipboard(key.api_key, 'API Key copiada')}>
                                  <CopyIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Box>
                            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                              Criada em: {new Date(key.created_at).toLocaleDateString('pt-BR')}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Chip 
                              label={key.is_active ? 'Ativa' : 'Inativa'} 
                              color={key.is_active ? 'success' : 'default'} 
                              size="small" 
                            />
                            <Tooltip title="Deletar">
                              <IconButton 
                                size="small" 
                                color="error"
                                onClick={() => handleDeleteApiKey(key.id)}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </Box>
                      </Paper>
                    ))}
                  </Box>
                )}

                {/* Como usar */}
                <Paper sx={{ p: 4, mt: 4, bgcolor: '#f0fdf4', borderRadius: 3 }}>
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    Como usar sua API Key
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Inclua a chave no header de todas as requisicoes:
                  </Typography>
                  <CodeBlock
                    label="Header"
                    language="http"
                    code={`X-API-Key: ${apiKeys[0]?.api_key || 'SUA_API_KEY'}

// Ou via Authorization Bearer
Authorization: Bearer ${apiKeys[0]?.api_key || 'SUA_API_KEY'}`}
                  />
                </Paper>
              </Box>
            </TabPanel>

            {/* Tab 3: Exemplos de Código (Para Devs) */}
            <TabPanel value={tabValue} index={3}>
              <Box sx={{ px: 3 }}>
                <Typography variant="h5" fontWeight={700} gutterBottom>
                  Exemplos de Integracao
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Codigo pronto para copiar e usar em seu projeto
                </Typography>

                {/* URL Base */}
                <Alert severity="info" sx={{ mb: 4, borderRadius: 2 }}>
                  <Typography variant="body2">
                    <strong>URL Base da API:</strong>{' '}
                    <code style={{ background: '#e0f2fe', padding: '2px 8px', borderRadius: 4 }}>
                      {API_BASE_URL}
                    </code>
                    <IconButton size="small" onClick={() => copyToClipboard(API_BASE_URL, 'URL copiada')}>
                      <CopyIcon fontSize="small" />
                    </IconButton>
                  </Typography>
                </Alert>

                {/* Endpoint Principal */}
                <Paper sx={{ p: 3, mb: 3, border: '2px solid #6366f1', borderRadius: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Chip label="POST" sx={{ bgcolor: '#22c55e', color: 'white', fontWeight: 700 }} />
                    <Typography variant="h6" fontWeight={600} sx={{ fontFamily: 'monospace' }}>
                      /api/create-payment
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Cria um novo pagamento PIX, Boleto ou Cartao. Retorna o QR Code PIX ou URL de pagamento.
                  </Typography>
                  
                  <Divider sx={{ my: 2 }} />
                  
                  <Typography variant="subtitle2" fontWeight={600} gutterBottom>Parametros:</Typography>
                  <Box component="ul" sx={{ pl: 2, m: 0, mb: 2 }}>
                    <li><Typography variant="body2"><code>amount</code> (obrigatorio) - Valor em reais (ex: 99.90)</Typography></li>
                    <li><Typography variant="body2"><code>customer.name</code> (obrigatorio) - Nome do cliente</Typography></li>
                    <li><Typography variant="body2"><code>customer.email</code> (obrigatorio) - Email do cliente</Typography></li>
                    <li><Typography variant="body2"><code>customer.cpfCnpj</code> (opcional) - CPF ou CNPJ</Typography></li>
                    <li><Typography variant="body2"><code>description</code> (opcional) - Descricao do pagamento</Typography></li>
                    <li><Typography variant="body2"><code>billingType</code> (opcional) - PIX, BOLETO ou CREDIT_CARD (padrao: PIX)</Typography></li>
                    <li><Typography variant="body2"><code>externalReference</code> (opcional) - ID do pedido no seu sistema</Typography></li>
                  </Box>
                </Paper>

                {/* Exemplos por linguagem */}
                <Accordion defaultExpanded sx={{ mb: 2, borderRadius: '12px !important', overflow: 'hidden', '&:before': { display: 'none' } }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: '#f8fafc' }}>
                    <Typography fontWeight={600}>JavaScript / Node.js / React</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <CodeBlock
                      label="JavaScript"
                      language="javascript"
                      code={`// ==========================================
// CRIAR PAGAMENTO PIX
// ==========================================
async function criarPagamentoPix(pedido) {
  const response = await fetch('${API_BASE_URL}/create-payment', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': '${apiKeys[0]?.api_key || 'SUA_API_KEY'}'
    },
    body: JSON.stringify({
      amount: pedido.valor,
      customer: {
        name: pedido.cliente.nome,
        email: pedido.cliente.email,
        cpfCnpj: pedido.cliente.cpf
      },
      description: pedido.descricao,
      billingType: 'PIX',
      externalReference: pedido.id
    })
  });

  const data = await response.json();

  if (data.success) {
    // Exibir QR Code PIX
    document.getElementById('qrcode').src = 'data:image/png;base64,' + data.pix.qrCode;
    document.getElementById('pixCode').textContent = data.pix.copyPaste;
    
    // Verificar pagamento a cada 5 segundos
    const checkInterval = setInterval(async () => {
      const status = await verificarPagamento(data.payment.id);
      if (status === 'RECEIVED' || status === 'CONFIRMED') {
        clearInterval(checkInterval);
        alert('Pagamento confirmado!');
      }
    }, 5000);
  }
  return data;
}

// ==========================================
// CRIAR PAGAMENTO COM CARTAO DE CREDITO
// ==========================================
async function criarPagamentoCartao(pedido, dadosCartao) {
  const response = await fetch('${API_BASE_URL}/create-payment', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': '${apiKeys[0]?.api_key || 'SUA_API_KEY'}'
    },
    body: JSON.stringify({
      amount: pedido.valor,
      customer: {
        name: pedido.cliente.nome,
        email: pedido.cliente.email,
        cpfCnpj: pedido.cliente.cpf,
        phone: pedido.cliente.telefone,
        address: {
          street: 'Rua Exemplo',
          number: '123',
          neighborhood: 'Centro',
          city: 'Sao Paulo',
          state: 'SP',
          zipcode: '01001000'
        }
      },
      description: pedido.descricao,
      billingType: 'CREDIT_CARD',
      installments: dadosCartao.parcelas || 1,
      creditCard: {
        number: dadosCartao.numero,
        cvv: dadosCartao.cvv,
        expiration_month: dadosCartao.mesExpiracao,
        expiration_year: dadosCartao.anoExpiracao,
        holder_name: dadosCartao.nomeTitular
      },
      externalReference: pedido.id
    })
  });

  const data = await response.json();

  if (data.success) {
    if (data.payment.status === 'CONFIRMED') {
      alert('Pagamento aprovado! Parcelas: ' + data.creditCard.installments);
    } else {
      alert('Pagamento em processamento...');
    }
  } else {
    alert('Erro: ' + data.error);
  }
  return data;
}

// ==========================================
// VERIFICAR STATUS DO PAGAMENTO
// ==========================================
async function verificarPagamento(paymentId) {
  const response = await fetch(
    '${API_BASE_URL}/check-payment-status?paymentId=' + paymentId,
    { headers: { 'X-API-Key': '${apiKeys[0]?.api_key || 'SUA_API_KEY'}' } }
  );
  const data = await response.json();
  return data.payment?.status;
}

// ==========================================
// EXEMPLOS DE USO
// ==========================================

// PIX
criarPagamentoPix({
  id: 'PEDIDO-12345',
  valor: 99.90,
  descricao: 'Produto XYZ',
  cliente: { nome: 'Joao Silva', email: 'joao@email.com', cpf: '12345678900' }
});

// Cartao de Credito (3x)
criarPagamentoCartao(
  {
    id: 'PEDIDO-67890',
    valor: 299.90,
    descricao: 'Produto Premium',
    cliente: {
      nome: 'Maria Santos',
      email: 'maria@email.com',
      cpf: '98765432100',
      telefone: '11999999999'
    }
  },
  {
    numero: '4012001038443335',
    cvv: '123',
    mesExpiracao: '12',
    anoExpiracao: '2028',
    nomeTitular: 'MARIA SANTOS',
    parcelas: 3
  }
);`}
                    />
                  </AccordionDetails>
                </Accordion>

                <Accordion sx={{ mb: 2, borderRadius: '12px !important', overflow: 'hidden', '&:before': { display: 'none' } }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: '#f8fafc' }}>
                    <Typography fontWeight={600}>PHP</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <CodeBlock
                      label="PHP"
                      language="php"
                      code={`<?php
// zucropay.php - Classe de integração

class ZucroPay {
    private $apiKey;
    private $apiUrl = '${API_BASE_URL}';
    
    public function __construct($apiKey) {
        $this->apiKey = $apiKey;
    }
    
    public function criarPagamentoPix($valor, $cliente, $descricao = '', $pedidoId = null) {
        $data = [
            'amount' => $valor,
            'customer' => [
                'name' => $cliente['nome'],
                'email' => $cliente['email'],
                'cpfCnpj' => $cliente['cpf'] ?? null
            ],
            'description' => $descricao,
            'billingType' => 'PIX',
            'externalReference' => $pedidoId ?? uniqid('PEDIDO-')
        ];
        
        return $this->request('/create-payment', 'POST', $data);
    }
    
    public function verificarPagamento($paymentId) {
        return $this->request('/check-payment-status?paymentId=' . $paymentId, 'GET');
    }
    
    private function request($endpoint, $method = 'GET', $data = null) {
        $curl = curl_init();
        
        $options = [
            CURLOPT_URL => $this->apiUrl . $endpoint,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'X-API-Key: ' . $this->apiKey
            ]
        ];
        
        if ($method === 'POST') {
            $options[CURLOPT_POST] = true;
            $options[CURLOPT_POSTFIELDS] = json_encode($data);
        }
        
        curl_setopt_array($curl, $options);
        $response = curl_exec($curl);
        curl_close($curl);
        
        return json_decode($response, true);
    }
}

// =====================
// EXEMPLO DE USO
// =====================

$zucropay = new ZucroPay('${apiKeys[0]?.api_key || 'SUA_API_KEY'}');

// Criar pagamento
$resultado = $zucropay->criarPagamentoPix(
    99.90,
    [
        'nome' => 'João Silva',
        'email' => 'joao@email.com',
        'cpf' => '12345678900'
    ],
    'Compra na Minha Loja',
    'PEDIDO-12345'
);

if ($resultado['success']) {
    // Exibir QR Code
    echo '<img src="data:image/png;base64,' . $resultado['pix']['qrCode'] . '" />';
    
    // Código PIX para copiar
    echo '<p>Código PIX: ' . $resultado['pix']['copyPaste'] . '</p>';
    
    // Salvar paymentId na sessão/banco para verificar depois
    $_SESSION['payment_id'] = $resultado['payment']['id'];
}
?>`}
                    />
                  </AccordionDetails>
                </Accordion>

                <Accordion sx={{ mb: 2, borderRadius: '12px !important', overflow: 'hidden', '&:before': { display: 'none' } }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: '#f8fafc' }}>
                    <Typography fontWeight={600}>Python</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <CodeBlock
                      label="Python"
                      language="python"
                      code={`import requests
import time

class ZucroPay:
    def __init__(self, api_key):
        self.api_key = api_key
        self.api_url = '${API_BASE_URL}'
        self.headers = {
            'Content-Type': 'application/json',
            'X-API-Key': api_key
        }
    
    def criar_pagamento_pix(self, valor, cliente, descricao='', pedido_id=None):
        payload = {
            'amount': valor,
            'customer': {
                'name': cliente['nome'],
                'email': cliente['email'],
                'cpfCnpj': cliente.get('cpf')
            },
            'description': descricao,
            'billingType': 'PIX',
            'externalReference': pedido_id or f'PEDIDO-{int(time.time())}'
        }
        
        response = requests.post(
            f'{self.api_url}/create-payment',
            headers=self.headers,
            json=payload
        )
        return response.json()
    
    def verificar_pagamento(self, payment_id):
        response = requests.get(
            f'{self.api_url}/check-payment-status?paymentId={payment_id}',
            headers=self.headers
        )
        return response.json()

# =====================
# EXEMPLO DE USO
# =====================

zucropay = ZucroPay('${apiKeys[0]?.api_key || 'SUA_API_KEY'}')

# Criar pagamento
resultado = zucropay.criar_pagamento_pix(
    valor=99.90,
    cliente={
        'nome': 'João Silva',
        'email': 'joao@email.com',
        'cpf': '12345678900'
    },
    descricao='Produto XYZ',
    pedido_id='PEDIDO-12345'
)

if resultado['success']:
    print(f"QR Code Base64: {resultado['pix']['qrCode'][:50]}...")
    print(f"Código PIX: {resultado['pix']['copyPaste']}")
    print(f"Payment ID: {resultado['payment']['id']}")
    
    # Aguardar confirmação (polling)
    while True:
        status = zucropay.verificar_pagamento(resultado['payment']['id'])
        if status['payment']['status'] in ['RECEIVED', 'CONFIRMED']:
            print("Pagamento confirmado!")
            break
        time.sleep(5)`}
                    />
                  </AccordionDetails>
                </Accordion>

                <Accordion sx={{ mb: 2, borderRadius: '12px !important', overflow: 'hidden', '&:before': { display: 'none' } }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: '#f8fafc' }}>
                    <Typography fontWeight={600}>cURL (Terminal)</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <CodeBlock
                      label="cURL"
                      language="bash"
                      code={`# ==========================================
# CRIAR PAGAMENTO PIX
# ==========================================
curl -X POST ${API_BASE_URL}/create-payment \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: ${apiKeys[0]?.api_key || 'SUA_API_KEY'}" \\
  -d '{
    "amount": 99.90,
    "customer": {
      "name": "João Silva",
      "email": "joao@email.com",
      "cpfCnpj": "12345678900"
    },
    "description": "Produto XYZ",
    "billingType": "PIX",
    "externalReference": "PEDIDO-12345"
  }'

# ==========================================
# CRIAR PAGAMENTO COM CARTAO DE CREDITO
# ==========================================
curl -X POST ${API_BASE_URL}/create-payment \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: ${apiKeys[0]?.api_key || 'SUA_API_KEY'}" \\
  -d '{
    "amount": 299.90,
    "customer": {
      "name": "Maria Santos",
      "email": "maria@email.com",
      "cpfCnpj": "98765432100",
      "phone": "11999999999",
      "address": {
        "street": "Rua Exemplo",
        "number": "123",
        "neighborhood": "Centro",
        "city": "São Paulo",
        "state": "SP",
        "zipcode": "01001000"
      }
    },
    "description": "Produto Premium",
    "billingType": "CREDIT_CARD",
    "installments": 3,
    "creditCard": {
      "number": "4012001038443335",
      "cvv": "123",
      "expiration_month": "12",
      "expiration_year": "2028",
      "holder_name": "MARIA SANTOS"
    },
    "externalReference": "PEDIDO-67890"
  }'

# ==========================================
# VERIFICAR STATUS DO PAGAMENTO
# ==========================================
curl -X GET "${API_BASE_URL}/check-payment-status?paymentId=PAYMENT_ID" \\
  -H "X-API-Key: ${apiKeys[0]?.api_key || 'SUA_API_KEY'}"`}
                    />
                  </AccordionDetails>
                </Accordion>

                {/* Webhook Example */}
                <Paper sx={{ p: 3, mt: 4, bgcolor: '#fef3c7', borderRadius: 3 }}>
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    Recebendo Webhooks
                  </Typography>
                  <Typography variant="body2" paragraph>
                    Configure um endpoint para receber notificacoes quando pagamentos forem confirmados:
                  </Typography>
                  <CodeBlock
                    label="PHP Webhook"
                    language="php"
                    code={`<?php
// webhook.php - Recebe notificações de pagamento

$payload = file_get_contents('php://input');
$data = json_decode($payload, true);

// Validar assinatura (opcional mas recomendado)
$signature = $_SERVER['HTTP_X_ZUCROPAY_SIGNATURE'] ?? '';
$secret = 'SEU_WEBHOOK_SECRET';
$expectedSignature = hash_hmac('sha256', $payload, $secret);

if (!hash_equals($expectedSignature, $signature)) {
    http_response_code(401);
    exit('Assinatura inválida');
}

// Processar evento
if ($data['event'] === 'PAYMENT_RECEIVED') {
    $paymentId = $data['payment']['id'];
    $pedidoId = $data['payment']['externalReference'];
    $valor = $data['payment']['value'];
    
    // Atualizar status do pedido no banco
    $pdo->prepare("UPDATE pedidos SET status = 'pago', pago_em = NOW() WHERE id = ?")
        ->execute([$pedidoId]);
    
    // Enviar email de confirmação
    mail($data['payment']['customer']['email'], 'Pagamento Confirmado!', 'Obrigado!');
    
    // Liberar produto/serviço
    liberarProduto($pedidoId);
}

// IMPORTANTE: Sempre retornar 200
http_response_code(200);
echo json_encode(['received' => true]);`}
                  />
                  <Button 
                    variant="contained" 
                    sx={{ mt: 2, bgcolor: '#d97706', '&:hover': { bgcolor: '#b45309' } }}
                    onClick={() => navigate('/webhooks')}
                  >
                    Configurar Webhooks
                  </Button>
                </Paper>
              </Box>
            </TabPanel>

            {/* Tab 4: Testar API */}
            <TabPanel value={tabValue} index={4}>
              <Box sx={{ px: 3 }}>
                <Typography variant="h5" fontWeight={700} gutterBottom>
                  Testar API em Tempo Real
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Crie um pagamento de teste para verificar se a integracao esta funcionando
                </Typography>

                <Alert severity="warning" sx={{ mb: 3, borderRadius: 2 }}>
                  <Typography variant="body2">
                    <strong>Atencao:</strong> Este teste cria um pagamento REAL. Use valores baixos para teste (ex: R$ 0,10).
                  </Typography>
                </Alert>

                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3 }}>
                      <Typography variant="h6" fontWeight={600} gutterBottom>
                        Dados do Pagamento
                      </Typography>
                      
                      <TextField
                        fullWidth
                        label="Valor (R$)"
                        type="number"
                        value={testForm.amount}
                        onChange={(e) => setTestForm({ ...testForm, amount: e.target.value })}
                        sx={{ mb: 2 }}
                        InputProps={{
                          startAdornment: <InputAdornment position="start">R$</InputAdornment>,
                        }}
                      />
                      
                      <TextField
                        fullWidth
                        label="Nome do Cliente"
                        value={testForm.customerName}
                        onChange={(e) => setTestForm({ ...testForm, customerName: e.target.value })}
                        sx={{ mb: 2 }}
                      />
                      
                      <TextField
                        fullWidth
                        label="Email"
                        type="email"
                        value={testForm.customerEmail}
                        onChange={(e) => setTestForm({ ...testForm, customerEmail: e.target.value })}
                        sx={{ mb: 2 }}
                      />
                      
                      <TextField
                        fullWidth
                        label="CPF"
                        value={testForm.customerCpf}
                        onChange={(e) => setTestForm({ ...testForm, customerCpf: e.target.value })}
                        sx={{ mb: 2 }}
                      />
                      
                      <TextField
                        fullWidth
                        label="Descricao"
                        value={testForm.description}
                        onChange={(e) => setTestForm({ ...testForm, description: e.target.value })}
                        sx={{ mb: 2 }}
                      />
                      
                      <FormControl fullWidth sx={{ mb: 2 }}>
                        <InputLabel>Tipo de Pagamento</InputLabel>
                        <Select
                          value={testForm.billingType}
                          label="Tipo de Pagamento"
                          onChange={(e) => setTestForm({ ...testForm, billingType: e.target.value })}
                        >
                          <MenuItem value="PIX">PIX</MenuItem>
                          <MenuItem value="BOLETO">Boleto</MenuItem>
                          <MenuItem value="CREDIT_CARD">Cartao de Credito</MenuItem>
                        </Select>
                      </FormControl>

                      {/* Campos de Cartao de Credito */}
                      {testForm.billingType === 'CREDIT_CARD' && (
                        <Box sx={{ bgcolor: '#f8fafc', p: 2, borderRadius: 2, mb: 2 }}>
                          <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
                            Dados do Cartao (Teste)
                          </Typography>
                          <Alert severity="info" sx={{ mb: 2 }}>
                            Estes sao dados de teste do sandbox EfiBank
                          </Alert>
                          <TextField
                            fullWidth
                            label="Numero do Cartao"
                            value={testForm.cardNumber}
                            onChange={(e) => setTestForm({ ...testForm, cardNumber: e.target.value })}
                            sx={{ mb: 2 }}
                          />
                          <Grid container spacing={2} sx={{ mb: 2 }}>
                            <Grid item xs={4}>
                              <TextField
                                fullWidth
                                label="CVV"
                                value={testForm.cardCvv}
                                onChange={(e) => setTestForm({ ...testForm, cardCvv: e.target.value })}
                              />
                            </Grid>
                            <Grid item xs={4}>
                              <TextField
                                fullWidth
                                label="Mes"
                                value={testForm.cardExpMonth}
                                onChange={(e) => setTestForm({ ...testForm, cardExpMonth: e.target.value })}
                              />
                            </Grid>
                            <Grid item xs={4}>
                              <TextField
                                fullWidth
                                label="Ano"
                                value={testForm.cardExpYear}
                                onChange={(e) => setTestForm({ ...testForm, cardExpYear: e.target.value })}
                              />
                            </Grid>
                          </Grid>
                          <TextField
                            fullWidth
                            label="Nome no Cartao"
                            value={testForm.cardHolderName}
                            onChange={(e) => setTestForm({ ...testForm, cardHolderName: e.target.value })}
                            sx={{ mb: 2 }}
                          />
                          <FormControl fullWidth>
                            <InputLabel>Parcelas</InputLabel>
                            <Select
                              value={testForm.installments}
                              label="Parcelas"
                              onChange={(e) => setTestForm({ ...testForm, installments: e.target.value })}
                            >
                              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                                <MenuItem key={n} value={n.toString()}>{n}x</MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Box>
                      )}
                      
                      <Button
                        variant="contained"
                        fullWidth
                        size="large"
                        onClick={handleTestApi}
                        disabled={testLoading || !apiKeys.length}
                        startIcon={testLoading ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
                      >
                        {testLoading ? 'Criando Pagamento...' : 'Criar Pagamento de Teste'}
                      </Button>
                    </Paper>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3, bgcolor: testResult?.success ? '#f0fdf4' : testResult?.error ? '#fef2f2' : '#f8fafc', minHeight: 400 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="h6" fontWeight={600}>
                          Resposta da API
                        </Typography>
                        {testResult && (
                          <IconButton onClick={() => setTestResult(null)} size="small">
                            <RefreshIcon />
                          </IconButton>
                        )}
                      </Box>
                      
                      {!testResult ? (
                        <Box sx={{ textAlign: 'center', py: 4 }}>
                          <ApiIcon sx={{ fontSize: 64, color: '#cbd5e1', mb: 2 }} />
                          <Typography color="text.secondary">
                            Preencha os dados e clique em "Criar Pagamento de Teste"
                          </Typography>
                        </Box>
                      ) : testResult.success ? (
                        <Box>
                          <Alert severity="success" sx={{ mb: 2 }}>
                            Pagamento criado com sucesso!
                          </Alert>
                          
                          {testResult.pix?.qrCode && (
                            <Box sx={{ textAlign: 'center', mb: 2 }}>
                              <img 
                                src={`data:image/png;base64,${testResult.pix.qrCode}`} 
                                alt="QR Code PIX"
                                style={{ maxWidth: 200, border: '1px solid #e2e8f0', borderRadius: 8 }}
                              />
                            </Box>
                          )}
                          
                          {testResult.pix?.copyPaste && (
                            <Box sx={{ mb: 2 }}>
                              <Typography variant="caption" color="text.secondary">Codigo PIX:</Typography>
                              <Box sx={{ 
                                bgcolor: '#f1f5f9', 
                                p: 1, 
                                borderRadius: 1, 
                                fontFamily: 'monospace',
                                fontSize: '0.7rem',
                                wordBreak: 'break-all',
                                maxHeight: 80,
                                overflow: 'auto'
                              }}>
                                {testResult.pix.copyPaste}
                              </Box>
                              <Button 
                                size="small" 
                                onClick={() => copyToClipboard(testResult.pix.copyPaste, 'Codigo PIX copiado')}
                                sx={{ mt: 1 }}
                              >
                                Copiar Codigo
                              </Button>
                            </Box>
                          )}
                          
                          <Divider sx={{ my: 2 }} />
                          
                          <Typography variant="caption" color="text.secondary">Resposta completa:</Typography>
                          <Box sx={{ 
                            bgcolor: '#0f172a', 
                            color: '#e2e8f0', 
                            p: 2, 
                            borderRadius: 1,
                            fontFamily: 'monospace',
                            fontSize: '0.7rem',
                            maxHeight: 200,
                            overflow: 'auto'
                          }}>
                            <pre style={{ margin: 0 }}>
                              {JSON.stringify(testResult, null, 2)}
                            </pre>
                          </Box>
                        </Box>
                      ) : (
                        <Box>
                          <Alert severity="error" sx={{ mb: 2 }}>
                            Erro ao criar pagamento
                          </Alert>
                          <Box sx={{ 
                            bgcolor: '#0f172a', 
                            color: '#e2e8f0', 
                            p: 2, 
                            borderRadius: 1,
                            fontFamily: 'monospace',
                            fontSize: '0.75rem'
                          }}>
                            <pre style={{ margin: 0 }}>
                              {JSON.stringify(testResult, null, 2)}
                            </pre>
                          </Box>
                        </Box>
                      )}
                    </Paper>
                  </Grid>
                </Grid>
              </Box>
            </TabPanel>
          </Paper>

          {/* Links rápidos */}
          <Grid container spacing={3} sx={{ mt: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card 
                sx={{ cursor: 'pointer', transition: 'all 0.3s', '&:hover': { transform: 'translateY(-4px)', boxShadow: 4 } }}
                onClick={() => navigate('/api-docs')}
              >
                <CardContent sx={{ textAlign: 'center' }}>
                  <CodeIcon sx={{ fontSize: 40, color: '#6366f1', mb: 1 }} />
                  <Typography variant="subtitle1" fontWeight={600}>Documentacao API</Typography>
                  <Typography variant="body2" color="text.secondary">Referencia completa</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card 
                sx={{ cursor: 'pointer', transition: 'all 0.3s', '&:hover': { transform: 'translateY(-4px)', boxShadow: 4 } }}
                onClick={() => navigate('/webhooks')}
              >
                <CardContent sx={{ textAlign: 'center' }}>
                  <WebhookIcon sx={{ fontSize: 40, color: '#f59e0b', mb: 1 }} />
                  <Typography variant="subtitle1" fontWeight={600}>Webhooks</Typography>
                  <Typography variant="body2" color="text.secondary">Configurar notificacoes</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card 
                sx={{ cursor: 'pointer', transition: 'all 0.3s', '&:hover': { transform: 'translateY(-4px)', boxShadow: 4 } }}
                onClick={() => navigate('/produtos')}
              >
                <CardContent sx={{ textAlign: 'center' }}>
                  <ShoppingCartIcon sx={{ fontSize: 40, color: '#22c55e', mb: 1 }} />
                  <Typography variant="subtitle1" fontWeight={600}>Produtos</Typography>
                  <Typography variant="body2" color="text.secondary">Criar links de checkout</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card 
                sx={{ cursor: 'pointer', transition: 'all 0.3s', '&:hover': { transform: 'translateY(-4px)', boxShadow: 4 } }}
                onClick={() => navigate('/suporte')}
              >
                <CardContent sx={{ textAlign: 'center' }}>
                  <IntegrationIcon sx={{ fontSize: 40, color: '#ec4899', mb: 1 }} />
                  <Typography variant="subtitle1" fontWeight={600}>Suporte</Typography>
                  <Typography variant="body2" color="text.secondary">Precisa de ajuda?</Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      </Box>

      {/* Dialog para criar nova API Key */}
      <Dialog open={openKeyDialog} onClose={() => setOpenKeyDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" fontWeight={600}>Nova API Key</Typography>
            <IconButton onClick={() => setOpenKeyDialog(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Nome da Chave"
            placeholder="Ex: Minha Loja Virtual"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            sx={{ mt: 2 }}
            helperText="Um nome para identificar onde esta chave sera usada"
          />
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setOpenKeyDialog(false)}>Cancelar</Button>
          <Button variant="contained" onClick={() => handleCreateApiKey()}>
            Criar Chave
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default Integrations;
