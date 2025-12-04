import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  styled,
  Box,
  Typography,
  Divider,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  Settings as SettingsIcon,
  Assessment as AssessmentIcon,
  Store as StoreIcon,
  AccountBalance as FinanceIcon,
  Logout as LogoutIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';

const DRAWER_WIDTH = 280;

const StyledDrawer = styled(Drawer)({
  width: DRAWER_WIDTH,
  flexShrink: 0,
  '& .MuiDrawer-paper': {
    width: DRAWER_WIDTH,
    boxSizing: 'border-box',
    backgroundColor: '#1e293b',
    color: 'white',
  },
});

const Logo = styled(Box)({
  padding: '24px',
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
});

const StyledListItem = styled(ListItem)<{ active?: boolean }>(({ active }) => ({
  margin: '8px 16px',
  borderRadius: '8px',
  backgroundColor: active ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
  '&:hover': {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
}));

const menuItems = [
  { text: 'Dashboard', icon: <DashboardIcon />, path: '/' },
  { text: 'Produtos', icon: <StoreIcon />, path: '/produtos' },
  { text: 'Finanças', icon: <FinanceIcon />, path: '/financas' },
  { text: 'Marketplace', icon: <PeopleIcon />, path: '/marketplace' },
  { text: 'Integrações', icon: <AssessmentIcon />, path: '/integracoes' },
  { text: 'Suporte', icon: <SettingsIcon />, path: '/suporte' },
];

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem('zucropay_token');
    navigate('/login');
  };

  return (
    <StyledDrawer variant="permanent">
      <Logo>
        <img src="/logo.svg" alt="ZucroPay" height="32" />
        <Typography variant="h5" fontWeight="bold">
          ZucroPay
        </Typography>
      </Logo>
      <List>
        {menuItems.map((item) => (
          <StyledListItem
            key={item.text}
            disablePadding
            active={location.pathname === item.path}
          >
            <ListItemButton onClick={() => navigate(item.path)}>
              <ListItemIcon sx={{ color: 'white', minWidth: 40 }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </StyledListItem>
        ))}
      </List>
      <Box sx={{ flexGrow: 1 }} />
      <Divider sx={{ backgroundColor: 'rgba(255,255,255,0.12)', mx: 2 }} />
      <List>
        <StyledListItem disablePadding>
          <ListItemButton onClick={handleLogout}>
            <ListItemIcon sx={{ color: 'white', minWidth: 40 }}>
              <LogoutIcon />
            </ListItemIcon>
            <ListItemText primary="Sair" />
          </ListItemButton>
        </StyledListItem>
      </List>
    </StyledDrawer>
  );
};

export default Sidebar; 