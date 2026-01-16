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
    loading: boolean;
  }>({ 
    open: false, 
    user: null, 
    pixRate: 5.99, 
    cardRate: 5.99, 
    boletoRate: 5.99,
    withdrawalFee: 3.00,
    notes: '',
    loading: false
  });

  // Taxas padrão da plataforma
  const DEFAULT_RATES = {
    pix_rate: 5.99,
    card_rate: 5.99,
    boleto_rate: 5.99,
    withdrawal_fee: 3.00,
    fixed_fee: 2.50,
  };

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

  const openRateDialog = async (user: any) => {
    // Abrir dialog com loading
    setRateDialog({
      open: true,
      user,
      pixRate: DEFAULT_RATES.pix_rate,
      cardRate: DEFAULT_RATES.card_rate,
      boletoRate: DEFAULT_RATES.boleto_rate,
      withdrawalFee: DEFAULT_RATES.withdrawal_fee,
      notes: '',
      loading: true,
    });

    try {
      // Buscar taxas atuais do usuário
      const data = await apiCall('getUserCustomRates', { userId: user.id });
      const rates = data.rates || {};
      
      setRateDialog({
        open: true,
        user,
        pixRate: rates.pix_rate ?? DEFAULT_RATES.pix_rate,
        cardRate: rates.card_rate ?? DEFAULT_RATES.card_rate,
        boletoRate: rates.boleto_rate ?? DEFAULT_RATES.boleto_rate,
        withdrawalFee: rates.withdrawal_fee ?? DEFAULT_RATES.withdrawal_fee,
        notes: rates.notes || '',
        loading: false,
      });
    } catch {
      // Se não encontrar, usar taxas padrão
      setRateDialog(prev => ({ ...prev, loading: false }));
    }
  };

  const handleSaveRates = async () => {
    try {
      setRateDialog(prev => ({ ...prev, loading: true }));
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
        pixRate: DEFAULT_RATES.pix_rate, 
        cardRate: DEFAULT_RATES.card_rate, 
        boletoRate: DEFAULT_RATES.boleto_rate,
        withdrawalFee: DEFAULT_RATES.withdrawal_fee,
        notes: '',
        loading: false
      });
      loadUsers();
    } catch (err: any) {
      setError(err.message);
      setRateDialog(prev => ({ ...prev, loading: false }));
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
                                <Tooltip title="Ajustar Taxas"><IconButton size="small" onClick={() => openRateDialog(user)} sx={{ color: '#f59e0b' }}><PercentIcon fontSize="small" /></IconButton></Tooltip>
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
                    <strong>💡 Taxas Padrão:</strong> PIX/Boleto/Cartão: {DEFAULT_RATES.pix_rate}% + R${DEFAULT_RATES.fixed_fee.toFixed(2)} | Saque: R${DEFAULT_RATES.withdrawal_fee.toFixed(2)}<br />
                    Você pode ajustar taxas individuais clicando no ⚙️ de cada usuário.
                  </Typography>
                </Alert>

                {/* Busca */}
                <Box sx={{ mb: 3 }}>
                  <TextField
                    size="small"
                    placeholder="Buscar usuário por nome ou email..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && loadUsers()}
                    InputProps={{
                      startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: '#94a3b8' }} /></InputAdornment>,
                    }}
                    sx={{ minWidth: 300 }}
                  />
                </Box>

                {loading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress sx={{ color: '#5818C8' }} /></Box>
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
                          <TableCell sx={{ fontWeight: 600 }} align="center">Ação</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {users.map((user) => {
                          const hasCustomRate = user.custom_rates && (
                            user.custom_rates.pix_rate !== DEFAULT_RATES.pix_rate ||
                            user.custom_rates.card_rate !== DEFAULT_RATES.card_rate ||
                            user.custom_rates.boleto_rate !== DEFAULT_RATES.boleto_rate ||
                            user.custom_rates.withdrawal_fee !== DEFAULT_RATES.withdrawal_fee
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
                                        label="Taxa Especial" 
                                        size="small" 
                                        sx={{ height: 18, fontSize: '0.65rem', bgcolor: '#dcfce7', color: '#16a34a' }} 
                                      />
                                    )}
                                  </Box>
                                </Box>
                              </TableCell>
                              <TableCell><Typography variant="body2" color="text.secondary">{user.email}</Typography></TableCell>
                              <TableCell align="center">
                                <Typography variant="body2" sx={{ 
                                  fontWeight: 600, 
                                  color: user.custom_rates?.pix_rate !== undefined && user.custom_rates?.pix_rate !== DEFAULT_RATES.pix_rate ? '#16a34a' : '#64748b' 
                                }}>
                                  {user.custom_rates?.pix_rate ?? DEFAULT_RATES.pix_rate}%
                                </Typography>
                              </TableCell>
                              <TableCell align="center">
                                <Typography variant="body2" sx={{ 
                                  fontWeight: 600, 
                                  color: user.custom_rates?.card_rate !== undefined && user.custom_rates?.card_rate !== DEFAULT_RATES.card_rate ? '#16a34a' : '#64748b' 
                                }}>
                                  {user.custom_rates?.card_rate ?? DEFAULT_RATES.card_rate}%
                                </Typography>
                              </TableCell>
                              <TableCell align="center">
                                <Typography variant="body2" sx={{ 
                                  fontWeight: 600, 
                                  color: user.custom_rates?.boleto_rate !== undefined && user.custom_rates?.boleto_rate !== DEFAULT_RATES.boleto_rate ? '#16a34a' : '#64748b' 
                                }}>
                                  {user.custom_rates?.boleto_rate ?? DEFAULT_RATES.boleto_rate}%
                                </Typography>
                              </TableCell>
                              <TableCell align="center">
                                <Typography variant="body2" sx={{ 
                                  fontWeight: 600, 
                                  color: user.custom_rates?.withdrawal_fee !== undefined && user.custom_rates?.withdrawal_fee !== DEFAULT_RATES.withdrawal_fee ? '#16a34a' : '#64748b' 
                                }}>
                                  R${(user.custom_rates?.withdrawal_fee ?? DEFAULT_RATES.withdrawal_fee).toFixed(2)}
                                </Typography>
                              </TableCell>
                              <TableCell align="center">
                                <Tooltip title="Editar Taxas">
                                  <IconButton size="small" onClick={() => openRateDialog(user)} sx={{ color: '#5818C8' }}>
                                    <PercentIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </TableCell>
                            </TableRow>
                          );
                        })}
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
          </Card>
        </Box>
      </Box>

      {/* Action Dialog */}
      <Dialog 
        open={actionDialog.open} 
        onClose={() => setActionDialog({ open: false, type: '', item: null, reason: '' })}
        PaperProps={{ sx: { borderRadius: 2, width: 360, maxWidth: '95vw', maxHeight: '85vh', display: 'flex', flexDirection: 'column' } }}
      >
        <DialogTitle sx={{ fontWeight: 600, py: 1.5, fontSize: '1rem' }}>
          {actionDialog.type.includes('approve') && '✅ Aprovar'}
          {actionDialog.type.includes('reject') && '❌ Rejeitar'}
          {actionDialog.type.includes('block') && '🚫 Bloquear'}
        </DialogTitle>
        <DialogContent sx={{ p: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            {actionDialog.type === 'approveUser' && 'Confirma aprovação?'}
            {actionDialog.type === 'rejectUser' && 'Motivo da rejeição:'}
            {actionDialog.type === 'blockUser' && 'Motivo do bloqueio:'}
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
              bgcolor: actionDialog.type.includes('approve') ? '#22c55e' : '#ef4444',
              '&:hover': { bgcolor: actionDialog.type.includes('approve') ? '#16a34a' : '#dc2626' },
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
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Chip 
                  size="small"
                  label={getStatusLabel(userDetailDialog.user.user?.account_status || 'pending')} 
                  color={getStatusColor(userDetailDialog.user.user?.account_status || 'pending') as any}
                />
                <Typography variant="caption" color="text.secondary">
                  {formatDate(userDetailDialog.user.user?.created_at)}
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 1.5 }}>
          <Button size="small" onClick={() => setUserDetailDialog({ open: false, user: null, loading: false })}>Fechar</Button>
        </DialogActions>
      </Dialog>

      {/* Rate Adjustment Dialog */}
      <Dialog 
        open={rateDialog.open} 
        onClose={() => setRateDialog({ open: false, user: null, pixRate: DEFAULT_RATES.pix_rate, cardRate: DEFAULT_RATES.card_rate, boletoRate: DEFAULT_RATES.boleto_rate, withdrawalFee: DEFAULT_RATES.withdrawal_fee, notes: '', loading: false })}
        PaperProps={{ sx: { borderRadius: 2, width: 450, maxWidth: '95vw', maxHeight: '85vh', display: 'flex', flexDirection: 'column' } }}
      >
        <DialogTitle sx={{ fontWeight: 600, py: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <PercentIcon sx={{ color: '#5818C8' }} />
          Taxas de {rateDialog.user?.name}
        </DialogTitle>
        <DialogContent sx={{ p: 2.5 }}>
          {rateDialog.loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={32} sx={{ color: '#5818C8' }} />
            </Box>
          ) : rateDialog.user && (
            <Box>
              <Alert severity="warning" sx={{ mb: 2, py: 0.5 }}>
                <Typography variant="caption">
                  Taxas padrão: {DEFAULT_RATES.pix_rate}% + R${DEFAULT_RATES.fixed_fee.toFixed(2)} (PIX/Boleto)
                </Typography>
              </Alert>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Taxa PIX (%)"
                  type="number"
                  value={rateDialog.pixRate}
                  onChange={(e) => setRateDialog({ ...rateDialog, pixRate: parseFloat(e.target.value) || 0 })}
                  inputProps={{ step: '0.01', min: '0', max: '50' }}
                  helperText="Taxa percentual para pagamentos via PIX"
                />
                <TextField
                  fullWidth
                  size="small"
                  label="Taxa Cartão (%)"
                  type="number"
                  value={rateDialog.cardRate}
                  onChange={(e) => setRateDialog({ ...rateDialog, cardRate: parseFloat(e.target.value) || 0 })}
                  inputProps={{ step: '0.01', min: '0', max: '50' }}
                  helperText="Taxa base para cartão (+ 2.49% por parcela)"
                />
                <TextField
                  fullWidth
                  size="small"
                  label="Taxa Boleto (%)"
                  type="number"
                  value={rateDialog.boletoRate}
                  onChange={(e) => setRateDialog({ ...rateDialog, boletoRate: parseFloat(e.target.value) || 0 })}
                  inputProps={{ step: '0.01', min: '0', max: '50' }}
                  helperText="Taxa percentual para pagamentos via Boleto"
                />
                <TextField
                  fullWidth
                  size="small"
                  label="Taxa de Saque (R$)"
                  type="number"
                  value={rateDialog.withdrawalFee}
                  onChange={(e) => setRateDialog({ ...rateDialog, withdrawalFee: parseFloat(e.target.value) || 0 })}
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
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button 
            onClick={() => setRateDialog({ open: false, user: null, pixRate: DEFAULT_RATES.pix_rate, cardRate: DEFAULT_RATES.card_rate, boletoRate: DEFAULT_RATES.boleto_rate, withdrawalFee: DEFAULT_RATES.withdrawal_fee, notes: '', loading: false })} 
            sx={{ color: '#64748b' }}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveRates}
            disabled={rateDialog.loading}
            sx={{ bgcolor: '#5818C8', '&:hover': { bgcolor: '#4a14a8' } }}
          >
            {rateDialog.loading ? <CircularProgress size={18} sx={{ color: 'white' }} /> : 'Salvar Taxas'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default Manager;
