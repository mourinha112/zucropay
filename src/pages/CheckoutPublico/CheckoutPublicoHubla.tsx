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
  IconButton,
  InputAdornment,
  Select,
  MenuItem,
  Checkbox,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  CreditCard as CreditCardIcon,
  Pix as PixIcon,
  Receipt as ReceiptIcon,
  CheckCircle,
  ContentCopy,
  Lock,
  KeyboardArrowDown,
  Visibility,
  VisibilityOff,
} from '@mui/icons-material';
import * as api from '../../services/api-supabase';

const CheckoutPublicoHubla: React.FC = () => {
  const { linkId } = useParams<{ linkId: string }>();

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [productData, setProductData] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState('CREDIT_CARD');
  const [pixCode, setPixCode] = useState('');
  const [pixQrCode, setPixQrCode] = useState('');
  const [showCvv, setShowCvv] = useState(false);

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

  // Parcelamento
  const [installments, setInstallments] = useState(1);
  const [isNotBrazilian, setIsNotBrazilian] = useState(false);

  useEffect(() => {
    loadProductData();
  }, [linkId]);

  const loadProductData = async () => {
    if (!linkId) {
      setError('Link de pagamento inválido');
      setLoading(false);
      return;
    }

    const cacheKey = `checkout_${linkId}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      try {
        const cachedData = JSON.parse(cached);
        setProductData(cachedData);
        setLoading(false);
        return;
      } catch (e) {
        // Ignora
      }
    }

    try {
      const response = await api.getPublicPaymentLink(linkId);
      setProductData(response);
      sessionStorage.setItem(cacheKey, JSON.stringify(response));
    } catch (err: any) {
      setError('Produto não encontrado');
    } finally {
      setLoading(false);
    }
  };

  const formatCPF = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  };

  const formatPhone = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .replace(/(-\d{4})\d+?$/, '$1');
  };

  const formatCardNumber = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{4})(\d)/, '$1 $2')
      .replace(/(\d{4})(\d)/, '$1 $2')
      .replace(/(\d{4})(\d)/, '$1 $2')
      .replace(/(\d{4})\d+?$/, '$1');
  };

  const handleSubmit = async () => {
    if (!productData) return;

    setProcessing(true);
    setError('');

    try {
      const paymentData = {
        paymentLinkId: linkId,
        billingType: paymentMethod,
        customer: {
          name: customerData.name,
          email: customerData.email,
          cpfCnpj: customerData.cpfCnpj.replace(/\D/g, ''),
          phone: customerData.phone.replace(/\D/g, ''),
        },
        creditCard: paymentMethod === 'CREDIT_CARD' ? {
          holderName: cardData.name,
          number: cardData.number.replace(/\s/g, ''),
          expiryMonth: cardData.expiryMonth,
          expiryYear: cardData.expiryYear,
          ccv: cardData.ccv,
        } : undefined,
        installmentCount: paymentMethod === 'CREDIT_CARD' ? installments : undefined,
      };

      const response = await api.createPublicPayment(paymentData);

      if (response.success) {
        if (paymentMethod === 'PIX' && response.pix) {
          setPixCode(response.pix.payload);
          setPixQrCode(response.pix.encodedImage);
        }
        setSuccess(true);
      } else {
        setError(response.message || 'Erro ao processar pagamento');
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao processar pagamento');
    } finally {
      setProcessing(false);
    }
  };

  const copyPixCode = () => {
    navigator.clipboard.writeText(pixCode);
    alert('Código PIX copiado!');
  };

  const calculateInstallmentValue = (total: number, installmentNumber: number) => {
    return total / installmentNumber;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', bgcolor: '#f5f5f5' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error && !productData) {
    return (
      <Container maxWidth="sm" sx={{ py: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  if (success && paymentMethod !== 'PIX') {
    return (
      <Container maxWidth="sm" sx={{ py: 4 }}>
        <Paper elevation={0} sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
          <CheckCircle sx={{ fontSize: 64, color: '#22c55e', mb: 2 }} />
          <Typography variant="h5" fontWeight={600} gutterBottom>
            Pagamento Realizado!
          </Typography>
          <Typography color="text.secondary">
            Seu pagamento foi processado com sucesso.
          </Typography>
        </Paper>
      </Container>
    );
  }

  return (
    <Box sx={{ bgcolor: '#f9fafb', minHeight: '100vh', py: 4 }}>
      <Container maxWidth="md">
        <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' } }}>
          {/* Lado Esquerdo - Imagem e Informações do Produto */}
          <Box sx={{ flex: 1 }}>
            <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid #e5e7eb' }}>
              {/* Imagem do Produto */}
              <Box
                sx={{
                  width: '100%',
                  height: 200,
                  borderRadius: 2,
                  bgcolor: '#e5e7eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mb: 2,
                  overflow: 'hidden',
                  backgroundImage: productData?.image_url ? `url(${productData.image_url})` : 'none',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              >
                {!productData?.image_url && (
                  <Box
                    sx={{
                      width: 80,
                      height: 80,
                      bgcolor: '#1e293b',
                      borderRadius: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: 700,
                      fontSize: 32,
                    }}
                  >
                    {productData?.name?.substring(0, 1).toUpperCase() || 'P'}
                  </Box>
                )}
              </Box>

              {/* Nome e Preço */}
              <Typography variant="h6" fontWeight={700} sx={{ mb: 1, color: '#1e293b' }}>
                {productData?.name || 'Produto'}
              </Typography>
              <Typography variant="h5" fontWeight={700} sx={{ color: '#1e293b' }}>
                {installments > 1
                  ? `${installments}x R$ ${calculateInstallmentValue(productData?.value || 0, installments).toFixed(2)}`
                  : `R$ ${(productData?.value || 0).toFixed(2)}`}
              </Typography>

              {/* Botão Adicionar Cupom */}
              <Button
                fullWidth
                variant="text"
                sx={{
                  mt: 2,
                  color: '#64748b',
                  textTransform: 'none',
                  justifyContent: 'flex-start',
                  '&:hover': { bgcolor: '#f1f5f9' },
                }}
                startIcon={<Typography>+</Typography>}
              >
                Adicionar cupom
              </Button>
            </Paper>
          </Box>

          {/* Lado Direito - Formulário de Pagamento */}
          <Box sx={{ flex: 1.5 }}>
            {!success ? (
              <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid #e5e7eb' }}>
                {/* Informações Pessoais */}
                <Typography variant="subtitle2" sx={{ mb: 2, color: '#64748b', fontWeight: 600 }}>
                  Informações pessoais
                </Typography>

                <Stack spacing={2} sx={{ mb: 3 }}>
                  <TextField
                    fullWidth
                    placeholder="Nome completo"
                    value={customerData.name}
                    onChange={(e) => setCustomerData({ ...customerData, name: e.target.value })}
                    variant="outlined"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        bgcolor: 'white',
                        '& fieldset': { borderColor: '#e5e7eb' },
                      },
                    }}
                  />

                  <TextField
                    fullWidth
                    placeholder="Email"
                    type="email"
                    value={customerData.email}
                    onChange={(e) => setCustomerData({ ...customerData, email: e.target.value })}
                    variant="outlined"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        bgcolor: 'white',
                        '& fieldset': { borderColor: '#e5e7eb' },
                      },
                    }}
                  />

                  <TextField
                    fullWidth
                    placeholder="Telefone"
                    value={customerData.phone}
                    onChange={(e) => setCustomerData({ ...customerData, phone: formatPhone(e.target.value) })}
                    variant="outlined"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <img src="https://flagcdn.com/w20/br.png" alt="BR" style={{ width: 20 }} />
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        bgcolor: 'white',
                        '& fieldset': { borderColor: '#e5e7eb' },
                      },
                    }}
                  />
                </Stack>

                {/* Método de Pagamento */}
                <Typography variant="subtitle2" sx={{ mb: 2, color: '#64748b', fontWeight: 600 }}>
                  Método de pagamento
                </Typography>

                <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
                  <Button
                    fullWidth
                    variant={paymentMethod === 'CREDIT_CARD' ? 'contained' : 'outlined'}
                    onClick={() => setPaymentMethod('CREDIT_CARD')}
                    sx={{
                      py: 1.5,
                      borderColor: '#e5e7eb',
                      color: paymentMethod === 'CREDIT_CARD' ? 'white' : '#64748b',
                      bgcolor: paymentMethod === 'CREDIT_CARD' ? '#1e293b' : 'white',
                      '&:hover': {
                        bgcolor: paymentMethod === 'CREDIT_CARD' ? '#0f172a' : '#f1f5f9',
                        borderColor: '#e5e7eb',
                      },
                    }}
                  >
                    <CreditCardIcon sx={{ mr: 1 }} />
                    Cartão
                  </Button>
                  <Button
                    fullWidth
                    variant={paymentMethod === 'PIX' ? 'contained' : 'outlined'}
                    onClick={() => setPaymentMethod('PIX')}
                    sx={{
                      py: 1.5,
                      borderColor: '#e5e7eb',
                      color: paymentMethod === 'PIX' ? 'white' : '#64748b',
                      bgcolor: paymentMethod === 'PIX' ? '#1e293b' : 'white',
                      '&:hover': {
                        bgcolor: paymentMethod === 'PIX' ? '#0f172a' : '#f1f5f9',
                        borderColor: '#e5e7eb',
                      },
                    }}
                  >
                    <PixIcon sx={{ mr: 1 }} />
                    Pix
                  </Button>
                  <Button
                    fullWidth
                    variant={paymentMethod === 'BOLETO' ? 'contained' : 'outlined'}
                    onClick={() => setPaymentMethod('BOLETO')}
                    sx={{
                      py: 1.5,
                      borderColor: '#e5e7eb',
                      color: paymentMethod === 'BOLETO' ? 'white' : '#64748b',
                      bgcolor: paymentMethod === 'BOLETO' ? '#1e293b' : 'white',
                      '&:hover': {
                        bgcolor: paymentMethod === 'BOLETO' ? '#0f172a' : '#f1f5f9',
                        borderColor: '#e5e7eb',
                      },
                    }}
                  >
                    <ReceiptIcon sx={{ mr: 1 }} />
                    Boleto
                  </Button>
                </Box>

                {/* Formulário de Cartão */}
                {paymentMethod === 'CREDIT_CARD' && (
                  <Stack spacing={2}>
                    <Typography variant="subtitle2" sx={{ color: '#64748b', fontWeight: 600 }}>
                      Dados do cartão
                    </Typography>

                    <TextField
                      fullWidth
                      placeholder="1234 1234 1234 1234"
                      value={cardData.number}
                      onChange={(e) => setCardData({ ...cardData, number: formatCardNumber(e.target.value) })}
                      inputProps={{ maxLength: 19 }}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                              <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Visa_Inc._logo.svg/2000px-Visa_Inc._logo.svg.png" alt="Visa" style={{ height: 16 }} />
                              <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Mastercard-logo.svg/1280px-Mastercard-logo.svg.png" alt="Mastercard" style={{ height: 16 }} />
                            </Box>
                          </InputAdornment>
                        ),
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          bgcolor: 'white',
                          '& fieldset': { borderColor: '#e5e7eb' },
                        },
                      }}
                    />

                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <TextField
                        fullWidth
                        placeholder="MM/AA"
                        value={cardData.expiryMonth && cardData.expiryYear ? `${cardData.expiryMonth}/${cardData.expiryYear}` : ''}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '');
                          const month = value.substring(0, 2);
                          const year = value.substring(2, 4);
                          setCardData({ ...cardData, expiryMonth: month, expiryYear: year });
                        }}
                        inputProps={{ maxLength: 5 }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            bgcolor: 'white',
                            '& fieldset': { borderColor: '#e5e7eb' },
                          },
                        }}
                      />

                      <TextField
                        fullWidth
                        placeholder="CVV"
                        type={showCvv ? 'text' : 'password'}
                        value={cardData.ccv}
                        onChange={(e) => setCardData({ ...cardData, ccv: e.target.value.replace(/\D/g, '').substring(0, 4) })}
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton size="small" onClick={() => setShowCvv(!showCvv)}>
                                {showCvv ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                              </IconButton>
                            </InputAdornment>
                          ),
                        }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            bgcolor: 'white',
                            '& fieldset': { borderColor: '#e5e7eb' },
                          },
                        }}
                      />
                    </Box>

                    <TextField
                      fullWidth
                      placeholder="Nome completo no cartão"
                      value={cardData.name}
                      onChange={(e) => setCardData({ ...cardData, name: e.target.value })}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          bgcolor: 'white',
                          '& fieldset': { borderColor: '#e5e7eb' },
                        },
                      }}
                    />

                    <Typography variant="subtitle2" sx={{ color: '#64748b', fontWeight: 600 }}>
                      Documento
                    </Typography>

                    <TextField
                      fullWidth
                      placeholder="CPF/CNPJ do titular do cartão"
                      value={customerData.cpfCnpj}
                      onChange={(e) => setCustomerData({ ...customerData, cpfCnpj: formatCPF(e.target.value) })}
                      inputProps={{ maxLength: 18 }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          bgcolor: 'white',
                          '& fieldset': { borderColor: '#e5e7eb' },
                        },
                      }}
                    />

                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={isNotBrazilian}
                          onChange={(e) => setIsNotBrazilian(e.target.checked)}
                          size="small"
                        />
                      }
                      label={<Typography variant="body2" sx={{ color: '#64748b' }}>Não sou brasileiro</Typography>}
                    />

                    {/* Parcelamento */}
                    <Typography variant="subtitle2" sx={{ color: '#64748b', fontWeight: 600 }}>
                      Parcelamento
                    </Typography>

                    <FormControl fullWidth>
                      <Select
                        value={installments}
                        onChange={(e) => setInstallments(Number(e.target.value))}
                        sx={{
                          bgcolor: 'white',
                          '& fieldset': { borderColor: '#e5e7eb' },
                        }}
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => (
                          <MenuItem key={num} value={num}>
                            {num}x R$ {calculateInstallmentValue(productData?.value || 0, num).toFixed(2)}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Stack>
                )}

                {/* Botão Pagar */}
                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  onClick={handleSubmit}
                  disabled={processing}
                  sx={{
                    mt: 3,
                    py: 1.5,
                    bgcolor: '#000',
                    color: 'white',
                    fontWeight: 600,
                    textTransform: 'none',
                    fontSize: 16,
                    '&:hover': { bgcolor: '#1e293b' },
                    '&:disabled': { bgcolor: '#cbd5e1' },
                  }}
                >
                  {processing ? <CircularProgress size={24} sx={{ color: 'white' }} /> : 'Pagar'}
                </Button>

                {/* Segurança */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mt: 2, gap: 1 }}>
                  <Lock sx={{ fontSize: 16, color: '#22c55e' }} />
                  <Typography variant="caption" sx={{ color: '#64748b' }}>
                    Transação Segura e Criptografada
                  </Typography>
                </Box>

                {error && (
                  <Alert severity="error" sx={{ mt: 2 }}>
                    {error}
                  </Alert>
                )}

                {/* Termos */}
                <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', mt: 2, color: '#94a3b8' }}>
                  Ao confirmar sua compra, você concorda com os Termos de Uso da Hubla.
                </Typography>
              </Paper>
            ) : (
              /* Tela de Sucesso PIX */
              <Paper elevation={0} sx={{ p: 4, borderRadius: 2, border: '1px solid #e5e7eb', textAlign: 'center' }}>
                <Box sx={{ mb: 3 }}>
                  <Box
                    component="img"
                    src={`data:image/png;base64,${pixQrCode}`}
                    alt="QR Code PIX"
                    sx={{ width: 250, height: 250, mx: 'auto' }}
                  />
                </Box>

                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  value={pixCode}
                  InputProps={{
                    readOnly: true,
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={copyPixCode}>
                          <ContentCopy />
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  sx={{ mb: 2 }}
                />

                <Alert severity="info">
                  Escaneie o QR Code ou copie o código PIX para realizar o pagamento
                </Alert>
              </Paper>
            )}
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default CheckoutPublicoHubla;
