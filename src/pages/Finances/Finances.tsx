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
} from '@mui/material';
import {
  AccountBalance as AccountBalanceIcon,
  TrendingUp as TrendingUpIcon,
  AttachMoney as MoneyIcon,
} from '@mui/icons-material';
import Header from '../../components/Header/Header';
import * as api from '../../services/api-supabase';

interface Transaction {
  id: number;
  type: string;
  amount: number;
  status: string;
  description: string;
  createdAt: string;
}

const Finances: React.FC = () => {
  const [balance, setBalance] = useState({ available: 0, pending: 0, total: 0 });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [openDepositDialog, setOpenDepositDialog] = useState(false);
  const [openWithdrawDialog, setOpenWithdrawDialog] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  
  // Estados para QR Code PIX do depósito
  const [pixQrCode, setPixQrCode] = useState('');
  const [pixCode, setPixCode] = useState('');
  const [showPixDialog, setShowPixDialog] = useState(false);
  
  const [bankAccountForm, setBankAccountForm] = useState({
    bank: '',
    agency: '',
    account: '',
    accountDigit: '',
    cpfCnpj: '',
    name: '',
  });

  useEffect(() => {
    loadBalance();
    loadTransactions();
  }, []);

  const loadBalance = async () => {
    try {
      const response = await api.getBalance();
      if (response.success) {
        setBalance(response.balance);
      }
    } catch (error: any) {
      console.error('Erro ao carregar saldo:', error);
    }
  };

  const loadTransactions = async () => {
    try {
      const response = await api.getTransactions(50);
      if (response.success) {
        setTransactions(response.transactions);
      }
    } catch (error: any) {
      console.error('Erro ao carregar transações:', error);
    }
  };

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleDeposit = async () => {
    const amount = parseFloat(depositAmount);
    
    if (isNaN(amount) || amount <= 0) {
      showSnackbar('Valor inválido', 'error');
      return;
    }

    if (amount < 10) {
      showSnackbar('Valor mínimo para depósito: R$ 10,00', 'error');
      return;
    }

    try {
      showSnackbar('Gerando QR Code PIX...', 'success');
      
      const response = await api.deposit(amount, 'Depósito via plataforma') as any;
      
      // Verificar se a resposta contém dados do PIX
      if (response.pix && response.pix.payload && response.pix.encodedImage) {
        setPixCode(response.pix.payload);
        setPixQrCode(response.pix.encodedImage);
        setOpenDepositDialog(false);
        setShowPixDialog(true);
        
        showSnackbar('QR Code PIX gerado! Aguardando pagamento...', 'success');
      } else {
        // Fallback caso o backend ainda não esteja retornando PIX
        showSnackbar('⚠️ Depósito simulado! QR Code PIX será implementado em breve', 'success');
        setOpenDepositDialog(false);
        setDepositAmount('');
        loadBalance();
        loadTransactions();
      }
    } catch (error: any) {
      showSnackbar(error.message || 'Erro ao gerar QR Code PIX', 'error');
    }
  };

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    
    if (isNaN(amount) || amount <= 0) {
      showSnackbar('Valor inválido', 'error');
      return;
    }

    if (amount > balance.available) {
      showSnackbar('Saldo insuficiente', 'error');
      return;
    }

    // Validar campos bancários
    const { bank, agency, account, accountDigit, cpfCnpj, name } = bankAccountForm;
    if (!bank || !agency || !account || !accountDigit || !cpfCnpj || !name) {
      showSnackbar('Preencha todos os dados bancários', 'error');
      return;
    }

    try {
      await api.withdraw(amount, bankAccountForm);
      showSnackbar('Saque solicitado com sucesso!', 'success');
      setOpenWithdrawDialog(false);
      setWithdrawAmount('');
      setBankAccountForm({
        bank: '',
        agency: '',
        account: '',
        accountDigit: '',
        cpfCnpj: '',
        name: '',
      });
      loadBalance();
      loadTransactions();
    } catch (error: any) {
      showSnackbar(error.message || 'Erro ao solicitar saque', 'error');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'pending':
        return 'warning';
      case 'failed':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Concluído';
      case 'pending':
        return 'Pendente';
      case 'failed':
        return 'Falhou';
      case 'cancelled':
        return 'Cancelado';
      default:
        return status;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'deposit':
        return 'Depósito';
      case 'withdraw':
        return 'Saque';
      case 'payment_received':
        return 'Pagamento Recebido';
      case 'payment_sent':
        return 'Pagamento Enviado';
      case 'fee':
        return 'Taxa';
      case 'refund':
        return 'Reembolso';
      default:
        return type;
    }
  };

  return (
    <>
      <Header />
      <Box sx={{ minHeight: '100vh', backgroundColor: '#fafafa' }}>
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            💰 Financeiro
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            Gerencie seu saldo e transações
          </Typography>

          {/* Cards de Saldo */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 3, mb: 4 }}>
            <Card sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <AccountBalanceIcon sx={{ color: 'white', mr: 1 }} />
                  <Typography color="white" variant="body2">
                    Saldo Disponível
                  </Typography>
                </Box>
                <Typography variant="h4" component="div" sx={{ color: 'white', mb: 2 }}>
                  R$ {balance.available.toFixed(2)}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="contained"
                    size="small"
                    onClick={() => setOpenDepositDialog(true)}
                    sx={{ bgcolor: 'rgba(255,255,255,0.2)', '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' } }}
                  >
                    Depositar
                  </Button>
                  <Button
                    variant="contained"
                    size="small"
                    onClick={() => setOpenWithdrawDialog(true)}
                    sx={{ bgcolor: 'rgba(255,255,255,0.2)', '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' } }}
                  >
                    Sacar
                  </Button>
                </Box>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <TrendingUpIcon sx={{ color: '#ff9800', mr: 1 }} />
                  <Typography color="textSecondary" variant="body2">
                    Saldo Pendente
                  </Typography>
                </Box>
                <Typography variant="h4" component="div" sx={{ color: '#ff9800' }}>
                  R$ {balance.pending.toFixed(2)}
                </Typography>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <MoneyIcon sx={{ color: '#4caf50', mr: 1 }} />
                  <Typography color="textSecondary" variant="body2">
                    Saldo Total
                  </Typography>
                </Box>
                <Typography variant="h4" component="div" sx={{ color: '#4caf50' }}>
                  R$ {balance.total.toFixed(2)}
                </Typography>
              </CardContent>
            </Card>
          </Box>

          {/* Tabela de Transações */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Histórico de Transações
              </Typography>
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
                    {transactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell>{new Date(transaction.createdAt).toLocaleDateString('pt-BR')}</TableCell>
                        <TableCell>{getTypeLabel(transaction.type)}</TableCell>
                        <TableCell>{transaction.description}</TableCell>
                        <TableCell align="right" sx={{ color: transaction.amount >= 0 ? 'success.main' : 'error.main' }}>
                          {transaction.amount >= 0 ? '+' : ''} R$ {Math.abs(transaction.amount).toFixed(2)}
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={getStatusLabel(transaction.status)}
                            color={getStatusColor(transaction.status) as any}
                            size="small"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {transactions.length === 0 && (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    Nenhuma transação registrada
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Container>
      </Box>

      {/* Dialog Depósito */}
      <Dialog open={openDepositDialog} onClose={() => setOpenDepositDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Realizar Depósito</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <TextField
              label="Valor (R$)"
              type="number"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              fullWidth
              inputProps={{ step: '0.01', min: '0' }}
              placeholder="0,00"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDepositDialog(false)}>Cancelar</Button>
          <Button onClick={handleDeposit} variant="contained">
            Depositar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Saque */}
      <Dialog open={openWithdrawDialog} onClose={() => setOpenWithdrawDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Solicitar Saque</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <Alert severity="info">
              Saldo disponível para saque: <strong>R$ {balance.available.toFixed(2)}</strong>
            </Alert>
            
            <TextField
              label="Valor (R$)"
              type="number"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              fullWidth
              inputProps={{ step: '0.01', min: '0', max: balance.available }}
              placeholder="0,00"
            />

            <Typography variant="subtitle2" sx={{ mt: 1 }}>
              Dados Bancários
            </Typography>

            <TextField
              label="Banco"
              select
              value={bankAccountForm.bank}
              onChange={(e) => setBankAccountForm({ ...bankAccountForm, bank: e.target.value })}
              fullWidth
            >
              <MenuItem value="001">001 - Banco do Brasil</MenuItem>
              <MenuItem value="237">237 - Bradesco</MenuItem>
              <MenuItem value="104">104 - Caixa Econômica</MenuItem>
              <MenuItem value="341">341 - Itaú</MenuItem>
              <MenuItem value="033">033 - Santander</MenuItem>
              <MenuItem value="260">260 - Nubank</MenuItem>
              <MenuItem value="077">077 - Inter</MenuItem>
            </TextField>

            <TextField
              label="Agência"
              value={bankAccountForm.agency}
              onChange={(e) => setBankAccountForm({ ...bankAccountForm, agency: e.target.value })}
              fullWidth
              placeholder="0000"
            />

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Conta"
                value={bankAccountForm.account}
                onChange={(e) => setBankAccountForm({ ...bankAccountForm, account: e.target.value })}
                fullWidth
                placeholder="000000"
              />
              <TextField
                label="Dígito"
                value={bankAccountForm.accountDigit}
                onChange={(e) => setBankAccountForm({ ...bankAccountForm, accountDigit: e.target.value })}
                sx={{ width: '100px' }}
                placeholder="0"
              />
            </Box>

            <TextField
              label="CPF/CNPJ do Titular"
              value={bankAccountForm.cpfCnpj}
              onChange={(e) => setBankAccountForm({ ...bankAccountForm, cpfCnpj: e.target.value })}
              fullWidth
              placeholder="000.000.000-00"
            />

            <TextField
              label="Nome do Titular"
              value={bankAccountForm.name}
              onChange={(e) => setBankAccountForm({ ...bankAccountForm, name: e.target.value })}
              fullWidth
              placeholder="Nome completo"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenWithdrawDialog(false)}>Cancelar</Button>
          <Button onClick={handleWithdraw} variant="contained">
            Solicitar Saque
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Dialog PIX QR Code */}
      <Dialog 
        open={showPixDialog} 
        onClose={() => {
          setShowPixDialog(false);
          setDepositAmount('');
          loadBalance();
          loadTransactions();
        }} 
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle sx={{ textAlign: 'center', pb: 1 }}>
          Pague com PIX
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, py: 2 }}>
            <Alert severity="info" sx={{ width: '100%' }}>
              Escaneie o QR Code ou copie o código PIX para realizar o pagamento
            </Alert>

            {pixQrCode && (
              <Box 
                component="img" 
                src={`data:image/png;base64,${pixQrCode}`}
                alt="QR Code PIX"
                sx={{ 
                  width: 250, 
                  height: 250, 
                  border: '1px solid #e0e0e0',
                  borderRadius: 2,
                  p: 1
                }}
              />
            )}

            {pixCode && (
              <TextField
                label="Código PIX Copia e Cola"
                value={pixCode}
                fullWidth
                multiline
                rows={3}
                InputProps={{
                  readOnly: true,
                  endAdornment: (
                    <Button 
                      onClick={() => {
                        navigator.clipboard.writeText(pixCode);
                        showSnackbar('Código PIX copiado!', 'success');
                      }}
                      size="small"
                    >
                      Copiar
                    </Button>
                  ),
                }}
              />
            )}

            <Alert severity="warning" sx={{ width: '100%' }}>
              Seu saldo será atualizado automaticamente após a confirmação do pagamento
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => {
              setShowPixDialog(false);
              setDepositAmount('');
              loadBalance();
              loadTransactions();
            }}
            variant="outlined"
          >
            Fechar
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default Finances;
