import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Tabs,
  Tab,
  LinearProgress,
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
import * as api from '../../services/api-supabase';

const Dashboard = () => {
  const [timeRange, setTimeRange] = useState(1);
  const [todayTotal, setTodayTotal] = useState(0);
  const [monthTotal, setMonthTotal] = useState(0);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    loadChartData();
  }, [timeRange]);

  const loadChartData = async () => {
    try {
      const paymentsResponse = await api.getPayments();
      const payments = paymentsResponse.payments || [];
      
      const today = new Date();
      let days = 7;
      
      if (timeRange === 0) days = 1;
      else if (timeRange === 1) days = 7;
      else if (timeRange === 2) days = 14;
      else if (timeRange === 3) days = 30;
      
      const chartDataArray = [];
      
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        
        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);
        
        const daySales = payments.filter((p: any) => {
          const paymentDate = new Date(p.created_at);
          return paymentDate >= date && paymentDate < nextDate && (p.status === 'RECEIVED' || p.status === 'CONFIRMED');
        });
        
        const dayTotal = daySales.reduce((sum: number, p: any) => sum + parseFloat(String(p.value || 0)), 0);
        
        chartDataArray.push({
          date: date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
          value: dayTotal,
        });
      }
      
      setChartData(chartDataArray);
    } catch (error) {
      console.error('Erro ao carregar dados do gráfico:', error);
      setChartData([]);
    }
  };

  const loadDashboardData = async () => {
    try {
      // Buscar pagamentos
      const paymentsResponse = await api.getPayments();
      const payments = paymentsResponse.payments || [];
      
      // Calcular totais
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      
      const todaySales = payments.filter((p: any) => {
        const paymentDate = new Date(p.created_at);
        return paymentDate >= todayStart && (p.status === 'RECEIVED' || p.status === 'CONFIRMED');
      });
      
      const monthSales = payments.filter((p: any) => {
        const paymentDate = new Date(p.created_at);
        return paymentDate >= monthStart && (p.status === 'RECEIVED' || p.status === 'CONFIRMED');
      });
      
      const todaySum = todaySales.reduce((sum: number, p: any) => sum + parseFloat(String(p.value || 0)), 0);
      const monthSum = monthSales.reduce((sum: number, p: any) => sum + parseFloat(String(p.value || 0)), 0);
      
      setTodayTotal(todaySum);
      setMonthTotal(monthSum);
      
      // Buscar saldo
      try {
        const balanceResponse = await api.getBalance();
        setBalance(parseFloat(String(balanceResponse.balance || 0)));
      } catch (error) {
        console.error('Erro ao buscar saldo:', error);
        setBalance(0);
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
          {/* Metric Cards */}
          <Box
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
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
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    {item.icon}
                    <Typography color="textSecondary" variant="body2">
                      {item.title}
                    </Typography>
                  </Box>
                  <Typography
                    variant="h4"
                    component="div"
                    sx={{ color: '#5818C8' }}
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
                <CardContent>
                  <Typography variant="h6" color="primary" gutterBottom>
                    Visão Geral de Vendas
                  </Typography>
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    Acompanhe o desempenho das suas vendas ao longo do tempo
                  </Typography>

                  <Tabs
                    value={timeRange}
                    onChange={handleTimeRangeChange}
                    sx={{ mb: 2 }}
                  >
                    <Tab label="Hoje" />
                    <Tab label="7 dias" />
                    <Tab label="14 dias" />
                    <Tab label="30 dias" />
                  </Tabs>

                  <Box sx={{ height: 250, width: '100%' }}>
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
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <TrophyIcon sx={{ color: '#5818C8' }} />
                    <Typography variant="h6" color="primary">
                      Programa de Recompensas
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="textSecondary">
                    Acompanhe seu progresso e resgate suas recompensas
                  </Typography>

                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', sm: '240px 1fr' },
                      gap: 3,
                      mt: 2,
                    }}
                  >
                    {/* Imagem */}
                    <Box
                      sx={{
                        position: 'relative',
                        cursor: 'pointer',
                        '&:hover': { transform: 'scale(1.05)' },
                      }}
                    >
                      <Box
                        component="img"
                        src="plca.png"
                        alt="Recompensa"
                        sx={{
                          width: '100%',
                          borderRadius: '8px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
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
                        <Typography variant="subtitle1" sx={{ color: '#5818C8' }}>
                          0% completo
                        </Typography>
                      </Box>
                      <Typography
                        variant="body2"
                        color="textSecondary"
                        gutterBottom
                      >
                        Progresso atual
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
                          value={0}
                          sx={{
                            height: 8,
                            borderRadius: 4,
                            '& .MuiLinearProgress-bar': {
                              backgroundColor: '#5818C8',
                            },
                          }}
                        />
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                          <Typography variant="body2" sx={{ color: '#5818C8' }}>
                            R$ 0,00 / 10K
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
              <CardContent>
                <Typography variant="h6" sx={{ color: '#5818C8', mb: 1 }}>
                  Métodos de Pagamento
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Estatísticas por método de pagamento
                </Typography>

                <Box sx={{ mt: 2 }}>
                  {[
                    {
                      icon: <CreditCardIcon sx={{ color: '#5818C8', fontSize: 20 }} />,
                      bg: '#EBE5FC',
                      title: 'Cartão',
                      subtitle: 'Pagamentos com cartão de crédito e débito',
                    },
                    {
                      icon: <QrCodeIcon sx={{ color: '#2E7D32', fontSize: 20 }} />,
                      bg: '#E8F5E9',
                      title: 'PIX',
                      subtitle: 'Transferências instantâneas via PIX',
                    },
                    {
                      icon: <ReceiptIcon sx={{ color: '#E65100', fontSize: 20 }} />,
                      bg: '#FFF3E0',
                      title: 'Boleto',
                      subtitle: 'Pagamentos via boleto bancário',
                    },
                  ].map((method, i) => (
                    <Box
                      key={i}
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        mb: 2,
                        border: '1px solid #f0f0f0',
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
                        <Box>
                          <Typography variant="subtitle1">{method.title}</Typography>
                          <Typography
                            variant="body2"
                            color="textSecondary"
                            sx={{ mb: 1 }}
                          >
                            {method.subtitle}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 2 }}>
                            <Typography variant="body2" color="textSecondary">
                              0 transações
                            </Typography>
                            <Typography
                              variant="body2"
                              sx={{ color: '#5818C8' }}
                              fontWeight="medium"
                            >
                              R$ 0,00
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Box>
        </Box>
      </Box>
    </>
  );
};

export default Dashboard;
