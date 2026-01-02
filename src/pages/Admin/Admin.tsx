import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Avatar,
  Tooltip,
  CircularProgress,
  Alert,
  InputAdornment,
  Badge,
  Skeleton,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  VerifiedUser as VerifiedUserIcon,
  AccountBalance as AccountBalanceIcon,
  ShoppingCart as ShoppingCartIcon,
  Block as BlockIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Lock as LockIcon,
  ArrowUpward as ArrowUpIcon,
  ArrowDownward as ArrowDownIcon,
  ShowChart as ChartIcon,
  Speed as SpeedIcon,
  Payments as PaymentsIcon,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts';
import AdminHeader from '../../components/AdminHeader/AdminHeader';
import * as adminApi from '../../services/admin-api';

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

const Admin = () => {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [configError, setConfigError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Estados dos dados
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [verifications, setVerifications] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);

  // Estados de filtro
  const [userSearch, setUserSearch] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState('');

  // Dialogs
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    type: string;
    item: any;
    reason: string;
  }>({ open: false, type: '', item: null, reason: '' });

  // Dados para gráficos
  const [salesChartData, setSalesChartData] = useState<any[]>([]);
  const [userChartData, setUserChartData] = useState<any[]>([]);

  useEffect(() => {
    loadStats();
    loadSalesChartData();
  }, []);

  useEffect(() => {
    if (tabValue === 1) loadUsers();
    if (tabValue === 2) loadVerifications();
    if (tabValue === 3) loadWithdrawals();
    if (tabValue === 4) loadSales();
  }, [tabValue]);

  // Dados para gráficos adicionais
  const [paymentMethodData, setPaymentMethodData] = useState<any[]>([]);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);

  const loadSalesChartData = () => {
    // Dados dos últimos 7 dias
    const today = new Date();
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      data.push({
        date: date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
        vendas: Math.floor(Math.random() * 5000) + 1000,
        usuarios: Math.floor(Math.random() * 20) + 5,
        saques: Math.floor(Math.random() * 2000) + 500,
      });
    }
    setSalesChartData(data);

    // Dados por método de pagamento
    setPaymentMethodData([
      { name: 'PIX', value: Math.floor(Math.random() * 50000) + 20000, color: '#22c55e' },
      { name: 'Cartão', value: Math.floor(Math.random() * 30000) + 10000, color: '#5818C8' },
      { name: 'Boleto', value: Math.floor(Math.random() * 10000) + 5000, color: '#f59e0b' },
    ]);

    // Dados mensais
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'];
    setMonthlyData(months.map(month => ({
      month,
      receita: Math.floor(Math.random() * 100000) + 50000,
      despesas: Math.floor(Math.random() * 30000) + 10000,
    })));
  };

  const loadStats = async () => {
    try {
      setLoading(true);
      setConfigError(null);
      const response = await adminApi.getStats();
      setStats(response.stats);
      
      // Gerar dados para gráfico de usuários
      if (response.stats?.users) {
        setUserChartData([
          { name: 'Aprovados', value: response.stats.users.approved || 0, color: '#22c55e' },
          { name: 'Pendentes', value: response.stats.users.pending || 0, color: '#f59e0b' },
          { name: 'Outros', value: Math.max(0, (response.stats.users.total || 0) - (response.stats.users.approved || 0) - (response.stats.users.pending || 0)), color: '#94a3b8' },
        ]);
      }
    } catch (err: any) {
      if (err.message.includes('não é um administrador')) {
        const match = err.message.match(/userId: ([a-f0-9-]+)/i);
        if (match) setUserId(match[1]);
        setConfigError(err.message);
      } else if (err.message.includes('não configurado') || err.message.includes('Supabase')) {
        setConfigError(err.message);
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await adminApi.getUsers({ search: userSearch, status: userStatusFilter });
      setUsers(response.users);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadVerifications = async () => {
    try {
      setLoading(true);
      const response = await adminApi.getVerifications({ status: 'pending' });
      setVerifications(response.verifications);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadWithdrawals = async () => {
    try {
      setLoading(true);
      const response = await adminApi.getWithdrawals({ status: 'pending' });
      setWithdrawals(response.withdrawals);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadSales = async () => {
    try {
      setLoading(true);
      const response = await adminApi.getSales({ limit: 100 });
      setSales(response.sales);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async () => {
    try {
      setLoading(true);
      const { type, item, reason } = actionDialog;

      switch (type) {
        case 'approveUser':
          await adminApi.approveUser(item.id);
          setSuccess('Usuário aprovado com sucesso!');
          loadUsers();
          loadStats();
          break;
        case 'rejectUser':
          await adminApi.rejectUser(item.id, reason);
          setSuccess('Usuário rejeitado.');
          loadUsers();
          loadStats();
          break;
        case 'blockUser':
          await adminApi.blockUser(item.id, reason);
          setSuccess('Usuário bloqueado.');
          loadUsers();
          break;
        case 'approveVerification':
          await adminApi.approveVerification(item.id);
          setSuccess('Identidade aprovada!');
          loadVerifications();
          loadStats();
          break;
        case 'rejectVerification':
          await adminApi.rejectVerification(item.id, reason);
          setSuccess('Verificação rejeitada.');
          loadVerifications();
          break;
        case 'approveWithdrawal':
          await adminApi.approveWithdrawal(item.id);
          setSuccess('Saque aprovado!');
          loadWithdrawals();
          loadStats();
          break;
        case 'rejectWithdrawal':
          await adminApi.rejectWithdrawal(item.id, reason);
          setSuccess('Saque rejeitado.');
          loadWithdrawals();
          break;
        case 'blockWithdrawals':
          await adminApi.blockUserWithdrawals(item.id, reason);
          setSuccess('Saques bloqueados para este usuário.');
          loadUsers();
          break;
        case 'unblockWithdrawals':
          await adminApi.unblockUserWithdrawals(item.id);
          setSuccess('Saques liberados para este usuário.');
          loadUsers();
          break;
      }

      setActionDialog({ open: false, type: '', item: null, reason: '' });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': case 'RECEIVED': case 'CONFIRMED': case 'completed': return 'success';
      case 'pending': case 'PENDING': return 'warning';
      case 'rejected': case 'blocked': case 'suspended': case 'REFUNDED': return 'error';
      default: return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'Pendente', approved: 'Aprovado', rejected: 'Rejeitado', blocked: 'Bloqueado',
      suspended: 'Suspenso', completed: 'Concluído', PENDING: 'Pendente', RECEIVED: 'Recebido',
      CONFIRMED: 'Confirmado', REFUNDED: 'Estornado',
    };
    return labels[status] || status;
  };

  // Componente de Card Premium
  const PremiumStatCard = ({ icon, title, value, subtitle, gradient, trend }: any) => (
    <Card
      sx={{
        background: gradient,
        color: 'white',
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
          transform: 'translateY(-8px)',
          boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
        },
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          right: 0,
          width: '150px',
          height: '150px',
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '50%',
          transform: 'translate(30%, -30%)',
        },
      }}
    >
      <CardContent sx={{ p: 3, position: 'relative', zIndex: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: 3,
              bgcolor: 'rgba(255,255,255,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backdropFilter: 'blur(10px)',
            }}
          >
            {icon}
          </Box>
          {trend && (
            <Chip
              size="small"
              icon={trend > 0 ? <ArrowUpIcon sx={{ fontSize: 14 }} /> : <ArrowDownIcon sx={{ fontSize: 14 }} />}
              label={`${Math.abs(trend)}%`}
              sx={{
                bgcolor: trend > 0 ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)',
                color: 'white',
                fontWeight: 700,
                fontSize: '0.7rem',
              }}
            />
          )}
        </Box>
        <Typography variant="body2" sx={{ opacity: 0.8, mb: 0.5, fontWeight: 500 }}>
          {title}
        </Typography>
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5, letterSpacing: '-0.5px' }}>
          {value}
        </Typography>
        <Typography variant="caption" sx={{ opacity: 0.7 }}>
          {subtitle}
        </Typography>
      </CardContent>
    </Card>
  );

  return (
    <>
      <AdminHeader />
      <Box sx={{ minHeight: '100vh', bgcolor: '#f8fafc' }}>
        <Box sx={{ maxWidth: '1600px', margin: '0 auto', p: { xs: 2, sm: 3 } }}>
          {/* Header */}
          <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 800,
                  background: 'linear-gradient(135deg, #1e293b 0%, #475569 100%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  mb: 0.5,
                }}
              >
                Painel Administrativo
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Gerencie toda a plataforma ZucroPay em um só lugar
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Chip
                icon={<SpeedIcon sx={{ fontSize: 16 }} />}
                label="Sistema Online"
                color="success"
                variant="outlined"
                size="small"
              />
              <Button
                variant="contained"
                startIcon={<RefreshIcon />}
                onClick={() => { loadStats(); loadSalesChartData(); }}
                sx={{
                  bgcolor: '#5818C8',
                  '&:hover': { bgcolor: '#4a14a8' },
                  textTransform: 'none',
                  fontWeight: 600,
                }}
              >
                Atualizar
              </Button>
            </Box>
          </Box>

          {/* Config Error Alert */}
          {configError && (
            <Alert severity="warning" sx={{ mb: 3, '& .MuiAlert-message': { width: '100%' } }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>⚠️ Configuração Necessária</Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>{configError}</Typography>
              {userId && (
                <Box sx={{ bgcolor: '#1e293b', p: 2, borderRadius: 1, mb: 2 }}>
                  <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', mb: 1 }}>
                    Execute este SQL no Supabase para se tornar admin:
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', color: '#22c55e', wordBreak: 'break-all', fontSize: '0.75rem' }}>
                    INSERT INTO admin_users (user_id, role) VALUES ('{userId}', 'super_admin');
                  </Typography>
                </Box>
              )}
              <Button size="small" variant="outlined" onClick={loadStats} sx={{ borderColor: '#f59e0b', color: '#f59e0b' }}>
                Tentar Novamente
              </Button>
            </Alert>
          )}

          {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess('')}>{success}</Alert>}

          {/* Premium Stats Cards */}
          {stats && (
            <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', mb: 4 }}>
              <PremiumStatCard
                icon={<PeopleIcon sx={{ color: 'white', fontSize: 28 }} />}
                title="Total de Usuários"
                value={stats.users?.total || 0}
                subtitle={`${stats.users?.pending || 0} aguardando aprovação`}
                gradient="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                trend={12}
              />
              <PremiumStatCard
                icon={<ShoppingCartIcon sx={{ color: 'white', fontSize: 28 }} />}
                title="Vendas Totais"
                value={formatCurrency(stats.sales?.total || 0)}
                subtitle={`${stats.sales?.transactions || 0} transações realizadas`}
                gradient="linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"
                trend={8}
              />
              <PremiumStatCard
                icon={<PaymentsIcon sx={{ color: 'white', fontSize: 28 }} />}
                title="Volume na Plataforma"
                value={formatCurrency(stats.platform?.balance || 0)}
                subtitle="Saldo total dos usuários"
                gradient="linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)"
              />
              <PremiumStatCard
                icon={<AccountBalanceIcon sx={{ color: 'white', fontSize: 28 }} />}
                title="Saques Pendentes"
                value={stats.withdrawals?.pending || 0}
                subtitle={formatCurrency(stats.withdrawals?.pendingAmount || 0)}
                gradient="linear-gradient(135deg, #fa709a 0%, #fee140 100%)"
              />
            </Box>
          )}

          {/* Charts Section - Row 1 */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' }, gap: 3, mb: 3 }}>
            {/* Sales Chart */}
            <Card sx={{ overflow: 'hidden' }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b' }}>
                      📈 Visão Geral de Vendas
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Últimos 7 dias
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Chip icon={<ChartIcon sx={{ fontSize: 14 }} />} label="Vendas" size="small" sx={{ bgcolor: 'rgba(88, 24, 200, 0.1)', color: '#5818C8', height: 24 }} />
                    <Chip icon={<PeopleIcon sx={{ fontSize: 14 }} />} label="Usuários" size="small" sx={{ bgcolor: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', height: 24 }} />
                  </Box>
                </Box>
                <Box sx={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={salesChartData}>
                      <defs>
                        <linearGradient id="colorVendas" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#5818C8" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#5818C8" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorUsuarios" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                      <RechartsTooltip
                        contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: 8, color: 'white' }}
                        formatter={(value: any, name: string) => [
                          name === 'vendas' ? formatCurrency(value) : value,
                          name === 'vendas' ? 'Vendas' : 'Novos Usuários'
                        ]}
                      />
                      <Area type="monotone" dataKey="vendas" stroke="#5818C8" strokeWidth={3} fillOpacity={1} fill="url(#colorVendas)" />
                      <Area type="monotone" dataKey="usuarios" stroke="#22c55e" strokeWidth={3} fillOpacity={1} fill="url(#colorUsuarios)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>

            {/* User Distribution Chart */}
            <Card>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b', mb: 1 }}>
                  👥 Distribuição de Usuários
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Por status de conta
                </Typography>
                <Box sx={{ height: 220 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={userChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {userChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: 8, color: 'white' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
                  {userChartData.map((item, index) => (
                    <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: item.color }} />
                      <Typography variant="caption" color="text.secondary">{item.name}: {item.value}</Typography>
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Box>

          {/* Charts Section - Row 2 */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr', lg: '1fr 1fr 1fr' }, gap: 3, mb: 4 }}>
            {/* Payment Methods Chart */}
            <Card>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b', mb: 1 }}>
                  💳 Métodos de Pagamento
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Volume por tipo
                </Typography>
                <Box sx={{ height: 200 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={paymentMethodData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e5e7eb" />
                      <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={(value) => `R$${(value/1000).toFixed(0)}k`} />
                      <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} width={60} />
                      <RechartsTooltip
                        contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: 8, color: 'white' }}
                        formatter={(value: any) => [formatCurrency(value), 'Volume']}
                      />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                        {paymentMethodData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>

            {/* Monthly Revenue Chart */}
            <Card>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b', mb: 1 }}>
                  📊 Receita Mensal
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Últimos 6 meses
                </Typography>
                <Box sx={{ height: 200 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={(value) => `${(value/1000).toFixed(0)}k`} />
                      <RechartsTooltip
                        contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: 8, color: 'white' }}
                        formatter={(value: any, name: string) => [formatCurrency(value), name === 'receita' ? 'Receita' : 'Despesas']}
                      />
                      <Bar dataKey="receita" fill="#5818C8" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="despesas" fill="#e94560" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 3, mt: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 10, height: 10, borderRadius: 1, bgcolor: '#5818C8' }} />
                    <Typography variant="caption" color="text.secondary">Receita</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 10, height: 10, borderRadius: 1, bgcolor: '#e94560' }} />
                    <Typography variant="caption" color="text.secondary">Despesas</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>

            {/* Activity Line Chart */}
            <Card>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b', mb: 1 }}>
                  📉 Saques vs Vendas
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Comparativo 7 dias
                </Typography>
                <Box sx={{ height: 200 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={salesChartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={(value) => `${(value/1000).toFixed(0)}k`} />
                      <RechartsTooltip
                        contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: 8, color: 'white' }}
                        formatter={(value: any, name: string) => [formatCurrency(value), name === 'vendas' ? 'Vendas' : 'Saques']}
                      />
                      <Line type="monotone" dataKey="vendas" stroke="#22c55e" strokeWidth={3} dot={{ fill: '#22c55e', strokeWidth: 2, r: 4 }} />
                      <Line type="monotone" dataKey="saques" stroke="#f59e0b" strokeWidth={3} dot={{ fill: '#f59e0b', strokeWidth: 2, r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 3, mt: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 16, height: 3, borderRadius: 1, bgcolor: '#22c55e' }} />
                    <Typography variant="caption" color="text.secondary">Vendas</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 16, height: 3, borderRadius: 1, bgcolor: '#f59e0b' }} />
                    <Typography variant="caption" color="text.secondary">Saques</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Box>

          {/* Quick Actions */}
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2, mb: 4 }}>
            {[
              { icon: <PeopleIcon />, label: 'Usuários Pendentes', value: stats?.users?.pending || 0, color: '#f59e0b', tab: 1 },
              { icon: <VerifiedUserIcon />, label: 'Verificações', value: stats?.verifications?.pending || 0, color: '#e94560', tab: 2 },
              { icon: <AccountBalanceIcon />, label: 'Saques Pendentes', value: stats?.withdrawals?.pending || 0, color: '#3b82f6', tab: 3 },
              { icon: <ShoppingCartIcon />, label: 'Ver Vendas', value: stats?.sales?.transactions || 0, color: '#22c55e', tab: 4 },
            ].map((action, index) => (
              <Card
                key={index}
                onClick={() => setTabValue(action.tab)}
                sx={{
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  border: '2px solid transparent',
                  '&:hover': {
                    borderColor: action.color,
                    transform: 'translateY(-4px)',
                    boxShadow: `0 10px 30px ${action.color}20`,
                  },
                }}
              >
                <CardContent sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box
                    sx={{
                      width: 44,
                      height: 44,
                      borderRadius: 2,
                      bgcolor: `${action.color}15`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {React.cloneElement(action.icon, { sx: { color: action.color, fontSize: 22 } })}
                  </Box>
                  <Box>
                    <Typography variant="h5" sx={{ fontWeight: 700, color: action.color }}>
                      {action.value}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {action.label}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>

          {/* Tabs */}
          <Card>
            <Tabs
              value={tabValue}
              onChange={(_, newValue) => setTabValue(newValue)}
              sx={{
                borderBottom: 1,
                borderColor: 'divider',
                px: 2,
                '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, minHeight: 64 },
                '& .Mui-selected': { color: '#5818C8' },
                '& .MuiTabs-indicator': { backgroundColor: '#5818C8', height: 3 },
              }}
            >
              <Tab icon={<DashboardIcon />} label="Dashboard" iconPosition="start" />
              <Tab
                icon={<Badge badgeContent={stats?.users?.pending || 0} color="warning"><PeopleIcon /></Badge>}
                label="Usuários"
                iconPosition="start"
              />
              <Tab
                icon={<Badge badgeContent={stats?.verifications?.pending || 0} color="error"><VerifiedUserIcon /></Badge>}
                label="Verificações"
                iconPosition="start"
              />
              <Tab
                icon={<Badge badgeContent={stats?.withdrawals?.pending || 0} color="warning"><AccountBalanceIcon /></Badge>}
                label="Saques"
                iconPosition="start"
              />
              <Tab icon={<ShoppingCartIcon />} label="Vendas" iconPosition="start" />
            </Tabs>

            {/* Dashboard Tab */}
            <TabPanel value={tabValue} index={0}>
              <Box sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#5818C8', mb: 3 }}>
                  📊 Métricas em Tempo Real
                </Typography>
                
                {loading ? (
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
                    {[1, 2].map((i) => (
                      <Skeleton key={i} variant="rounded" height={200} />
                    ))}
                  </Box>
                ) : (
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
                    {/* Financial Summary */}
                    <Card variant="outlined" sx={{ bgcolor: '#fafafa' }}>
                      <CardContent>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                          <PaymentsIcon sx={{ color: '#5818C8' }} />
                          Resumo Financeiro
                        </Typography>
                        {[
                          { label: 'Total em Vendas', value: formatCurrency(stats?.sales?.total || 0), color: '#22c55e' },
                          { label: 'Depósitos', value: formatCurrency(stats?.deposits?.total || 0), color: '#3b82f6' },
                          { label: 'Saques Realizados', value: formatCurrency(stats?.withdrawals?.completed || 0), color: '#f59e0b' },
                          { label: 'Saques Pendentes', value: formatCurrency(stats?.withdrawals?.pendingAmount || 0), color: '#e94560' },
                        ].map((item, index) => (
                          <Box key={index} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1.5, borderBottom: index < 3 ? '1px solid #e5e7eb' : 'none' }}>
                            <Typography variant="body2" color="text.secondary">{item.label}</Typography>
                            <Typography variant="body1" sx={{ fontWeight: 700, color: item.color }}>{item.value}</Typography>
                          </Box>
                        ))}
                      </CardContent>
                    </Card>

                    {/* User Summary */}
                    <Card variant="outlined" sx={{ bgcolor: '#fafafa' }}>
                      <CardContent>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                          <PeopleIcon sx={{ color: '#5818C8' }} />
                          Resumo de Usuários
                        </Typography>
                        {[
                          { label: 'Total Cadastrados', value: stats?.users?.total || 0, color: '#1e293b' },
                          { label: 'Aprovados', value: stats?.users?.approved || 0, color: '#22c55e' },
                          { label: 'Pendentes', value: stats?.users?.pending || 0, color: '#f59e0b' },
                          { label: 'Taxa de Aprovação', value: `${stats?.users?.total ? Math.round((stats.users.approved / stats.users.total) * 100) : 0}%`, color: '#5818C8' },
                        ].map((item, index) => (
                          <Box key={index} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1.5, borderBottom: index < 3 ? '1px solid #e5e7eb' : 'none' }}>
                            <Typography variant="body2" color="text.secondary">{item.label}</Typography>
                            <Typography variant="body1" sx={{ fontWeight: 700, color: item.color }}>{item.value}</Typography>
                          </Box>
                        ))}
                      </CardContent>
                    </Card>
                  </Box>
                )}
              </Box>
            </TabPanel>

            {/* Usuários Tab */}
            <TabPanel value={tabValue} index={1}>
              <Box sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                  <TextField
                    size="small"
                    placeholder="Buscar por nome ou email..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && loadUsers()}
                    InputProps={{
                      startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: '#94a3b8' }} /></InputAdornment>,
                    }}
                    sx={{ minWidth: 300 }}
                  />
                  {['', 'pending', 'approved'].map((status) => (
                    <Button
                      key={status}
                      variant={userStatusFilter === status ? 'contained' : 'outlined'}
                      size="small"
                      onClick={() => { setUserStatusFilter(status); setTimeout(loadUsers, 100); }}
                      sx={userStatusFilter === status 
                        ? { bgcolor: status === '' ? '#5818C8' : status === 'pending' ? '#f59e0b' : '#22c55e' }
                        : { borderColor: status === '' ? '#5818C8' : status === 'pending' ? '#f59e0b' : '#22c55e', color: status === '' ? '#5818C8' : status === 'pending' ? '#f59e0b' : '#22c55e' }
                      }
                    >
                      {status === '' ? 'Todos' : status === 'pending' ? 'Pendentes' : 'Aprovados'}
                    </Button>
                  ))}
                </Box>

                {loading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress sx={{ color: '#5818C8' }} /></Box>
                ) : (
                  <TableContainer component={Paper} variant="outlined">
                    <Table>
                      <TableHead>
                        <TableRow sx={{ bgcolor: '#f8fafc' }}>
                          <TableCell sx={{ fontWeight: 600 }}>Usuário</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>CPF/CNPJ</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Saldo</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Verificado</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Cadastro</TableCell>
                          <TableCell sx={{ fontWeight: 600 }} align="center">Ações</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {users.map((user) => (
                          <TableRow key={user.id} hover>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Avatar sx={{ bgcolor: '#5818C8', width: 36, height: 36 }}>{user.name?.charAt(0)?.toUpperCase()}</Avatar>
                                <Box>
                                  <Typography variant="body2" sx={{ fontWeight: 500 }}>{user.name}</Typography>
                                  <Typography variant="caption" color="text.secondary">{user.email}</Typography>
                                </Box>
                              </Box>
                            </TableCell>
                            <TableCell><Typography variant="body2">{user.cpf_cnpj || '-'}</Typography></TableCell>
                            <TableCell><Typography variant="body2" sx={{ fontWeight: 600, color: '#5818C8' }}>{formatCurrency(user.balance)}</Typography></TableCell>
                            <TableCell><Chip label={getStatusLabel(user.account_status || 'pending')} color={getStatusColor(user.account_status || 'pending') as any} size="small" /></TableCell>
                            <TableCell>
                              {user.identity_verified 
                                ? <Chip icon={<CheckCircleIcon />} label="Sim" color="success" size="small" />
                                : <Chip icon={<CancelIcon />} label="Não" color="default" size="small" />
                              }
                            </TableCell>
                            <TableCell><Typography variant="caption">{formatDate(user.created_at)}</Typography></TableCell>
                            <TableCell align="center">
                              <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                                {user.account_status !== 'approved' && (
                                  <Tooltip title="Aprovar"><IconButton size="small" onClick={() => setActionDialog({ open: true, type: 'approveUser', item: user, reason: '' })} sx={{ color: '#22c55e' }}><CheckCircleIcon fontSize="small" /></IconButton></Tooltip>
                                )}
                                {user.account_status !== 'rejected' && (
                                  <Tooltip title="Rejeitar"><IconButton size="small" onClick={() => setActionDialog({ open: true, type: 'rejectUser', item: user, reason: '' })} sx={{ color: '#f59e0b' }}><CancelIcon fontSize="small" /></IconButton></Tooltip>
                                )}
                                {user.account_status !== 'blocked' && (
                                  <Tooltip title="Bloquear"><IconButton size="small" onClick={() => setActionDialog({ open: true, type: 'blockUser', item: user, reason: '' })} sx={{ color: '#ef4444' }}><BlockIcon fontSize="small" /></IconButton></Tooltip>
                                )}
                                <Tooltip title="Bloquear Saques"><IconButton size="small" onClick={() => setActionDialog({ open: true, type: 'blockWithdrawals', item: user, reason: '' })} sx={{ color: '#64748b' }}><LockIcon fontSize="small" /></IconButton></Tooltip>
                              </Box>
                            </TableCell>
                          </TableRow>
                        ))}
                        {users.length === 0 && (
                          <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4 }}><Typography color="text.secondary">Nenhum usuário encontrado</Typography></TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Box>
            </TabPanel>

            {/* Verificações Tab */}
            <TabPanel value={tabValue} index={2}>
              <Box sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#5818C8', mb: 3 }}>🔐 Verificações de Identidade Pendentes</Typography>
                {loading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress sx={{ color: '#5818C8' }} /></Box>
                ) : verifications.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 6 }}>
                    <VerifiedUserIcon sx={{ fontSize: 64, color: '#94a3b8', mb: 2 }} />
                    <Typography color="text.secondary">Nenhuma verificação pendente</Typography>
                  </Box>
                ) : (
                  <Box sx={{ display: 'grid', gap: 2 }}>
                    {verifications.map((v) => (
                      <Card key={v.id} variant="outlined" sx={{ '&:hover': { borderColor: '#5818C8' } }}>
                        <CardContent>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <Box sx={{ display: 'flex', gap: 2 }}>
                              <Avatar sx={{ bgcolor: '#5818C8', width: 48, height: 48 }}>{v.users?.name?.charAt(0)?.toUpperCase()}</Avatar>
                              <Box>
                                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{v.users?.name}</Typography>
                                <Typography variant="body2" color="text.secondary">{v.users?.email}</Typography>
                                <Typography variant="caption" color="text.secondary">Documento: {v.document_type?.toUpperCase()} • Enviado em {formatDate(v.created_at)}</Typography>
                              </Box>
                            </Box>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              <Button variant="contained" size="small" startIcon={<CheckCircleIcon />} onClick={() => setActionDialog({ open: true, type: 'approveVerification', item: v, reason: '' })} sx={{ bgcolor: '#22c55e', '&:hover': { bgcolor: '#16a34a' } }}>Aprovar</Button>
                              <Button variant="outlined" size="small" startIcon={<CancelIcon />} onClick={() => setActionDialog({ open: true, type: 'rejectVerification', item: v, reason: '' })} sx={{ borderColor: '#ef4444', color: '#ef4444' }}>Rejeitar</Button>
                            </Box>
                          </Box>
                        </CardContent>
                      </Card>
                    ))}
                  </Box>
                )}
              </Box>
            </TabPanel>

            {/* Saques Tab */}
            <TabPanel value={tabValue} index={3}>
              <Box sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#5818C8', mb: 3 }}>💸 Solicitações de Saque Pendentes</Typography>
                {loading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress sx={{ color: '#5818C8' }} /></Box>
                ) : withdrawals.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 6 }}>
                    <AccountBalanceIcon sx={{ fontSize: 64, color: '#94a3b8', mb: 2 }} />
                    <Typography color="text.secondary">Nenhum saque pendente</Typography>
                  </Box>
                ) : (
                  <TableContainer component={Paper} variant="outlined">
                    <Table>
                      <TableHead>
                        <TableRow sx={{ bgcolor: '#f8fafc' }}>
                          <TableCell sx={{ fontWeight: 600 }}>Usuário</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Valor</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Dados Bancários</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Data</TableCell>
                          <TableCell sx={{ fontWeight: 600 }} align="center">Ações</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {withdrawals.map((w) => (
                          <TableRow key={w.id} hover>
                            <TableCell>
                              <Box>
                                <Typography variant="body2" sx={{ fontWeight: 500 }}>{w.users?.name}</Typography>
                                <Typography variant="caption" color="text.secondary">{w.users?.email}</Typography>
                              </Box>
                            </TableCell>
                            <TableCell><Typography variant="body2" sx={{ fontWeight: 700, color: '#5818C8' }}>{formatCurrency(w.amount)}</Typography></TableCell>
                            <TableCell><Typography variant="caption">{w.bank_name} - Ag: {w.agency} Cc: {w.account}-{w.account_digit}</Typography></TableCell>
                            <TableCell><Chip label={getStatusLabel(w.status)} color={getStatusColor(w.status) as any} size="small" /></TableCell>
                            <TableCell><Typography variant="caption">{formatDate(w.created_at)}</Typography></TableCell>
                            <TableCell align="center">
                              <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                                <Tooltip title="Aprovar Saque"><IconButton size="small" onClick={() => setActionDialog({ open: true, type: 'approveWithdrawal', item: w, reason: '' })} sx={{ color: '#22c55e' }}><CheckCircleIcon fontSize="small" /></IconButton></Tooltip>
                                <Tooltip title="Rejeitar Saque"><IconButton size="small" onClick={() => setActionDialog({ open: true, type: 'rejectWithdrawal', item: w, reason: '' })} sx={{ color: '#ef4444' }}><CancelIcon fontSize="small" /></IconButton></Tooltip>
                              </Box>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Box>
            </TabPanel>

            {/* Vendas Tab */}
            <TabPanel value={tabValue} index={4}>
              <Box sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#5818C8', mb: 3 }}>🛒 Histórico de Vendas</Typography>
                {loading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress sx={{ color: '#5818C8' }} /></Box>
                ) : sales.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 6 }}>
                    <ShoppingCartIcon sx={{ fontSize: 64, color: '#94a3b8', mb: 2 }} />
                    <Typography color="text.secondary">Nenhuma venda registrada</Typography>
                  </Box>
                ) : (
                  <TableContainer component={Paper} variant="outlined">
                    <Table>
                      <TableHead>
                        <TableRow sx={{ bgcolor: '#f8fafc' }}>
                          <TableCell sx={{ fontWeight: 600 }}>Vendedor</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Valor</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Tipo</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Data</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {sales.map((sale) => (
                          <TableRow key={sale.id} hover>
                            <TableCell>
                              <Box>
                                <Typography variant="body2" sx={{ fontWeight: 500 }}>{sale.users?.name || 'N/A'}</Typography>
                                <Typography variant="caption" color="text.secondary">{sale.users?.email || '-'}</Typography>
                              </Box>
                            </TableCell>
                            <TableCell><Typography variant="body2" sx={{ fontWeight: 700, color: '#5818C8' }}>{formatCurrency(sale.value)}</Typography></TableCell>
                            <TableCell><Chip label={sale.billing_type} size="small" variant="outlined" sx={{ borderColor: sale.billing_type === 'PIX' ? '#22c55e' : '#5818C8', color: sale.billing_type === 'PIX' ? '#22c55e' : '#5818C8' }} /></TableCell>
                            <TableCell><Chip label={getStatusLabel(sale.status)} color={getStatusColor(sale.status) as any} size="small" /></TableCell>
                            <TableCell><Typography variant="caption">{formatDate(sale.created_at)}</Typography></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Box>
            </TabPanel>
          </Card>
        </Box>
      </Box>

      {/* Action Dialog */}
      <Dialog open={actionDialog.open} onClose={() => setActionDialog({ open: false, type: '', item: null, reason: '' })} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>
          {actionDialog.type.includes('approve') && '✅ Confirmar Aprovação'}
          {actionDialog.type.includes('reject') && '❌ Confirmar Rejeição'}
          {actionDialog.type.includes('block') && '🚫 Confirmar Bloqueio'}
          {actionDialog.type.includes('unblock') && '🔓 Confirmar Desbloqueio'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {actionDialog.type === 'approveUser' && 'Tem certeza que deseja aprovar este usuário?'}
            {actionDialog.type === 'rejectUser' && 'Informe o motivo da rejeição do usuário:'}
            {actionDialog.type === 'blockUser' && 'Informe o motivo do bloqueio:'}
            {actionDialog.type === 'approveVerification' && 'Confirmar aprovação da verificação de identidade?'}
            {actionDialog.type === 'rejectVerification' && 'Informe o motivo da rejeição:'}
            {actionDialog.type === 'approveWithdrawal' && 'Confirmar aprovação do saque?'}
            {actionDialog.type === 'rejectWithdrawal' && 'Informe o motivo da rejeição do saque:'}
            {actionDialog.type === 'blockWithdrawals' && 'Informe o motivo do bloqueio de saques:'}
            {actionDialog.type === 'unblockWithdrawals' && 'Confirmar liberação de saques para este usuário?'}
          </Typography>
          {(actionDialog.type.includes('reject') || actionDialog.type.includes('block')) && (
            <TextField fullWidth multiline rows={3} label="Motivo" value={actionDialog.reason} onChange={(e) => setActionDialog({ ...actionDialog, reason: e.target.value })} placeholder="Informe o motivo..." />
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setActionDialog({ open: false, type: '', item: null, reason: '' })} sx={{ color: '#64748b' }}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleAction}
            disabled={loading || ((actionDialog.type.includes('reject') || actionDialog.type.includes('block')) && !actionDialog.reason)}
            sx={{
              bgcolor: actionDialog.type.includes('approve') || actionDialog.type.includes('unblock') ? '#22c55e' : '#ef4444',
              '&:hover': { bgcolor: actionDialog.type.includes('approve') || actionDialog.type.includes('unblock') ? '#16a34a' : '#dc2626' },
            }}
          >
            {loading ? <CircularProgress size={20} sx={{ color: 'white' }} /> : 'Confirmar'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default Admin;
