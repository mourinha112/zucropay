import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  TextField,
  Grid,
  Avatar,
  Chip,
  IconButton,
  Alert,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  InputAdornment,
  Tooltip,
} from '@mui/material';
import {
  Share as ShareIcon,
  ContentCopy as CopyIcon,
  WhatsApp as WhatsAppIcon,
  Email as EmailIcon,
  Facebook as FacebookIcon,
  Twitter as TwitterIcon,
  PersonAdd as PersonAddIcon,
  EmojiEvents as TrophyIcon,
  AccountBalanceWallet as WalletIcon,
  TrendingUp as TrendingUpIcon,
  CheckCircle as CheckCircleIcon,
  Pending as PendingIcon,
} from '@mui/icons-material';
import Header from '../../components/Header/Header';

interface Referral {
  id: number;
  name: string;
  email: string;
  status: 'pending' | 'active' | 'completed';
  signupDate: string;
  commission: number;
  transactions: number;
}

const Indique: React.FC = () => {
  const [referralCode] = useState('ZUCRO2025');
  const [referralLink, setReferralLink] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  
  // Stats
  const [stats] = useState({
    totalReferrals: 12,
    activeReferrals: 8,
    totalEarnings: 1850.50,
    pendingEarnings: 320.00,
    nextReward: 5000,
    currentProgress: 37,
  });

  // Referrals list
  const [referrals] = useState<Referral[]>([
    {
      id: 1,
      name: 'João Silva',
      email: 'joao@email.com',
      status: 'active',
      signupDate: '2025-10-01',
      commission: 250.00,
      transactions: 15,
    },
    {
      id: 2,
      name: 'Maria Santos',
      email: 'maria@email.com',
      status: 'completed',
      signupDate: '2025-09-15',
      commission: 580.50,
      transactions: 42,
    },
    {
      id: 3,
      name: 'Pedro Oliveira',
      email: 'pedro@email.com',
      status: 'pending',
      signupDate: '2025-10-10',
      commission: 0,
      transactions: 0,
    },
  ]);

  useEffect(() => {
    // Gerar link de referral
    const baseUrl = window.location.origin;
    setReferralLink(`${baseUrl}/register?ref=${referralCode}`);
  }, [referralCode]);

  const showSnackbar = (message: string, severity: 'success' | 'error' = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink);
    showSnackbar('Link copiado para a área de transferência!');
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(referralCode);
    showSnackbar('Código copiado!');
  };

  const handleShareWhatsApp = () => {
    const message = encodeURIComponent(
      `🚀 Conheça o ZucroPay - Gateway de Pagamentos!\n\n` +
      `Use meu código de indicação: ${referralCode}\n` +
      `Link: ${referralLink}\n\n` +
      `Ganhe benefícios exclusivos ao se cadastrar!`
    );
    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  const handleShareEmail = () => {
    const subject = encodeURIComponent('Indicação ZucroPay - Gateway de Pagamentos');
    const body = encodeURIComponent(
      `Olá!\n\n` +
      `Estou usando o ZucroPay e recomendo para você também!\n\n` +
      `Use meu código de indicação: ${referralCode}\n` +
      `Link de cadastro: ${referralLink}\n\n` +
      `Benefícios ao se cadastrar:\n` +
      `✅ Taxa zero nos primeiros 30 dias\n` +
      `✅ R$50 em créditos\n` +
      `✅ Suporte prioritário\n\n` +
      `Abraços!`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const handleShareFacebook = () => {
    const url = encodeURIComponent(referralLink);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
  };

  const handleShareTwitter = () => {
    const text = encodeURIComponent(
      `Estou usando o ZucroPay! Use meu código ${referralCode} e ganhe benefícios exclusivos 🚀`
    );
    const url = encodeURIComponent(referralLink);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'completed':
        return 'primary';
      case 'pending':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'Ativo';
      case 'completed':
        return 'Completo';
      case 'pending':
        return 'Pendente';
      default:
        return status;
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5' }}>
      <Header />
      
      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Hero Section */}
        <Box
          sx={{
            background: 'linear-gradient(135deg, #651BE5 0%, #380F7F 100%)',
            borderRadius: 4,
            p: 4,
            mb: 4,
            color: 'white',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              top: -50,
              right: -50,
              width: 200,
              height: 200,
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.1)',
              filter: 'blur(40px)',
            }}
          />
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={8}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <TrophyIcon sx={{ fontSize: 48 }} />
                <Typography variant="h3" fontWeight={800}>
                  Programa de Indicação
                </Typography>
              </Box>
              <Typography variant="h6" sx={{ mb: 3, opacity: 0.9 }}>
                Ganhe até <strong>R$ 100</strong> por indicação! Convide amigos e ganhe recompensas a cada cadastro e transação realizada.
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Chip
                  icon={<CheckCircleIcon />}
                  label="R$ 50 por cadastro"
                  sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', fontWeight: 600 }}
                />
                <Chip
                  icon={<CheckCircleIcon />}
                  label="5% das transações"
                  sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', fontWeight: 600 }}
                />
                <Chip
                  icon={<CheckCircleIcon />}
                  label="Sem limite de indicações"
                  sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', fontWeight: 600 }}
                />
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card sx={{ bgcolor: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(10px)' }}>
                <CardContent>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Seu Código de Indicação
                  </Typography>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      p: 2,
                      bgcolor: '#f5f5f5',
                      borderRadius: 2,
                      mb: 2,
                    }}
                  >
                    <Typography
                      variant="h4"
                      fontWeight={800}
                      sx={{
                        flex: 1,
                        letterSpacing: 2,
                        background: 'linear-gradient(135deg, #651BE5 0%, #380F7F 100%)',
                        backgroundClip: 'text',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                      }}
                    >
                      {referralCode}
                    </Typography>
                    <Tooltip title="Copiar código">
                      <IconButton onClick={handleCopyCode} size="small">
                        <CopyIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  <Button
                    variant="contained"
                    fullWidth
                    startIcon={<ShareIcon />}
                    onClick={handleCopyLink}
                    sx={{
                      background: 'linear-gradient(135deg, #651BE5 0%, #380F7F 100%)',
                      fontWeight: 600,
                    }}
                  >
                    Copiar Link
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>

        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: '#651BE5', width: 56, height: 56 }}>
                    <PersonAddIcon fontSize="large" />
                  </Avatar>
                  <Box>
                    <Typography variant="h4" fontWeight={800}>
                      {stats.totalReferrals}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total de Indicações
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: '#10b981', width: 56, height: 56 }}>
                    <CheckCircleIcon fontSize="large" />
                  </Avatar>
                  <Box>
                    <Typography variant="h4" fontWeight={800}>
                      {stats.activeReferrals}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Indicações Ativas
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: '#f59e0b', width: 56, height: 56 }}>
                    <WalletIcon fontSize="large" />
                  </Avatar>
                  <Box>
                    <Typography variant="h4" fontWeight={800}>
                      R$ {stats.totalEarnings.toFixed(2)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Ganho
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: '#8b5cf6', width: 56, height: 56 }}>
                    <TrendingUpIcon fontSize="large" />
                  </Avatar>
                  <Box>
                    <Typography variant="h4" fontWeight={800}>
                      R$ {stats.pendingEarnings.toFixed(2)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Ganhos Pendentes
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Grid container spacing={3}>
          {/* Compartilhar */}
          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" fontWeight={700} gutterBottom>
                  Compartilhar Link
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Escolha como deseja compartilhar seu link de indicação
                </Typography>

                <TextField
                  fullWidth
                  value={referralLink}
                  InputProps={{
                    readOnly: true,
                    endAdornment: (
                      <InputAdornment position="end">
                        <Tooltip title="Copiar link">
                          <IconButton onClick={handleCopyLink} edge="end">
                            <CopyIcon />
                          </IconButton>
                        </Tooltip>
                      </InputAdornment>
                    ),
                  }}
                  sx={{ mb: 3 }}
                />

                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Compartilhar via:
                </Typography>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<WhatsAppIcon />}
                    onClick={handleShareWhatsApp}
                    sx={{
                      borderColor: '#25D366',
                      color: '#25D366',
                      '&:hover': {
                        borderColor: '#25D366',
                        bgcolor: 'rgba(37, 211, 102, 0.1)',
                      },
                    }}
                  >
                    WhatsApp
                  </Button>

                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<EmailIcon />}
                    onClick={handleShareEmail}
                    sx={{
                      borderColor: '#6366f1',
                      color: '#6366f1',
                      '&:hover': {
                        borderColor: '#6366f1',
                        bgcolor: 'rgba(99, 102, 241, 0.1)',
                      },
                    }}
                  >
                    Email
                  </Button>

                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<FacebookIcon />}
                    onClick={handleShareFacebook}
                    sx={{
                      borderColor: '#1877F2',
                      color: '#1877F2',
                      '&:hover': {
                        borderColor: '#1877F2',
                        bgcolor: 'rgba(24, 119, 242, 0.1)',
                      },
                    }}
                  >
                    Facebook
                  </Button>

                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<TwitterIcon />}
                    onClick={handleShareTwitter}
                    sx={{
                      borderColor: '#1DA1F2',
                      color: '#1DA1F2',
                      '&:hover': {
                        borderColor: '#1DA1F2',
                        bgcolor: 'rgba(29, 161, 242, 0.1)',
                      },
                    }}
                  >
                    Twitter
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Como Funciona & Recompensas */}
          <Grid item xs={12} md={8}>
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" fontWeight={700} gutterBottom>
                  Como Funciona
                </Typography>
                <Grid container spacing={3} sx={{ mt: 1 }}>
                  <Grid item xs={12} sm={4}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Avatar
                        sx={{
                          width: 64,
                          height: 64,
                          bgcolor: '#651BE5',
                          margin: '0 auto',
                          mb: 2,
                        }}
                      >
                        <Typography variant="h5" fontWeight={700}>
                          1
                        </Typography>
                      </Avatar>
                      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                        Compartilhe
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Envie seu link de indicação para amigos e conhecidos
                      </Typography>
                    </Box>
                  </Grid>

                  <Grid item xs={12} sm={4}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Avatar
                        sx={{
                          width: 64,
                          height: 64,
                          bgcolor: '#651BE5',
                          margin: '0 auto',
                          mb: 2,
                        }}
                      >
                        <Typography variant="h5" fontWeight={700}>
                          2
                        </Typography>
                      </Avatar>
                      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                        Eles se Cadastram
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Seus amigos criam conta usando seu código
                      </Typography>
                    </Box>
                  </Grid>

                  <Grid item xs={12} sm={4}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Avatar
                        sx={{
                          width: 64,
                          height: 64,
                          bgcolor: '#651BE5',
                          margin: '0 auto',
                          mb: 2,
                        }}
                      >
                        <Typography variant="h5" fontWeight={700}>
                          3
                        </Typography>
                      </Avatar>
                      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                        Você Ganha
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Receba R$50 + 5% das transações deles
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Próxima Recompensa */}
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Box>
                    <Typography variant="h6" fontWeight={700}>
                      Próxima Recompensa
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Faltam R$ {(stats.nextReward - stats.totalEarnings).toFixed(2)} para desbloquear
                    </Typography>
                  </Box>
                  <Chip
                    icon={<TrophyIcon />}
                    label="Bônus R$ 500"
                    color="warning"
                    sx={{ fontWeight: 700, fontSize: '1rem', py: 3 }}
                  />
                </Box>

                <LinearProgress
                  variant="determinate"
                  value={stats.currentProgress}
                  sx={{
                    height: 12,
                    borderRadius: 6,
                    bgcolor: '#e5e7eb',
                    '& .MuiLinearProgress-bar': {
                      background: 'linear-gradient(90deg, #651BE5 0%, #380F7F 100%)',
                      borderRadius: 6,
                    },
                  }}
                />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    R$ {stats.totalEarnings.toFixed(2)}
                  </Typography>
                  <Typography variant="caption" fontWeight={700}>
                    {stats.currentProgress}%
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    R$ {stats.nextReward.toFixed(2)}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Lista de Indicações */}
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="h6" fontWeight={700} gutterBottom>
              Suas Indicações
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Nome</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Data de Cadastro</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Transações</TableCell>
                    <TableCell align="right">Comissão</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {referrals.map((referral) => (
                    <TableRow key={referral.id}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar sx={{ bgcolor: '#651BE5', width: 32, height: 32, fontSize: 14 }}>
                            {referral.name.charAt(0)}
                          </Avatar>
                          {referral.name}
                        </Box>
                      </TableCell>
                      <TableCell>{referral.email}</TableCell>
                      <TableCell>
                        {new Date(referral.signupDate).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={getStatusLabel(referral.status)}
                          color={getStatusColor(referral.status)}
                          size="small"
                          icon={
                            referral.status === 'active' ? (
                              <CheckCircleIcon />
                            ) : referral.status === 'pending' ? (
                              <PendingIcon />
                            ) : undefined
                          }
                        />
                      </TableCell>
                      <TableCell align="right">{referral.transactions}</TableCell>
                      <TableCell align="right">
                        <Typography
                          variant="body2"
                          fontWeight={700}
                          color={referral.commission > 0 ? '#10b981' : 'text.secondary'}
                        >
                          R$ {referral.commission.toFixed(2)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {referrals.length === 0 && (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <PersonAddIcon sx={{ fontSize: 64, color: '#cbd5e1', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  Nenhuma indicação ainda
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Comece a compartilhar seu link e ganhe recompensas!
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      </Container>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
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
    </Box>
  );
};

export default Indique;
