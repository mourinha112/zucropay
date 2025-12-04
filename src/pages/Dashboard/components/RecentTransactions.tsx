import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Avatar,
  Box,
} from '@mui/material';

type TransactionStatus = 'completed' | 'pending' | 'failed';
type TransactionType = 'payment' | 'transfer';

interface Transaction {
  id: number;
  customer: {
    name: string;
    avatar: string;
  };
  amount: number;
  status: TransactionStatus;
  date: string;
  type: TransactionType;
}

const transactions: Transaction[] = [
  {
    id: 1,
    customer: {
      name: 'Carlos Oliveira',
      avatar: 'https://i.pravatar.cc/150?img=1',
    },
    amount: 2500.0,
    status: 'completed',
    date: '2024-03-15',
    type: 'payment',
  },
  {
    id: 2,
    customer: {
      name: 'Ana Silva',
      avatar: 'https://i.pravatar.cc/150?img=2',
    },
    amount: 1800.0,
    status: 'pending',
    date: '2024-03-15',
    type: 'transfer',
  },
  {
    id: 3,
    customer: {
      name: 'Pedro Santos',
      avatar: 'https://i.pravatar.cc/150?img=3',
    },
    amount: 3200.0,
    status: 'completed',
    date: '2024-03-14',
    type: 'payment',
  },
  {
    id: 4,
    customer: {
      name: 'Maria Costa',
      avatar: 'https://i.pravatar.cc/150?img=4',
    },
    amount: 950.0,
    status: 'failed',
    date: '2024-03-14',
    type: 'transfer',
  },
];

const statusColors: Record<TransactionStatus, 'success' | 'warning' | 'error'> = {
  completed: 'success',
  pending: 'warning',
  failed: 'error',
};

const statusLabels: Record<TransactionStatus, string> = {
  completed: 'Concluído',
  pending: 'Pendente',
  failed: 'Falhou',
};

const typeLabels: Record<TransactionType, string> = {
  payment: 'Pagamento',
  transfer: 'Transferência',
};

const RecentTransactions = () => {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Transações Recentes
        </Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Cliente</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell>Valor</TableCell>
                <TableCell>Data</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {transactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar src={transaction.customer.avatar} />
                      <Typography variant="body2">
                        {transaction.customer.name}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>{typeLabels[transaction.type]}</TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      R$ {transaction.amount.toLocaleString()}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {new Date(transaction.date).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={statusLabels[transaction.status]}
                      color={statusColors[transaction.status]}
                      size="small"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
};

export default RecentTransactions; 