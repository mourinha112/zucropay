import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  CardMedia,
  Button,
  TextField,
  RadioGroup,
  FormControlLabel,
  Radio,
  CircularProgress,
  Alert,
  Paper,
  Divider,
} from '@mui/material';
import {
  Pix as PixIcon,
  Receipt as ReceiptIcon,
  CreditCard as CreditCardIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';

interface CheckoutData {
  productName: string;
  productDescription: string;
  amount: number;
  imageUrl?: string;
  billingType: string;
}

const Checkout: React.FC = () => {
  const { linkId } = useParams<{ linkId: string }>();
  const [loading, setLoading] = useState(true);
  const [checkoutData, setCheckoutData] = useState<CheckoutData | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('PIX');
  const [customerData, setCustomerData] = useState({
    name: '',
    email: '',
    cpfCnpj: '',
    phone: '',
  });
  const [processing, setProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [pixCode, setPixCode] = useState('');
  const [boletoUrl, setBoletoUrl] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    // Carregar dados do checkout
    // TODO: Implementar chamada à API para buscar dados do link de pagamento
    setTimeout(() => {
      setCheckoutData({
        productName: 'Produto de Exemplo',
        productDescription: 'Descrição do produto de exemplo',
        amount: 99.90,
        billingType: 'UNDEFINED',
      });
      setLoading(false);
    }, 1000);
  }, [linkId]);

  const handlePayment = async () => {
    // Validar dados do cliente
    if (!customerData.name || !customerData.email || !customerData.cpfCnpj) {
      setError('Preencha todos os campos obrigatórios');
      return;
    }

    setProcessing(true);
    setError('');

    try {
      // TODO: Implementar chamada à API para criar pagamento
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      if (paymentMethod === 'PIX') {
        setPixCode('00020126580014br.gov.bcb.pix013612345678-1234-1234-1234-12345678901252040000');
        setPaymentSuccess(true);
      } else if (paymentMethod === 'BOLETO') {
        setBoletoUrl('https://exemplo.com/boleto.pdf');
        setPaymentSuccess(true);
      } else {
        setPaymentSuccess(true);
      }
    } catch (err) {
      setError('Erro ao processar pagamento. Tente novamente.');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!checkoutData) {
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Alert severity="error">Link de pagamento inválido ou expirado</Alert>
      </Container>
    );
  }

  if (paymentSuccess) {
    return (
      <Box sx={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', py: 8 }}>
        <Container maxWidth="sm">
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 4 }}>
              <CheckCircleIcon sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
              <Typography variant="h4" gutterBottom>
                Pagamento em Processamento!
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                Obrigado pela sua compra!
              </Typography>

              {pixCode && (
                <Box sx={{ mt: 4 }}>
                  <Typography variant="h6" gutterBottom>
                    Código PIX Copia e Cola
                  </Typography>
                  <Paper sx={{ p: 2, bgcolor: '#f5f5f5', wordBreak: 'break-all' }}>
                    <Typography variant="body2" fontFamily="monospace">
                      {pixCode}
                    </Typography>
                  </Paper>
                  <Button
                    variant="contained"
                    fullWidth
                    sx={{ mt: 2 }}
                    onClick={() => navigator.clipboard.writeText(pixCode)}
                  >
                    Copiar Código PIX
                  </Button>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                    Use este código para pagar via PIX no app do seu banco
                  </Typography>
                </Box>
              )}

              {boletoUrl && (
                <Box sx={{ mt: 4 }}>
                  <Button
                    variant="contained"
                    fullWidth
                    onClick={() => window.open(boletoUrl, '_blank')}
                  >
                    Visualizar Boleto
                  </Button>
                </Box>
              )}
            </CardContent>
          </Card>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', py: 4 }}>
      <Container maxWidth="md">
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
          {/* Resumo do Produto */}
          <Box sx={{ flex: 1 }}>
            <Card>
              <CardContent>
                <Typography variant="h5" gutterBottom>
                  Resumo do Pedido
                </Typography>
                <Divider sx={{ my: 2 }} />
                
                {checkoutData.imageUrl && (
                  <CardMedia
                    component="img"
                    height="200"
                    image={checkoutData.imageUrl}
                    alt={checkoutData.productName}
                    sx={{ borderRadius: 1, mb: 2 }}
                  />
                )}
                
                <Typography variant="h6" gutterBottom>
                  {checkoutData.productName}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  {checkoutData.productDescription}
                </Typography>
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body1">
                    Valor Total:
                  </Typography>
                  <Typography variant="h4" color="primary">
                    R$ {checkoutData.amount.toFixed(2)}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Box>

          {/* Formulário de Pagamento */}
          <Box sx={{ flex: 1 }}>
            <Card>
              <CardContent>
                <Typography variant="h5" gutterBottom>
                  Dados do Pagador
                </Typography>
                <Divider sx={{ my: 2 }} />

                {error && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                  </Alert>
                )}

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <TextField
                    label="Nome Completo *"
                    value={customerData.name}
                    onChange={(e) => setCustomerData({ ...customerData, name: e.target.value })}
                    fullWidth
                    required
                  />
                  <TextField
                    label="Email *"
                    type="email"
                    value={customerData.email}
                    onChange={(e) => setCustomerData({ ...customerData, email: e.target.value })}
                    fullWidth
                    required
                  />
                  <TextField
                    label="CPF/CNPJ *"
                    value={customerData.cpfCnpj}
                    onChange={(e) => setCustomerData({ ...customerData, cpfCnpj: e.target.value })}
                    fullWidth
                    required
                    placeholder="000.000.000-00"
                  />
                  <TextField
                    label="Telefone"
                    value={customerData.phone}
                    onChange={(e) => setCustomerData({ ...customerData, phone: e.target.value })}
                    fullWidth
                    placeholder="(00) 00000-0000"
                  />

                  <Typography variant="h6" sx={{ mt: 2 }}>
                    Forma de Pagamento
                  </Typography>

                  <RadioGroup
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  >
                    <FormControlLabel
                      value="PIX"
                      control={<Radio />}
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <PixIcon />
                          <span>PIX - Pagamento Instantâneo</span>
                        </Box>
                      }
                    />
                    <FormControlLabel
                      value="BOLETO"
                      control={<Radio />}
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <ReceiptIcon />
                          <span>Boleto Bancário</span>
                        </Box>
                      }
                    />
                    <FormControlLabel
                      value="CREDIT_CARD"
                      control={<Radio />}
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <CreditCardIcon />
                          <span>Cartão de Crédito</span>
                        </Box>
                      }
                    />
                  </RadioGroup>

                  <Button
                    variant="contained"
                    size="large"
                    fullWidth
                    onClick={handlePayment}
                    disabled={processing}
                    sx={{
                      mt: 2,
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                      },
                    }}
                  >
                    {processing ? (
                      <CircularProgress size={24} color="inherit" />
                    ) : (
                      `Pagar R$ ${checkoutData.amount.toFixed(2)}`
                    )}
                  </Button>

                  <Typography variant="caption" color="text.secondary" textAlign="center" sx={{ mt: 1 }}>
                    Ambiente seguro. Seus dados estão protegidos.
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default Checkout;
