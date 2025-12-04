import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  RadioGroup,
  Radio,
  FormControlLabel,
  Alert,
  CircularProgress,
  Divider,
  Paper,
  Stack,
} from '@mui/material';
import {
  CreditCard as CreditCardIcon,
  Pix as PixIcon,
  Receipt as ReceiptIcon,
  CheckCircle,
  ContentCopy,
  Lock,
} from '@mui/icons-material';
import * as api from '../../services/api-supabase';

const CheckoutPublico: React.FC = () => {
  const { linkId } = useParams<{ linkId: string }>();

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [productData, setProductData] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState('PIX');
  const [pixCode, setPixCode] = useState('');
  const [pixQrCode, setPixQrCode] = useState('');

  // Dados do cliente
  const [customerData, setCustomerData] = useState({
    name: '',
    email: '',
    cpfCnpj: '',
    phone: '',
  });

  // Dados do cartão
  const [cardData, setCardData] = useState({
    number: '',
    name: '',
    expiryMonth: '',
    expiryYear: '',
    ccv: '',
  });

  useEffect(() => {
    loadProductData();
  }, [linkId]);

  const loadProductData = async () => {
    if (!linkId) {
      setError('Link de pagamento inválido');
      setLoading(false);
      return;
    }

    // Verificar cache (evita delay em recarregamentos)
    const cacheKey = `checkout_${linkId}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      try {
        const cachedData = JSON.parse(cached);
        console.log('Product data loaded from cache:', cachedData);
        setProductData(cachedData);
        setLoading(false);
        return;
      } catch (e) {
        // Ignora erro de cache e busca do servidor
      }
    }

    try {
      console.time('loadProductData');
      const response = await api.getPublicPaymentLink(linkId);
      console.timeEnd('loadProductData');
      console.log('Product data loaded from server:', response);
      
      setProductData(response);
      
      // Salvar no cache por 5 minutos
      sessionStorage.setItem(cacheKey, JSON.stringify(response));
    } catch (err: any) {
      console.error('Error loading product:', err);
      setError('Produto não encontrado');
    } finally {
      setLoading(false);
    }
  };

  const handleCustomerChange = (field: string, value: string) => {
    setCustomerData(prev => ({ ...prev, [field]: value }));
  };

  const handleCardChange = (field: string, value: string) => {
    setCardData(prev => ({ ...prev, [field]: value }));
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setProcessing(true);

    try {
      if (!linkId) {
        throw new Error('Link de pagamento inválido');
      }

      const paymentData: any = {
        linkId,
        customer: customerData,
        billingType: paymentMethod,
      };

      if (paymentMethod === 'CREDIT_CARD') {
        paymentData.creditCard = cardData;
      }

      console.log('Creating payment:', paymentData);
      const response = await api.createPublicPayment(paymentData);
      console.log('Payment response:', response);

      if (response.success) {
        if (paymentMethod === 'PIX') {
          // PIX: só marca sucesso se gerou QR Code
          if (response.payment.pixCode && response.payment.pixQrCode) {
            setPixCode(response.payment.pixCode);
            setPixQrCode(response.payment.pixQrCode);
            setSuccess(true);
          } else {
            throw new Error('Erro ao gerar QR Code PIX. Tente novamente.');
          }
        } else if (paymentMethod === 'BOLETO') {
          if (response.payment.bankSlipUrl) {
            window.open(response.payment.bankSlipUrl, '_blank');
            setSuccess(true);
          } else {
            throw new Error('Erro ao gerar boleto. Tente novamente.');
          }
        } else if (paymentMethod === 'CREDIT_CARD') {
          // Cartão: marca sucesso direto
          setSuccess(true);
        }
      } else {
        throw new Error(response.message || 'Erro ao processar pagamento');
      }
    } catch (err: any) {
      console.error('Payment error:', err);
      setError(err.message || 'Erro ao processar pagamento');
    } finally {
      setProcessing(false);
    }
  };

  const copyPixCode = () => {
    navigator.clipboard.writeText(pixCode);
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          bgcolor: '#f5f5f5',
        }}
      >
        <CircularProgress size={60} />
      </Box>
    );
  }

  // Tela de sucesso PIX
  if (success && paymentMethod === 'PIX' && pixCode) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5', py: 6 }}>
        <Container maxWidth="sm">
          <Paper
            elevation={0}
            sx={{
              p: 4,
              borderRadius: 3,
              textAlign: 'center',
              border: '1px solid #e0e0e0',
            }}
          >
            <CheckCircle sx={{ fontSize: 80, color: '#00c853', mb: 2 }} />
            <Typography variant="h5" fontWeight={600} gutterBottom>
              QR Code PIX Gerado!
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Escaneie o QR Code abaixo ou copie o código PIX
            </Typography>

            {pixQrCode && (
              <Box
                sx={{
                  bgcolor: 'white',
                  p: 3,
                  borderRadius: 2,
                  mb: 3,
                  border: '1px solid #e0e0e0',
                }}
              >
                <img
                  src={`data:image/png;base64,${pixQrCode}`}
                  alt="QR Code PIX"
                  style={{ maxWidth: '250px', width: '100%' }}
                />
              </Box>
            )}

            <Paper
              sx={{
                p: 2,
                bgcolor: '#f5f5f5',
                mb: 2,
                borderRadius: 2,
                wordBreak: 'break-all',
                fontFamily: 'monospace',
                fontSize: '0.875rem',
              }}
            >
              {pixCode}
            </Paper>

            <Button
              fullWidth
              variant="contained"
              onClick={copyPixCode}
              startIcon={<ContentCopy />}
              sx={{
                py: 1.5,
                borderRadius: 2,
                textTransform: 'none',
                fontSize: '1rem',
                fontWeight: 600,
              }}
            >
              Copiar Código PIX
            </Button>

            <Typography variant="caption" color="text.secondary" sx={{ mt: 3, display: 'block' }}>
              O pagamento será confirmado automaticamente após o processamento
            </Typography>
          </Paper>
        </Container>
      </Box>
    );
  }

  // Tela de sucesso outros métodos
  if (success) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5', py: 6 }}>
        <Container maxWidth="sm">
          <Paper
            elevation={0}
            sx={{
              p: 4,
              borderRadius: 3,
              textAlign: 'center',
              border: '1px solid #e0e0e0',
            }}
          >
            <CheckCircle sx={{ fontSize: 80, color: '#00c853', mb: 2 }} />
            <Typography variant="h5" fontWeight={600} gutterBottom>
              Pagamento Processado!
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Obrigado pela sua compra. Em breve você receberá a confirmação por email.
            </Typography>
          </Paper>
        </Container>
      </Box>
    );
  }

  // Tela do Checkout (Kiwify Style)
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5', py: { xs: 3, md: 6 } }}>
      <Container maxWidth="lg">
        {error && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
          {/* Resumo do Produto - Estilo Kiwify */}
          <Box sx={{ flex: { xs: '1', md: '0 0 35%' } }}>
            <Paper
              elevation={0}
              sx={{
                p: 3,
                borderRadius: 3,
                border: '1px solid #e0e0e0',
                position: { md: 'sticky' },
                top: 24,
              }}
            >
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Resumo do Pedido
              </Typography>
              
              <Divider sx={{ my: 2 }} />

              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Produto
                </Typography>
                <Typography variant="body1" fontWeight={500}>
                  {productData?.name || 'Carregando...'}
                </Typography>
              </Box>

              {productData?.description && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Descrição
                  </Typography>
                  <Typography variant="body2">
                    {productData.description}
                  </Typography>
                </Box>
              )}

              <Divider sx={{ my: 2 }} />

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6" fontWeight={600}>
                  Total
                </Typography>
                <Typography variant="h5" fontWeight={700} color="primary">
                  {formatCurrency(parseFloat(productData?.amount || '0'))}
                </Typography>
              </Box>

              <Box
                sx={{
                  mt: 3,
                  p: 2,
                  bgcolor: '#e8f5e9',
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                <Lock sx={{ fontSize: 20, color: '#2e7d32' }} />
                <Typography variant="caption" color="#2e7d32" fontWeight={500}>
                  Pagamento 100% seguro
                </Typography>
              </Box>
            </Paper>
          </Box>

          {/* Formulário de Pagamento - Estilo Kiwify */}
          <Box sx={{ flex: 1 }}>
            <Paper
              elevation={0}
              sx={{
                p: { xs: 3, md: 4 },
                borderRadius: 3,
                border: '1px solid #e0e0e0',
              }}
            >
              <Typography variant="h5" fontWeight={600} gutterBottom>
                Dados de Pagamento
              </Typography>

              <form onSubmit={handleSubmit}>
                {/* Dados do Cliente */}
                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                    Informações Pessoais
                  </Typography>

                  <Stack spacing={2.5} sx={{ mt: 2 }}>
                    <TextField
                      label="Nome Completo"
                      fullWidth
                      required
                      value={customerData.name}
                      onChange={(e) => handleCustomerChange('name', e.target.value)}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2,
                        },
                      }}
                    />

                    <TextField
                      label="Email"
                      type="email"
                      fullWidth
                      required
                      value={customerData.email}
                      onChange={(e) => handleCustomerChange('email', e.target.value)}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2,
                        },
                      }}
                    />

                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <TextField
                        label="CPF/CNPJ"
                        fullWidth
                        required
                        value={customerData.cpfCnpj}
                        onChange={(e) => handleCustomerChange('cpfCnpj', e.target.value)}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 2,
                          },
                        }}
                      />
                      <TextField
                        label="Telefone"
                        fullWidth
                        required
                        value={customerData.phone}
                        onChange={(e) => handleCustomerChange('phone', e.target.value)}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 2,
                          },
                        }}
                      />
                    </Box>
                  </Stack>
                </Box>

                <Divider sx={{ my: 4 }} />

                {/* Método de Pagamento */}
                <Box>
                  <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                    Método de Pagamento
                  </Typography>

                  <RadioGroup
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    sx={{ mt: 2 }}
                  >
                    <Paper
                      sx={{
                        p: 2,
                        mb: 2,
                        border: paymentMethod === 'PIX' ? '2px solid' : '1px solid',
                        borderColor: paymentMethod === 'PIX' ? 'primary.main' : '#e0e0e0',
                        borderRadius: 2,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        '&:hover': {
                          borderColor: 'primary.main',
                          bgcolor: '#f5f5f5',
                        },
                      }}
                      onClick={() => setPaymentMethod('PIX')}
                    >
                      <FormControlLabel
                        value="PIX"
                        control={<Radio />}
                        label={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <PixIcon sx={{ fontSize: 28, color: '#00bfa5' }} />
                            <Box>
                              <Typography variant="body1" fontWeight={600}>
                                PIX
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Aprovação imediata
                              </Typography>
                            </Box>
                          </Box>
                        }
                        sx={{ m: 0, width: '100%' }}
                      />
                    </Paper>

                    <Paper
                      sx={{
                        p: 2,
                        mb: 2,
                        border: paymentMethod === 'CREDIT_CARD' ? '2px solid' : '1px solid',
                        borderColor: paymentMethod === 'CREDIT_CARD' ? 'primary.main' : '#e0e0e0',
                        borderRadius: 2,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        '&:hover': {
                          borderColor: 'primary.main',
                          bgcolor: '#f5f5f5',
                        },
                      }}
                      onClick={() => setPaymentMethod('CREDIT_CARD')}
                    >
                      <FormControlLabel
                        value="CREDIT_CARD"
                        control={<Radio />}
                        label={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <CreditCardIcon sx={{ fontSize: 28, color: '#1976d2' }} />
                            <Box>
                              <Typography variant="body1" fontWeight={600}>
                                Cartão de Crédito
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Parcelamento disponível
                              </Typography>
                            </Box>
                          </Box>
                        }
                        sx={{ m: 0, width: '100%' }}
                      />
                    </Paper>

                    <Paper
                      sx={{
                        p: 2,
                        border: paymentMethod === 'BOLETO' ? '2px solid' : '1px solid',
                        borderColor: paymentMethod === 'BOLETO' ? 'primary.main' : '#e0e0e0',
                        borderRadius: 2,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        '&:hover': {
                          borderColor: 'primary.main',
                          bgcolor: '#f5f5f5',
                        },
                      }}
                      onClick={() => setPaymentMethod('BOLETO')}
                    >
                      <FormControlLabel
                        value="BOLETO"
                        control={<Radio />}
                        label={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <ReceiptIcon sx={{ fontSize: 28, color: '#ff9800' }} />
                            <Box>
                              <Typography variant="body1" fontWeight={600}>
                                Boleto Bancário
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Vencimento em 3 dias
                              </Typography>
                            </Box>
                          </Box>
                        }
                        sx={{ m: 0, width: '100%' }}
                      />
                    </Paper>
                  </RadioGroup>
                </Box>

                {/* Dados do Cartão */}
                {paymentMethod === 'CREDIT_CARD' && (
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                      Dados do Cartão
                    </Typography>

                    <Stack spacing={2.5} sx={{ mt: 2 }}>
                      <TextField
                        label="Número do Cartão"
                        fullWidth
                        required
                        value={cardData.number}
                        onChange={(e) => handleCardChange('number', e.target.value)}
                        placeholder="0000 0000 0000 0000"
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 2,
                          },
                        }}
                      />

                      <TextField
                        label="Nome no Cartão"
                        fullWidth
                        required
                        value={cardData.name}
                        onChange={(e) => handleCardChange('name', e.target.value)}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 2,
                          },
                        }}
                      />

                      <Box sx={{ display: 'flex', gap: 2 }}>
                        <TextField
                          label="Mês"
                          required
                          value={cardData.expiryMonth}
                          onChange={(e) => handleCardChange('expiryMonth', e.target.value)}
                          placeholder="MM"
                          sx={{
                            flex: 1,
                            '& .MuiOutlinedInput-root': {
                              borderRadius: 2,
                            },
                          }}
                        />
                        <TextField
                          label="Ano"
                          required
                          value={cardData.expiryYear}
                          onChange={(e) => handleCardChange('expiryYear', e.target.value)}
                          placeholder="AAAA"
                          sx={{
                            flex: 1,
                            '& .MuiOutlinedInput-root': {
                              borderRadius: 2,
                            },
                          }}
                        />
                        <TextField
                          label="CVV"
                          required
                          value={cardData.ccv}
                          onChange={(e) => handleCardChange('ccv', e.target.value)}
                          placeholder="000"
                          sx={{
                            flex: 1,
                            '& .MuiOutlinedInput-root': {
                              borderRadius: 2,
                            },
                          }}
                        />
                      </Box>
                    </Stack>
                  </Box>
                )}

                {/* Botão de Finalizar */}
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  size="large"
                  disabled={processing}
                  sx={{
                    mt: 4,
                    py: 1.8,
                    borderRadius: 2,
                    textTransform: 'none',
                    fontSize: '1.1rem',
                    fontWeight: 600,
                    boxShadow: '0 4px 12px rgba(25, 118, 210, 0.3)',
                    '&:hover': {
                      boxShadow: '0 6px 16px rgba(25, 118, 210, 0.4)',
                    },
                  }}
                >
                  {processing ? (
                    <CircularProgress size={24} color="inherit" />
                  ) : (
                    `Finalizar Pagamento - ${formatCurrency(parseFloat(productData?.amount || '0'))}`
                  )}
                </Button>
              </form>
            </Paper>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default CheckoutPublico;
