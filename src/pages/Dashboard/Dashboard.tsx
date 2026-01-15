import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Tabs,
  Tab,
  LinearProgress,
  Button,
  Snackbar,
  Alert,
} from '@mui/material';
import {
  CalendarToday as CalendarIcon,
  TrendingUp as TrendingUpIcon,
  AccountBalance as AccountBalanceIcon,
  CreditCard as CreditCardIcon,
  QrCode as QrCodeIcon,
  Receipt as ReceiptIcon,
  EmojiEvents as TrophyIcon,
  Share as ShareIcon,
  LocalOffer as OfferIcon,
  Event as EventIcon,
  Lock as LockIcon,
  Schedule as ScheduleIcon,
  GetApp as GetAppIcon,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts';
import Header from '../../components/Header/Header';
import pushNotifications from '../../services/push-notifications';

// API URL
const API_URL = import.meta.env.VITE_API_URL || '';

interface ReserveData {
  totalReserved: number;
  reservesCount: number;
  nextRelease: {
    amount: number;
    releaseDate: string;
    description: string;
  } | null;
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PaymentMethodStats {
  PIX: { count: number; total: number };
  CREDIT_CARD: { count: number; total: number };
  BOLETO: { count: number; total: number };
}

const Dashboard = () => {
  const [timeRange, setTimeRange] = useState(1);
  const [todayTotal, setTodayTotal] = useState(0);
  const [monthTotal, setMonthTotal] = useState(0);
  const [balance, setBalance] = useState(0);
  const [reserveData, setReserveData] = useState<ReserveData>({ totalReserved: 0, reservesCount: 0, nextRelease: null });
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodStats>({
    PIX: { count: 0, total: 0 },
    CREDIT_CARD: { count: 0, total: 0 },
    BOLETO: { count: 0, total: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<any[]>([]);
  const [fullChartData, setFullChartData] = useState<any[]>([]);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallButton, setShowInstallButton] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' | 'info' | 'warning' });

  useEffect(() => {
    loadDashboardData();
    setupPWAInstall();
    
    // Inicializar Push Notifications
    initializePushNotifications();
  }, []);

  const initializePushNotifications = async () => {
    try {
      // Verificar se push é suportado
      if (!pushNotifications.isPushSupported()) {
        console.log('[Push] Não suportado neste dispositivo');
        return;
      }

      // Registrar service worker
      await pushNotifications.registerServiceWorker();

      // Se já tem permissão, ativar automaticamente
      if (pushNotifications.getNotificationPermission() === 'granted') {
        await pushNotifications.subscribe();
        console.log('[Push] Notificações ativadas automaticamente');
      } else if (pushNotifications.getNotificationPermission() === 'default') {
        // Perguntar ao usuário após 5 segundos
        setTimeout(async () => {
          const permission = await pushNotifications.requestPermission();
          if (permission === 'granted') {
            await pushNotifications.subscribe();
            setSnackbar({ 
              open: true, 
              message: 'Notificações de vendas ativadas!', 
              severity: 'success' 
            });
          }
        }, 5000);
      }
    } catch (error) {
      console.error('[Push] Erro ao inicializar:', error);
    }
  };

  const setupPWAInstall = () => {
    // Verificar se já está instalado
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsInstalled(true);
      setShowInstallButton(false);
      return;
    }

    // Detectar evento beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      setShowInstallButton(true);
      console.log('PWA: beforeinstallprompt event captured');
    };

    // Verificar se o evento já foi disparado antes do listener ser adicionado
    if ('serviceWorker' in navigator) {
      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    }

    // Detectar se foi instalado após o evento
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setShowInstallButton(false);
      setDeferredPrompt(null);
      setSnackbar({ open: true, message: 'App instalado com sucesso!', severity: 'success' });
      console.log('PWA: App installed');
    });

    // Cleanup function
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      setSnackbar({ open: true, message: 'Instalação não disponível no momento', severity: 'info' });
      return;
    }

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setSnackbar({ open: true, message: 'Instalação iniciada!', severity: 'success' });
      } else {
        setSnackbar({ open: true, message: 'Instalação cancelada', severity: 'info' });
      }
      
      setDeferredPrompt(null);
      setShowInstallButton(false);
    } catch (error) {
      console.error('Erro ao instalar app:', error);
      setSnackbar({ open: true, message: 'Erro ao instalar o app', severity: 'error' });
    }
  };

  // Filtrar dados do gráfico baseado no timeRange (sem nova requisição!)
  useEffect(() => {
    if (fullChartData.length > 0) {
      let days = 7;
      if (timeRange === 0) days = 1;
      else if (timeRange === 1) days = 7;
      else if (timeRange === 2) days = 14;
      else if (timeRange === 3) days = 30;
      
      // Pegar os últimos N dias dos dados completos
      setChartData(fullChartData.slice(-days).map(d => ({
        date: d.label,
        value: d.value,
      })));
    }
  }, [timeRange, fullChartData]);

  const loadDashboardData = async () => {
    try {
      const token = localStorage.getItem('zucropay_token');
      
      // Uma única requisição para a API otimizada
      const response = await fetch(`${API_URL}/api/dashboard-data`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const result = await response.json();
      
      if (result.success && result.data) {
        const { stats, chartData: apiChartData, user, reserves, paymentMethods: apiPaymentMethods } = result.data;
        
        setTodayTotal(stats.todayTotal || 0);
        setMonthTotal(stats.monthTotal || 0);
        setBalance(user.balance || 0);
        setFullChartData(apiChartData || []);
        
        // Dados de reserva
        if (reserves) {
          setReserveData({
            totalReserved: reserves.totalReserved || 0,
            reservesCount: reserves.reservesCount || 0,
            nextRelease: reserves.nextRelease || null,
          });
        }
        
        // Dados de métodos de pagamento
        if (apiPaymentMethods) {
          setPaymentMethods({
            PIX: apiPaymentMethods.PIX || { count: 0, total: 0 },
            CREDIT_CARD: apiPaymentMethods.CREDIT_CARD || { count: 0, total: 0 },
            BOLETO: apiPaymentMethods.BOLETO || { count: 0, total: 0 },
          });
        }
        
        // Inicializar gráfico com 7 dias
        const last7Days = (apiChartData || []).slice(-7).map((d: any) => ({
          date: d.label,
          value: d.value,
        }));
        setChartData(last7Days);
      }
      
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    if (isNaN(value)) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const handleTimeRangeChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTimeRange(newValue);
  };

  return (
    <>
      <Header />
      <Box sx={{ minHeight: '100vh', backgroundColor: '#fafafa' }}>
        <Box
          sx={{
            maxWidth: '1400px',
            margin: '0 auto',
            p: { xs: 2, sm: 3 },
          }}
        >
          {/* Botão Instalar App PWA */}
          {showInstallButton && !isInstalled && (
            <Card
              sx={{
                mb: 3,
                background: 'linear-gradient(135deg, #5818C8 0%, #7c3aed 100%)',
                color: 'white',
                border: 'none',
              }}
            >
              <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  flexWrap: 'wrap', 
                  gap: 2,
                  flexDirection: { xs: 'column', sm: 'row' }
                }}>
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: { xs: 1.5, md: 2 },
                    flex: 1
                  }}>
                    <GetAppIcon sx={{ fontSize: { xs: 24, md: 32 } }} />
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 600, fontSize: { xs: '1rem', md: '1.25rem' } }}>
                        Instalar App ZucroPay
                      </Typography>
                      <Typography variant="body2" sx={{ opacity: 0.9, fontSize: { xs: '0.75rem', md: '0.875rem' } }}>
                        Instale o app para acesso rápido e melhor experiência
                      </Typography>
                    </Box>
                  </Box>
                  <Button
                    variant="contained"
                    startIcon={<GetAppIcon />}
                    onClick={handleInstallClick}
                    fullWidth={false}
                    sx={{
                      backgroundColor: 'white',
                      color: '#5818C8',
                      fontWeight: 600,
                      width: { xs: '100%', sm: 'auto' },
                      '&:hover': {
                        backgroundColor: '#f3f4f6',
                      },
                    }}
                  >
                    Instalar App
                  </Button>
                </Box>
              </CardContent>
            </Card>
          )}

          {/* Metric Cards */}
          <Box
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
              mb: 4,
            }}
          >
            {[
              {
                icon: <CalendarIcon sx={{ color: '#666', mr: 1 }} />,
                title: 'Total em Vendas hoje',
                value: loading ? 'Carregando...' : formatCurrency(todayTotal),
              },
              {
                icon: <TrendingUpIcon sx={{ color: '#666', mr: 1 }} />,
                title: 'Total em Vendas este mês',
                value: loading ? 'Carregando...' : formatCurrency(monthTotal),
              },
              {
                icon: <AccountBalanceIcon sx={{ color: '#666', mr: 1 }} />,
                title: 'Saldo disponível',
                value: loading ? 'Carregando...' : formatCurrency(balance),
              },
            ].map((item, index) => (
              <Card
                key={index}
                sx={{
                  height: '100%',
                  transition: 'transform 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 3,
                  },
                }}
              >
                <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    {item.icon}
                    <Typography 
                      color="textSecondary" 
                      variant="body2"
                      sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' } }}
                    >
                      {item.title}
                    </Typography>
                  </Box>
                  <Typography
                    variant="h4"
                    component="div"
                    sx={{ 
                      color: '#5818C8',
                      fontSize: { xs: '1.5rem', md: '2.125rem' }
                    }}
                  >
                    {item.value}
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Box>

          {/* Main Grid */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '3fr 1fr' },
              gap: 3,
            }}
          >
            {/* Left Column */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {/* Sales Chart */}
              <Card
                sx={{
                  transition: 'transform 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 3,
                  },
                }}
              >
                <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                  <Typography variant="h6" color="primary" gutterBottom sx={{ fontSize: { xs: '1rem', md: '1.25rem' } }}>
                    Visão Geral de Vendas
                  </Typography>
                  <Typography variant="body2" color="textSecondary" gutterBottom sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' } }}>
                    Acompanhe o desempenho das suas vendas ao longo do tempo
                  </Typography>

                  <Tabs
                    value={timeRange}
                    onChange={handleTimeRangeChange}
                    sx={{ mb: 2 }}
                    variant="scrollable"
                    scrollButtons="auto"
                    allowScrollButtonsMobile
                  >
                    <Tab label="Hoje" sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' } }} />
                    <Tab label="7 dias" sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' } }} />
                    <Tab label="14 dias" sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' } }} />
                    <Tab label="30 dias" sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' } }} />
                  </Tabs>

                  <Box sx={{ height: { xs: 200, md: 250 }, width: '100%' }}>
                    <ResponsiveContainer>
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke="#5818C8"
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>

              {/* Rewards */}
              <Card
                sx={{
                  transition: 'transform 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 3,
                  },
                }}
              >
                <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <TrophyIcon sx={{ color: '#5818C8', fontSize: { xs: 20, md: 24 } }} />
                    <Typography variant="h6" color="primary" sx={{ fontSize: { xs: '1rem', md: '1.25rem' } }}>
                      Programa de Recompensas
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="textSecondary" sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' } }}>
                    Acompanhe seu progresso e resgate suas recompensas
                  </Typography>

                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', sm: '240px 1fr' },
                        gap: { xs: 2, md: 3 },
                        mt: 2,
                      }}
                    >
                    {/* Imagem da Placa de Recompensa */}
                    <Box
                      sx={{
                        position: 'relative',
                        cursor: 'pointer',
                        transition: 'transform 0.3s',
                        '&:hover': { transform: 'scale(1.05)' },
                      }}
                    >
                      <Box
                        component="img"
                        src="/plca.png"
                        alt="Placa de Recompensa"
                        sx={{
                          width: '100%',
                          maxWidth: 240,
                          borderRadius: '12px',
                          boxShadow: '0 8px 32px rgba(88, 24, 200, 0.3)',
                        }}
                      />
                    </Box>

                    {/* Progresso */}
                    <Box>
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          mb: 1,
                        }}
                      >
                        <Typography variant="subtitle1">Sua próxima meta</Typography>
                        <Typography variant="subtitle1" sx={{ color: '#5818C8', fontWeight: 600 }}>
                          {Math.min(100, Math.round((monthTotal / 10000) * 100))}% completo
                        </Typography>
                      </Box>
                      <Typography
                        variant="body2"
                        color="textSecondary"
                        gutterBottom
                      >
                        Progresso atual - Meta: R$ 10.000,00
                      </Typography>

                      <Box sx={{ mt: 2, mb: 3 }}>
                        <Box
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            mb: 1,
                          }}
                        >
                          <Typography variant="caption" color="textSecondary">
                            0%
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            100%
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={Math.min(100, (monthTotal / 10000) * 100)}
                          sx={{
                            height: 10,
                            borderRadius: 5,
                            bgcolor: '#e9d5ff',
                            '& .MuiLinearProgress-bar': {
                              backgroundColor: '#5818C8',
                              borderRadius: 5,
                            },
                          }}
                        />
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                          <Typography variant="body2" sx={{ color: '#5818C8', fontWeight: 600 }}>
                            {formatCurrency(monthTotal)}
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#5818C8' }}>
                            / R$ 10.000,00
                          </Typography>
                        </Box>
                      </Box>

                      {/* Dicas */}
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="subtitle1" gutterBottom>
                          Dicas para alcançar sua meta
                        </Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <ShareIcon sx={{ color: '#5818C8', fontSize: 20 }} />
                            <Typography variant="body2">
                              Compartilhe seus produtos nas redes sociais
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <OfferIcon sx={{ color: '#5818C8', fontSize: 20 }} />
                            <Typography variant="body2">
                              Ofereça descontos para clientes recorrentes
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <EventIcon sx={{ color: '#5818C8', fontSize: 20 }} />
                            <Typography variant="body2">
                              Crie promoções especiais para datas comemorativas
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Box>

            {/* Payment Methods */}
            <Card
              sx={{
                height: 'fit-content',
                transition: 'transform 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 3,
                },
              }}
            >
              <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                <Typography variant="h6" sx={{ color: '#5818C8', mb: 1, fontSize: { xs: '1rem', md: '1.25rem' } }}>
                  Métodos de Pagamento
                </Typography>
                <Typography variant="body2" color="textSecondary" sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' } }}>
                  Estatísticas por método de pagamento
                </Typography>

                <Box sx={{ mt: 2 }}>
                  {[
                    {
                      key: 'CREDIT_CARD',
                      icon: <CreditCardIcon sx={{ color: '#5818C8', fontSize: 20 }} />,
                      bg: '#EBE5FC',
                      title: 'Cartão',
                      subtitle: 'Pagamentos com cartão de crédito e débito',
                      count: paymentMethods.CREDIT_CARD.count,
                      total: paymentMethods.CREDIT_CARD.total,
                    },
                    {
                      key: 'PIX',
                      icon: <QrCodeIcon sx={{ color: '#2E7D32', fontSize: 20 }} />,
                      bg: '#E8F5E9',
                      title: 'PIX',
                      subtitle: 'Transferências instantâneas via PIX',
                      count: paymentMethods.PIX.count,
                      total: paymentMethods.PIX.total,
                    },
                    {
                      key: 'BOLETO',
                      icon: <ReceiptIcon sx={{ color: '#E65100', fontSize: 20 }} />,
                      bg: '#FFF3E0',
                      title: 'Boleto',
                      subtitle: 'Pagamentos via boleto bancário',
                      count: paymentMethods.BOLETO.count,
                      total: paymentMethods.BOLETO.total,
                    },
                  ].map((method) => (
                    <Box
                      key={method.key}
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        mb: 2,
                        border: '1px solid #f0f0f0',
                        transition: 'all 0.2s',
                        '&:hover': {
                          backgroundColor: '#fafafa',
                          transform: 'translateX(4px)',
                        },
                      }}
                    >
                      <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                        <Box
                          sx={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            backgroundColor: method.bg,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {method.icon}
                        </Box>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="subtitle1">{method.title}</Typography>
                          <Typography
                            variant="body2"
                            color="textSecondary"
                            sx={{ mb: 1 }}
                          >
                            {method.subtitle}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                            <Typography variant="body2" color="textSecondary">
                              {method.count} {method.count === 1 ? 'transação' : 'transações'}
                            </Typography>
                            <Typography
                              variant="body2"
                              sx={{ color: '#5818C8', fontWeight: 600 }}
                            >
                              {formatCurrency(method.total)}
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>

            {/* Card de Reserva de Saldo */}
            <Card
              sx={{
                height: 'fit-content',
                mt: 3,
                transition: 'transform 0.2s',
                background: 'linear-gradient(135deg, #5818C8 0%, #7c3aed 100%)',
                border: 'none',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 8px 32px rgba(88, 24, 200, 0.4)',
                },
              }}
            >
              <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <LockIcon sx={{ color: 'white', fontSize: { xs: 20, md: 24 } }} />
                  <Typography variant="h6" sx={{ color: 'white', fontSize: { xs: '1rem', md: '1.25rem' }, fontWeight: 600 }}>
                    Reserva de Saldo
                  </Typography>
                </Box>
                
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)', mb: 2, fontSize: { xs: '0.75rem', md: '0.875rem' } }}>
                  Retenção de 5% por 30 dias para cobrir reembolsos e chargebacks
                </Typography>

                <Box sx={{ 
                  backgroundColor: 'rgba(255,255,255,0.15)', 
                  borderRadius: 2, 
                  p: 2, 
                  mb: 2,
                  backdropFilter: 'blur(10px)',
                }}>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                    Total em Reserva
                  </Typography>
                  <Typography variant="h5" sx={{ color: 'white', fontWeight: 700 }}>
                    {loading ? 'Carregando...' : formatCurrency(reserveData.totalReserved)}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                    {reserveData.reservesCount} reserva{reserveData.reservesCount !== 1 ? 's' : ''} ativa{reserveData.reservesCount !== 1 ? 's' : ''}
                  </Typography>
                </Box>

                {reserveData.nextRelease && (
                  <Box sx={{ 
                    backgroundColor: 'rgba(255,255,255,0.1)', 
                    borderRadius: 2, 
                    p: 2,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2
                  }}>
                    <ScheduleIcon sx={{ color: 'white', fontSize: 20 }} />
                    <Box>
                      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>
                        Próxima liberação
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'white', fontWeight: 700 }}>
                        {formatCurrency(reserveData.nextRelease.amount)} em{' '}
                        {new Date(reserveData.nextRelease.releaseDate).toLocaleDateString('pt-BR')}
                      </Typography>
                    </Box>
                  </Box>
                )}

                <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid rgba(255, 255, 255, 0.2)' }}>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.85)' }}>
                    💡 As reservas são liberadas automaticamente após 30 dias da venda.
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Box>
        </Box>
      </Box>

      {/* Snackbar para feedback */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
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

export default Dashboard;
