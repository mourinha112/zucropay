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
  Percent as PercentIcon,
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
import { useNavigate } from 'react-router-dom';

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
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [configError, setConfigError] = useState<string | null>(null);
  const [userId, _setUserId] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);

  // Verificar se está logado como admin
  useEffect(() => {
    const adminToken = localStorage.getItem('zucropay_admin_token');
    if (!adminToken) {
      navigate('/admin-login');
      return;
    }
    try {
      const payload = JSON.parse(atob(adminToken));
      if (!payload.exp || payload.exp < Date.now()) {
        localStorage.removeItem('zucropay_admin_token');
        localStorage.removeItem('zucropay_admin_user');
        navigate('/admin-login');
      }
    } catch {
      navigate('/admin-login');
    }
  }, [navigate]);

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
        setAccessDenied(true);
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
      // Buscar todos os saques (agora são automáticos, apenas para visualização)
      const response = await adminApi.getWithdrawals({ limit: 100 });
      setWithdrawals(response.withdrawals || []);
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

  // Handler para mudança de tab pelo header
  const handleTabChange = (tabIndex: number) => {
    setTabValue(tabIndex);
  };

  // ============================================
  // COMPONENTE DE GERENTES TAB
  // ============================================
  const ManagersTab = () => {
    const [managers, setManagers] = useState<any[]>([]);
    const [loadingManagers, setLoadingManagers] = useState(false);
    const [createDialog, setCreateDialog] = useState(false);
    const [newManager, setNewManager] = useState({ name: '', email: '', password: '' });

    const loadManagers = async () => {
      try {
        setLoadingManagers(true);
        const response = await adminApi.listManagers();
        setManagers(response.managers || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoadingManagers(false);
      }
    };

    useEffect(() => {
      loadManagers();
    }, []);

    const handleCreateManager = async () => {
      try {
        if (!newManager.name || !newManager.email || !newManager.password) {
          setError('Preencha todos os campos');
          return;
        }
        
        setLoadingManagers(true);
        await adminApi.createManager(newManager);
        setSuccess('Gerente criado com sucesso!');
        setCreateDialog(false);
        setNewManager({ name: '', email: '', password: '' });
        loadManagers();
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoadingManagers(false);
      }
    };

    const handleDeleteManager = async (managerId: string) => {
      try {
        setLoadingManagers(true);
        await adminApi.deleteManager(managerId);
        setSuccess('Gerente desativado com sucesso!');
        loadManagers();
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoadingManagers(false);
      }
    };

    return (
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#5818C8' }}>
              👤 Gerentes de Conta
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Crie e gerencie gerentes que podem aprovar/cancelar contas e ajustar taxas
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<PeopleIcon />}
            onClick={() => setCreateDialog(true)}
            sx={{ bgcolor: '#5818C8', '&:hover': { bgcolor: '#4a14a8' } }}
          >
            Criar Gerente
          </Button>
        </Box>

        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>💡 O que um Gerente pode fazer:</strong><br />
            ✅ Aprovar e cancelar contas de usuários<br />
            ✅ Ajustar taxas personalizadas para usuários<br />
            ❌ NÃO pode ver faturamento, estatísticas financeiras ou configurações do gateway
          </Typography>
        </Alert>

        {loadingManagers ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress sx={{ color: '#5818C8' }} />
          </Box>
        ) : managers.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <PeopleIcon sx={{ fontSize: 64, color: '#94a3b8', mb: 2 }} />
            <Typography color="text.secondary">Nenhum gerente cadastrado</Typography>
            <Button
              variant="outlined"
              sx={{ mt: 2 }}
              onClick={() => setCreateDialog(true)}
            >
              Criar Primeiro Gerente
            </Button>
          </Box>
        ) : (
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: '#f8fafc' }}>
                  <TableCell sx={{ fontWeight: 600 }}>Nome</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Último Login</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Criado em</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="center">Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {managers.map((manager) => (
                  <TableRow key={manager.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ bgcolor: '#7c3aed', width: 36, height: 36 }}>
                          {manager.name?.charAt(0)?.toUpperCase()}
                        </Avatar>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>{manager.name}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell><Typography variant="body2">{manager.email}</Typography></TableCell>
                    <TableCell>
                      <Chip 
                        label={manager.is_active ? 'Ativo' : 'Inativo'} 
                        color={manager.is_active ? 'success' : 'default'} 
                        size="small" 
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">
                        {manager.last_login ? formatDate(manager.last_login) : 'Nunca'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">{formatDate(manager.created_at)}</Typography>
                    </TableCell>
                    <TableCell align="center">
                      {manager.is_active && (
                        <Tooltip title="Desativar Gerente">
                          <IconButton 
                            size="small" 
                            onClick={() => handleDeleteManager(manager.id)}
                            sx={{ color: '#ef4444' }}
                          >
                            <BlockIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Dialog Criar Gerente */}
        <Dialog 
          open={createDialog} 
          onClose={() => setCreateDialog(false)}
          PaperProps={{ sx: { borderRadius: 2, width: 380, maxWidth: '95vw', maxHeight: '85vh', display: 'flex', flexDirection: 'column' } }}
        >
          <DialogTitle sx={{ fontWeight: 600, py: 1.5, fontSize: '1rem' }}>👤 Novo Gerente</DialogTitle>
          <DialogContent sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <TextField
                fullWidth
                size="small"
                label="Nome"
                value={newManager.name}
                onChange={(e) => setNewManager({ ...newManager, name: e.target.value })}
                placeholder="João Silva"
              />
              <TextField
                fullWidth
                size="small"
                type="email"
                label="Email"
                value={newManager.email}
                onChange={(e) => setNewManager({ ...newManager, email: e.target.value })}
                placeholder="gerente@email.com"
              />
              <TextField
                fullWidth
                size="small"
                type="password"
                label="Senha"
                value={newManager.password}
                onChange={(e) => setNewManager({ ...newManager, password: e.target.value })}
                placeholder="Mínimo 6 caracteres"
              />
              <Typography variant="caption" sx={{ color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                ⚠️ Acesso em: /gerente-login
              </Typography>
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 1.5 }}>
            <Button size="small" onClick={() => setCreateDialog(false)} sx={{ color: '#64748b' }}>Cancelar</Button>
            <Button
              size="small"
              variant="contained"
              onClick={handleCreateManager}
              disabled={loadingManagers || !newManager.name || !newManager.email || !newManager.password}
              sx={{ bgcolor: '#5818C8', '&:hover': { bgcolor: '#4a14a8' } }}
            >
              {loadingManagers ? <CircularProgress size={16} sx={{ color: 'white' }} /> : 'Criar'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    );
  };

  // ============================================
  // COMPONENTE DE TAXAS TAB
  // ============================================
  const RatesTab = () => {
    const [ratesUsers, setRatesUsers] = useState<any[]>([]);
    const [loadingRates, setLoadingRates] = useState(false);
    const [searchUser, setSearchUser] = useState('');
    const [rateDialog, setRateDialog] = useState<{
      open: boolean;
      user: any;
      pixRate: string;
      cardRate: string;
      boletoRate: string;
      withdrawalFee: string;
      notes: string;
    }>({
      open: false,
      user: null,
      pixRate: '5.99',
      cardRate: '5.99',
      boletoRate: '5.99',
      withdrawalFee: '3.00',
      notes: '',
    });

    // Taxas padrão da plataforma (fixas no código)
    const DEFAULT_RATES = {
      pixRate: 5.99,
      cardRate: 5.99, // Base, depois soma 2.49% por parcela
      boletoRate: 5.99,
      withdrawalFee: 3.00,
      fixedFee: 2.50, // Taxa fixa por transação PIX/Boleto
    };

    const loadUsersWithRates = async () => {
      try {
        setLoadingRates(true);
        const response = await adminApi.getUsers({ search: searchUser });
        setRatesUsers(response.users || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoadingRates(false);
      }
    };

    useEffect(() => {
      loadUsersWithRates();
    }, []);

    const handleOpenRateDialog = async (user: any) => {
      try {
        // Buscar taxas atuais do usuário
        const response = await adminApi.getUserCustomRates(user.id);
        const rates = response.rates || {};
        
        setRateDialog({
          open: true,
          user,
          pixRate: rates.pix_rate?.toString() || DEFAULT_RATES.pixRate.toString(),
          cardRate: rates.card_rate?.toString() || DEFAULT_RATES.cardRate.toString(),
          boletoRate: rates.boleto_rate?.toString() || DEFAULT_RATES.boletoRate.toString(),
          withdrawalFee: rates.withdrawal_fee?.toString() || DEFAULT_RATES.withdrawalFee.toString(),
          notes: rates.notes || '',
        });
      } catch (err: any) {
        // Se não encontrou, usar taxas padrão
        setRateDialog({
          open: true,
          user,
          pixRate: DEFAULT_RATES.pixRate.toString(),
          cardRate: DEFAULT_RATES.cardRate.toString(),
          boletoRate: DEFAULT_RATES.boletoRate.toString(),
          withdrawalFee: DEFAULT_RATES.withdrawalFee.toString(),
          notes: '',
        });
      }
    };

    const handleSaveRates = async () => {
      try {
        setLoadingRates(true);
        await adminApi.setUserCustomRates({
          userId: rateDialog.user.id,
          pixRate: parseFloat(rateDialog.pixRate) || DEFAULT_RATES.pixRate,
          cardRate: parseFloat(rateDialog.cardRate) || DEFAULT_RATES.cardRate,
          boletoRate: parseFloat(rateDialog.boletoRate) || DEFAULT_RATES.boletoRate,
          withdrawalFee: parseFloat(rateDialog.withdrawalFee) || DEFAULT_RATES.withdrawalFee,
          notes: rateDialog.notes,
        });
        setSuccess('Taxas atualizadas com sucesso!');
        setRateDialog({ ...rateDialog, open: false });
        loadUsersWithRates();
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoadingRates(false);
      }
    };

    const filteredUsers = ratesUsers.filter(user =>
      user.name?.toLowerCase().includes(searchUser.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchUser.toLowerCase())
    );

    return (
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#5818C8' }}>
              📊 Taxas por Usuário
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Configure taxas personalizadas para cada usuário. Taxas padrão: PIX {DEFAULT_RATES.pixRate}% + R${DEFAULT_RATES.fixedFee.toFixed(2)} fixo
            </Typography>
          </Box>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadUsersWithRates}
            disabled={loadingRates}
          >
            Atualizar
          </Button>
        </Box>

        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>💡 Como funciona:</strong><br />
            • <strong>Taxas Padrão:</strong> PIX/Boleto: {DEFAULT_RATES.pixRate}% + R${DEFAULT_RATES.fixedFee.toFixed(2)} | Cartão: {DEFAULT_RATES.cardRate}% + 2.49% por parcela<br />
            • <strong>Taxas Personalizadas:</strong> Você pode diminuir (ou aumentar) as taxas para usuários específicos<br />
            • Taxa de saque padrão: R${DEFAULT_RATES.withdrawalFee.toFixed(2)}
          </Typography>
        </Alert>

        {/* Busca */}
        <Box sx={{ mb: 3 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Buscar usuário por nome ou email..."
            value={searchUser}
            onChange={(e) => setSearchUser(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: '#94a3b8' }} />
                </InputAdornment>
              ),
            }}
            sx={{ maxWidth: 400 }}
          />
        </Box>

        {loadingRates ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress sx={{ color: '#5818C8' }} />
          </Box>
        ) : filteredUsers.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <PercentIcon sx={{ fontSize: 64, color: '#94a3b8', mb: 2 }} />
            <Typography color="text.secondary">Nenhum usuário encontrado</Typography>
          </Box>
        ) : (
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#f8fafc' }}>
                  <TableCell sx={{ fontWeight: 600 }}>Usuário</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="center">PIX</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="center">Cartão</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="center">Boleto</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="center">Saque</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="center">Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredUsers.map((user) => {
                  const hasCustomRate = user.custom_rates && (
                    user.custom_rates.pix_rate !== DEFAULT_RATES.pixRate ||
                    user.custom_rates.card_rate !== DEFAULT_RATES.cardRate ||
                    user.custom_rates.boleto_rate !== DEFAULT_RATES.boletoRate ||
                    user.custom_rates.withdrawal_fee !== DEFAULT_RATES.withdrawalFee
                  );
                  
                  return (
                    <TableRow key={user.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{ width: 32, height: 32, bgcolor: '#5818C8', fontSize: '0.8rem' }}>
                            {user.name?.[0]?.toUpperCase() || '?'}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{user.name}</Typography>
                            {hasCustomRate && (
                              <Chip 
                                label="Taxa Personalizada" 
                                size="small" 
                                sx={{ 
                                  height: 18, 
                                  fontSize: '0.65rem',
                                  bgcolor: '#dcfce7', 
                                  color: '#16a34a' 
                                }} 
                              />
                            )}
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">{user.email}</Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2" sx={{ 
                          fontWeight: 600, 
                          color: user.custom_rates?.pix_rate !== undefined && user.custom_rates?.pix_rate !== DEFAULT_RATES.pixRate ? '#16a34a' : '#64748b' 
                        }}>
                          {user.custom_rates?.pix_rate ?? DEFAULT_RATES.pixRate}%
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2" sx={{ 
                          fontWeight: 600, 
                          color: user.custom_rates?.card_rate !== undefined && user.custom_rates?.card_rate !== DEFAULT_RATES.cardRate ? '#16a34a' : '#64748b' 
                        }}>
                          {user.custom_rates?.card_rate ?? DEFAULT_RATES.cardRate}%
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2" sx={{ 
                          fontWeight: 600, 
                          color: user.custom_rates?.boleto_rate !== undefined && user.custom_rates?.boleto_rate !== DEFAULT_RATES.boletoRate ? '#16a34a' : '#64748b' 
                        }}>
                          {user.custom_rates?.boleto_rate ?? DEFAULT_RATES.boletoRate}%
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2" sx={{ 
                          fontWeight: 600, 
                          color: user.custom_rates?.withdrawal_fee !== undefined && user.custom_rates?.withdrawal_fee !== DEFAULT_RATES.withdrawalFee ? '#16a34a' : '#64748b' 
                        }}>
                          R${(user.custom_rates?.withdrawal_fee ?? DEFAULT_RATES.withdrawalFee).toFixed(2)}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="Editar taxas">
                          <IconButton 
                            size="small" 
                            onClick={() => handleOpenRateDialog(user)}
                            sx={{ color: '#5818C8' }}
                          >
                            <SettingsIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Dialog de Edição de Taxas */}
        <Dialog 
          open={rateDialog.open} 
          onClose={() => setRateDialog({ ...rateDialog, open: false })}
          PaperProps={{ sx: { borderRadius: 2, width: 450, maxWidth: '95vw' } }}
        >
          <DialogTitle sx={{ fontWeight: 600, py: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <PercentIcon sx={{ color: '#5818C8' }} />
            Taxas de {rateDialog.user?.name}
          </DialogTitle>
          <DialogContent sx={{ p: 2.5 }}>
            <Alert severity="warning" sx={{ mb: 2, py: 0.5 }}>
              <Typography variant="caption">
                Taxas padrão da plataforma: {DEFAULT_RATES.pixRate}% + R${DEFAULT_RATES.fixedFee.toFixed(2)} (PIX/Boleto)
              </Typography>
            </Alert>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                fullWidth
                size="small"
                label="Taxa PIX (%)"
                type="number"
                value={rateDialog.pixRate}
                onChange={(e) => setRateDialog({ ...rateDialog, pixRate: e.target.value })}
                inputProps={{ step: '0.01', min: '0', max: '50' }}
                helperText="Taxa percentual para pagamentos via PIX"
              />
              <TextField
                fullWidth
                size="small"
                label="Taxa Cartão (%)"
                type="number"
                value={rateDialog.cardRate}
                onChange={(e) => setRateDialog({ ...rateDialog, cardRate: e.target.value })}
                inputProps={{ step: '0.01', min: '0', max: '50' }}
                helperText="Taxa base para cartão (+ 2.49% por parcela)"
              />
              <TextField
                fullWidth
                size="small"
                label="Taxa Boleto (%)"
                type="number"
                value={rateDialog.boletoRate}
                onChange={(e) => setRateDialog({ ...rateDialog, boletoRate: e.target.value })}
                inputProps={{ step: '0.01', min: '0', max: '50' }}
                helperText="Taxa percentual para pagamentos via Boleto"
              />
              <TextField
                fullWidth
                size="small"
                label="Taxa de Saque (R$)"
                type="number"
                value={rateDialog.withdrawalFee}
                onChange={(e) => setRateDialog({ ...rateDialog, withdrawalFee: e.target.value })}
                InputProps={{
                  startAdornment: <InputAdornment position="start">R$</InputAdornment>,
                }}
                inputProps={{ step: '0.01', min: '0' }}
                helperText="Valor fixo cobrado por saque"
              />
              <TextField
                fullWidth
                size="small"
                label="Observações (opcional)"
                multiline
                rows={2}
                value={rateDialog.notes}
                onChange={(e) => setRateDialog({ ...rateDialog, notes: e.target.value })}
                placeholder="Ex: Cliente VIP - taxa reduzida"
              />
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button 
              onClick={() => setRateDialog({ ...rateDialog, open: false })} 
              sx={{ color: '#64748b' }}
            >
              Cancelar
            </Button>
            <Button
              variant="contained"
              onClick={handleSaveRates}
              disabled={loadingRates}
              sx={{ bgcolor: '#5818C8', '&:hover': { bgcolor: '#4a14a8' } }}
            >
              {loadingRates ? <CircularProgress size={18} sx={{ color: 'white' }} /> : 'Salvar Taxas'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    );
  };

  // ============================================
  // PÁGINA DE ACESSO NEGADO
  // ============================================
  if (accessDenied) {
    return (
      <>
        <AdminHeader 
          onTabChange={handleTabChange}
          pendingVerifications={stats?.verifications?.pending || 0}
          pendingWithdrawals={stats?.withdrawals?.pending || 0}
          pendingUsers={stats?.users?.pending || 0}
        />
        <Box
          sx={{
            minHeight: '100vh',
            bgcolor: '#0f172a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            p: 3,
          }}
        >
          <Card
            sx={{
              maxWidth: 500,
              width: '100%',
              background: 'linear-gradient(145deg, #1e293b 0%, #0f172a 100%)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 4,
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            {/* Gradient border effect */}
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 4,
                background: 'linear-gradient(90deg, #ef4444, #f97316, #ef4444)',
              }}
            />
            
            <CardContent sx={{ p: 5, textAlign: 'center' }}>
              {/* Icon */}
              <Box
                sx={{
                  width: 100,
                  height: 100,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(239, 68, 68, 0.05) 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mx: 'auto',
                  mb: 3,
                  border: '2px solid rgba(239, 68, 68, 0.3)',
                }}
              >
                <BlockIcon sx={{ fontSize: 50, color: '#ef4444' }} />
              </Box>

              {/* Title */}
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 800,
                  color: '#f1f5f9',
                  mb: 1.5,
                  letterSpacing: '-0.5px',
                }}
              >
                Acesso Negado
              </Typography>

              {/* Subtitle */}
              <Typography
                variant="body1"
                sx={{
                  color: '#94a3b8',
                  mb: 4,
                  lineHeight: 1.7,
                }}
              >
                Você não tem permissão para acessar o painel administrativo.
                <br />
                Esta área é restrita apenas para administradores.
              </Typography>

              {/* Info Box */}
              <Box
                sx={{
                  bgcolor: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  borderRadius: 2,
                  p: 2.5,
                  mb: 4,
                }}
              >
                <Typography
                  variant="body2"
                  sx={{ color: '#fca5a5', fontWeight: 500 }}
                >
                  ⚠️ Se você acredita que deveria ter acesso, entre em contato com o suporte.
                </Typography>
              </Box>

              {/* Button */}
              <Button
                variant="contained"
                size="large"
                href="/dashboard"
                sx={{
                  bgcolor: '#5818C8',
                  color: 'white',
                  fontWeight: 700,
                  px: 5,
                  py: 1.5,
                  borderRadius: 2,
                  textTransform: 'none',
                  fontSize: '1rem',
                  '&:hover': {
                    bgcolor: '#4a14a8',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 10px 25px rgba(88, 24, 200, 0.3)',
                  },
                  transition: 'all 0.2s ease',
                }}
              >
                Voltar ao Dashboard
              </Button>
            </CardContent>

            {/* Footer */}
            <Box
              sx={{
                bgcolor: 'rgba(0, 0, 0, 0.2)',
                py: 2,
                px: 3,
                borderTop: '1px solid rgba(255, 255, 255, 0.05)',
              }}
            >
              <Typography
                variant="caption"
                sx={{ color: '#64748b', display: 'block', textAlign: 'center' }}
              >
                ZucroPay © {new Date().getFullYear()} • Sistema de Pagamentos
              </Typography>
            </Box>
          </Card>
        </Box>
      </>
    );
  }

  return (
    <>
      <AdminHeader 
        onTabChange={handleTabChange}
        pendingVerifications={stats?.verifications?.pending || 0}
        pendingWithdrawals={stats?.withdrawals?.pending || 0}
        pendingUsers={stats?.users?.pending || 0}
      />
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
              <Tab icon={<PeopleIcon />} label="Gerentes" iconPosition="start" />
              <Tab icon={<PercentIcon />} label="Taxas" iconPosition="start" />
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
                  <Box sx={{ display: 'grid', gap: 3 }}>
                    {verifications.map((v) => (
                      <Card key={v.id} variant="outlined" sx={{ '&:hover': { borderColor: '#5818C8' }, overflow: 'visible' }}>
                        <CardContent>
                          {/* Header com dados do usuário */}
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
                            <Box sx={{ display: 'flex', gap: 2 }}>
                              <Avatar sx={{ bgcolor: '#5818C8', width: 56, height: 56 }}>{v.users?.name?.charAt(0)?.toUpperCase()}</Avatar>
                              <Box>
                                <Typography variant="h6" sx={{ fontWeight: 600 }}>{v.full_name || v.users?.name}</Typography>
                                <Typography variant="body2" color="text.secondary">{v.users?.email}</Typography>
                                <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                                  <Chip label={v.document_type?.toUpperCase()} size="small" color="primary" variant="outlined" />
                                  <Chip label={`CPF: ${v.document_number || '-'}`} size="small" variant="outlined" />
                                  <Chip label={`Nasc: ${v.birth_date ? new Date(v.birth_date).toLocaleDateString('pt-BR') : '-'}`} size="small" variant="outlined" />
                                </Box>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                                  Enviado em {formatDate(v.created_at)}
                                </Typography>
                              </Box>
                            </Box>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              <Button variant="contained" size="small" startIcon={<CheckCircleIcon />} onClick={() => setActionDialog({ open: true, type: 'approveVerification', item: v, reason: '' })} sx={{ bgcolor: '#22c55e', '&:hover': { bgcolor: '#16a34a' } }}>Aprovar</Button>
                              <Button variant="outlined" size="small" startIcon={<CancelIcon />} onClick={() => setActionDialog({ open: true, type: 'rejectVerification', item: v, reason: '' })} sx={{ borderColor: '#ef4444', color: '#ef4444' }}>Rejeitar</Button>
                            </Box>
                          </Box>

                          {/* Grid de imagens */}
                          <Grid container spacing={2}>
                            {/* Documento Frente */}
                            <Grid item xs={12} sm={4}>
                              <Paper variant="outlined" sx={{ p: 1, textAlign: 'center' }}>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, fontWeight: 600 }}>
                                  📄 Documento (Frente)
                                </Typography>
                                {v.document_front_url ? (
                                  <Box
                                    component="img"
                                    src={v.document_front_url}
                                    alt="Documento Frente"
                                    sx={{
                                      width: '100%',
                                      maxHeight: 200,
                                      objectFit: 'contain',
                                      borderRadius: 1,
                                      cursor: 'pointer',
                                      '&:hover': { opacity: 0.8 }
                                    }}
                                    onClick={() => window.open(v.document_front_url, '_blank')}
                                  />
                                ) : (
                                  <Box sx={{ height: 150, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f5f5f5', borderRadius: 1 }}>
                                    <Typography color="text.secondary" variant="caption">Não enviado</Typography>
                                  </Box>
                                )}
                              </Paper>
                            </Grid>

                            {/* Documento Verso */}
                            <Grid item xs={12} sm={4}>
                              <Paper variant="outlined" sx={{ p: 1, textAlign: 'center' }}>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, fontWeight: 600 }}>
                                  📄 Documento (Verso)
                                </Typography>
                                {v.document_back_url ? (
                                  <Box
                                    component="img"
                                    src={v.document_back_url}
                                    alt="Documento Verso"
                                    sx={{
                                      width: '100%',
                                      maxHeight: 200,
                                      objectFit: 'contain',
                                      borderRadius: 1,
                                      cursor: 'pointer',
                                      '&:hover': { opacity: 0.8 }
                                    }}
                                    onClick={() => window.open(v.document_back_url, '_blank')}
                                  />
                                ) : (
                                  <Box sx={{ height: 150, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f5f5f5', borderRadius: 1 }}>
                                    <Typography color="text.secondary" variant="caption">Não enviado</Typography>
                                  </Box>
                                )}
                              </Paper>
                            </Grid>

                            {/* Selfie */}
                            <Grid item xs={12} sm={4}>
                              <Paper variant="outlined" sx={{ p: 1, textAlign: 'center' }}>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, fontWeight: 600 }}>
                                  🤳 Selfie com Documento
                                </Typography>
                                {v.selfie_url ? (
                                  <Box
                                    component="img"
                                    src={v.selfie_url}
                                    alt="Selfie"
                                    sx={{
                                      width: '100%',
                                      maxHeight: 200,
                                      objectFit: 'contain',
                                      borderRadius: 1,
                                      cursor: 'pointer',
                                      '&:hover': { opacity: 0.8 }
                                    }}
                                    onClick={() => window.open(v.selfie_url, '_blank')}
                                  />
                                ) : (
                                  <Box sx={{ height: 150, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f5f5f5', borderRadius: 1 }}>
                                    <Typography color="text.secondary" variant="caption">Não enviado</Typography>
                                  </Box>
                                )}
                              </Paper>
                            </Grid>
                          </Grid>
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
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#5818C8', mb: 3 }}>💸 Histórico de Saques</Typography>
                <Alert severity="info" sx={{ mb: 3 }}>
                  Os saques são processados automaticamente. Limite de 2 saques por dia por usuário.
                </Alert>
                {loading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress sx={{ color: '#5818C8' }} /></Box>
                ) : withdrawals.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 6 }}>
                    <AccountBalanceIcon sx={{ fontSize: 64, color: '#94a3b8', mb: 2 }} />
                    <Typography color="text.secondary">Nenhum saque registrado</Typography>
                  </Box>
                ) : (
                  <TableContainer component={Paper} variant="outlined">
                    <Table>
                      <TableHead>
                        <TableRow sx={{ bgcolor: '#f8fafc' }}>
                          <TableCell sx={{ fontWeight: 600 }}>Usuário</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Valor</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Tipo</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Dados</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Data/Hora</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {withdrawals.map((w) => (
                          <TableRow key={w.id} hover>
                            <TableCell>
                              <Box>
                                <Typography variant="body2" sx={{ fontWeight: 500 }}>{w.users?.name || 'N/A'}</Typography>
                                <Typography variant="caption" color="text.secondary">{w.users?.email || '-'}</Typography>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" sx={{ fontWeight: 700, color: '#22c55e' }}>
                                {formatCurrency(w.amount)}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip 
                                label={w.withdrawal_type === 'pix' ? 'PIX' : 'TED'} 
                                size="small" 
                                sx={{ 
                                  bgcolor: w.withdrawal_type === 'pix' ? 'rgba(34,197,94,0.1)' : 'rgba(88,24,200,0.1)',
                                  color: w.withdrawal_type === 'pix' ? '#22c55e' : '#5818C8',
                                  fontWeight: 600
                                }} 
                              />
                            </TableCell>
                            <TableCell>
                              <Typography variant="caption" sx={{ display: 'block' }}>
                                {w.pix_key ? (
                                  <>
                                    <strong>Chave:</strong> {w.pix_key}
                                    <br />
                                    <strong>Tipo:</strong> {w.pix_key_type?.toUpperCase()}
                                  </>
                                ) : (
                                  <>
                                    <strong>Banco:</strong> {w.bank_name || w.bank_code}
                                    <br />
                                    <strong>Ag:</strong> {w.agency} <strong>Cc:</strong> {w.account_number}-{w.account_digit}
                                  </>
                                )}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {w.holder_name}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip 
                                label={getStatusLabel(w.status)} 
                                color={getStatusColor(w.status) as any} 
                                size="small" 
                              />
                            </TableCell>
                            <TableCell>
                              <Typography variant="caption" sx={{ display: 'block' }}>
                                {formatDate(w.created_at)}
                              </Typography>
                              {w.completed_at && (
                                <Typography variant="caption" color="success.main">
                                  ✓ {formatDate(w.completed_at)}
                                </Typography>
                              )}
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

            {/* Gerentes Tab */}
            <TabPanel value={tabValue} index={8}>
              <ManagersTab />
            </TabPanel>

            {/* Taxas Tab */}
            <TabPanel value={tabValue} index={9}>
              <RatesTab />
            </TabPanel>
          </Card>
        </Box>
      </Box>

      {/* Action Dialog */}
      <Dialog 
        open={actionDialog.open} 
        onClose={() => setActionDialog({ open: false, type: '', item: null, reason: '' })}
        PaperProps={{ sx: { borderRadius: 2, width: 380, maxWidth: '95vw', maxHeight: '85vh', display: 'flex', flexDirection: 'column' } }}
      >
        <DialogTitle sx={{ fontWeight: 600, py: 1.5, fontSize: '1rem' }}>
          {actionDialog.type.includes('approve') && '✅ Aprovar'}
          {actionDialog.type.includes('reject') && '❌ Rejeitar'}
          {actionDialog.type.includes('block') && '🚫 Bloquear'}
          {actionDialog.type.includes('unblock') && '🔓 Desbloquear'}
          {actionDialog.type.includes('complete') && '✅ Concluir'}
        </DialogTitle>
        <DialogContent sx={{ p: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, fontSize: '0.85rem' }}>
            {actionDialog.type === 'approveUser' && 'Confirma aprovação?'}
            {actionDialog.type === 'rejectUser' && 'Motivo da rejeição:'}
            {actionDialog.type === 'blockUser' && 'Motivo do bloqueio:'}
            {actionDialog.type === 'approveVerification' && 'Aprovar verificação?'}
            {actionDialog.type === 'rejectVerification' && 'Motivo da rejeição:'}
            {actionDialog.type === 'approveWithdrawal' && 'Aprovar saque? Faça a transferência e clique em Concluir.'}
            {actionDialog.type === 'completeWithdrawal' && 'Confirma que a transferência foi feita?'}
            {actionDialog.type === 'rejectWithdrawal' && 'Motivo da rejeição:'}
            {actionDialog.type === 'blockWithdrawals' && 'Motivo do bloqueio:'}
            {actionDialog.type === 'unblockWithdrawals' && 'Liberar saques?'}
          </Typography>
          {(actionDialog.type.includes('reject') || actionDialog.type.includes('block')) && (
            <TextField fullWidth size="small" multiline rows={2} label="Motivo" value={actionDialog.reason} onChange={(e) => setActionDialog({ ...actionDialog, reason: e.target.value })} />
          )}
        </DialogContent>
        <DialogActions sx={{ p: 1.5 }}>
          <Button size="small" onClick={() => setActionDialog({ open: false, type: '', item: null, reason: '' })} sx={{ color: '#64748b' }}>Cancelar</Button>
          <Button
            size="small"
            variant="contained"
            onClick={handleAction}
            disabled={loading || ((actionDialog.type.includes('reject') || actionDialog.type.includes('block')) && !actionDialog.reason)}
            sx={{
              bgcolor: actionDialog.type.includes('approve') || actionDialog.type.includes('unblock') || actionDialog.type.includes('complete') ? '#22c55e' : '#ef4444',
              '&:hover': { bgcolor: actionDialog.type.includes('approve') || actionDialog.type.includes('unblock') || actionDialog.type.includes('complete') ? '#16a34a' : '#dc2626' },
            }}
          >
            {loading ? <CircularProgress size={16} sx={{ color: 'white' }} /> : 'Confirmar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* User Detail Dialog */}
      <Dialog 
        open={userDetailDialog.open} 
        onClose={() => setUserDetailDialog({ open: false, user: null, loading: false })}
        PaperProps={{ sx: { borderRadius: 2, width: 400, maxWidth: '95vw', maxHeight: '85vh', display: 'flex', flexDirection: 'column' } }}
      >
        <DialogTitle sx={{ fontWeight: 600, py: 1.5, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 1 }}>
          <PersonIcon fontSize="small" /> Detalhes
        </DialogTitle>
        <DialogContent sx={{ p: 2 }}>
          {userDetailDialog.loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress size={24} /></Box>
          ) : userDetailDialog.user && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Box sx={{ p: 1.5, bgcolor: '#f8fafc', borderRadius: 1.5 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{userDetailDialog.user.user?.name}</Typography>
                <Typography variant="caption" color="text.secondary">{userDetailDialog.user.user?.email}</Typography>
                <Typography variant="caption" display="block" color="text.secondary">{userDetailDialog.user.user?.phone || 'Sem telefone'}</Typography>
                <Typography variant="caption" display="block" color="text.secondary">CPF/CNPJ: {userDetailDialog.user.user?.cpf_cnpj || '-'}</Typography>
              </Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                <Box sx={{ p: 1, bgcolor: '#f0fdf4', borderRadius: 1, textAlign: 'center' }}>
                  <Typography variant="caption" color="text.secondary">Saldo</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: '#5818C8' }}>{formatCurrency(userDetailDialog.user.user?.balance || 0)}</Typography>
                </Box>
                <Box sx={{ p: 1, bgcolor: '#f0fdf4', borderRadius: 1, textAlign: 'center' }}>
                  <Typography variant="caption" color="text.secondary">Vendas</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: '#22c55e' }}>{formatCurrency(userDetailDialog.user.user?.stats?.totalSales || 0)}</Typography>
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 1.5 }}>
          <Button size="small" onClick={() => setUserDetailDialog({ open: false, user: null, loading: false })}>Fechar</Button>
        </DialogActions>
      </Dialog>

      {/* Balance Adjustment Dialog */}
      <Dialog 
        open={balanceDialog.open} 
        onClose={() => setBalanceDialog({ open: false, user: null, amount: '', type: 'add', reason: '' })}
        PaperProps={{ sx: { borderRadius: 2, width: 380, maxWidth: '95vw', maxHeight: '85vh', display: 'flex', flexDirection: 'column' } }}
      >
        <DialogTitle sx={{ fontWeight: 600, py: 1.5, fontSize: '1rem' }}>💰 Ajustar Saldo</DialogTitle>
        <DialogContent sx={{ p: 2 }}>
          {balanceDialog.user && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Typography variant="caption" sx={{ color: '#64748b' }}>
                {balanceDialog.user.name} • Saldo: {formatCurrency(balanceDialog.user.balance)}
              </Typography>
              <FormControl fullWidth size="small">
                <InputLabel>Tipo</InputLabel>
                <Select
                  value={balanceDialog.type}
                  onChange={(e) => setBalanceDialog({ ...balanceDialog, type: e.target.value as any })}
                  label="Tipo"
                >
                  <MenuItem value="add">➕ Adicionar</MenuItem>
                  <MenuItem value="subtract">➖ Subtrair</MenuItem>
                  <MenuItem value="set">🔄 Definir</MenuItem>
                </Select>
              </FormControl>
              <TextField
                fullWidth
                size="small"
                label="Valor"
                type="number"
                value={balanceDialog.amount}
                onChange={(e) => setBalanceDialog({ ...balanceDialog, amount: e.target.value })}
                InputProps={{
                  startAdornment: <InputAdornment position="start">R$</InputAdornment>,
                }}
              />
              <TextField
                fullWidth
                size="small"
                multiline
                rows={2}
                label="Motivo"
                value={balanceDialog.reason}
                onChange={(e) => setBalanceDialog({ ...balanceDialog, reason: e.target.value })}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 1.5 }}>
          <Button size="small" onClick={() => setBalanceDialog({ open: false, user: null, amount: '', type: 'add', reason: '' })} sx={{ color: '#64748b' }}>Cancelar</Button>
          <Button
            size="small"
            variant="contained"
            onClick={handleAdjustBalance}
            disabled={loading || !balanceDialog.amount || !balanceDialog.reason}
            sx={{ bgcolor: '#5818C8', '&:hover': { bgcolor: '#4a14a8' } }}
          >
            {loading ? <CircularProgress size={16} sx={{ color: 'white' }} /> : 'Confirmar'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default Admin;
