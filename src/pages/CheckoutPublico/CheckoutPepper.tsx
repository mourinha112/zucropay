import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
} from '@mui/material';
import {
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Lock as LockIcon,
  CreditCard as CardIcon,
  ContentCopy as CopyIcon,
  CheckCircle as CheckIcon,
  Timer as TimerIcon,
} from '@mui/icons-material';
import * as api from '../../services/api-supabase';

const CheckoutPepper: React.FC = () => {
  const { linkId } = useParams<{ linkId: string }>();

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [productData, setProductData] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState<number>(300); // 5 minutes
  const [paymentMethod, setPaymentMethod] = useState<'PIX' | 'CREDIT_CARD' | 'BOLETO'>('CREDIT_CARD');
  const [pixCode, setPixCode] = useState('');
  const [pixQrCode, setPixQrCode] = useState('');
  const [copied, setCopied] = useState(false);

  // Dados do cliente
  const [customerData, setCustomerData] = useState({
    name: '',
    email: '',
    cpfCnpj: '',
    phone: '',
  });

  // Dados do cartão
  const [cardData, setCardData] = useState({
    name: '',
    number: '',
    expiry: '',
    cvv: '',
  });

  // Parcelamento
  const [installments, setInstallments] = useState(1);

  // Descontos por forma de pagamento
  const discounts = {
    PIX: 5,
    CREDIT_CARD: 2,
    BOLETO: 0,
  };

  useEffect(() => {
    loadProductData();
  }, [linkId]);

  // Countdown timer
  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => prev > 0 ? prev - 1 : 0);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

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

    try {
      const response = await api.getPublicPaymentLink(linkId);
      setProductData(response);
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
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
      .slice(0, 14);
  };

  const formatPhone = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .slice(0, 15);
  };

  const formatCardNumber = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{4})(\d)/, '$1 $2')
      .replace(/(\d{4})(\d)/, '$1 $2')
      .replace(/(\d{4})(\d)/, '$1 $2')
      .slice(0, 19);
  };

  const formatExpiry = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{2})(\d)/, '$1/$2')
      .slice(0, 5);
  };

  const getPrice = () => productData?.amount || productData?.value || 0;
  
  const getDiscount = () => (getPrice() * discounts[paymentMethod]) / 100;
  
  const getFinalPrice = () => getPrice() - getDiscount();

  const getInstallmentValue = (numInstallments: number) => {
    const price = getFinalPrice();
    if (numInstallments === 1) return price;
    // Juros de 2.99% ao mês
    const rate = 0.0299;
    const installmentValue = (price * rate * Math.pow(1 + rate, numInstallments)) / (Math.pow(1 + rate, numInstallments) - 1);
    return installmentValue;
  };

  const handleSubmit = async () => {
    // Validações
    if (!customerData.name.trim()) {
      setError('Por favor, preencha seu nome completo');
      return;
    }
    if (!customerData.email.trim() || !customerData.email.includes('@')) {
      setError('Por favor, preencha um e-mail válido');
      return;
    }
    if (!customerData.phone.trim()) {
      setError('Por favor, preencha seu celular');
      return;
    }
    if (!customerData.cpfCnpj.trim()) {
      setError('Por favor, preencha seu CPF');
      return;
    }

    if (paymentMethod === 'CREDIT_CARD') {
      if (!cardData.name.trim()) {
        setError('Por favor, preencha o nome no cartão');
        return;
      }
      if (!cardData.number.trim() || cardData.number.replace(/\s/g, '').length < 13) {
        setError('Por favor, preencha um número de cartão válido');
        return;
      }
      if (!cardData.expiry.trim() || cardData.expiry.length < 5) {
        setError('Por favor, preencha a validade do cartão');
        return;
      }
      if (!cardData.cvv.trim() || cardData.cvv.length < 3) {
        setError('Por favor, preencha o CVV');
        return;
      }
    }

    setProcessing(true);
    setError('');

    try {
      const [expiryMonth, expiryYear] = cardData.expiry.split('/');
      
      const paymentPayload = {
        linkId: linkId || '',
        customer: {
          name: customerData.name,
          email: customerData.email,
          cpfCnpj: customerData.cpfCnpj.replace(/\D/g, ''),
          phone: customerData.phone.replace(/\D/g, ''),
        },
        billingType: paymentMethod,
        creditCard: paymentMethod === 'CREDIT_CARD' ? {
          number: cardData.number.replace(/\s/g, ''),
          name: cardData.name,
          expiryMonth: expiryMonth || '',
          expiryYear: `20${expiryYear}` || '',
          ccv: cardData.cvv,
        } : undefined,
      };

      const response = await api.createPublicPayment(paymentPayload);

      if (response.success) {
        if (paymentMethod === 'PIX' && response.payment) {
          setPixCode(response.payment.pixCode || '');
          setPixQrCode(response.payment.pixQrCode || '');
        }
        setSuccess(true);
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao processar pagamento');
    } finally {
      setProcessing(false);
    }
  };

  const copyPixCode = () => {
    navigator.clipboard.writeText(pixCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f5f5f5' }}>
        <CircularProgress sx={{ color: '#b91c1c' }} />
      </Box>
    );
  }

  if (error && !productData) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f5f5f5' }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  // Tela de sucesso PIX
  if (success && paymentMethod === 'PIX') {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5', py: 4 }}>
        <Container maxWidth="sm">
          <Box sx={{ bgcolor: 'white', borderRadius: 2, p: 4, textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <CheckIcon sx={{ fontSize: 64, color: '#22c55e', mb: 2 }} />
            <Typography variant="h5" fontWeight={700} gutterBottom>
              PIX Gerado com Sucesso!
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>
              Escaneie o QR Code ou copie o código abaixo
            </Typography>
            
            {pixQrCode && (
              <Box sx={{ mb: 3 }}>
                <img src={`data:image/png;base64,${pixQrCode}`} alt="QR Code PIX" style={{ maxWidth: 200 }} />
              </Box>
            )}

            <Box sx={{ bgcolor: '#f5f5f5', p: 2, borderRadius: 1, mb: 2 }}>
              <Typography variant="caption" sx={{ wordBreak: 'break-all', fontFamily: 'monospace' }}>
                {pixCode}
              </Typography>
            </Box>

            <Button
              variant="contained"
              fullWidth
              startIcon={copied ? <CheckIcon /> : <CopyIcon />}
              onClick={copyPixCode}
              sx={{
                bgcolor: copied ? '#22c55e' : '#b91c1c',
                '&:hover': { bgcolor: copied ? '#16a34a' : '#991b1b' },
                py: 1.5,
              }}
            >
              {copied ? 'Copiado!' : 'Copiar Código PIX'}
            </Button>
          </Box>
        </Container>
      </Box>
    );
  }

  // Tela de sucesso Cartão/Boleto
  if (success) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5', py: 4 }}>
        <Container maxWidth="sm">
          <Box sx={{ bgcolor: 'white', borderRadius: 2, p: 4, textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <CheckIcon sx={{ fontSize: 64, color: '#22c55e', mb: 2 }} />
            <Typography variant="h5" fontWeight={700} gutterBottom>
              Pagamento Processado!
            </Typography>
            <Typography color="text.secondary">
              {paymentMethod === 'CREDIT_CARD' 
                ? 'Seu pagamento foi aprovado com sucesso!' 
                : 'Seu boleto foi gerado. Verifique seu e-mail.'}
            </Typography>
          </Box>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5' }}>
      {/* Header com produto e timer */}
      <Box sx={{ bgcolor: '#b91c1c', color: 'white', py: 2 }}>
        <Container maxWidth="md">
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
            {/* Produto */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {productData?.productImage ? (
                <Box
                  component="img"
                  src={productData.productImage}
                  alt={productData.productName}
                  sx={{ width: 60, height: 60, borderRadius: 1, objectFit: 'cover' }}
                />
              ) : (
                <Box sx={{ width: 60, height: 60, bgcolor: 'rgba(255,255,255,0.2)', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography variant="h6" fontWeight={700}>
                    {productData?.productName?.charAt(0) || 'P'}
                  </Typography>
                </Box>
              )}
              <Box>
                <Typography variant="subtitle1" fontWeight={600}>
                  {productData?.productName || productData?.name}
                </Typography>
                <Typography variant="caption" sx={{ textDecoration: 'line-through', opacity: 0.7 }}>
                  De {installments}x R$ {(getPrice() / installments).toFixed(2)} por
                </Typography>
                <Typography variant="h6" fontWeight={700}>
                  {installments}x R$ {getInstallmentValue(installments).toFixed(2)}
                </Typography>
                <Typography variant="caption">
                  Ou R$ {getFinalPrice().toFixed(2)} à vista
                </Typography>
              </Box>
            </Box>

            {/* Timer */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="h4" fontWeight={700} sx={{ fontFamily: 'monospace' }}>
                00:{formatTime(timeLeft)}
              </Typography>
              <TimerIcon />
              <Typography variant="body2">
                Aproveite essa oferta!
              </Typography>
            </Box>
          </Box>
        </Container>
      </Box>

      {/* Formulário */}
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Box sx={{ bgcolor: 'white', borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
          
          {/* Seção 1 - Dados Pessoais */}
          <Box sx={{ p: 3, borderBottom: '1px solid #eee' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
              <Box sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: '#22c55e', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700 }}>
                1
              </Box>
              <Typography variant="subtitle1" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>
                Dados Pessoais
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Typography variant="caption" fontWeight={600} sx={{ mb: 0.5, display: 'block', textTransform: 'uppercase', color: '#666' }}>
                  Nome Completo
                </Typography>
                <TextField
                  fullWidth
                  placeholder="Digite seu nome completo"
                  value={customerData.name}
                  onChange={(e) => setCustomerData({ ...customerData, name: e.target.value })}
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><PersonIcon sx={{ color: '#999' }} /></InputAdornment>,
                  }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                />
              </Box>

              <Box>
                <Typography variant="caption" fontWeight={600} sx={{ mb: 0.5, display: 'block', textTransform: 'uppercase', color: '#666' }}>
                  Seu E-mail
                </Typography>
                <TextField
                  fullWidth
                  placeholder="Digite seu e-mail"
                  type="email"
                  value={customerData.email}
                  onChange={(e) => setCustomerData({ ...customerData, email: e.target.value })}
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><EmailIcon sx={{ color: '#999' }} /></InputAdornment>,
                  }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                />
              </Box>

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                <Box>
                  <Typography variant="caption" fontWeight={600} sx={{ mb: 0.5, display: 'block', textTransform: 'uppercase', color: '#666' }}>
                    Celular com WhatsApp
                  </Typography>
                  <TextField
                    fullWidth
                    placeholder="(00) 00000-0000"
                    value={customerData.phone}
                    onChange={(e) => setCustomerData({ ...customerData, phone: formatPhone(e.target.value) })}
                    InputProps={{
                      startAdornment: <InputAdornment position="start"><PhoneIcon sx={{ color: '#999' }} /></InputAdornment>,
                    }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                  />
                </Box>
                <Box>
                  <Typography variant="caption" fontWeight={600} sx={{ mb: 0.5, display: 'block', textTransform: 'uppercase', color: '#666' }}>
                    CPF
                  </Typography>
                  <TextField
                    fullWidth
                    placeholder="000.000.000-00"
                    value={customerData.cpfCnpj}
                    onChange={(e) => setCustomerData({ ...customerData, cpfCnpj: formatCPF(e.target.value) })}
                    InputProps={{
                      startAdornment: <InputAdornment position="start"><LockIcon sx={{ color: '#999' }} /></InputAdornment>,
                    }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                  />
                </Box>
              </Box>
            </Box>
          </Box>

          {/* Seção 2 - Dados de Pagamento */}
          <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
              <Box sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: '#22c55e', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700 }}>
                2
              </Box>
              <Typography variant="subtitle1" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>
                Dados de Pagamento
              </Typography>
            </Box>

            {/* Métodos de pagamento */}
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.5, mb: 3 }}>
              {/* PIX */}
              <Box
                onClick={() => setPaymentMethod('PIX')}
                sx={{
                  border: paymentMethod === 'PIX' ? '2px solid #b91c1c' : '1px solid #ddd',
                  borderRadius: 2,
                  p: 2,
                  cursor: 'pointer',
                  position: 'relative',
                  bgcolor: paymentMethod === 'PIX' ? '#fef2f2' : 'white',
                  transition: 'all 0.2s',
                  '&:hover': { borderColor: '#b91c1c' },
                }}
              >
                <Box sx={{ position: 'absolute', top: -8, right: 8, bgcolor: '#22c55e', color: 'white', px: 1, py: 0.25, borderRadius: 1, fontSize: 11, fontWeight: 700 }}>
                  5% OFF
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography sx={{ fontSize: 24, mb: 0.5 }}>◆</Typography>
                  <Typography variant="body2" fontWeight={600}>PIX</Typography>
                </Box>
              </Box>

              {/* Cartão */}
              <Box
                onClick={() => setPaymentMethod('CREDIT_CARD')}
                sx={{
                  border: paymentMethod === 'CREDIT_CARD' ? '2px solid #b91c1c' : '1px solid #ddd',
                  borderRadius: 2,
                  p: 2,
                  cursor: 'pointer',
                  position: 'relative',
                  bgcolor: paymentMethod === 'CREDIT_CARD' ? '#fef2f2' : 'white',
                  transition: 'all 0.2s',
                  '&:hover': { borderColor: '#b91c1c' },
                }}
              >
                <Box sx={{ position: 'absolute', top: -8, right: 8, bgcolor: '#22c55e', color: 'white', px: 1, py: 0.25, borderRadius: 1, fontSize: 11, fontWeight: 700 }}>
                  2% OFF
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <CardIcon sx={{ fontSize: 24, mb: 0.5, color: '#666' }} />
                  <Typography variant="body2" fontWeight={600} color={paymentMethod === 'CREDIT_CARD' ? '#b91c1c' : 'inherit'}>
                    Cartão de crédito
                  </Typography>
                </Box>
              </Box>

              {/* Boleto */}
              <Box
                onClick={() => setPaymentMethod('BOLETO')}
                sx={{
                  border: paymentMethod === 'BOLETO' ? '2px solid #b91c1c' : '1px solid #ddd',
                  borderRadius: 2,
                  p: 2,
                  cursor: 'pointer',
                  bgcolor: paymentMethod === 'BOLETO' ? '#fef2f2' : 'white',
                  transition: 'all 0.2s',
                  '&:hover': { borderColor: '#b91c1c' },
                }}
              >
                <Box sx={{ textAlign: 'center' }}>
                  <Typography sx={{ fontSize: 24, mb: 0.5 }}>|||</Typography>
                  <Typography variant="body2" fontWeight={600}>Boleto</Typography>
                </Box>
              </Box>
            </Box>

            {/* Campos do cartão */}
            {paymentMethod === 'CREDIT_CARD' && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
                <Box>
                  <Typography variant="caption" fontWeight={600} sx={{ mb: 0.5, display: 'block', textTransform: 'uppercase', color: '#666' }}>
                    Nome como consta no cartão
                  </Typography>
                  <TextField
                    fullWidth
                    placeholder="Nome"
                    value={cardData.name}
                    onChange={(e) => setCardData({ ...cardData, name: e.target.value })}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                  />
                </Box>

                <Box>
                  <Typography variant="caption" fontWeight={600} sx={{ mb: 0.5, display: 'block', textTransform: 'uppercase', color: '#666' }}>
                    Número do cartão
                  </Typography>
                  <TextField
                    fullWidth
                    placeholder="Somente números"
                    value={cardData.number}
                    onChange={(e) => setCardData({ ...cardData, number: formatCardNumber(e.target.value) })}
                    InputProps={{
                      startAdornment: <InputAdornment position="start"><CardIcon sx={{ color: '#999' }} /></InputAdornment>,
                    }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                  />
                </Box>

                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                  <Box>
                    <Typography variant="caption" fontWeight={600} sx={{ mb: 0.5, display: 'block', textTransform: 'uppercase', color: '#666' }}>
                      Validade do cartão
                    </Typography>
                    <TextField
                      fullWidth
                      placeholder="MM/YY"
                      value={cardData.expiry}
                      onChange={(e) => setCardData({ ...cardData, expiry: formatExpiry(e.target.value) })}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                    />
                  </Box>
                  <Box>
                    <Typography variant="caption" fontWeight={600} sx={{ mb: 0.5, display: 'block', textTransform: 'uppercase', color: '#666' }}>
                      Cód. Segurança
                    </Typography>
                    <TextField
                      fullWidth
                      placeholder="CVV"
                      value={cardData.cvv}
                      onChange={(e) => setCardData({ ...cardData, cvv: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                      InputProps={{
                        startAdornment: <InputAdornment position="start"><LockIcon sx={{ color: '#999' }} /></InputAdornment>,
                      }}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                    />
                  </Box>
                </Box>

                <Box>
                  <Typography variant="caption" fontWeight={600} sx={{ mb: 0.5, display: 'block', textTransform: 'uppercase', color: '#666' }}>
                    Parcelamento
                  </Typography>
                  <FormControl fullWidth>
                    <Select
                      value={installments}
                      onChange={(e) => setInstallments(Number(e.target.value))}
                      sx={{ borderRadius: 1.5 }}
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => (
                        <MenuItem key={num} value={num}>
                          {num}x de R$ {getInstallmentValue(num).toFixed(2)}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
              </Box>
            )}

            {/* Resumo de valores */}
            <Box sx={{ bgcolor: '#f9f9f9', p: 2, borderRadius: 1.5, mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">Valor original:</Typography>
                <Typography variant="body2" sx={{ textDecoration: 'line-through', color: '#999' }}>
                  R$ {getPrice().toFixed(2)}
                </Typography>
              </Box>
              {discounts[paymentMethod] > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">Desconto (Forma de Pagamento):</Typography>
                  <Typography variant="body2" color="#22c55e" fontWeight={600}>
                    -R$ {getDiscount().toFixed(2)}
                  </Typography>
                </Box>
              )}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 1, borderTop: '1px solid #eee' }}>
                <Typography variant="body1" fontWeight={700}>Valor total:</Typography>
                <Typography variant="body1" fontWeight={700} color="#b91c1c">
                  {paymentMethod === 'CREDIT_CARD' && installments > 1
                    ? `${installments}x de R$ ${getInstallmentValue(installments).toFixed(2)}`
                    : `R$ ${getFinalPrice().toFixed(2)}`}
                </Typography>
              </Box>
            </Box>

            {/* Erro */}
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            {/* Botão de compra */}
            <Button
              fullWidth
              variant="contained"
              size="large"
              onClick={handleSubmit}
              disabled={processing}
              sx={{
                bgcolor: '#b91c1c',
                '&:hover': { bgcolor: '#991b1b' },
                py: 2,
                fontSize: 16,
                fontWeight: 700,
                textTransform: 'uppercase',
                borderRadius: 1.5,
              }}
            >
              {processing ? <CircularProgress size={24} sx={{ color: 'white' }} /> : 'COMPRAR AGORA'}
            </Button>

            {/* Footer */}
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 2 }}>
              🔒 Ambiente criptografado e 100% seguro
            </Typography>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default CheckoutPepper;

