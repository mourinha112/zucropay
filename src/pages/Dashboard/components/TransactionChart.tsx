import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  ButtonGroup,
  Button,
} from '@mui/material';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const data = [
  { name: 'Jan', value: 4000 },
  { name: 'Fev', value: 3000 },
  { name: 'Mar', value: 5000 },
  { name: 'Abr', value: 2780 },
  { name: 'Mai', value: 6890 },
  { name: 'Jun', value: 4390 },
  { name: 'Jul', value: 7490 },
];

const TransactionChart = () => {
  const [timeRange, setTimeRange] = React.useState('7D');

  return (
    <Card>
      <CardContent>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 3,
          }}
        >
          <Typography variant="h6">Volume de Transações</Typography>
          <ButtonGroup size="small">
            {['7D', '1M', '3M', '1A'].map((range) => (
              <Button
                key={range}
                variant={timeRange === range ? 'contained' : 'outlined'}
                onClick={() => setTimeRange(range)}
              >
                {range}
              </Button>
            ))}
          </ButtonGroup>
        </Box>
        <Box sx={{ width: '100%', height: 300 }}>
          <ResponsiveContainer>
            <AreaChart
              data={data}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                style={{ fontSize: 12 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                style={{ fontSize: 12 }}
                tickFormatter={(value) => `R$ ${value}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                }}
                formatter={(value: number) =>
                  [`R$ ${value.toLocaleString()}`, 'Valor']
                }
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#2563eb"
                fillOpacity={1}
                fill="url(#colorValue)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </Box>
      </CardContent>
    </Card>
  );
};

export default TransactionChart; 