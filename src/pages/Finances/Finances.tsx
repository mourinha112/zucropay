import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Alert,
  Snackbar,
  MenuItem,
  Tabs,
  Tab,
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  InputAdornment,
  Divider,
  CircularProgress,
} from '@mui/material';
import {
  AccountBalance as AccountBalanceIcon,
  Lock as LockIcon,
  AttachMoney as MoneyIcon,
  Pix as PixIcon,
  AccountBalanceWallet as WalletIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  HourglassEmpty as PendingIcon,
} from '@mui/icons-material';
import Header from '../../components/Header/Header';

interface Transaction {
  id: string;
  type: string;
  amount: number;
  status: string;
  description: string;
  created_at: string;
}

interface Withdrawal {
  id: string;
  amount: number;
  status: string;
  withdrawal_type: string;
  pix_key?: string;
  pix_key_type?: string;
  bank_name?: string;
  holder_name?: string;
  requested_at: string;
  rejection_reason?: string;
}

const API_URL = import.meta.env.VITE_API_URL || '';

const Finances: React.FC = () => {
  const [balance, setBalance] = useState({ available: 0, reserved: 0, total: 0 });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  
  // Modal de saque
  const [openWithdrawDialog, setOpenWithdrawDialog] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawType, setWithdrawType] = useState<'pix' | 'bank'>('pix');
  const [submitting, setSubmitting] = useState(false);
  
  // Dados PIX
  const [pixKey, setPixKey] = useState('');
  const [pixKeyType, setPixKeyType] = useState('cpf');
  
  // Dados bancários
  const [bankForm, setBankForm] = useState({
    bankCode: '',
    bankName: '',
    agency: '',
    accountNumber: '',
    accountDigit: '',
    accountType: 'checking',
    holderName: '',
    holderDocument: '',
  });
  
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' | 'info' });

  const getAuthToken = () => localStorage.getItem('zucropay_token');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadBalance(), loadTransactions(), loadWithdrawals()]);
    setLoading(false);
  };

  const loadBalance = async () => {
    try {
      const token = getAuthToken();
      console.log('[Finances] Token encontrado:', !!token);
      
      if (!token) {
        console.error('[Finances] Token não encontrado no localStorage');
        return;
      }
      
      const response = await fetch(`${API_URL}/api/dashboard-data`, {
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
      });
      
      console.log('[Finances] Response status:', response.status);
      const data = await response.json();
      console.log('[Finances] Data received:', data);
      
      if (data.success && data.data) {
        const available = parseFloat(data.data.user?.balance) || 0;
        const reserved = parseFloat(data.data.user?.reservedBalance) || parseFloat(data.data.reserves?.totalReserved) || 0;
        
        console.log('[Finances] Saldo disponível:', available, 'Reservado:', reserved);
        
        setBalance({
          available,
          reserved,
          total: available + reserved,
        });
        
        // Transações vêm do mesmo endpoint (se disponível)
        if (data.data.transactions) {
          setTransactions(data.data.transactions);
        }
      } else {
        console.error('[Finances] Resposta inválida:', data);
      }
    } catch (error) {
      console.error('[Finances] Erro ao carregar saldo:', error);
    }
  };

  const loadTransactions = async () => {
    // As transações agora são carregadas junto com o saldo via dashboard-data
    // Mas se precisar buscar separadamente, usar Supabase diretamente
    try {
      // Buscar transações diretamente do Supabase se não vieram no dashboard-data
      // Por enquanto, apenas log se houver erro
    } catch (error) {
      console.error('Erro ao carregar transações:', error);
    }
  };

  const loadWithdrawals = async () => {
    try {
      const response = await fetch(`${API_URL}/api/withdrawals`, {
        headers: { Authorization: `Bearer ${getAuthToken()}` },
      });
      const data = await response.json();
      
      if (data.success) {
        setWithdrawals(data.withdrawals || []);
      }
    } catch (error) {
      console.error('Erro ao carregar saques:', error);
    }
  };

  const showSnackbar = (message: string, severity: 'success' | 'error' | 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount); // Valor bruto (total a debitar)
    const netAmount = amount - 2; // Valor líquido que o usuário recebe
    
    if (isNaN(amount) || amount < 10) {
      showSnackbar('Valor mínimo para saque: R$ 10,00', 'error');
      return;
    }

    if (amount > balance.available) {
      showSnackbar(`Saldo insuficiente. Disponível: R$ ${balance.available.toFixed(2)}`, 'error');
      return;
    }
    
    if (netAmount < 8) {
      showSnackbar('Valor mínimo após taxa: R$ 8,00. Aumente o valor do saque.', 'error');
      return;
    }

    // Validar dados
    if (withdrawType === 'pix') {
      if (!pixKey.trim()) {
        showSnackbar('Informe a chave PIX', 'error');
        return;
      }
    } else {
      if (!bankForm.bankCode || !bankForm.agency || !bankForm.accountNumber || !bankForm.holderName || !bankForm.holderDocument) {
        showSnackbar('Preencha todos os dados bancários', 'error');
        return;
      }
    }

    setSubmitting(true);

    try {
      const response = await fetch(`${API_URL}/api/withdrawals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({
          amount,
          withdrawalType: withdrawType === 'pix' ? 'pix' : 'bank_transfer',
          pixKey: withdrawType === 'pix' ? pixKey : undefined,
          pixKeyType: withdrawType === 'pix' ? pixKeyType : undefined,
          ...( withdrawType === 'bank' ? bankForm : {}),
        }),
      });

      const data = await response.json();

      if (data.success) {
        showSnackbar('Solicitação de saque enviada! Aguarde a aprovação.', 'success');
        setOpenWithdrawDialog(false);
        resetWithdrawForm();
        loadData();
      } else {
        showSnackbar(data.message || 'Erro ao solicitar saque', 'error');
      }
    } catch (error: any) {
      showSnackbar(error.message || 'Erro ao solicitar saque', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const resetWithdrawForm = () => {
    setWithdrawAmount('');
    setPixKey('');
    setPixKeyType('cpf');
    setBankForm({
      bankCode: '',
      bankName: '',
      agency: '',
      accountNumber: '',
      accountDigit: '',
      accountType: 'checking',
      holderName: '',
      holderDocument: '',
    });
  };

  const getStatusChip = (status: string) => {
    const configs: Record<string, { color: 'success' | 'warning' | 'error' | 'info' | 'default'; icon: React.ReactElement; label: string }> = {
      pending: { color: 'warning', icon: <PendingIcon fontSize="small" />, label: 'Pendente' },
      approved: { color: 'info', icon: <CheckCircleIcon fontSize="small" />, label: 'Aprovado' },
      completed: { color: 'success', icon: <CheckCircleIcon fontSize="small" />, label: 'Concluído' },
      rejected: { color: 'error', icon: <CancelIcon fontSize="small" />, label: 'Rejeitado' },
      cancelled: { color: 'default', icon: <CancelIcon fontSize="small" />, label: 'Cancelado' },
    };
    
    const config = configs[status] || configs.pending;
    return (
      <Chip
        icon={config.icon}
        label={config.label}
        color={config.color}
        size="small"
      />
    );
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const BANKS = [
    { code: '001', name: 'Banco do Brasil' },
    { code: '237', name: 'Bradesco' },
    { code: '104', name: 'Caixa Econômica' },
    { code: '341', name: 'Itaú' },
    { code: '033', name: 'Santander' },
    { code: '260', name: 'Nubank' },
    { code: '077', name: 'Inter' },
    { code: '336', name: 'C6 Bank' },
    { code: '212', name: 'Banco Original' },
    { code: '756', name: 'Sicoob' },
  ];

  return (
    <>
      <Header />
      <Box sx={{ minHeight: '100vh', backgroundColor: '#f8fafc' }}>
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom fontWeight={700}>
            💰 Financeiro
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            Gerencie seu saldo e solicite saques
          </Typography>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              {/* Cards de Saldo */}
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 3, mb: 4 }}>
                {/* Saldo Disponível */}
                <Card sx={{ 
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: 'white',
                  position: 'relative',
                  overflow: 'hidden',
                }}>
                  <Box sx={{ 
                    position: 'absolute', 
                    right: -20, 
                    top: -20, 
                    width: 120, 
                    height: 120, 
                    borderRadius: '50%', 
                    bgcolor: 'rgba(255,255,255,0.1)' 
                  }} />
                  <CardContent sx={{ position: 'relative', zIndex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <WalletIcon sx={{ mr: 1 }} />
                      <Typography variant="body2" sx={{ opacity: 0.9 }}>
                        Saldo Disponível
                      </Typography>
                    </Box>
                    <Typography variant="h4" fontWeight={700} sx={{ mb: 2 }}>
                      {formatCurrency(balance.available)}
                    </Typography>
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => setOpenWithdrawDialog(true)}
                      disabled={loading || balance.available < 10}
                      sx={{ 
                        bgcolor: 'rgba(255,255,255,0.2)', 
                        color: 'white',
                        '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
                        '&:disabled': { bgcolor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }
                      }}
                    >
                      {loading ? 'Carregando...' : balance.available < 10 ? `Mínimo R$ 10` : 'Solicitar Saque'}
                    </Button>
                  </CardContent>
                </Card>

                {/* Saldo Retido */}
                <Card sx={{ 
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  color: 'white',
                  position: 'relative',
                  overflow: 'hidden',
                }}>
                  <Box sx={{ 
                    position: 'absolute', 
                    right: -20, 
                    top: -20, 
                    width: 120, 
                    height: 120, 
                    borderRadius: '50%', 
                    bgcolor: 'rgba(255,255,255,0.1)' 
                  }} />
                  <CardContent sx={{ position: 'relative', zIndex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <LockIcon sx={{ mr: 1 }} />
                      <Typography variant="body2" sx={{ opacity: 0.9 }}>
                        Saldo Retido (30 dias)
                      </Typography>
                    </Box>
                    <Typography variant="h4" fontWeight={700} sx={{ mb: 2 }}>
                      {formatCurrency(balance.reserved)}
                    </Typography>
                    <Typography variant="caption" sx={{ opacity: 0.8 }}>
                      Reserva de 5% para chargebacks
                    </Typography>
                  </CardContent>
                </Card>

                {/* Saldo Total */}
                <Card sx={{ 
                  background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                  color: 'white',
                  position: 'relative',
                  overflow: 'hidden',
                }}>
                  <Box sx={{ 
                    position: 'absolute', 
                    right: -20, 
                    top: -20, 
                    width: 120, 
                    height: 120, 
                    borderRadius: '50%', 
                    bgcolor: 'rgba(255,255,255,0.1)' 
                  }} />
                  <CardContent sx={{ position: 'relative', zIndex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <MoneyIcon sx={{ mr: 1 }} />
                      <Typography variant="body2" sx={{ opacity: 0.9 }}>
                        Saldo Total
                      </Typography>
                    </Box>
                    <Typography variant="h4" fontWeight={700} sx={{ mb: 2 }}>
                      {formatCurrency(balance.total)}
                    </Typography>
                    <Typography variant="caption" sx={{ opacity: 0.8 }}>
                      Disponível + Retido
                    </Typography>
                  </CardContent>
                </Card>
              </Box>

              {/* Tabs */}
              <Card sx={{ mb: 4 }}>
                <Tabs 
                  value={tabValue} 
                  onChange={(_, v) => setTabValue(v)}
                  sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
                >
                  <Tab label="Solicitações de Saque" />
                  <Tab label="Histórico de Transações" />
                </Tabs>

                <CardContent>
                  {/* Tab Saques */}
                  {tabValue === 0 && (
                    <>
                      {withdrawals.length === 0 ? (
                        <Box sx={{ textAlign: 'center', py: 6 }}>
                          <ScheduleIcon sx={{ fontSize: 60, color: '#cbd5e1', mb: 2 }} />
                          <Typography color="text.secondary">
                            Nenhuma solicitação de saque ainda
                          </Typography>
                          <Button 
                            variant="contained" 
                            sx={{ mt: 2 }}
                            onClick={() => setOpenWithdrawDialog(true)}
                            disabled={balance.available < 12}
                          >
                            Solicitar Primeiro Saque
                          </Button>
                        </Box>
                      ) : (
                        <TableContainer>
                          <Table>
                            <TableHead>
                              <TableRow>
                                <TableCell>Data</TableCell>
                                <TableCell>Tipo</TableCell>
                                <TableCell>Destino</TableCell>
                                <TableCell align="right">Valor</TableCell>
                                <TableCell align="center">Status</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {withdrawals.map((w) => (
                                <TableRow key={w.id}>
                                  <TableCell>{formatDate(w.requested_at)}</TableCell>
                                  <TableCell>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                      {w.withdrawal_type === 'pix' ? (
                                        <><PixIcon fontSize="small" color="primary" /> PIX</>
                                      ) : (
                                        <><AccountBalanceIcon fontSize="small" color="primary" /> TED</>
                                      )}
                                    </Box>
                                  </TableCell>
                                  <TableCell>
                                    {w.withdrawal_type === 'pix' 
                                      ? `${w.pix_key_type?.toUpperCase()}: ${w.pix_key}`
                                      : `${w.bank_name} - ${w.holder_name}`
                                    }
                                  </TableCell>
                                  <TableCell align="right" sx={{ fontWeight: 600 }}>
                                    {formatCurrency(w.amount)}
                                  </TableCell>
                                  <TableCell align="center">
                                    {getStatusChip(w.status)}
                                    {w.rejection_reason && (
                                      <Typography variant="caption" display="block" color="error">
                                        {w.rejection_reason}
                                      </Typography>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      )}
                    </>
                  )}

                  {/* Tab Transações */}
                  {tabValue === 1 && (
                    <>
                      {transactions.length === 0 ? (
                        <Box sx={{ textAlign: 'center', py: 6 }}>
                          <Typography color="text.secondary">
                            Nenhuma transação registrada
                          </Typography>
                        </Box>
                      ) : (
                        <TableContainer>
                          <Table>
                            <TableHead>
                              <TableRow>
                                <TableCell>Data</TableCell>
                                <TableCell>Tipo</TableCell>
                                <TableCell>Descrição</TableCell>
                                <TableCell align="right">Valor</TableCell>
                                <TableCell align="center">Status</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {transactions.map((t) => (
                                <TableRow key={t.id}>
                                  <TableCell>{formatDate(t.created_at)}</TableCell>
                                  <TableCell>
                                    {t.type === 'payment_received' ? 'Venda' 
                                      : t.type === 'platform_fee' ? 'Taxa'
                                      : t.type === 'withdrawal_request' ? 'Saque'
                                      : t.type === 'withdrawal_fee' ? 'Taxa Saque'
                                      : t.type}
                                  </TableCell>
                                  <TableCell>{t.description}</TableCell>
                                  <TableCell 
                                    align="right" 
                                    sx={{ 
                                      fontWeight: 600, 
                                      color: t.amount >= 0 ? 'success.main' : 'error.main' 
                                    }}
                                  >
                                    {t.amount >= 0 ? '+' : ''}{formatCurrency(t.amount)}
                                  </TableCell>
                                  <TableCell align="center">
                                    {getStatusChip(t.status)}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Info */}
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  <strong>Taxa de saque:</strong> R$ 2,00 por saque | <strong>Mínimo:</strong> R$ 10,00 | 
                  <strong> Prazo:</strong> Até 24h úteis após aprovação
                </Typography>
              </Alert>
            </>
          )}
        </Container>
      </Box>

      {/* Dialog Saque */}
      <Dialog 
        open={openWithdrawDialog} 
        onClose={() => !submitting && setOpenWithdrawDialog(false)}
        PaperProps={{ sx: { borderRadius: 2, width: 400, maxWidth: '95vw', maxHeight: '85vh', display: 'flex', flexDirection: 'column' } }}
      >
        <DialogTitle sx={{ py: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <WalletIcon color="primary" fontSize="small" />
            <Typography variant="subtitle1" fontWeight={600}>Solicitar Saque</Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 2, overflowY: 'auto' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ p: 1.5, bgcolor: '#f0fdf4', borderRadius: 1.5, textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary">Saldo disponível</Typography>
              <Typography variant="h6" sx={{ color: '#22c55e', fontWeight: 700 }}>{formatCurrency(balance.available)}</Typography>
            </Box>

            <TextField
              size="small"
              label="Valor do Saque"
              type="number"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              fullWidth
              inputProps={{ step: '0.01', min: '10', max: balance.available }}
              InputProps={{
                startAdornment: <InputAdornment position="start">R$</InputAdornment>,
              }}
              helperText={`Taxa: R$ 2,00 • Receberá: ${formatCurrency(Math.max(0, parseFloat(withdrawAmount || '0') - 2))}`}
            />

            <Divider />

            <Typography variant="subtitle2" fontWeight={600}>
              Como deseja receber?
            </Typography>

            <FormControl>
              <RadioGroup
                value={withdrawType}
                onChange={(e) => setWithdrawType(e.target.value as 'pix' | 'bank')}
              >
                <FormControlLabel 
                  value="pix" 
                  control={<Radio />} 
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <PixIcon color="primary" /> PIX (Instantâneo)
                    </Box>
                  } 
                />
                <FormControlLabel 
                  value="bank" 
                  control={<Radio />} 
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <AccountBalanceIcon color="primary" /> Transferência Bancária (TED)
                    </Box>
                  } 
                />
              </RadioGroup>
            </FormControl>

            {/* Formulário PIX */}
            {withdrawType === 'pix' && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  select
                  label="Tipo da Chave PIX"
                  value={pixKeyType}
                  onChange={(e) => setPixKeyType(e.target.value)}
                  fullWidth
                >
                  <MenuItem value="cpf">CPF</MenuItem>
                  <MenuItem value="cnpj">CNPJ</MenuItem>
                  <MenuItem value="email">E-mail</MenuItem>
                  <MenuItem value="phone">Telefone</MenuItem>
                  <MenuItem value="random">Chave Aleatória</MenuItem>
                </TextField>

                <TextField
                  label="Chave PIX"
                  value={pixKey}
                  onChange={(e) => setPixKey(e.target.value)}
                  fullWidth
                  placeholder={
                    pixKeyType === 'cpf' ? '000.000.000-00'
                      : pixKeyType === 'cnpj' ? '00.000.000/0000-00'
                      : pixKeyType === 'email' ? 'seu@email.com'
                      : pixKeyType === 'phone' ? '+5511999999999'
                      : 'Chave aleatória'
                  }
                />
              </Box>
            )}

            {/* Formulário Banco */}
            {withdrawType === 'bank' && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  select
                  label="Banco"
                  value={bankForm.bankCode}
                  onChange={(e) => {
                    const bank = BANKS.find(b => b.code === e.target.value);
                    setBankForm({ 
                      ...bankForm, 
                      bankCode: e.target.value,
                      bankName: bank?.name || ''
                    });
                  }}
                  fullWidth
                >
                  {BANKS.map((bank) => (
                    <MenuItem key={bank.code} value={bank.code}>
                      {bank.code} - {bank.name}
                    </MenuItem>
                  ))}
                </TextField>

                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField
                    label="Agência"
                    value={bankForm.agency}
                    onChange={(e) => setBankForm({ ...bankForm, agency: e.target.value })}
                    fullWidth
                    placeholder="0000"
                  />
                  <TextField
                    label="Conta"
                    value={bankForm.accountNumber}
                    onChange={(e) => setBankForm({ ...bankForm, accountNumber: e.target.value })}
                    fullWidth
                    placeholder="00000"
                  />
                  <TextField
                    label="Dígito"
                    value={bankForm.accountDigit}
                    onChange={(e) => setBankForm({ ...bankForm, accountDigit: e.target.value })}
                    sx={{ width: 100 }}
                    placeholder="0"
                  />
                </Box>

                <TextField
                  select
                  label="Tipo de Conta"
                  value={bankForm.accountType}
                  onChange={(e) => setBankForm({ ...bankForm, accountType: e.target.value })}
                  fullWidth
                >
                  <MenuItem value="checking">Conta Corrente</MenuItem>
                  <MenuItem value="savings">Conta Poupança</MenuItem>
                </TextField>

                <TextField
                  label="Nome do Titular"
                  value={bankForm.holderName}
                  onChange={(e) => setBankForm({ ...bankForm, holderName: e.target.value })}
                  fullWidth
                  placeholder="Nome completo"
                />

                <TextField
                  label="CPF/CNPJ do Titular"
                  value={bankForm.holderDocument}
                  onChange={(e) => setBankForm({ ...bankForm, holderDocument: e.target.value })}
                  fullWidth
                  placeholder="000.000.000-00"
                />
              </Box>
            )}

            <Alert severity="warning">
              <Typography variant="body2">
                ⚠️ Confira os dados antes de enviar. Saques para dados incorretos podem ser rejeitados.
              </Typography>
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpenWithdrawDialog(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button 
            onClick={handleWithdraw} 
            variant="contained" 
            disabled={submitting}
            startIcon={submitting ? <CircularProgress size={20} /> : null}
          >
            {submitting ? 'Enviando...' : 'Solicitar Saque'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default Finances;
