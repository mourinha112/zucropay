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
  LinearProgress,
  Divider,
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
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  Lock as LockIcon,
  ArrowUpward as ArrowUpIcon,
  ArrowDownward as ArrowDownIcon,
} from '@mui/icons-material';
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
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`admin-tabpanel-${index}`}
      aria-labelledby={`admin-tab-${index}`}
      {...other}
    >
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

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    if (tabValue === 1) loadUsers();
    if (tabValue === 2) loadVerifications();
    if (tabValue === 3) loadWithdrawals();
    if (tabValue === 4) loadSales();
  }, [tabValue]);

  const loadStats = async () => {
    try {
      setLoading(true);
      setConfigError(null);
      const response = await adminApi.getStats();
      setStats(response.stats);
    } catch (err: any) {
      // Verificar se é erro de configuração
      if (err.message.includes('não é um administrador')) {
        // Extrair userId da mensagem se disponível
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
      const response = await adminApi.getUsers({ 
        search: userSearch, 
        status: userStatusFilter 
      });
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
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value || 0);
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
      case 'approved':
      case 'RECEIVED':
      case 'CONFIRMED':
      case 'completed':
        return 'success';
      case 'pending':
      case 'PENDING':
        return 'warning';
      case 'rejected':
      case 'blocked':
      case 'suspended':
      case 'REFUNDED':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'Pendente',
      approved: 'Aprovado',
      rejected: 'Rejeitado',
      blocked: 'Bloqueado',
      suspended: 'Suspenso',
      completed: 'Concluído',
      PENDING: 'Pendente',
      RECEIVED: 'Recebido',
      CONFIRMED: 'Confirmado',
      REFUNDED: 'Estornado',
    };
    return labels[status] || status;
  };

  return (
    <>
      <AdminHeader />
      <Box sx={{ minHeight: '100vh', backgroundColor: '#fafafa' }}>
        <Box sx={{ maxWidth: '1600px', margin: '0 auto', p: { xs: 2, sm: 3 } }}>
          {/* Header */}
          <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 700,
                  color: '#1e293b',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                }}
              >
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 2,
                    background: 'linear-gradient(135deg, #651BE5 0%, #380F7F 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <DashboardIcon sx={{ color: 'white', fontSize: 28 }} />
                </Box>
                Painel Administrativo
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
                Gerencie usuários, verificações, saques e visualize estatísticas
              </Typography>
            </Box>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={() => {
                loadStats();
                if (tabValue === 1) loadUsers();
                if (tabValue === 2) loadVerifications();
                if (tabValue === 3) loadWithdrawals();
                if (tabValue === 4) loadSales();
              }}
              sx={{ borderColor: '#5818C8', color: '#5818C8' }}
            >
              Atualizar
            </Button>
          </Box>

          {/* Config Error Alert */}
          {configError && (
            <Alert 
              severity="warning" 
              sx={{ 
                mb: 3,
                '& .MuiAlert-message': { width: '100%' }
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                ⚠️ Configuração Necessária
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                {configError}
              </Typography>
              {userId && (
                <Box sx={{ bgcolor: '#1e293b', p: 2, borderRadius: 1, mb: 2 }}>
                  <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', mb: 1 }}>
                    Execute este SQL no Supabase para se tornar admin:
                  </Typography>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      fontFamily: 'monospace', 
                      color: '#22c55e',
                      wordBreak: 'break-all',
                      fontSize: '0.75rem'
                    }}
                  >
                    INSERT INTO admin_users (user_id, role) VALUES ('{userId}', 'super_admin');
                  </Typography>
                </Box>
              )}
              <Button 
                size="small" 
                variant="outlined"
                onClick={loadStats}
                sx={{ borderColor: '#f59e0b', color: '#f59e0b' }}
              >
                Tentar Novamente
              </Button>
            </Alert>
          )}

          {/* Alerts */}
          {error && (
            <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}
          {success && (
            <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess('')}>
              {success}
            </Alert>
          )}

          {/* Stats Cards */}
          {stats && (
            <Box
              sx={{
                display: 'grid',
                gap: 2,
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                mb: 4,
              }}
            >
              {[
                {
                  icon: <PeopleIcon />,
                  bg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  title: 'Total de Usuários',
                  value: stats.users?.total || 0,
                  subtitle: `${stats.users?.pending || 0} pendentes`,
                },
                {
                  icon: <VerifiedUserIcon />,
                  bg: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
                  title: 'Usuários Aprovados',
                  value: stats.users?.approved || 0,
                  subtitle: 'Contas verificadas',
                },
                {
                  icon: <WarningIcon />,
                  bg: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                  title: 'Verificações Pendentes',
                  value: stats.verifications?.pending || 0,
                  subtitle: 'Aguardando análise',
                },
                {
                  icon: <ShoppingCartIcon />,
                  bg: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                  title: 'Total em Vendas',
                  value: formatCurrency(stats.sales?.total || 0),
                  subtitle: `${stats.sales?.transactions || 0} transações`,
                },
                {
                  icon: <ArrowDownIcon />,
                  bg: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                  title: 'Total em Depósitos',
                  value: formatCurrency(stats.deposits?.total || 0),
                  subtitle: 'Entradas na plataforma',
                },
                {
                  icon: <ArrowUpIcon />,
                  bg: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
                  title: 'Saques Pendentes',
                  value: stats.withdrawals?.pending || 0,
                  subtitle: formatCurrency(stats.withdrawals?.pendingAmount || 0),
                },
                {
                  icon: <AccountBalanceIcon />,
                  bg: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
                  title: 'Saldo na Plataforma',
                  value: formatCurrency(stats.platform?.balance || 0),
                  subtitle: 'Total em contas',
                },
              ].map((stat, index) => (
                <Card
                  key={index}
                  sx={{
                    transition: 'all 0.3s',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: '0 12px 24px rgba(0,0,0,0.1)',
                    },
                  }}
                >
                  <CardContent sx={{ p: 2.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                      <Box
                        sx={{
                          width: 48,
                          height: 48,
                          borderRadius: 2,
                          background: stat.bg,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {React.cloneElement(stat.icon, { sx: { color: 'white', fontSize: 24 } })}
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                          {stat.title}
                        </Typography>
                        <Typography
                          variant="h5"
                          sx={{
                            fontWeight: 700,
                            color: '#1e293b',
                            lineHeight: 1.2,
                            mt: 0.5,
                          }}
                        >
                          {stat.value}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {stat.subtitle}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}

          {/* Tabs */}
          <Card sx={{ mb: 3 }}>
            <Tabs
              value={tabValue}
              onChange={(_, newValue) => setTabValue(newValue)}
              sx={{
                borderBottom: 1,
                borderColor: 'divider',
                '& .MuiTab-root': {
                  textTransform: 'none',
                  fontWeight: 600,
                  minHeight: 56,
                },
                '& .Mui-selected': {
                  color: '#5818C8',
                },
                '& .MuiTabs-indicator': {
                  backgroundColor: '#5818C8',
                },
              }}
            >
              <Tab icon={<DashboardIcon />} label="Dashboard" iconPosition="start" />
              <Tab
                icon={
                  <Badge badgeContent={stats?.users?.pending || 0} color="warning">
                    <PeopleIcon />
                  </Badge>
                }
                label="Usuários"
                iconPosition="start"
              />
              <Tab
                icon={
                  <Badge badgeContent={stats?.verifications?.pending || 0} color="error">
                    <VerifiedUserIcon />
                  </Badge>
                }
                label="Verificações"
                iconPosition="start"
              />
              <Tab
                icon={
                  <Badge badgeContent={stats?.withdrawals?.pending || 0} color="warning">
                    <AccountBalanceIcon />
                  </Badge>
                }
                label="Saques"
                iconPosition="start"
              />
              <Tab icon={<ShoppingCartIcon />} label="Vendas" iconPosition="start" />
            </Tabs>

            {/* Dashboard Tab */}
            <TabPanel value={tabValue} index={0}>
              <Box sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: '#5818C8' }}>
                  Visão Geral do Sistema
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Acompanhe as métricas principais da plataforma em tempo real
                </Typography>

                {loading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress sx={{ color: '#5818C8' }} />
                  </Box>
                ) : (
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
                    {/* Resumo de Usuários */}
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                          📊 Resumo de Usuários
                        </Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography color="text.secondary">Aprovados</Typography>
                            <Typography sx={{ fontWeight: 600, color: '#22c55e' }}>
                              {stats?.users?.approved || 0}
                            </Typography>
                          </Box>
                          <LinearProgress
                            variant="determinate"
                            value={((stats?.users?.approved || 0) / (stats?.users?.total || 1)) * 100}
                            sx={{ height: 8, borderRadius: 4, bgcolor: '#e5e7eb', '& .MuiLinearProgress-bar': { bgcolor: '#22c55e' } }}
                          />
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography color="text.secondary">Pendentes</Typography>
                            <Typography sx={{ fontWeight: 600, color: '#f59e0b' }}>
                              {stats?.users?.pending || 0}
                            </Typography>
                          </Box>
                          <LinearProgress
                            variant="determinate"
                            value={((stats?.users?.pending || 0) / (stats?.users?.total || 1)) * 100}
                            sx={{ height: 8, borderRadius: 4, bgcolor: '#e5e7eb', '& .MuiLinearProgress-bar': { bgcolor: '#f59e0b' } }}
                          />
                        </Box>
                      </CardContent>
                    </Card>

                    {/* Resumo Financeiro */}
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                          💰 Resumo Financeiro
                        </Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <ArrowDownIcon sx={{ color: '#22c55e', fontSize: 20 }} />
                              <Typography color="text.secondary">Depósitos</Typography>
                            </Box>
                            <Typography sx={{ fontWeight: 600, color: '#22c55e' }}>
                              {formatCurrency(stats?.deposits?.total || 0)}
                            </Typography>
                          </Box>
                          <Divider />
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <ArrowUpIcon sx={{ color: '#ef4444', fontSize: 20 }} />
                              <Typography color="text.secondary">Saques</Typography>
                            </Box>
                            <Typography sx={{ fontWeight: 600, color: '#ef4444' }}>
                              {formatCurrency(stats?.withdrawals?.completed || 0)}
                            </Typography>
                          </Box>
                          <Divider />
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <TrendingUpIcon sx={{ color: '#5818C8', fontSize: 20 }} />
                              <Typography color="text.secondary">Vendas</Typography>
                            </Box>
                            <Typography sx={{ fontWeight: 600, color: '#5818C8' }}>
                              {formatCurrency(stats?.sales?.total || 0)}
                            </Typography>
                          </Box>
                        </Box>
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
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon sx={{ color: '#94a3b8' }} />
                        </InputAdornment>
                      ),
                    }}
                    sx={{ minWidth: 300 }}
                  />
                  <Button
                    variant={userStatusFilter === '' ? 'contained' : 'outlined'}
                    size="small"
                    onClick={() => { setUserStatusFilter(''); loadUsers(); }}
                    sx={userStatusFilter === '' ? { bgcolor: '#5818C8' } : { borderColor: '#5818C8', color: '#5818C8' }}
                  >
                    Todos
                  </Button>
                  <Button
                    variant={userStatusFilter === 'pending' ? 'contained' : 'outlined'}
                    size="small"
                    onClick={() => { setUserStatusFilter('pending'); loadUsers(); }}
                    sx={userStatusFilter === 'pending' ? { bgcolor: '#f59e0b' } : { borderColor: '#f59e0b', color: '#f59e0b' }}
                  >
                    Pendentes
                  </Button>
                  <Button
                    variant={userStatusFilter === 'approved' ? 'contained' : 'outlined'}
                    size="small"
                    onClick={() => { setUserStatusFilter('approved'); loadUsers(); }}
                    sx={userStatusFilter === 'approved' ? { bgcolor: '#22c55e' } : { borderColor: '#22c55e', color: '#22c55e' }}
                  >
                    Aprovados
                  </Button>
                </Box>

                {loading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress sx={{ color: '#5818C8' }} />
                  </Box>
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
                                <Avatar sx={{ bgcolor: '#5818C8', width: 36, height: 36 }}>
                                  {user.name?.charAt(0)?.toUpperCase()}
                                </Avatar>
                                <Box>
                                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                    {user.name}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {user.email}
                                  </Typography>
                                </Box>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">{user.cpf_cnpj || '-'}</Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" sx={{ fontWeight: 600, color: '#5818C8' }}>
                                {formatCurrency(user.balance)}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={getStatusLabel(user.account_status || 'pending')}
                                color={getStatusColor(user.account_status || 'pending') as any}
                                size="small"
                              />
                            </TableCell>
                            <TableCell>
                              {user.identity_verified ? (
                                <Chip icon={<CheckCircleIcon />} label="Sim" color="success" size="small" />
                              ) : (
                                <Chip icon={<CancelIcon />} label="Não" color="default" size="small" />
                              )}
                            </TableCell>
                            <TableCell>
                              <Typography variant="caption">{formatDate(user.created_at)}</Typography>
                            </TableCell>
                            <TableCell align="center">
                              <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                                {user.account_status !== 'approved' && (
                                  <Tooltip title="Aprovar">
                                    <IconButton
                                      size="small"
                                      onClick={() => setActionDialog({ open: true, type: 'approveUser', item: user, reason: '' })}
                                      sx={{ color: '#22c55e' }}
                                    >
                                      <CheckCircleIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                )}
                                {user.account_status !== 'rejected' && (
                                  <Tooltip title="Rejeitar">
                                    <IconButton
                                      size="small"
                                      onClick={() => setActionDialog({ open: true, type: 'rejectUser', item: user, reason: '' })}
                                      sx={{ color: '#f59e0b' }}
                                    >
                                      <CancelIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                )}
                                {user.account_status !== 'blocked' && (
                                  <Tooltip title="Bloquear">
                                    <IconButton
                                      size="small"
                                      onClick={() => setActionDialog({ open: true, type: 'blockUser', item: user, reason: '' })}
                                      sx={{ color: '#ef4444' }}
                                    >
                                      <BlockIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                )}
                                <Tooltip title="Bloquear Saques">
                                  <IconButton
                                    size="small"
                                    onClick={() => setActionDialog({ open: true, type: 'blockWithdrawals', item: user, reason: '' })}
                                    sx={{ color: '#64748b' }}
                                  >
                                    <LockIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </Box>
                            </TableCell>
                          </TableRow>
                        ))}
                        {users.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                              <Typography color="text.secondary">Nenhum usuário encontrado</Typography>
                            </TableCell>
                          </TableRow>
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
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: '#5818C8' }}>
                  Verificações de Identidade Pendentes
                </Typography>

                {loading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress sx={{ color: '#5818C8' }} />
                  </Box>
                ) : verifications.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 6 }}>
                    <VerifiedUserIcon sx={{ fontSize: 64, color: '#94a3b8', mb: 2 }} />
                    <Typography color="text.secondary">
                      Nenhuma verificação pendente
                    </Typography>
                  </Box>
                ) : (
                  <Box sx={{ display: 'grid', gap: 2 }}>
                    {verifications.map((v) => (
                      <Card key={v.id} variant="outlined">
                        <CardContent>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <Box sx={{ display: 'flex', gap: 2 }}>
                              <Avatar sx={{ bgcolor: '#5818C8', width: 48, height: 48 }}>
                                {v.users?.name?.charAt(0)?.toUpperCase()}
                              </Avatar>
                              <Box>
                                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                  {v.users?.name}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {v.users?.email}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  Documento: {v.document_type?.toUpperCase()} • Enviado em {formatDate(v.created_at)}
                                </Typography>
                              </Box>
                            </Box>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              <Button
                                variant="contained"
                                size="small"
                                startIcon={<CheckCircleIcon />}
                                onClick={() => setActionDialog({ open: true, type: 'approveVerification', item: v, reason: '' })}
                                sx={{ bgcolor: '#22c55e', '&:hover': { bgcolor: '#16a34a' } }}
                              >
                                Aprovar
                              </Button>
                              <Button
                                variant="outlined"
                                size="small"
                                startIcon={<CancelIcon />}
                                onClick={() => setActionDialog({ open: true, type: 'rejectVerification', item: v, reason: '' })}
                                sx={{ borderColor: '#ef4444', color: '#ef4444' }}
                              >
                                Rejeitar
                              </Button>
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
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: '#5818C8' }}>
                  Solicitações de Saque Pendentes
                </Typography>

                {loading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress sx={{ color: '#5818C8' }} />
                  </Box>
                ) : withdrawals.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 6 }}>
                    <AccountBalanceIcon sx={{ fontSize: 64, color: '#94a3b8', mb: 2 }} />
                    <Typography color="text.secondary">
                      Nenhum saque pendente
                    </Typography>
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
                                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                  {w.users?.name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {w.users?.email}
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" sx={{ fontWeight: 700, color: '#5818C8' }}>
                                {formatCurrency(w.amount)}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="caption">
                                {w.bank_name} - Ag: {w.agency} Cc: {w.account}-{w.account_digit}
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
                              <Typography variant="caption">{formatDate(w.created_at)}</Typography>
                            </TableCell>
                            <TableCell align="center">
                              <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                                <Tooltip title="Aprovar Saque">
                                  <IconButton
                                    size="small"
                                    onClick={() => setActionDialog({ open: true, type: 'approveWithdrawal', item: w, reason: '' })}
                                    sx={{ color: '#22c55e' }}
                                  >
                                    <CheckCircleIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Rejeitar Saque">
                                  <IconButton
                                    size="small"
                                    onClick={() => setActionDialog({ open: true, type: 'rejectWithdrawal', item: w, reason: '' })}
                                    sx={{ color: '#ef4444' }}
                                  >
                                    <CancelIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
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
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: '#5818C8' }}>
                  Histórico de Vendas
                </Typography>

                {loading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress sx={{ color: '#5818C8' }} />
                  </Box>
                ) : sales.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 6 }}>
                    <ShoppingCartIcon sx={{ fontSize: 64, color: '#94a3b8', mb: 2 }} />
                    <Typography color="text.secondary">
                      Nenhuma venda registrada
                    </Typography>
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
                                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                  {sale.users?.name || 'N/A'}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {sale.users?.email || '-'}
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" sx={{ fontWeight: 700, color: '#5818C8' }}>
                                {formatCurrency(sale.value)}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={sale.billing_type}
                                size="small"
                                variant="outlined"
                                sx={{
                                  borderColor: sale.billing_type === 'PIX' ? '#22c55e' : '#5818C8',
                                  color: sale.billing_type === 'PIX' ? '#22c55e' : '#5818C8',
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={getStatusLabel(sale.status)}
                                color={getStatusColor(sale.status) as any}
                                size="small"
                              />
                            </TableCell>
                            <TableCell>
                              <Typography variant="caption">{formatDate(sale.created_at)}</Typography>
                            </TableCell>
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
      <Dialog
        open={actionDialog.open}
        onClose={() => setActionDialog({ open: false, type: '', item: null, reason: '' })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 600 }}>
          {actionDialog.type.includes('approve') && 'Confirmar Aprovação'}
          {actionDialog.type.includes('reject') && 'Confirmar Rejeição'}
          {actionDialog.type.includes('block') && 'Confirmar Bloqueio'}
          {actionDialog.type.includes('unblock') && 'Confirmar Desbloqueio'}
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
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Motivo"
              value={actionDialog.reason}
              onChange={(e) => setActionDialog({ ...actionDialog, reason: e.target.value })}
              placeholder="Informe o motivo..."
            />
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button
            onClick={() => setActionDialog({ open: false, type: '', item: null, reason: '' })}
            sx={{ color: '#64748b' }}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleAction}
            disabled={loading || ((actionDialog.type.includes('reject') || actionDialog.type.includes('block')) && !actionDialog.reason)}
            sx={{
              bgcolor: actionDialog.type.includes('approve') || actionDialog.type.includes('unblock') ? '#22c55e' : '#ef4444',
              '&:hover': {
                bgcolor: actionDialog.type.includes('approve') || actionDialog.type.includes('unblock') ? '#16a34a' : '#dc2626',
              },
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

