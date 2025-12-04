import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  FormControlLabel,
  Alert,
  CircularProgress,
  Paper,
  Stack,
  IconButton,
  InputAdornment,
  Select,
  MenuItem,
  Checkbox,
  FormControl,
} from '@mui/material';
import {
  CreditCard as CreditCardIcon,
  Pix as PixIcon,
  Receipt as ReceiptIcon,
  CheckCircle,
  ContentCopy,
  Lock,
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
  const [customization, setCustomization] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('CREDIT_CARD');
  const [pixCode, setPixCode] = useState('');
  const [pixQrCode, setPixQrCode] = useState('');
  const [bankSlipUrl, setBankSlipUrl] = useState('');
  const [invoiceUrl, setInvoiceUrl] = useState('');
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

  // Carregar customizações do produto
  useEffect(() => {
    const loadCustomization = async () => {
      if (!productData?.productId) return;

      try {
        const response = await fetch(`http://localhost:8000/checkout-customization.php?productId=${productData.productId}`);
        const data = await response.json();
        
        if (data.success && data.customization) {
          const settings = JSON.parse(data.customization.settings);
          setCustomization(settings);
          
          // Iniciar cronômetro se estiver ativado
          if (settings.timerEnabled && settings.timerMinutes) {
            setTimeLeft(settings.timerMinutes * 60); // converter minutos para segundos
          }
        }
      } catch (error) {
        console.error('Erro ao carregar customização:', error);
      }
    };

    loadCustomization();
  }, [productData]);

  // Countdown do timer
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  // Formatar tempo do cronômetro
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const loadProductData = async () => {
    if (!linkId) {
      setError('Link de pagamento inválido');
      setLoading(false);
      return;
    }

    const cacheKey = `checkout_${linkId}`;
    
    // Verificar se deve forçar refresh (parâmetro na URL ou força via sessionStorage)
    const urlParams = new URLSearchParams(window.location.search);
    const forceRefresh = urlParams.get('refresh') === 'true';
    
    // Se não for forçar refresh, tenta pegar do cache
    if (!forceRefresh) {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        try {
          const cachedData = JSON.parse(cached);
          setProductData(cachedData);
          setLoading(false);
          return;
        } catch (e) {
          // Ignora erro e busca do servidor
        }
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

    // Validações
    if (!customerData.name.trim()) {
      setError('Por favor, preencha seu nome');
      return;
    }

    if (!customerData.email.trim() || !customerData.email.includes('@')) {
      setError('Por favor, preencha um email válido');
      return;
    }

    if (!customerData.phone.trim()) {
      setError('Por favor, preencha seu telefone');
      return;
    }

    // Validações específicas para cartão
    if (paymentMethod === 'CREDIT_CARD') {
      if (!cardData.number.trim() || cardData.number.replace(/\s/g, '').length < 13) {
        setError('Por favor, preencha um número de cartão válido');
        return;
      }

      if (!cardData.name.trim()) {
        setError('Por favor, preencha o nome do titular do cartão');
        return;
      }

      if (!cardData.expiryMonth || !cardData.expiryYear) {
        setError('Por favor, preencha a validade do cartão');
        return;
      }

      if (!cardData.ccv.trim() || cardData.ccv.length < 3) {
        setError('Por favor, preencha o CVV');
        return;
      }

      if (!customerData.cpfCnpj.trim()) {
        setError('Por favor, preencha o CPF/CNPJ');
        return;
      }
    }

    // Para PIX e Boleto, CPF também é obrigatório
    if ((paymentMethod === 'PIX' || paymentMethod === 'BOLETO') && !customerData.cpfCnpj.trim()) {
      setError('Por favor, preencha o CPF/CNPJ');
      return;
    }

    setProcessing(true);
    setError('');

    try {
      const paymentData = {
        linkId: linkId || '',
        customer: {
          name: customerData.name,
          email: customerData.email,
          cpfCnpj: customerData.cpfCnpj.replace(/\D/g, ''),
          phone: customerData.phone.replace(/\D/g, ''),
        },
        billingType: paymentMethod as 'CREDIT_CARD' | 'PIX' | 'BOLETO',
        creditCard: paymentMethod === 'CREDIT_CARD' ? {
          number: cardData.number.replace(/\s/g, ''),
          name: cardData.name,
          expiryMonth: cardData.expiryMonth,
          expiryYear: cardData.expiryYear,
          ccv: cardData.ccv,
        } : undefined,
      };

      const response = await api.createPublicPayment(paymentData);

      if (response.success) {
        // PIX: capturar QR Code e código
        if (paymentMethod === 'PIX') {
          if (response.payment?.pixCode && response.payment?.pixQrCode) {
            setPixCode(response.payment.pixCode);
            setPixQrCode(response.payment.pixQrCode);
          } else {
            setError('Erro ao gerar QR Code PIX. Tente novamente.');
            return;
          }
        }
        
        // Boleto: capturar URL
        if (paymentMethod === 'BOLETO') {
          if (response.payment?.bankSlipUrl) {
            setBankSlipUrl(response.payment.bankSlipUrl);
          } else {
            setError('Erro ao gerar boleto. Tente novamente.');
            return;
          }
        }
        
        // Cartão: capturar invoice
        if (paymentMethod === 'CREDIT_CARD' && response.payment?.invoiceUrl) {
          setInvoiceUrl(response.payment.invoiceUrl);
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

  // Tela de sucesso apenas para cartão de crédito (pagamento instantâneo)
  if (success && paymentMethod === 'CREDIT_CARD') {
    return (
      <Container maxWidth="sm" sx={{ py: 4 }}>
        <Paper elevation={0} sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
          <CheckCircle sx={{ fontSize: 64, color: '#22c55e', mb: 2 }} />
          <Typography variant="h5" fontWeight={600} gutterBottom>
            Pagamento Realizado!
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            Seu pagamento foi processado com sucesso.
          </Typography>
          {invoiceUrl && (
            <Button
              variant="outlined"
              href={invoiceUrl}
              target="_blank"
              sx={{ mt: 2 }}
            >
              Ver Comprovante
            </Button>
          )}
        </Paper>
      </Container>
    );
  }

  return (
    <Box 
      sx={{ 
        bgcolor: customization?.backgroundColor || '#f9fafb', 
        minHeight: '100vh', 
        py: 4 
      }}
    >
      <Container maxWidth="md">
        {/* Logo e Banner */}
        {customization?.showLogo && customization?.logoUrl && (
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <img 
              src={customization.logoUrl} 
              alt="Logo" 
              style={{ maxWidth: '200px', maxHeight: '80px', objectFit: 'contain' }}
            />
          </Box>
        )}

        {customization?.showBanner && customization?.bannerUrl && (
          <Box sx={{ mb: 3, borderRadius: 2, overflow: 'hidden' }}>
            <img 
              src={customization.bannerUrl} 
              alt="Banner" 
              style={{ width: '100%', maxHeight: '200px', objectFit: 'cover' }}
            />
          </Box>
        )}

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
                  backgroundImage: productData?.productImage ? `url(${productData.productImage})` : 'none',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              >
                {!productData?.productImage && (
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
                    {productData?.productName?.substring(0, 1).toUpperCase() || productData?.name?.substring(0, 1).toUpperCase() || 'P'}
                  </Box>
                )}
              </Box>

              {/* Nome e Preço */}
              <Typography 
                variant="h6" 
                fontWeight={700} 
                sx={{ 
                  mb: 1, 
                  color: customization?.textColor || '#1e293b' 
                }}
              >
                {customization?.customTitle || productData?.productName || productData?.name || 'Produto'}
              </Typography>
              
              {customization?.customDescription && (
                <Typography 
                  variant="body2" 
                  sx={{ 
                    mb: 1, 
                    color: customization?.textColor || '#64748b',
                    opacity: 0.8
                  }}
                >
                  {customization.customDescription}
                </Typography>
              )}

              <Typography 
                variant="h5" 
                fontWeight={700} 
                sx={{ color: customization?.priceColor || '#1e293b' }}
              >
                {installments > 1
                  ? `${installments}x R$ ${calculateInstallmentValue(productData?.amount || productData?.value || 0, installments).toFixed(2)}`
                  : `R$ ${(productData?.amount || productData?.value || 0).toFixed(2)}`}
              </Typography>

              {/* Cronômetro */}
              {customization?.timerEnabled && timeLeft !== null && timeLeft > 0 && (
                <Alert 
                  severity="warning" 
                  sx={{ 
                    mt: 2,
                    bgcolor: '#fef3c7',
                    color: '#92400e',
                    border: '1px solid #fcd34d',
                    '& .MuiAlert-icon': {
                      color: '#f59e0b'
                    }
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" fontWeight={600}>
                      ⏰ {customization.timerMessage || 'Oferta expira em:'}
                    </Typography>
                    <Typography 
                      variant="h6" 
                      fontWeight={700}
                      sx={{ 
                        color: '#dc2626',
                        fontFamily: 'monospace',
                        minWidth: '60px'
                      }}
                    >
                      {formatTime(timeLeft)}
                    </Typography>
                  </Box>
                </Alert>
              )}

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

                  {/* CPF para PIX e Boleto */}
                  {(paymentMethod === 'PIX' || paymentMethod === 'BOLETO') && (
                    <TextField
                      fullWidth
                      placeholder="CPF/CNPJ"
                      value={customerData.cpfCnpj}
                      onChange={(e) => setCustomerData({ ...customerData, cpfCnpj: formatCPF(e.target.value) })}
                      inputProps={{ maxLength: 18 }}
                      variant="outlined"
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          bgcolor: 'white',
                          '& fieldset': { borderColor: '#e5e7eb' },
                        },
                      }}
                    />
                  )}
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

                {/* Informação para PIX */}
                {paymentMethod === 'PIX' && (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    <Typography variant="body2" fontWeight={600} gutterBottom>
                      Pagamento via PIX
                    </Typography>
                    <Typography variant="body2">
                      Após clicar em "Pagar", você receberá um QR Code para realizar o pagamento instantaneamente.
                    </Typography>
                  </Alert>
                )}

                {/* Informação para Boleto */}
                {paymentMethod === 'BOLETO' && (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    <Typography variant="body2" fontWeight={600} gutterBottom>
                      Pagamento via Boleto
                    </Typography>
                    <Typography variant="body2">
                      O boleto será gerado após clicar em "Pagar". O prazo de compensação é de até 3 dias úteis.
                    </Typography>
                  </Alert>
                )}

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
                            {num}x R$ {calculateInstallmentValue(productData?.amount || productData?.value || 0, num).toFixed(2)}
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
                    bgcolor: customization?.buttonColor || '#000',
                    color: customization?.buttonTextColor || 'white',
                    fontWeight: 600,
                    textTransform: 'none',
                    fontSize: 16,
                    '&:hover': { 
                      bgcolor: customization?.buttonColor || '#1e293b',
                      filter: 'brightness(0.9)'
                    },
                    '&:disabled': { bgcolor: '#cbd5e1' },
                  }}
                >
                  {processing ? (
                    <CircularProgress size={24} sx={{ color: customization?.buttonTextColor || 'white' }} />
                  ) : (
                    customization?.buttonText || 'Pagar'
                  )}
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
            ) : success && paymentMethod === 'PIX' && pixQrCode ? (
              /* Tela de QR Code PIX */
              <Paper elevation={0} sx={{ p: 4, borderRadius: 2, border: '1px solid #e5e7eb', textAlign: 'center' }}>
                <Typography variant="h6" fontWeight={600} sx={{ mb: 3, color: '#1e293b' }}>
                  Pagamento via PIX
                </Typography>
                
                <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center' }}>
                  <Box
                    component="img"
                    src={`data:image/png;base64,${pixQrCode}`}
                    alt="QR Code PIX"
                    sx={{ width: 250, height: 250, border: '2px solid #e5e7eb', borderRadius: 2, p: 1 }}
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
                        <IconButton onClick={copyPixCode} color="primary">
                          <ContentCopy />
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  sx={{ mb: 2, bgcolor: 'white' }}
                />

                <Alert severity="info" sx={{ textAlign: 'left' }}>
                  <Typography variant="body2" fontWeight={600} gutterBottom>
                    Como pagar:
                  </Typography>
                  <Typography variant="body2">
                    1. Abra o app do seu banco<br />
                    2. Escaneie o QR Code ou copie o código PIX<br />
                    3. Confirme o pagamento<br />
                    4. Pronto! Você receberá a confirmação em instantes
                  </Typography>
                </Alert>
              </Paper>
            ) : success && paymentMethod === 'BOLETO' && bankSlipUrl ? (
              /* Tela de Boleto */
              <Paper elevation={0} sx={{ p: 4, borderRadius: 2, border: '1px solid #e5e7eb', textAlign: 'center' }}>
                <Typography variant="h6" fontWeight={600} sx={{ mb: 3, color: '#1e293b' }}>
                  Boleto Gerado com Sucesso!
                </Typography>
                
                <ReceiptIcon sx={{ fontSize: 80, color: '#1e293b', mb: 3 }} />
                
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Seu boleto foi gerado. Clique no botão abaixo para visualizar e pagar.
                </Typography>

                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  href={bankSlipUrl}
                  target="_blank"
                  sx={{
                    py: 1.5,
                    bgcolor: '#000',
                    color: 'white',
                    fontWeight: 600,
                    textTransform: 'none',
                    fontSize: 16,
                    '&:hover': { bgcolor: '#1e293b' },
                    mb: 2
                  }}
                >
                  Visualizar Boleto
                </Button>

                <Alert severity="warning" sx={{ textAlign: 'left' }}>
                  <Typography variant="body2">
                    <strong>Importante:</strong> O prazo de compensação do boleto é de até 3 dias úteis após o pagamento.
                  </Typography>
                </Alert>
              </Paper>
            ) : null}
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default CheckoutPublicoHubla;
