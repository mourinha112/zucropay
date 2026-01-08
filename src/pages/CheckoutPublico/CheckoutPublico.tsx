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
import EfiPay from 'payment-token-efi';

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
  const [boletoUrl, setBoletoUrl] = useState('');
  const [boletoBarcode, setBoletoBarcode] = useState('');
  const [invoiceUrl] = useState(''); // Pode ser usado futuramente para links de comprovante
  const [showCvv, setShowCvv] = useState(false);
  const [pixConfirmed, setPixConfirmed] = useState(false);
  const [boletoConfirmed, setBoletoConfirmed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [pixTxid, setPixTxid] = useState<string | null>(null);
  const [chargeId, setChargeId] = useState<string | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [cardPaymentUrl, setCardPaymentUrl] = useState<string | null>(null);

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
  const [tokenizing, setTokenizing] = useState(false);

  // Tokenizar cartão usando SDK EfiBank (payment-token-efi)
  const tokenizeCard = async (): Promise<{ token: string; cardMask: string } | null> => {
    try {
      const cardNumber = cardData.number.replace(/\s/g, '');
      const cvv = cardData.ccv;
      const expMonth = cardData.expiryMonth.padStart(2, '0');
      // Ano precisa ser YYYY (4 dígitos)
      const expYear = cardData.expiryYear.length === 2 ? `20${cardData.expiryYear}` : cardData.expiryYear;
      const brand = detectCardBrand(cardNumber);
      
      // Account ID da EfiBank (identificador da conta - payee_code)
      const accountId = import.meta.env.VITE_EFI_ACCOUNT_ID || 'ece645632413c19903346509af8b14b1';

      console.log('[Tokenização] Dados:', { 
        accountId, 
        brand,
        cardLength: cardNumber.length,
        cvvLength: cvv.length,
        expMonth,
        expYear,
        holderName: cardData.name,
        holderDocument: customerData.cpfCnpj.replace(/\D/g, '')
      });

      // Usar a nova biblioteca payment-token-efi
      const result = await EfiPay.CreditCard
        .setAccount(accountId)
        .setEnvironment('production')
        .setCreditCardData({
          brand: brand,
          number: cardNumber,
          cvv: cvv,
          expirationMonth: expMonth,
          expirationYear: expYear,
          holderName: cardData.name,
          holderDocument: customerData.cpfCnpj.replace(/\D/g, ''),
          reuse: false
        })
        .getPaymentToken();

      console.log('[Tokenização] Resultado:', result);

      // Verificar se é resposta de sucesso (tem payment_token)
      const successResult = result as { payment_token: string; card_mask: string };
      if (successResult?.payment_token && successResult?.card_mask) {
        console.log('[Tokenização] Token obtido com sucesso!');
        return {
          token: successResult.payment_token,
          cardMask: successResult.card_mask
        };
      }

      // Se for erro, verificar mensagem
      const errorResult = result as { error_description?: string };
      if (errorResult?.error_description) {
        setError(`Erro no cartão: ${errorResult.error_description}`);
      }

      console.error('[Tokenização] Resposta sem token:', result);
      return null;

    } catch (error: any) {
      console.error('[Tokenização] Erro:', error);
      // Se for erro da API, mostrar mensagem
      if (error?.error_description) {
        setError(`Erro no cartão: ${error.error_description}`);
      } else if (error?.message) {
        setError(`Erro ao processar cartão: ${error.message}`);
      }
      return null;
    }
  };

  // Detectar bandeira do cartão
  const detectCardBrand = (number: string): string => {
    const cleanNumber = number.replace(/\D/g, '');
    
    if (/^4/.test(cleanNumber)) return 'visa';
    if (/^5[1-5]/.test(cleanNumber)) return 'mastercard';
    if (/^3[47]/.test(cleanNumber)) return 'amex';
    if (/^6(?:011|5)/.test(cleanNumber)) return 'discover';
    if (/^(?:2131|1800|35)/.test(cleanNumber)) return 'jcb';
    if (/^3(?:0[0-5]|[68])/.test(cleanNumber)) return 'diners';
    if (/^(636368|438935|504175|451416|636297|5067|4576|4011|506699)/.test(cleanNumber)) return 'elo';
    if (/^(606282|3841)/.test(cleanNumber)) return 'hipercard';
    
    return 'visa'; // Default
  };

  useEffect(() => {
    loadProductData();
  }, [linkId]);

  // Polling para verificar status do PIX
  useEffect(() => {
    if (!success || paymentMethod !== 'PIX' || pixConfirmed || !pixTxid) {
      return;
    }

    const checkPixStatus = async () => {
      try {
        setCheckingStatus(true);
        const response = await fetch(`/api/check-payment-status?type=pix&txid=${pixTxid}${paymentId ? `&paymentId=${paymentId}` : ''}`);
        const data = await response.json();
        
        console.log('[Polling PIX] Status:', data);

        if (data.success && data.status === 'CONFIRMED') {
          setPixConfirmed(true);
          // Limpar o intervalo será feito automaticamente pelo cleanup
        }
      } catch (error) {
        console.error('[Polling PIX] Erro:', error);
      } finally {
        setCheckingStatus(false);
      }
    };

    // Verificar imediatamente
    checkPixStatus();

    // Verificar a cada 5 segundos
    const interval = setInterval(checkPixStatus, 5000);

    // Timeout de 10 minutos (parar de verificar depois de muito tempo)
    const timeout = setTimeout(() => {
      clearInterval(interval);
    }, 10 * 60 * 1000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [success, paymentMethod, pixConfirmed, pixTxid, paymentId]);

  // Polling para verificar status do Boleto
  useEffect(() => {
    if (!success || paymentMethod !== 'BOLETO' || boletoConfirmed || !chargeId) {
      return;
    }

    const checkBoletoStatus = async () => {
      try {
        setCheckingStatus(true);
        const response = await fetch(`/api/check-payment-status?type=charge&chargeId=${chargeId}${paymentId ? `&paymentId=${paymentId}` : ''}`);
        const data = await response.json();
        
        console.log('[Polling Boleto] Status:', data);

        if (data.success && data.status === 'CONFIRMED') {
          setBoletoConfirmed(true);
        }
      } catch (error) {
        console.error('[Polling Boleto] Erro:', error);
      } finally {
        setCheckingStatus(false);
      }
    };

    // Para boleto, verificar a cada 30 segundos (pagamento pode demorar)
    checkBoletoStatus();
    const interval = setInterval(checkBoletoStatus, 30000);
    const timeout = setTimeout(() => clearInterval(interval), 30 * 60 * 1000); // 30 min

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [success, paymentMethod, boletoConfirmed, chargeId, paymentId]);

  // Carregar customizações do produto
  useEffect(() => {
    const loadCustomization = async () => {
      if (!productData?.productId) return;

      try {
        const result = await api.getCheckoutCustomization(productData.productId);
        if (result) {
          setCustomization(result);
          
          // Iniciar cronômetro se estiver ativado
          if (result.timerEnabled && result.timerMinutes) {
            setTimeLeft(result.timerMinutes * 60); // converter minutos para segundos
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
      const paymentData: any = {
        linkId: linkId || '',
        customer: {
          name: customerData.name,
          email: customerData.email,
          cpfCnpj: customerData.cpfCnpj.replace(/\D/g, ''),
          phone: customerData.phone.replace(/\D/g, ''),
        },
        billingType: paymentMethod as 'CREDIT_CARD' | 'PIX' | 'BOLETO',
        installments: paymentMethod === 'CREDIT_CARD' ? installments : undefined,
      };

      // Para cartão, tokenizar primeiro usando SDK EfiBank
      if (paymentMethod === 'CREDIT_CARD') {
        setTokenizing(true);
        console.log('[Checkout] Tokenizando cartão...');
        
        const tokenResult = await tokenizeCard();
        setTokenizing(false);
        
        if (tokenResult) {
          // Token obtido - enviar para processar diretamente
          console.log('[Checkout] Token obtido, processando pagamento...');
          paymentData.creditCard = {
            paymentToken: tokenResult.token,
            cardMask: tokenResult.cardMask,
          };
        } else {
          // Sem token - mostrar erro e não prosseguir
          console.error('[Checkout] Falha ao tokenizar cartão');
          setError('Erro ao processar os dados do cartão. Verifique os dados e tente novamente.');
          setProcessing(false);
          return;
        }
      }

      const response = await api.createPublicPayment(paymentData);

      if (response.success) {
        // PIX: capturar QR Code e código
        if (paymentMethod === 'PIX') {
          if (response.payment?.pixCode) {
            setPixCode(response.payment.pixCode);
            // Guardar txid e paymentId para polling
            if (response.payment?.txid) {
              setPixTxid(response.payment.txid);
            }
            if (response.payment?.id) {
              setPaymentId(response.payment.id);
            }
            // EfiBank retorna QR Code em base64 (pode ser com ou sem prefixo data:)
            if (response.payment?.pixQrCode) {
              setPixQrCode(response.payment.pixQrCode);
            }
            console.log('PIX gerado:', { 
              pixCode: response.payment.pixCode?.substring(0, 50) + '...', 
              hasQrCode: !!response.payment?.pixQrCode,
              txid: response.payment?.txid,
              paymentId: response.payment?.id
            });
          } else {
            setError('Erro ao gerar código PIX. Tente novamente.');
            return;
          }
        }
        
        // Boleto: capturar URL e código de barras
        if (paymentMethod === 'BOLETO') {
          if (response.payment?.boletoUrl || response.payment?.chargeId) {
            if (response.payment?.boletoUrl) {
              setBoletoUrl(response.payment.boletoUrl);
            }
            if (response.payment?.barcode) {
              setBoletoBarcode(response.payment.barcode);
            }
            if (response.payment?.chargeId) {
              setChargeId(response.payment.chargeId.toString());
            }
            if (response.payment?.id) {
              setPaymentId(response.payment.id);
            }
            console.log('Boleto gerado:', {
              boletoUrl: response.payment?.boletoUrl,
              barcode: response.payment?.barcode,
              chargeId: response.payment?.chargeId,
              paymentId: response.payment?.id
            });
          } else {
            setError('Erro ao gerar boleto. Tente novamente.');
            return;
          }
        }
        
        // Cartão: verificar status
        if (paymentMethod === 'CREDIT_CARD') {
          // Capturar chargeId e paymentUrl se existir
          if (response.payment?.chargeId) {
            setChargeId(response.payment.chargeId.toString());
          }
          if (response.payment?.id) {
            setPaymentId(response.payment.id);
          }
          
          // Se pagamento aprovado (com token)
          if (response.payment?.status === 'RECEIVED' || response.payment?.status === 'approved') {
            console.log('[Checkout] Cartão aprovado!');
            setSuccess(true);
            return;
          }
          
          // Se tem link de pagamento (fallback sem token)
          if (response.payment?.paymentUrl) {
            setCardPaymentUrl(response.payment.paymentUrl);
            setSuccess(true);
            return;
          }
          
          // Pagamento pendente ou recusado
          if (response.payment?.status === 'PENDING' || response.payment?.status === 'waiting') {
            setError('Pagamento em análise. Aguarde a confirmação.');
            return;
          }
          
          // Erro genérico
          setError(response.message || 'Erro ao processar pagamento com cartão.');
          return;
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

  // Tela de sucesso para cartão de crédito (pagamento instantâneo ou link de pagamento)
  if (success && paymentMethod === 'CREDIT_CARD') {
    // Se tem link de pagamento (tokenização não disponível), redirecionar
    if (cardPaymentUrl) {
      return (
        <Box sx={{ bgcolor: '#f8fafc', minHeight: '100vh', py: 6 }}>
          <Container maxWidth="sm">
            <Paper elevation={0} sx={{ p: 5, textAlign: 'center', borderRadius: 3, border: '1px solid #e2e8f0' }}>
              <CreditCardIcon sx={{ fontSize: 60, color: '#3b82f6', mb: 3 }} />
              
              <Typography variant="h5" fontWeight={700} sx={{ mb: 2, color: '#1e293b' }}>
                Complete seu Pagamento
              </Typography>
              
              <Typography variant="body1" sx={{ mb: 4, color: '#64748b' }}>
                Clique no botão abaixo para finalizar o pagamento com cartão de crédito de forma segura.
              </Typography>

              <Button
                fullWidth
                variant="contained"
                size="large"
                href={cardPaymentUrl}
                target="_blank"
                sx={{
                  py: 2,
                  bgcolor: '#3b82f6',
                  color: 'white',
                  fontWeight: 700,
                  textTransform: 'none',
                  fontSize: 18,
                  borderRadius: 2,
                  mb: 2,
                  '&:hover': { bgcolor: '#2563eb' },
                }}
              >
                Pagar com Cartão
              </Button>

              <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                Você será redirecionado para a página de pagamento segura da EfiBank
              </Typography>
            </Paper>
          </Container>
        </Box>
      );
    }

    // Pagamento aprovado instantaneamente
    return (
      <Box sx={{ bgcolor: '#f0fdf4', minHeight: '100vh', py: 6 }}>
        <Container maxWidth="sm">
          <Paper elevation={0} sx={{ p: 5, textAlign: 'center', borderRadius: 3, border: '1px solid #bbf7d0' }}>
            <Box sx={{ 
              width: 100, 
              height: 100, 
              borderRadius: '50%', 
              bgcolor: '#22c55e', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              mx: 'auto',
              mb: 3,
              boxShadow: '0 8px 30px rgba(34, 197, 94, 0.4)'
            }}>
              <CheckCircle sx={{ fontSize: 60, color: 'white' }} />
            </Box>
            
            <Typography variant="h4" fontWeight={700} sx={{ mb: 1, color: '#166534' }}>
              Pagamento Confirmado!
            </Typography>
            
            <Typography variant="body1" sx={{ mb: 4, color: '#15803d' }}>
              Sua compra foi realizada com sucesso.
            </Typography>

            <Box sx={{ bgcolor: '#f0fdf4', borderRadius: 2, p: 3, mb: 3, border: '1px solid #bbf7d0' }}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                Produto adquirido:
              </Typography>
              <Typography variant="h6" fontWeight={600} color="#1e293b">
                {productData?.productName || productData?.name}
              </Typography>
              <Typography variant="h5" fontWeight={700} color="#22c55e" sx={{ mt: 1 }}>
                R$ {(productData?.amount || productData?.value || 0).toFixed(2)}
              </Typography>
            </Box>

            <Alert severity="success" sx={{ textAlign: 'left', bgcolor: '#dcfce7', border: '1px solid #bbf7d0', mb: 3 }}>
              <Typography variant="body2" fontWeight={600} gutterBottom>
                🎉 Parabéns pela sua compra!
              </Typography>
              <Typography variant="body2">
                Você receberá um e-mail com os detalhes do seu pedido e instruções de acesso em breve.
              </Typography>
            </Alert>

            {invoiceUrl && (
              <Button
                fullWidth
                variant="outlined"
                href={invoiceUrl}
                target="_blank"
                sx={{ 
                  py: 1.5, 
                  borderRadius: 2,
                  borderColor: '#22c55e',
                  color: '#22c55e',
                  fontWeight: 600,
                  '&:hover': {
                    borderColor: '#16a34a',
                    bgcolor: '#f0fdf4'
                  }
                }}
              >
                Ver Comprovante
              </Button>
            )}

            <Typography variant="caption" sx={{ display: 'block', mt: 3, color: '#64748b' }}>
              Compra realizada via ZucroPay - Pagamentos Seguros
            </Typography>
          </Paper>
        </Container>
      </Box>
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
                        placeholder="MM"
                        value={cardData.expiryMonth}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '').substring(0, 2);
                          // Validar mês (01-12)
                          if (value === '' || (parseInt(value) >= 0 && parseInt(value) <= 12)) {
                            setCardData({ ...cardData, expiryMonth: value });
                          }
                        }}
                        inputProps={{ maxLength: 2, inputMode: 'numeric' }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            bgcolor: 'white',
                            '& fieldset': { borderColor: '#e5e7eb' },
                          },
                        }}
                      />
                      
                      <TextField
                        fullWidth
                        placeholder="AA"
                        value={cardData.expiryYear}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '').substring(0, 2);
                          setCardData({ ...cardData, expiryYear: value });
                        }}
                        inputProps={{ maxLength: 2, inputMode: 'numeric' }}
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
                        inputProps={{ inputMode: 'numeric' }}
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
                    <>
                      <CircularProgress size={24} sx={{ color: customization?.buttonTextColor || 'white', mr: 1 }} />
                      {tokenizing ? 'Processando cartão...' : 'Processando...'}
                    </>
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
            ) : success && paymentMethod === 'PIX' && pixConfirmed ? (
              /* Tela de Confirmação de Pagamento PIX */
              <Paper elevation={0} sx={{ p: 4, borderRadius: 3, border: '1px solid #e5e7eb', textAlign: 'center', bgcolor: '#f0fdf4' }}>
                <Box sx={{ 
                  width: 80, 
                  height: 80, 
                  borderRadius: '50%', 
                  bgcolor: '#22c55e', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  mx: 'auto',
                  mb: 3,
                  boxShadow: '0 4px 20px rgba(34, 197, 94, 0.4)'
                }}>
                  <CheckCircle sx={{ fontSize: 48, color: 'white' }} />
                </Box>
                
                <Typography variant="h5" fontWeight={700} sx={{ mb: 1, color: '#166534' }}>
                  Pagamento Confirmado!
                </Typography>
                
                <Typography variant="body1" sx={{ mb: 3, color: '#15803d' }}>
                  Seu pagamento foi processado com sucesso.
                </Typography>

                <Box sx={{ bgcolor: 'white', borderRadius: 2, p: 3, mb: 3, border: '1px solid #bbf7d0' }}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                    Produto adquirido:
                  </Typography>
                  <Typography variant="h6" fontWeight={600} color="#1e293b">
                    {productData?.productName || productData?.name}
                  </Typography>
                  <Typography variant="h5" fontWeight={700} color="#22c55e" sx={{ mt: 1 }}>
                    R$ {(productData?.amount || productData?.value || 0).toFixed(2)}
                  </Typography>
                </Box>

                <Alert severity="success" sx={{ textAlign: 'left', bgcolor: '#dcfce7', border: '1px solid #bbf7d0' }}>
                  <Typography variant="body2" fontWeight={600} gutterBottom>
                    🎉 Parabéns pela sua compra!
                  </Typography>
                  <Typography variant="body2">
                    Você receberá um e-mail com os detalhes do seu pedido em breve.
                    Em caso de dúvidas, entre em contato com o suporte.
                  </Typography>
                </Alert>

                <Typography variant="caption" sx={{ display: 'block', mt: 3, color: '#64748b' }}>
                  Compra realizada via ZucroPay - Pagamentos Seguros
                </Typography>
              </Paper>
            ) : success && paymentMethod === 'PIX' && (pixQrCode || pixCode) ? (
              /* Tela de QR Code PIX */
              <Paper elevation={0} sx={{ p: 4, borderRadius: 2, border: '1px solid #e5e7eb', textAlign: 'center' }}>
                <Typography variant="h6" fontWeight={600} sx={{ mb: 3, color: '#1e293b' }}>
                  Pagamento via PIX
                </Typography>
                
                {pixQrCode && (
                  <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center' }}>
                    <Box
                      component="img"
                      src={pixQrCode.startsWith('data:') ? pixQrCode : `data:image/png;base64,${pixQrCode}`}
                      alt="QR Code PIX"
                      sx={{ width: 250, height: 250, border: '2px solid #e5e7eb', borderRadius: 2, p: 1, bgcolor: 'white' }}
                      onError={(e) => {
                        console.error('Erro ao carregar QR Code');
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </Box>
                )}

                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  onClick={() => {
                    navigator.clipboard.writeText(pixCode);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  startIcon={copied ? <CheckCircle /> : <ContentCopy />}
                  sx={{
                    py: 1.5,
                    mb: 2,
                    bgcolor: copied ? '#22c55e' : '#1e293b',
                    color: 'white',
                    fontWeight: 600,
                    textTransform: 'none',
                    fontSize: 16,
                    borderRadius: 2,
                    '&:hover': { bgcolor: copied ? '#16a34a' : '#374151' },
                  }}
                >
                  {copied ? 'Código Copiado!' : 'Copiar Código PIX'}
                </Button>

                <Box sx={{ bgcolor: '#f8fafc', p: 2, borderRadius: 2, mb: 3, border: '1px solid #e2e8f0' }}>
                  <Typography variant="caption" sx={{ 
                    wordBreak: 'break-all', 
                    fontFamily: 'monospace',
                    fontSize: 11,
                    color: '#64748b'
                  }}>
                    {pixCode}
                  </Typography>
                </Box>

                <Alert severity="info" sx={{ textAlign: 'left', mb: 3 }}>
                  <Typography variant="body2" fontWeight={600} gutterBottom>
                    Como pagar:
                  </Typography>
                  <Typography variant="body2">
                    1. Abra o app do seu banco<br />
                    2. Escaneie o QR Code ou copie o código PIX<br />
                    3. Confirme o pagamento<br />
                    4. Clique no botão abaixo após pagar
                  </Typography>
                </Alert>

                {/* Indicador de verificação automática */}
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  gap: 1, 
                  mb: 2,
                  p: 2,
                  bgcolor: '#f0f9ff',
                  borderRadius: 2,
                  border: '1px solid #bae6fd'
                }}>
                  {checkingStatus ? (
                    <CircularProgress size={20} sx={{ color: '#0284c7' }} />
                  ) : (
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#22c55e', animation: 'pulse 2s infinite' }} />
                  )}
                  <Typography variant="body2" sx={{ color: '#0369a1' }}>
                    Aguardando confirmação do pagamento...
                  </Typography>
                </Box>

                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  onClick={() => setPixConfirmed(true)}
                  sx={{
                    py: 2,
                    bgcolor: '#22c55e',
                    color: 'white',
                    fontWeight: 700,
                    textTransform: 'none',
                    fontSize: 18,
                    borderRadius: 2,
                    boxShadow: '0 4px 14px rgba(34, 197, 94, 0.4)',
                    '&:hover': { bgcolor: '#16a34a' },
                  }}
                >
                  ✓ JÁ FIZ O PAGAMENTO
                </Button>

                <Typography variant="caption" sx={{ display: 'block', mt: 2, color: '#64748b', textAlign: 'center' }}>
                  A página será atualizada automaticamente quando o pagamento for confirmado
                </Typography>
              </Paper>
            ) : success && paymentMethod === 'BOLETO' && (boletoUrl || chargeId) ? (
              /* Tela de Boleto */
              <Paper elevation={0} sx={{ p: 4, borderRadius: 2, border: '1px solid #e5e7eb', textAlign: 'center' }}>
                <Typography variant="h6" fontWeight={600} sx={{ mb: 3, color: '#1e293b' }}>
                  Boleto Gerado com Sucesso!
                </Typography>
                
                <ReceiptIcon sx={{ fontSize: 80, color: '#1e293b', mb: 3 }} />
                
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Seu boleto foi gerado. Clique no botão abaixo para visualizar e pagar.
                </Typography>

                {boletoBarcode && (
                  <Box sx={{ bgcolor: '#f8fafc', p: 2, borderRadius: 2, mb: 3, border: '1px solid #e2e8f0' }}>
                    <Typography variant="caption" sx={{ color: '#64748b', mb: 1, display: 'block' }}>
                      Código de Barras:
                    </Typography>
                    <Typography variant="body2" sx={{ 
                      wordBreak: 'break-all', 
                      fontFamily: 'monospace',
                      fontSize: 12,
                      color: '#1e293b'
                    }}>
                      {boletoBarcode}
                    </Typography>
                    <Button
                      size="small"
                      startIcon={<ContentCopy />}
                      onClick={() => {
                        navigator.clipboard.writeText(boletoBarcode);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      sx={{ mt: 1 }}
                    >
                      {copied ? 'Copiado!' : 'Copiar'}
                    </Button>
                  </Box>
                )}

                {boletoUrl && (
                  <Button
                    fullWidth
                    variant="contained"
                    size="large"
                    href={boletoUrl}
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
                )}

                {/* Indicador de verificação automática */}
                {!boletoConfirmed && (
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    gap: 1, 
                    mb: 2,
                    p: 2,
                    bgcolor: '#f0f9ff',
                    borderRadius: 2,
                    border: '1px solid #bae6fd'
                  }}>
                    {checkingStatus ? (
                      <CircularProgress size={20} sx={{ color: '#0284c7' }} />
                    ) : (
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#22c55e' }} />
                    )}
                    <Typography variant="body2" sx={{ color: '#0369a1' }}>
                      Verificando pagamento a cada 30 segundos...
                    </Typography>
                  </Box>
                )}

                {boletoConfirmed ? (
                  <Alert severity="success" sx={{ textAlign: 'left' }}>
                    <Typography variant="body2" fontWeight={600}>
                      🎉 Pagamento Confirmado!
                    </Typography>
                    <Typography variant="body2">
                      Seu boleto foi pago e processado com sucesso.
                    </Typography>
                  </Alert>
                ) : (
                  <Alert severity="warning" sx={{ textAlign: 'left' }}>
                    <Typography variant="body2">
                      <strong>Importante:</strong> O prazo de compensação do boleto é de até 3 dias úteis após o pagamento.
                    </Typography>
                  </Alert>
                )}
              </Paper>
            ) : null}
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default CheckoutPublicoHubla;
