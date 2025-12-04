import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
} from '@mui/material';
import {
  AccountBalance as AccountBalanceIcon,
  TrendingUp as TrendingUpIcon,
  ArrowUpward as ArrowUpIcon,
  ArrowDownward as ArrowDownIcon,
  AttachMoney as MoneyIcon,
  Receipt as ReceiptIcon,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import Header from '../../components/Header/Header';

// Mock data for the chart
const chartData = [
  { date: '01/07', receitas: 4000, despesas: 2400 },
  { date: '02/07', receitas: 3000, despesas: 1398 },
  { date: '03/07', receitas: 2000, despesas: 9800 },
  { date: '04/07', receitas: 2780, despesas: 3908 },
  { date: '05/07', receitas: 1890, despesas: 4800 },
  { date: '06/07', receitas: 2390, despesas: 3800 },
  { date: '07/07', receitas: 3490, despesas: 4300 },
];

// Mock data for transactions
const transactions = [
  {
    id: 1,
    description: 'Venda #1234',
    date: '07/07/2023',
    amount: 1500.00,
    type: 'receita',
    status: 'completed',
  },
  {
    id: 2,
    description: 'Fornecedor ABC',
    date: '06/07/2023',
    amount: -450.00,
    type: 'despesa',
    status: 'completed',
  },
  {
    id: 3,
    description: 'Venda #1235',
    date: '06/07/2023',
    amount: 2300.00,
    type: 'receita',
    status: 'pending',
  },
  {
    id: 4,
    description: 'Serviço de Marketing',
    date: '05/07/2023',
    amount: -800.00,
    type: 'despesa',
    status: 'completed',
  },
  {
    id: 5,
    description: 'Venda #1236',
    date: '05/07/2023',
    amount: 1750.00,
    type: 'receita',
    status: 'completed',
  },
];

const FinanceCard = ({ title, value, icon, color, trend, trendValue }: any) => (
  <Card
    sx={{
      height: '100%',
      transition: 'transform 0.2s',
      '&:hover': {
        transform: 'translateY(-4px)',
        boxShadow: 3,
      },
    }}
  >
    <CardContent>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <Box sx={{ mr: 1, color: '#666' }}>{icon}</Box>
        <Typography color="textSecondary" variant="body2">
          {title}
        </Typography>
        {trend && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              ml: 'auto',
              color: trend === 'up' ? 'success.main' : 'error.main',
              fontSize: '0.875rem',
            }}
          >
            {trend === 'up' ? <ArrowUpIcon fontSize="small" /> : <ArrowDownIcon fontSize="small" />}
            <Typography variant="body2" sx={{ ml: 0.5 }}>
              {trendValue}%
            </Typography>
          </Box>
        )}
      </Box>
      <Typography
        variant="h4"
        component="div"
        sx={{ color: color || '#5818C8' }}
      >
        {value}
      </Typography>
    </CardContent>
  </Card>
);

const Finances: React.FC = () => {
  const [timeRange, setTimeRange] = useState(0);

  const handleTimeRangeChange = (event: React.SyntheticEvent, newValue: number) => {
    setTimeRange(newValue);
  };

  return (
    <>
      <Header />
      <Box sx={{ minHeight: '100vh', backgroundColor: '#fafafa' }}>
        <Box
          sx={{
            maxWidth: '1400px',
            margin: '0 auto',
            p: { xs: 2, sm: 3 },
          }}
        >
          {/* Finance Cards */}
          <Box
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              mb: 4,
            }}
          >
            <FinanceCard
              title="Saldo Disponível"
              value="R$ 25.400,00"
              icon={<AccountBalanceIcon />}
            />
            <FinanceCard
              title="Total de Receitas no Mês"
              value="R$ 32.800,00"
              icon={<TrendingUpIcon />}
              color="#4CAF50"
              trend="up"
              trendValue="12"
            />
            <FinanceCard
              title="Total de Despesas no Mês"
              value="R$ 7.400,00"
              icon={<MoneyIcon />}
              color="#f44336"
              trend="down"
              trendValue="5"
            />
            <FinanceCard
              title="Faturas Pendentes"
              value="R$ 3.200,00"
              icon={<ReceiptIcon />}
              color="#FF9800"
            />
          </Box>

          {/* Chart Section */}
          <Card sx={{ mb: 4 }}>
            <CardContent>
              <Typography variant="h6" color="primary" gutterBottom>
                Fluxo de Caixa
              </Typography>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Acompanhe suas receitas e despesas ao longo do tempo
              </Typography>
              <Tabs value={timeRange} onChange={handleTimeRangeChange} sx={{ mb: 2 }}>
                <Tab label="7 dias" />
                <Tab label="15 dias" />
                <Tab label="30 dias" />
                <Tab label="90 dias" />
              </Tabs>
              <Box sx={{ height: 300, width: '100%' }}>
                <ResponsiveContainer>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="receitas"
                      stroke="#4CAF50"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="despesas"
                      stroke="#f44336"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>

          {/* Transactions Table */}
          <Card sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6">Últimas Transações</Typography>
              <Button variant="outlined" color="primary">
                Ver Todas
              </Button>
            </Box>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Descrição</TableCell>
                    <TableCell>Data</TableCell>
                    <TableCell align="right">Valor</TableCell>
                    <TableCell align="right">Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {transactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>{transaction.description}</TableCell>
                      <TableCell>{transaction.date}</TableCell>
                      <TableCell
                        align="right"
                        sx={{
                          color: transaction.type === 'receita' ? 'success.main' : 'error.main',
                          fontWeight: 'bold',
                        }}
                      >
                        {transaction.type === 'receita' ? '+' : '-'} R${' '}
                        {Math.abs(transaction.amount).toFixed(2)}
                      </TableCell>
                      <TableCell align="right">
                        <Chip
                          label={transaction.status === 'completed' ? 'Concluído' : 'Pendente'}
                          color={transaction.status === 'completed' ? 'success' : 'warning'}
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </Box>
      </Box>
    </>
  );
};

export default Finances; 