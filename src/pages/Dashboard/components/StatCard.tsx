import { Card, CardContent, Typography, Box, SvgIcon } from '@mui/material';
import { styled } from '@mui/material/styles';

interface StatCardProps {
  title: string;
  value: string;
  icon: typeof SvgIcon;
  trend: {
    value: number;
    isPositive: boolean;
  };
  color: string;
}

const IconWrapper = styled(Box)<{ bgcolor: string }>(({ bgcolor }) => ({
  width: 48,
  height: 48,
  borderRadius: 8,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: bgcolor,
  marginBottom: 16,
}));

const TrendIndicator = styled(Typography)<{ ispositive: 'true' | 'false' }>(
  ({ theme, ispositive }) => ({
    color: ispositive === 'true' ? theme.palette.success.main : theme.palette.error.main,
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  })
);

const StatCard = ({ title, value, icon: Icon, trend, color }: StatCardProps) => {
  return (
    <Card>
      <CardContent>
        <IconWrapper bgcolor={`${color}15`}>
          <Icon sx={{ color: color, fontSize: 24 }} />
        </IconWrapper>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          {value}
        </Typography>
        <Typography color="text.secondary" gutterBottom>
          {title}
        </Typography>
        <TrendIndicator
          variant="body2"
          ispositive={trend.isPositive ? 'true' : 'false'}
        >
          {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
        </TrendIndicator>
      </CardContent>
    </Card>
  );
};

export default StatCard; 