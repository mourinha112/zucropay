import { useEffect, useState } from 'react';
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
  Grid,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
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
  ArrowUpward as ArrowUpIcon,
  ArrowDownward as ArrowDownIcon,
  Speed as SpeedIcon,
  Payments as PaymentsIcon,
  Inventory as InventoryIcon,
  History as HistoryIcon,
  Settings as SettingsIcon,
  Link as LinkIcon,
  Visibility as ViewIcon,
  Person as PersonIcon,
  AttachMoney as MoneyIcon,
  TrendingUp as TrendingUpIcon,
  CloudDone as CloudDoneIcon,
  CloudOff as CloudOffIcon,
  Webhook as WebhookIcon,
} from '@mui/icons-material';
import {
  AreaChart,
  Area,
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
  const [products, setProducts] = useState<any[]>([]);
  const [webhookLogs, setWebhookLogs] = useState<any[]>([]);
  const [adminLogs, setAdminLogs] = useState<any[]>([]);
  const [paymentLinks, setPaymentLinks] = useState<any[]>([]);
  const [gatewayConfig, setGatewayConfig] = useState<any>(null);
  const [advancedStats, setAdvancedStats] = useState<any>(null);

  // Estados de filtro
  const [userSearch, setUserSearch] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState('');
  const [productSearch, setProductSearch] = useState('');

  // Dialogs
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    type: string;
    item: any;
    reason: string;
  }>({ open: false, type: '', item: null, reason: '' });

  const [userDetailDialog, setUserDetailDialog] = useState<{
    open: boolean;
    user: any;
    loading: boolean;
  }>({ open: false, user: null, loading: false });

  const [balanceDialog, setBalanceDialog] = useState<{
    open: boolean;
    user: any;
    amount: string;
    type: 'add' | 'subtract' | 'set';
    reason: string;
  }>({ open: false, user: null, amount: '', type: 'add', reason: '' });

  // Dados para gráficos
  const [salesChartData, setSalesChartData] = useState<any[]>([]);
  const [paymentMethodData, setPaymentMethodData] = useState<any[]>([]);

  useEffect(() => {
    loadStats();
    loadGatewayConfig();
    loadAdvancedStats();
  }, []);

  useEffect(() => {
    if (tabValue === 1) loadUsers();
    if (tabValue === 2) loadVerifications();
    if (tabValue === 3) loadWithdrawals();
    if (tabValue === 4) loadSales();
    if (tabValue === 5) loadProducts();
    if (tabValue === 6) loadPaymentLinks();
    if (tabValue === 7) loadLogs();
  }, [tabValue]);

  const loadStats = async () => {
    try {
      setLoading(true);
      setConfigError(null);
      const response = await adminApi.getStats();
      setStats(response.stats);
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

  const loadGatewayConfig = async () => {
    try {
      const response = await adminApi.getGatewayConfig();
      setGatewayConfig(response.config);
    } catch (err: any) {
      console.error('Erro ao carregar config do gateway:', err);
    }
  };

  const loadAdvancedStats = async () => {
    try {
      const response = await adminApi.getAdvancedStats({});
      setAdvancedStats(response.stats);
      
      // Atualizar gráficos
      if (response.stats?.dailyStats) {
        setSalesChartData(response.stats.dailyStats.map((d: any) => ({
          date: new Date(d.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
          vendas: d.sales,
          usuarios: d.newUsers,
        })));
      }
      
      if (response.stats?.paymentMethodStats) {
        const methods = response.stats.paymentMethodStats;
        setPaymentMethodData([
          { name: 'PIX', value: methods.PIX || 0, color: '#22c55e' },
          { name: 'Cartão', value: methods.CREDIT_CARD || 0, color: '#5818C8' },
          { name: 'Boleto', value: methods.BOLETO || 0, color: '#f59e0b' },
        ]);
      }
    } catch (err: any) {
      console.error('Erro ao carregar estatísticas avançadas:', err);
    }
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await adminApi.getUsers({ search: userSearch, status: userStatusFilter });
      setUsers(response.users || []);
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
      setVerifications(response.verifications || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadWithdrawals = async () => {
    try {
      setLoading(true);
      // Buscar saques pendentes E aprovados (aguardando transferência manual)
      const [pendingRes, approvedRes] = await Promise.all([
        adminApi.getWithdrawals({ status: 'pending' }),
        adminApi.getWithdrawals({ status: 'approved' }),
      ]);
      const allWithdrawals = [
        ...(pendingRes.withdrawals || []),
        ...(approvedRes.withdrawals || []),
      ];
      setWithdrawals(allWithdrawals);
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
      setSales(response.sales || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      setLoading(true);
      const response = await adminApi.getAllProducts({ search: productSearch, limit: 100 });
      setProducts(response.products || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadPaymentLinks = async () => {
    try {
      setLoading(true);
      const response = await adminApi.getAllPaymentLinks({ limit: 100 });
      setPaymentLinks(response.paymentLinks || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadLogs = async () => {
    try {
      setLoading(true);
      const [webhookResponse, adminResponse] = await Promise.all([
        adminApi.getWebhookLogs({ limit: 50 }),
        adminApi.getAdminLogs({ limit: 50 }),
      ]);
      setWebhookLogs(webhookResponse.logs || []);
      setAdminLogs(adminResponse.logs || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadUserDetails = async (userId: string) => {
    try {
      setUserDetailDialog({ open: true, user: null, loading: true });
      const response = await adminApi.getUserDetails(userId);
      setUserDetailDialog({ open: true, user: response, loading: false });
    } catch (err: any) {
      setError(err.message);
      setUserDetailDialog({ open: false, user: null, loading: false });
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
          // eslint-disable-next-line no-case-declarations
          const approveResult = await adminApi.approveWithdrawal(item.id);
          setSuccess(approveResult.message || 'Saque aprovado!');
          loadWithdrawals();
          loadStats();
          break;
        case 'completeWithdrawal':
          // eslint-disable-next-line no-case-declarations
          const completeResult = await adminApi.completeWithdrawal(item.id);
          setSuccess(completeResult.message || 'Saque concluído!');
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

  const handleAdjustBalance = async () => {
    try {
      setLoading(true);
      const { user, amount, type, reason } = balanceDialog;
      
      await adminApi.adjustUserBalance({
        userId: user.id,
        amount: parseFloat(amount),
        type,
        reason,
      });
      
      setSuccess('Saldo ajustado com sucesso!');
      setBalanceDialog({ open: false, user: null, amount: '', type: 'add', reason: '' });
      loadUsers();
      loadStats();
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
    switch (status?.toLowerCase()) {
      case 'approved': case 'received': case 'confirmed': case 'completed': case 'active': return 'success';
      case 'pending': return 'warning';
      case 'rejected': case 'blocked': case 'suspended': case 'refunded': case 'failed': case 'inactive': return 'error';
      default: return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'Pendente', approved: 'Aprovado', rejected: 'Rejeitado', blocked: 'Bloqueado',
      suspended: 'Suspenso', completed: 'Concluído', PENDING: 'Pendente', RECEIVED: 'Recebido',
      CONFIRMED: 'Confirmado', REFUNDED: 'Estornado', active: 'Ativo', inactive: 'Inativo',
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
          {trend !== undefined && (
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
        <Box sx={{ maxWidth: '1800px', margin: '0 auto', p: { xs: 2, sm: 3 } }}>
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
                🛡️ Painel Administrativo ZucroPay
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Controle total do gateway de pagamentos
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {gatewayConfig && (
                <Chip
                  icon={gatewayConfig.configured ? <CloudDoneIcon sx={{ fontSize: 16 }} /> : <CloudOffIcon sx={{ fontSize: 16 }} />}
                  label={gatewayConfig.configured ? 'Gateway Conectado' : 'Gateway Offline'}
                  color={gatewayConfig.configured ? 'success' : 'error'}
                  variant="outlined"
                  size="small"
                />
              )}
              <Chip
                icon={<SpeedIcon sx={{ fontSize: 16 }} />}
                label={gatewayConfig?.sandbox ? 'Sandbox' : 'Produção'}
                color={gatewayConfig?.sandbox ? 'warning' : 'success'}
                variant="outlined"
                size="small"
              />
              <Button
                variant="contained"
                startIcon={<RefreshIcon />}
                onClick={() => { loadStats(); loadAdvancedStats(); loadGatewayConfig(); }}
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
            <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', mb: 4 }}>
              <PremiumStatCard
                icon={<PeopleIcon sx={{ color: 'white', fontSize: 28 }} />}
                title="Total de Usuários"
                value={stats.users?.total || 0}
                subtitle={`${stats.users?.pending || 0} aguardando aprovação`}
                gradient="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
              />
              <PremiumStatCard
                icon={<ShoppingCartIcon sx={{ color: 'white', fontSize: 28 }} />}
                title="Vendas Totais"
                value={formatCurrency(stats.sales?.total || 0)}
                subtitle={`${stats.sales?.transactions || 0} transações`}
                gradient="linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"
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

          {/* Charts Section */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' }, gap: 3, mb: 4 }}>
            {/* Sales Chart */}
            <Card sx={{ overflow: 'hidden' }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b' }}>
                      📈 Vendas e Novos Usuários
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Últimos 30 dias
                    </Typography>
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

            {/* Payment Methods Chart */}
            <Card>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b', mb: 1 }}>
                  💳 Métodos de Pagamento
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Volume por tipo
                </Typography>
                <Box sx={{ height: 220 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={paymentMethodData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {paymentMethodData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: 8, color: 'white' }} 
                        formatter={(value: any) => [formatCurrency(value), 'Volume']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
                  {paymentMethodData.map((item, index) => (
                    <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: item.color }} />
                      <Typography variant="caption" color="text.secondary">{item.name}: {formatCurrency(item.value)}</Typography>
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Box>

          {/* Gateway Config Card */}
          {gatewayConfig && (
            <Card sx={{ mb: 4, border: '2px solid', borderColor: gatewayConfig.configured ? '#22c55e' : '#ef4444' }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Box sx={{ 
                    width: 48, height: 48, borderRadius: 2, 
                    bgcolor: gatewayConfig.configured ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <SettingsIcon sx={{ color: gatewayConfig.configured ? '#22c55e' : '#ef4444', fontSize: 24 }} />
                  </Box>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>Configuração do Gateway</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {gatewayConfig.provider} • {gatewayConfig.sandbox ? 'Modo Sandbox' : 'Modo Produção'}
                    </Typography>
                  </Box>
                </Box>
                <Grid container spacing={2}>
                  <Grid item xs={6} md={3}>
                    <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2, textAlign: 'center' }}>
                      <Typography variant="caption" color="text.secondary">Client ID</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: gatewayConfig.clientIdMasked ? '#22c55e' : '#ef4444' }}>
                        {gatewayConfig.clientIdMasked || 'Não configurado'}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2, textAlign: 'center' }}>
                      <Typography variant="caption" color="text.secondary">Chave PIX</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: gatewayConfig.pixKeyMasked ? '#22c55e' : '#ef4444' }}>
                        {gatewayConfig.pixKeyMasked || 'Não configurado'}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2, textAlign: 'center' }}>
                      <Typography variant="caption" color="text.secondary">PIX</Typography>
                      <Chip label={gatewayConfig.features?.pix ? 'Ativo' : 'Inativo'} size="small" color={gatewayConfig.features?.pix ? 'success' : 'error'} />
                    </Box>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2, textAlign: 'center' }}>
                      <Typography variant="caption" color="text.secondary">Cartão</Typography>
                      <Chip label={gatewayConfig.features?.creditCard ? 'Ativo' : 'Inativo'} size="small" color={gatewayConfig.features?.creditCard ? 'success' : 'error'} />
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          )}

          {/* Tabs */}
          <Card>
            <Tabs
              value={tabValue}
              onChange={(_, newValue) => setTabValue(newValue)}
              variant="scrollable"
              scrollButtons="auto"
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
              <Tab icon={<InventoryIcon />} label="Produtos" iconPosition="start" />
              <Tab icon={<LinkIcon />} label="Links" iconPosition="start" />
              <Tab icon={<HistoryIcon />} label="Logs" iconPosition="start" />
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
                  <>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3, mb: 3 }}>
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

                    {/* Top Sellers */}
                    {advancedStats?.topSellers && advancedStats.topSellers.length > 0 && (
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <TrendingUpIcon sx={{ color: '#5818C8' }} />
                            Top Vendedores (30 dias)
                          </Typography>
                          <TableContainer>
                            <Table size="small">
                              <TableHead>
                                <TableRow>
                                  <TableCell sx={{ fontWeight: 600 }}>#</TableCell>
                                  <TableCell sx={{ fontWeight: 600 }}>Vendedor</TableCell>
                                  <TableCell sx={{ fontWeight: 600 }} align="right">Vendas</TableCell>
                                  <TableCell sx={{ fontWeight: 600 }} align="right">Total</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {advancedStats.topSellers.slice(0, 5).map((seller: any, index: number) => (
                                  <TableRow key={seller.userId}>
                                    <TableCell>
                                      <Chip label={index + 1} size="small" sx={{ 
                                        bgcolor: index === 0 ? '#ffd700' : index === 1 ? '#c0c0c0' : index === 2 ? '#cd7f32' : '#e5e7eb',
                                        fontWeight: 700
                                      }} />
                                    </TableCell>
                                    <TableCell>
                                      <Box>
                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{seller.name}</Typography>
                                        <Typography variant="caption" color="text.secondary">{seller.email}</Typography>
                                      </Box>
                                    </TableCell>
                                    <TableCell align="right">{seller.count}</TableCell>
                                    <TableCell align="right">
                                      <Typography sx={{ fontWeight: 700, color: '#22c55e' }}>{formatCurrency(seller.total)}</Typography>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </TableContainer>
                        </CardContent>
                      </Card>
                    )}
                  </>
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
                                <Tooltip title="Ver Detalhes"><IconButton size="small" onClick={() => loadUserDetails(user.id)} sx={{ color: '#3b82f6' }}><ViewIcon fontSize="small" /></IconButton></Tooltip>
                                <Tooltip title="Ajustar Saldo"><IconButton size="small" onClick={() => setBalanceDialog({ open: true, user, amount: '', type: 'add', reason: '' })} sx={{ color: '#f59e0b' }}><MoneyIcon fontSize="small" /></IconButton></Tooltip>
                                {user.account_status !== 'approved' && (
                                  <Tooltip title="Aprovar"><IconButton size="small" onClick={() => setActionDialog({ open: true, type: 'approveUser', item: user, reason: '' })} sx={{ color: '#22c55e' }}><CheckCircleIcon fontSize="small" /></IconButton></Tooltip>
                                )}
                                {user.account_status !== 'blocked' && (
                                  <Tooltip title="Bloquear"><IconButton size="small" onClick={() => setActionDialog({ open: true, type: 'blockUser', item: user, reason: '' })} sx={{ color: '#ef4444' }}><BlockIcon fontSize="small" /></IconButton></Tooltip>
                                )}
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
                            <TableCell>
                              <Typography variant="caption">
                                {w.pix_key ? `PIX (${w.pix_key_type}): ${w.pix_key}` : `${w.bank_name} - Ag: ${w.agency} Cc: ${w.account_number}-${w.account_digit}`}
                              </Typography>
                              <Typography variant="caption" display="block" color="text.secondary">
                                {w.holder_name}
                              </Typography>
                            </TableCell>
                            <TableCell><Chip label={getStatusLabel(w.status)} color={getStatusColor(w.status) as any} size="small" /></TableCell>
                            <TableCell><Typography variant="caption">{formatDate(w.created_at)}</Typography></TableCell>
                            <TableCell align="center">
                              <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                                {w.status === 'pending' ? (
                                  <>
                                    <Tooltip title="Aprovar Saque"><IconButton size="small" onClick={() => setActionDialog({ open: true, type: 'approveWithdrawal', item: w, reason: '' })} sx={{ color: '#22c55e' }}><CheckCircleIcon fontSize="small" /></IconButton></Tooltip>
                                    <Tooltip title="Rejeitar Saque"><IconButton size="small" onClick={() => setActionDialog({ open: true, type: 'rejectWithdrawal', item: w, reason: '' })} sx={{ color: '#ef4444' }}><CancelIcon fontSize="small" /></IconButton></Tooltip>
                                  </>
                                ) : w.status === 'approved' ? (
                                  <Tooltip title="Marcar como Concluído (transferência feita)">
                                    <Button 
                                      size="small" 
                                      variant="contained"
                                      onClick={() => setActionDialog({ open: true, type: 'completeWithdrawal', item: w, reason: '' })} 
                                      sx={{ bgcolor: '#5818C8', '&:hover': { bgcolor: '#4a14a8' }, fontSize: '0.7rem' }}
                                    >
                                      ✓ Concluir
                                    </Button>
                                  </Tooltip>
                                ) : null}
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
                          <TableCell sx={{ fontWeight: 600 }}>Descrição</TableCell>
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
                            <TableCell><Typography variant="caption">{sale.description || '-'}</Typography></TableCell>
                            <TableCell><Typography variant="caption">{formatDate(sale.created_at)}</Typography></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Box>
            </TabPanel>

            {/* Produtos Tab */}
            <TabPanel value={tabValue} index={5}>
              <Box sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#5818C8' }}>📦 Produtos do Sistema</Typography>
                  <TextField
                    size="small"
                    placeholder="Buscar produto..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && loadProducts()}
                    InputProps={{
                      startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: '#94a3b8' }} /></InputAdornment>,
                    }}
                    sx={{ width: 300 }}
                  />
                </Box>
                {loading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress sx={{ color: '#5818C8' }} /></Box>
                ) : products.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 6 }}>
                    <InventoryIcon sx={{ fontSize: 64, color: '#94a3b8', mb: 2 }} />
                    <Typography color="text.secondary">Nenhum produto encontrado</Typography>
                  </Box>
                ) : (
                  <TableContainer component={Paper} variant="outlined">
                    <Table>
                      <TableHead>
                        <TableRow sx={{ bgcolor: '#f8fafc' }}>
                          <TableCell sx={{ fontWeight: 600 }}>Produto</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Vendedor</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Preço</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Marketplace</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Criado em</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {products.map((product) => (
                          <TableRow key={product.id} hover>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                {product.image_url && (
                                  <Box component="img" src={product.image_url} sx={{ width: 40, height: 40, borderRadius: 1, objectFit: 'cover' }} />
                                )}
                                <Box>
                                  <Typography variant="body2" sx={{ fontWeight: 500 }}>{product.name}</Typography>
                                  <Typography variant="caption" color="text.secondary">{product.description?.substring(0, 50)}...</Typography>
                                </Box>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Box>
                                <Typography variant="body2" sx={{ fontWeight: 500 }}>{product.users?.name}</Typography>
                                <Typography variant="caption" color="text.secondary">{product.users?.email}</Typography>
                              </Box>
                            </TableCell>
                            <TableCell><Typography variant="body2" sx={{ fontWeight: 700, color: '#5818C8' }}>{formatCurrency(product.price)}</Typography></TableCell>
                            <TableCell><Chip label={product.active ? 'Ativo' : 'Inativo'} color={product.active ? 'success' : 'default'} size="small" /></TableCell>
                            <TableCell><Chip label={product.marketplace_enabled ? 'Sim' : 'Não'} color={product.marketplace_enabled ? 'success' : 'default'} size="small" /></TableCell>
                            <TableCell><Typography variant="caption">{formatDate(product.created_at)}</Typography></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Box>
            </TabPanel>

            {/* Links Tab */}
            <TabPanel value={tabValue} index={6}>
              <Box sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#5818C8', mb: 3 }}>🔗 Links de Pagamento</Typography>
                {loading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress sx={{ color: '#5818C8' }} /></Box>
                ) : paymentLinks.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 6 }}>
                    <LinkIcon sx={{ fontSize: 64, color: '#94a3b8', mb: 2 }} />
                    <Typography color="text.secondary">Nenhum link de pagamento encontrado</Typography>
                  </Box>
                ) : (
                  <TableContainer component={Paper} variant="outlined">
                    <Table>
                      <TableHead>
                        <TableRow sx={{ bgcolor: '#f8fafc' }}>
                          <TableCell sx={{ fontWeight: 600 }}>Nome</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Vendedor</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Valor</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Clicks</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Vendas</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Total</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {paymentLinks.map((link) => (
                          <TableRow key={link.id} hover>
                            <TableCell>
                              <Typography variant="body2" sx={{ fontWeight: 500 }}>{link.name}</Typography>
                            </TableCell>
                            <TableCell>
                              <Box>
                                <Typography variant="body2" sx={{ fontWeight: 500 }}>{link.users?.name}</Typography>
                                <Typography variant="caption" color="text.secondary">{link.users?.email}</Typography>
                              </Box>
                            </TableCell>
                            <TableCell><Typography variant="body2" sx={{ fontWeight: 700, color: '#5818C8' }}>{formatCurrency(link.amount)}</Typography></TableCell>
                            <TableCell>{link.clicks || 0}</TableCell>
                            <TableCell>{link.payments_count || 0}</TableCell>
                            <TableCell><Typography sx={{ fontWeight: 700, color: '#22c55e' }}>{formatCurrency(link.total_received || 0)}</Typography></TableCell>
                            <TableCell><Chip label={link.active ? 'Ativo' : 'Inativo'} color={link.active ? 'success' : 'default'} size="small" /></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Box>
            </TabPanel>

            {/* Logs Tab */}
            <TabPanel value={tabValue} index={7}>
              <Box sx={{ p: 3 }}>
                <Grid container spacing={3}>
                  {/* Webhook Logs */}
                  <Grid item xs={12} md={6}>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#5818C8', mb: 2 }}>🔔 Logs de Webhook</Typography>
                    <Card variant="outlined" sx={{ maxHeight: 400, overflow: 'auto' }}>
                      {webhookLogs.length === 0 ? (
                        <Box sx={{ p: 3, textAlign: 'center' }}>
                          <WebhookIcon sx={{ fontSize: 48, color: '#94a3b8', mb: 1 }} />
                          <Typography color="text.secondary">Nenhum log de webhook</Typography>
                        </Box>
                      ) : (
                        <List dense>
                          {webhookLogs.map((log) => (
                            <ListItem key={log.id} divider>
                              <ListItemIcon>
                                <Chip 
                                  label={log.processed ? 'OK' : 'PEND'} 
                                  size="small" 
                                  color={log.processed ? 'success' : 'warning'}
                                  sx={{ width: 50 }}
                                />
                              </ListItemIcon>
                              <ListItemText
                                primary={log.event_type}
                                secondary={formatDate(log.created_at)}
                              />
                            </ListItem>
                          ))}
                        </List>
                      )}
                    </Card>
                  </Grid>

                  {/* Admin Logs */}
                  <Grid item xs={12} md={6}>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#5818C8', mb: 2 }}>📋 Logs de Admin</Typography>
                    <Card variant="outlined" sx={{ maxHeight: 400, overflow: 'auto' }}>
                      {adminLogs.length === 0 ? (
                        <Box sx={{ p: 3, textAlign: 'center' }}>
                          <HistoryIcon sx={{ fontSize: 48, color: '#94a3b8', mb: 1 }} />
                          <Typography color="text.secondary">Nenhuma ação registrada</Typography>
                        </Box>
                      ) : (
                        <List dense>
                          {adminLogs.map((log) => (
                            <ListItem key={log.id} divider>
                              <ListItemIcon>
                                <Chip 
                                  label={log.action?.split('_')[0]?.toUpperCase()} 
                                  size="small" 
                                  color={log.action?.includes('approve') || log.action?.includes('unblock') ? 'success' : log.action?.includes('reject') || log.action?.includes('block') ? 'error' : 'default'}
                                  sx={{ minWidth: 70 }}
                                />
                              </ListItemIcon>
                              <ListItemText
                                primary={log.action?.replace(/_/g, ' ')}
                                secondary={`${log.target_type} • ${formatDate(log.created_at)}`}
                              />
                            </ListItem>
                          ))}
                        </List>
                      )}
                    </Card>
                  </Grid>
                </Grid>
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
            {actionDialog.type === 'approveWithdrawal' && 'Confirmar aprovação do saque? Você deverá fazer a transferência manualmente e depois clicar em "Concluir".'}
            {actionDialog.type === 'completeWithdrawal' && 'Confirmar que a transferência foi realizada?'}
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

      {/* User Detail Dialog */}
      <Dialog open={userDetailDialog.open} onClose={() => setUserDetailDialog({ open: false, user: null, loading: false })} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
          <PersonIcon /> Detalhes do Usuário
        </DialogTitle>
        <DialogContent>
          {userDetailDialog.loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
          ) : userDetailDialog.user && (
            <Box>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle2" color="text.secondary">Informações</Typography>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>{userDetailDialog.user.user?.name}</Typography>
                      <Typography variant="body2" color="text.secondary">{userDetailDialog.user.user?.email}</Typography>
                      <Typography variant="body2" color="text.secondary">{userDetailDialog.user.user?.phone || 'Sem telefone'}</Typography>
                      <Typography variant="body2" color="text.secondary">CPF/CNPJ: {userDetailDialog.user.user?.cpf_cnpj || '-'}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle2" color="text.secondary">Estatísticas</Typography>
                      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, mt: 1 }}>
                        <Box>
                          <Typography variant="caption" color="text.secondary">Saldo</Typography>
                          <Typography variant="h6" sx={{ fontWeight: 700, color: '#5818C8' }}>{formatCurrency(userDetailDialog.user.user?.balance || 0)}</Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">Total Vendas</Typography>
                          <Typography variant="h6" sx={{ fontWeight: 700, color: '#22c55e' }}>{formatCurrency(userDetailDialog.user.user?.stats?.totalSales || 0)}</Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">Produtos</Typography>
                          <Typography variant="body1" sx={{ fontWeight: 700 }}>{userDetailDialog.user.user?.stats?.totalProducts || 0}</Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">Transações</Typography>
                          <Typography variant="body1" sx={{ fontWeight: 700 }}>{userDetailDialog.user.user?.stats?.totalTransactions || 0}</Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUserDetailDialog({ open: false, user: null, loading: false })}>Fechar</Button>
        </DialogActions>
      </Dialog>

      {/* Balance Adjustment Dialog */}
      <Dialog open={balanceDialog.open} onClose={() => setBalanceDialog({ open: false, user: null, amount: '', type: 'add', reason: '' })} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>💰 Ajustar Saldo</DialogTitle>
        <DialogContent>
          {balanceDialog.user && (
            <Box>
              <Alert severity="info" sx={{ mb: 2 }}>
                Usuário: <strong>{balanceDialog.user.name}</strong><br />
                Saldo atual: <strong>{formatCurrency(balanceDialog.user.balance)}</strong>
              </Alert>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Tipo de Ajuste</InputLabel>
                <Select
                  value={balanceDialog.type}
                  onChange={(e) => setBalanceDialog({ ...balanceDialog, type: e.target.value as any })}
                  label="Tipo de Ajuste"
                >
                  <MenuItem value="add">➕ Adicionar ao saldo</MenuItem>
                  <MenuItem value="subtract">➖ Subtrair do saldo</MenuItem>
                  <MenuItem value="set">🔄 Definir saldo exato</MenuItem>
                </Select>
              </FormControl>
              <TextField
                fullWidth
                label="Valor"
                type="number"
                value={balanceDialog.amount}
                onChange={(e) => setBalanceDialog({ ...balanceDialog, amount: e.target.value })}
                InputProps={{
                  startAdornment: <InputAdornment position="start">R$</InputAdornment>,
                }}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Motivo (obrigatório)"
                value={balanceDialog.reason}
                onChange={(e) => setBalanceDialog({ ...balanceDialog, reason: e.target.value })}
                placeholder="Informe o motivo do ajuste..."
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setBalanceDialog({ open: false, user: null, amount: '', type: 'add', reason: '' })} sx={{ color: '#64748b' }}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleAdjustBalance}
            disabled={loading || !balanceDialog.amount || !balanceDialog.reason}
            sx={{ bgcolor: '#5818C8', '&:hover': { bgcolor: '#4a14a8' } }}
          >
            {loading ? <CircularProgress size={20} sx={{ color: 'white' }} /> : 'Confirmar Ajuste'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default Admin;
