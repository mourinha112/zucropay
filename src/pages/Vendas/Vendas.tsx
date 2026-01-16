import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  TextField,
  MenuItem,
  Stack,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Card,
  CardContent,
} from '@mui/material';
import {
  Visibility,
  Refresh,
  FilterList,
  TrendingUp as TrendingUpIcon,
  AccountBalance as AccountBalanceIcon,
  Receipt as ReceiptIcon,
} from '@mui/icons-material';
import Header from '../../components/Header/Header';

const API_URL = import.meta.env.VITE_API_URL || '';

interface Sale {
  id: number;
  efi_txid?: string;       // Para PIX
  efi_charge_id?: string;  // Para cartão/boleto
  customer_name: string;
  customer_email: string;
  customer_cpf: string;
  value: number;
  net_value: number;
  billing_type: string;
  status: string;
  payment_date: string | null;
  due_date: string;
  description: string;
  created_at: string;
}

interface Stats {
  total: number;
  confirmed: number;
  pending: number;
  totalValue: number;
  totalNetValue: number;
}

const Vendas: React.FC = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [_stats, setStats] = useState<Stats>({ total: 0, confirmed: 0, pending: 0, totalValue: 0, totalNetValue: 0 });
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState('ALL');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    loadSales();
  }, [filterStatus]);

  const loadSales = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('zucropay_token');
      const params = new URLSearchParams();
      if (filterStatus !== 'ALL') params.append('filter', filterStatus);
      
      const response = await fetch(`${API_URL}/api/vendas-data?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      const result = await response.json();
      
      if (result.success) {
        setSales(result.payments || []);
        setStats(result.stats || { total: 0, confirmed: 0, pending: 0, totalValue: 0, totalNetValue: 0 });
      }
    } catch (error) {
      console.error('Erro ao carregar vendas:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'RECEIVED':
      case 'CONFIRMED':
        return 'success';
      case 'PENDING':
        return 'warning';
      case 'OVERDUE':
        return 'error';
      case 'REFUNDED':
        return 'default';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      PENDING: 'Pendente',
      RECEIVED: 'Recebido',
      CONFIRMED: 'Confirmado',
      OVERDUE: 'Vencido',
      REFUNDED: 'Estornado',
    };
    return labels[status] || status;
  };

  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      PIX: 'PIX',
      CREDIT_CARD: 'Cartão de Crédito',
      BOLETO: 'Boleto',
      UNDEFINED: 'Não definido',
    };
    return labels[method] || method;
  };

  const formatCurrency = (value: number | string) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(numValue);
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

  const filteredSales = sales.filter((sale) => {
    if (filterStatus !== 'ALL' && sale.status !== filterStatus) return false;
    if (filterPaymentMethod !== 'ALL' && sale.billing_type !== filterPaymentMethod) return false;
    return true;
  });

  // Calcular totais apenas de vendas CONFIRMADAS/RECEBIDAS (não pendentes)
  const confirmedSales = filteredSales.filter(sale => 
    sale.status === 'RECEIVED' || sale.status === 'CONFIRMED'
  );
  
  const totalValue = confirmedSales.reduce((sum, sale) => sum + parseFloat(String(sale.value || 0)), 0);
  const totalNetValue = confirmedSales.reduce((sum, sale) => sum + parseFloat(String(sale.net_value || sale.value || 0)), 0);

  const handleViewDetails = (sale: Sale) => {
    setSelectedSale(sale);
    setDetailsOpen(true);
  };

  return (
    <>
      <Header />
      <Box sx={{ minHeight: '100vh', backgroundColor: '#fafafa', py: 4 }}>
        <Container maxWidth="lg">
          {/* Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
            <Box>
              <Typography variant="h4" component="h1" gutterBottom>
                💰 Vendas
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Gerencie todas as suas vendas e pagamentos
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<Refresh />}
              onClick={loadSales}
              disabled={loading}
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                },
              }}
            >
              Atualizar
            </Button>
          </Box>

          {/* Cards de Estatísticas */}
          <Box
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              mb: 4,
            }}
          >
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <TrendingUpIcon sx={{ color: '#667eea', mr: 1 }} />
                  <Typography variant="body2" color="text.secondary">
                    Total em Vendas (Confirmadas)
                  </Typography>
                </Box>
                <Typography variant="h5" fontWeight={600} color="primary.main">
                  {formatCurrency(totalValue)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {confirmedSales.length} vendas confirmadas
                </Typography>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <AccountBalanceIcon sx={{ color: '#10b981', mr: 1 }} />
                  <Typography variant="body2" color="text.secondary">
                    Total Líquido (Após taxas)
                  </Typography>
                </Box>
                <Typography variant="h5" fontWeight={600} sx={{ color: '#10b981' }}>
                  {formatCurrency(totalNetValue)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Disponível para saque
                </Typography>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <ReceiptIcon sx={{ color: '#f59e0b', mr: 1 }} />
                  <Typography variant="body2" color="text.secondary">
                    Total de Transações
                  </Typography>
                </Box>
                <Typography variant="h5" fontWeight={600}>
                  {filteredSales.length}
                </Typography>
              </CardContent>
            </Card>
          </Box>

          {/* Filtros */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                <FilterList sx={{ color: '#667eea' }} />
                <Typography variant="subtitle2" fontWeight={600}>
                  Filtros:
                </Typography>
                <TextField
                  select
                  label="Status"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  size="small"
                  sx={{ minWidth: 180 }}
                >
                  <MenuItem value="ALL">Todos os Status</MenuItem>
                  <MenuItem value="PENDING">Pendente</MenuItem>
                  <MenuItem value="RECEIVED">Recebido</MenuItem>
                  <MenuItem value="CONFIRMED">Confirmado</MenuItem>
                  <MenuItem value="OVERDUE">Vencido</MenuItem>
                  <MenuItem value="REFUNDED">Estornado</MenuItem>
                </TextField>

                <TextField
                  select
                  label="Método de Pagamento"
                  value={filterPaymentMethod}
                  onChange={(e) => setFilterPaymentMethod(e.target.value)}
                  size="small"
                  sx={{ minWidth: 200 }}
                >
                  <MenuItem value="ALL">Todos os Métodos</MenuItem>
                  <MenuItem value="PIX">PIX</MenuItem>
                  <MenuItem value="CREDIT_CARD">Cartão de Crédito</MenuItem>
                  <MenuItem value="BOLETO">Boleto</MenuItem>
                </TextField>
              </Box>
            </CardContent>
          </Card>

          {/* Tabela */}
          <Card>
            <TableContainer>
              <Table>
                <TableHead sx={{ bgcolor: '#f9fafb' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Data</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Cliente</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Descrição</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Método</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>Valor</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>Líquido</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600 }}>Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                    <Typography>Carregando...</Typography>
                  </TableCell>
                </TableRow>
              ) : filteredSales.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">
                      Nenhuma venda encontrada
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredSales.map((sale) => (
                  <TableRow key={sale.id} hover>
                    <TableCell>
                      {formatDate(sale.created_at)}
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" fontWeight={500}>
                          {sale.customer_name || 'Sem nome'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {sale.customer_email || 'Sem email'}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {sale.description || 'Produto sem descrição'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getPaymentMethodLabel(sale.billing_type)}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Typography fontWeight={500}>
                        {formatCurrency(sale.value)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography color="success.main" fontWeight={500}>
                        {formatCurrency(sale.net_value || sale.value)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getStatusLabel(sale.status)}
                        color={getStatusColor(sale.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="Ver detalhes">
                        <IconButton
                          size="small"
                          onClick={() => handleViewDetails(sale)}
                        >
                          <Visibility fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
          </Card>

        {/* Dialog de Detalhes - Compacto */}
        <Dialog
          open={detailsOpen}
          onClose={() => setDetailsOpen(false)}
          maxWidth="xs"
          fullWidth
          PaperProps={{ sx: { borderRadius: 2, maxWidth: 380 } }}
        >
          <DialogTitle sx={{ py: 1.5, fontSize: '1rem', fontWeight: 600 }}>
            Detalhes da Venda
          </DialogTitle>
          <DialogContent sx={{ p: 2 }}>
              {selectedSale && (
              <Stack spacing={1.5}>
                <Box sx={{ p: 1, bgcolor: '#f8fafc', borderRadius: 1 }}>
                  <Typography variant="caption" color="text.secondary">ID</Typography>
                  <Typography variant="caption" display="block" fontFamily="monospace" sx={{ fontSize: '0.7rem' }}>
                    {(selectedSale.efi_txid || selectedSale.efi_charge_id || selectedSale.id).substring(0, 20)}...
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary">Cliente</Typography>
                  <Typography variant="body2" fontWeight={500}>{selectedSale.customer_name || 'Sem nome'}</Typography>
                  <Typography variant="caption" color="text.secondary" display="block">{selectedSale.customer_email || 'Sem email'}</Typography>
                  {selectedSale.customer_cpf && (
                    <Typography variant="caption" color="text.secondary" display="block">CPF: {selectedSale.customer_cpf}</Typography>
                  )}
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary">Produto</Typography>
                  <Typography variant="body2" fontWeight={500}>{selectedSale.description || 'Sem descrição'}</Typography>
                </Box>

                <Stack direction="row" spacing={1.5}>
                  <Box flex={1} sx={{ p: 1, bgcolor: '#fafafa', borderRadius: 1, textAlign: 'center' }}>
                    <Typography variant="caption" color="text.secondary">Bruto</Typography>
                    <Typography variant="body2" fontWeight={600}>{formatCurrency(selectedSale.value)}</Typography>
                  </Box>
                  <Box flex={1} sx={{ p: 1, bgcolor: '#f0fdf4', borderRadius: 1, textAlign: 'center' }}>
                    <Typography variant="caption" color="text.secondary">Líquido</Typography>
                    <Typography variant="body2" fontWeight={600} color="success.main">{formatCurrency(selectedSale.net_value || selectedSale.value)}</Typography>
                  </Box>
                </Stack>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="caption" color="text.secondary">Status:</Typography>
                  <Chip label={getStatusLabel(selectedSale.status)} color={getStatusColor(selectedSale.status)} size="small" />
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Método de Pagamento
                  </Typography>
                  <Typography variant="body2">
                    {getPaymentMethodLabel(selectedSale.billing_type)}
                  </Typography>
                </Box>

                <Stack direction="row" spacing={2}>
                  <Box flex={1}>
                    <Typography variant="caption" color="text.secondary">
                      Data de Criação
                    </Typography>
                    <Typography variant="body2">
                      {formatDate(selectedSale.created_at)}
                    </Typography>
                  </Box>
                  {selectedSale.payment_date && (
                    <Box flex={1}>
                      <Typography variant="caption" color="text.secondary">
                        Data do Pagamento
                      </Typography>
                      <Typography variant="body2">
                        {formatDate(selectedSale.payment_date)}
                      </Typography>
                    </Box>
                  )}
                </Stack>
              </Stack>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDetailsOpen(false)}>
              Fechar
            </Button>
          </DialogActions>
        </Dialog>
        </Container>
      </Box>
    </>
  );
};

export default Vendas;
