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
  Grid,
  Slider,
} from '@mui/material';
import {
  People as PeopleIcon,
  CheckCircle as CheckCircleIcon,
  Block as BlockIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Visibility as ViewIcon,
  Person as PersonIcon,
  PercentOutlined as PercentIcon,
  SupervisorAccount as ManagerIcon,
  Logout as LogoutIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

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

const Manager = () => {
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [managerInfo, setManagerInfo] = useState<any>(null);

  // Estados dos dados
  const [users, setUsers] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState('');

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

  const [rateDialog, setRateDialog] = useState<{
    open: boolean;
    user: any;
    pixRate: number;
    cardRate: number;
    boletoRate: number;
    withdrawalFee: number;
    notes: string;
  }>({ 
    open: false, 
    user: null, 
    pixRate: 0.99, 
    cardRate: 4.99, 
    boletoRate: 2.99,
    withdrawalFee: 2.00,
    notes: ''
  });

  // Verificar se está logado como gerente
  useEffect(() => {
    const managerToken = localStorage.getItem('zucropay_manager_token');
    if (!managerToken) {
      navigate('/gerente-login');
      return;
    }
    try {
      const payload = JSON.parse(atob(managerToken));
      if (!payload.exp || payload.exp < Date.now() || payload.role !== 'gerente') {
        localStorage.removeItem('zucropay_manager_token');
        localStorage.removeItem('zucropay_manager_user');
        navigate('/gerente-login');
        return;
      }
      
      const storedUser = localStorage.getItem('zucropay_manager_user');
      if (storedUser) {
        setManagerInfo(JSON.parse(storedUser));
      }
    } catch {
      navigate('/gerente-login');
    }
  }, [navigate]);

  useEffect(() => {
    loadUsers();
  }, []);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('zucropay_manager_token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  };

  const apiCall = async (action: string, params: any = {}) => {
    const response = await fetch(`${API_BASE_URL}/admin`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ action, ...params }),
    });
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.message || 'Erro na requisição');
    }
    return data;
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await apiCall('getUsers', { search: userSearch, status: userStatusFilter });
      setUsers(data.users || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadUserDetails = async (userId: string) => {
    try {
      setUserDetailDialog({ open: true, user: null, loading: true });
      const data = await apiCall('getUserDetails', { userId });
      setUserDetailDialog({ open: true, user: data, loading: false });
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
          await apiCall('approveUser', { userId: item.id });
          setSuccess('Usuário aprovado com sucesso!');
          break;
        case 'rejectUser':
          await apiCall('rejectUser', { userId: item.id, reason });
          setSuccess('Usuário rejeitado.');
          break;
        case 'blockUser':
          await apiCall('blockUser', { userId: item.id, reason });
          setSuccess('Usuário bloqueado.');
          break;
      }

      setActionDialog({ open: false, type: '', item: null, reason: '' });
      loadUsers();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRates = async () => {
    try {
      setLoading(true);
      const { user, pixRate, cardRate, boletoRate, withdrawalFee, notes } = rateDialog;
      
      await apiCall('setUserCustomRates', {
        userId: user.id,
        pixRate,
        cardRate,
        boletoRate,
        withdrawalFee,
        notes,
      });
      
      setSuccess(`Taxas atualizadas para ${user.name}!`);
      setRateDialog({ 
        open: false, 
        user: null, 
        pixRate: 0.99, 
        cardRate: 4.99, 
        boletoRate: 2.99,
        withdrawalFee: 2.00,
        notes: ''
      });
      loadUsers();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('zucropay_manager_token');
    localStorage.removeItem('zucropay_manager_user');
    navigate('/gerente-login');
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
      case 'approved': case 'active': return 'success';
      case 'pending': return 'warning';
      case 'rejected': case 'blocked': case 'suspended': return 'error';
      default: return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'Pendente', approved: 'Aprovado', rejected: 'Rejeitado', 
      blocked: 'Bloqueado', suspended: 'Suspenso', active: 'Ativo',
    };
    return labels[status] || status;
  };

  // Header do Gerente
  const ManagerHeader = () => (
    <Box
      sx={{
        background: 'linear-gradient(135deg, #5818C8 0%, #7c3aed 100%)',
        color: 'white',
        py: 2,
        px: 3,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 2,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            bgcolor: 'rgba(255,255,255,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ManagerIcon sx={{ fontSize: 28 }} />
        </Box>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Painel do Gerente
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.9 }}>
            {managerInfo?.username || 'Gerente de Conta'}
          </Typography>
        </Box>
      </Box>
      <Button
        variant="outlined"
        startIcon={<LogoutIcon />}
        onClick={handleLogout}
        sx={{
          borderColor: 'rgba(255,255,255,0.5)',
          color: 'white',
          '&:hover': {
            borderColor: 'white',
            bgcolor: 'rgba(255,255,255,0.1)',
          },
        }}
      >
        Sair
      </Button>
    </Box>
  );

  return (
    <>
      <ManagerHeader />
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
                👤 Gestão de Contas
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Aprove, cancele contas e ajuste taxas dos usuários
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<RefreshIcon />}
              onClick={loadUsers}
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

          {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess('')}>{success}</Alert>}

          {/* Cards de estatísticas rápidas */}
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', mb: 4 }}>
            <Card sx={{ 
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              color: 'white',
            }}>
              <CardContent>
                <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }}>Contas Pendentes</Typography>
                <Typography variant="h3" sx={{ fontWeight: 700 }}>
                  {users.filter(u => u.account_status === 'pending').length}
                </Typography>
              </CardContent>
            </Card>
            <Card sx={{ 
              background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
              color: 'white',
            }}>
              <CardContent>
                <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }}>Contas Aprovadas</Typography>
                <Typography variant="h3" sx={{ fontWeight: 700 }}>
                  {users.filter(u => u.account_status === 'approved').length}
                </Typography>
              </CardContent>
            </Card>
            <Card sx={{ 
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              color: 'white',
            }}>
              <CardContent>
                <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }}>Contas Bloqueadas</Typography>
                <Typography variant="h3" sx={{ fontWeight: 700 }}>
                  {users.filter(u => u.account_status === 'blocked').length}
                </Typography>
              </CardContent>
            </Card>
          </Box>

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
              <Tab icon={<PeopleIcon />} label="Gerenciar Usuários" iconPosition="start" />
              <Tab icon={<PercentIcon />} label="Ajustar Taxas" iconPosition="start" />
            </Tabs>

            {/* Tab Usuários */}
            <TabPanel value={tabValue} index={0}>
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
                  {['', 'pending', 'approved', 'blocked'].map((status) => (
                    <Button
                      key={status}
                      variant={userStatusFilter === status ? 'contained' : 'outlined'}
                      size="small"
                      onClick={() => { setUserStatusFilter(status); setTimeout(loadUsers, 100); }}
                      sx={userStatusFilter === status 
                        ? { bgcolor: status === '' ? '#5818C8' : status === 'pending' ? '#f59e0b' : status === 'approved' ? '#22c55e' : '#ef4444' }
                        : { borderColor: status === '' ? '#5818C8' : status === 'pending' ? '#f59e0b' : status === 'approved' ? '#22c55e' : '#ef4444', 
                            color: status === '' ? '#5818C8' : status === 'pending' ? '#f59e0b' : status === 'approved' ? '#22c55e' : '#ef4444' }
                      }
                    >
                      {status === '' ? 'Todos' : status === 'pending' ? 'Pendentes' : status === 'approved' ? 'Aprovados' : 'Bloqueados'}
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
                          <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
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
                            <TableCell><Chip label={getStatusLabel(user.account_status || 'pending')} color={getStatusColor(user.account_status || 'pending') as any} size="small" /></TableCell>
                            <TableCell><Typography variant="caption">{formatDate(user.created_at)}</Typography></TableCell>
                            <TableCell align="center">
                              <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                                <Tooltip title="Ver Detalhes"><IconButton size="small" onClick={() => loadUserDetails(user.id)} sx={{ color: '#3b82f6' }}><ViewIcon fontSize="small" /></IconButton></Tooltip>
                                <Tooltip title="Ajustar Taxas"><IconButton size="small" onClick={() => setRateDialog({ open: true, user, pixRate: 0.99, cardRate: 4.99, boletoRate: 2.99, withdrawalFee: 2.00, notes: '' })} sx={{ color: '#f59e0b' }}><PercentIcon fontSize="small" /></IconButton></Tooltip>
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
                          <TableRow><TableCell colSpan={5} align="center" sx={{ py: 4 }}><Typography color="text.secondary">Nenhum usuário encontrado</Typography></TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Box>
            </TabPanel>

            {/* Tab Taxas */}
            <TabPanel value={tabValue} index={1}>
              <Box sx={{ p: 3 }}>
                <Alert severity="info" sx={{ mb: 3 }}>
                  <Typography variant="body2">
                    <strong>💡 Dica:</strong> Você pode definir taxas personalizadas para cada usuário. 
                    Taxas menores ajudam a reter clientes importantes.
                  </Typography>
                </Alert>

                <Typography variant="h6" sx={{ fontWeight: 700, color: '#5818C8', mb: 3 }}>
                  📊 Taxas Padrão do Sistema
                </Typography>

                <Grid container spacing={3} sx={{ mb: 4 }}>
                  <Grid item xs={12} sm={6} md={3}>
                    <Card variant="outlined" sx={{ textAlign: 'center', p: 2 }}>
                      <Typography variant="caption" color="text.secondary">Taxa PIX</Typography>
                      <Typography variant="h4" sx={{ color: '#22c55e', fontWeight: 700 }}>0.99%</Typography>
                    </Card>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Card variant="outlined" sx={{ textAlign: 'center', p: 2 }}>
                      <Typography variant="caption" color="text.secondary">Taxa Cartão</Typography>
                      <Typography variant="h4" sx={{ color: '#5818C8', fontWeight: 700 }}>4.99%</Typography>
                    </Card>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Card variant="outlined" sx={{ textAlign: 'center', p: 2 }}>
                      <Typography variant="caption" color="text.secondary">Taxa Boleto</Typography>
                      <Typography variant="h4" sx={{ color: '#f59e0b', fontWeight: 700 }}>2.99%</Typography>
                    </Card>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Card variant="outlined" sx={{ textAlign: 'center', p: 2 }}>
                      <Typography variant="caption" color="text.secondary">Taxa Saque</Typography>
                      <Typography variant="h4" sx={{ color: '#ef4444', fontWeight: 700 }}>R$ 2,00</Typography>
                    </Card>
                  </Grid>
                </Grid>

                <Typography variant="body2" color="text.secondary">
                  Para ajustar taxas de um usuário específico, clique no ícone de porcentagem (%) na tabela de usuários.
                </Typography>
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
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {actionDialog.type === 'approveUser' && 'Tem certeza que deseja aprovar este usuário?'}
            {actionDialog.type === 'rejectUser' && 'Informe o motivo da rejeição do usuário:'}
            {actionDialog.type === 'blockUser' && 'Informe o motivo do bloqueio:'}
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
              bgcolor: actionDialog.type.includes('approve') ? '#22c55e' : '#ef4444',
              '&:hover': { bgcolor: actionDialog.type.includes('approve') ? '#16a34a' : '#dc2626' },
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
                      <Typography variant="subtitle2" color="text.secondary">Status da Conta</Typography>
                      <Chip 
                        label={getStatusLabel(userDetailDialog.user.user?.account_status || 'pending')} 
                        color={getStatusColor(userDetailDialog.user.user?.account_status || 'pending') as any}
                        sx={{ mt: 1 }}
                      />
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                        Cadastrado em: {formatDate(userDetailDialog.user.user?.created_at)}
                      </Typography>
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

      {/* Rate Adjustment Dialog */}
      <Dialog open={rateDialog.open} onClose={() => setRateDialog({ open: false, user: null, pixRate: 0.99, cardRate: 4.99, boletoRate: 2.99, withdrawalFee: 2.00, notes: '' })} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>📊 Ajustar Taxas do Usuário</DialogTitle>
        <DialogContent>
          {rateDialog.user && (
            <Box>
              <Alert severity="info" sx={{ mb: 3 }}>
                Usuário: <strong>{rateDialog.user.name}</strong> ({rateDialog.user.email})
              </Alert>

              <Typography variant="subtitle2" gutterBottom>Taxa PIX: {rateDialog.pixRate}%</Typography>
              <Slider
                value={rateDialog.pixRate}
                onChange={(_, value) => setRateDialog({ ...rateDialog, pixRate: value as number })}
                min={0}
                max={2}
                step={0.01}
                valueLabelDisplay="auto"
                valueLabelFormat={(value) => `${value}%`}
                sx={{ mb: 3, color: '#22c55e' }}
              />

              <Typography variant="subtitle2" gutterBottom>Taxa Cartão: {rateDialog.cardRate}%</Typography>
              <Slider
                value={rateDialog.cardRate}
                onChange={(_, value) => setRateDialog({ ...rateDialog, cardRate: value as number })}
                min={0}
                max={10}
                step={0.01}
                valueLabelDisplay="auto"
                valueLabelFormat={(value) => `${value}%`}
                sx={{ mb: 3, color: '#5818C8' }}
              />

              <Typography variant="subtitle2" gutterBottom>Taxa Boleto: {rateDialog.boletoRate}%</Typography>
              <Slider
                value={rateDialog.boletoRate}
                onChange={(_, value) => setRateDialog({ ...rateDialog, boletoRate: value as number })}
                min={0}
                max={5}
                step={0.01}
                valueLabelDisplay="auto"
                valueLabelFormat={(value) => `${value}%`}
                sx={{ mb: 3, color: '#f59e0b' }}
              />

              <Typography variant="subtitle2" gutterBottom>Taxa de Saque: R$ {rateDialog.withdrawalFee.toFixed(2)}</Typography>
              <Slider
                value={rateDialog.withdrawalFee}
                onChange={(_, value) => setRateDialog({ ...rateDialog, withdrawalFee: value as number })}
                min={0}
                max={10}
                step={0.50}
                valueLabelDisplay="auto"
                valueLabelFormat={(value) => `R$ ${value.toFixed(2)}`}
                sx={{ mb: 3, color: '#ef4444' }}
              />

              <TextField
                fullWidth
                multiline
                rows={2}
                label="Observações (opcional)"
                value={rateDialog.notes}
                onChange={(e) => setRateDialog({ ...rateDialog, notes: e.target.value })}
                placeholder="Motivo do ajuste, acordos comerciais, etc."
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setRateDialog({ open: false, user: null, pixRate: 0.99, cardRate: 4.99, boletoRate: 2.99, withdrawalFee: 2.00, notes: '' })} sx={{ color: '#64748b' }}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleSaveRates}
            disabled={loading}
            sx={{ bgcolor: '#5818C8', '&:hover': { bgcolor: '#4a14a8' } }}
          >
            {loading ? <CircularProgress size={20} sx={{ color: 'white' }} /> : 'Salvar Taxas'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default Manager;
