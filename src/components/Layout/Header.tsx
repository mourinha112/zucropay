import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  IconButton,
  Badge,
  Avatar,
  styled,
  Box,
  Typography,
  Menu,
  MenuItem,
  ListItemIcon,
  Divider,
} from '@mui/material';
import {
  NotificationsOutlined as NotificationsIcon,
  SearchOutlined as SearchIcon,
  Logout,
  Person,
  Settings,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const StyledAppBar = styled(AppBar)(({ theme }) => ({
  backgroundColor: theme.palette.background.paper,
  color: theme.palette.text.primary,
  boxShadow: 'none',
  borderBottom: `1px solid ${theme.palette.divider}`,
  left: 280,
  width: 'calc(100% - 280px)',
}));

const SearchBox = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.background.default,
  borderRadius: theme.shape.borderRadius,
  padding: '8px 16px',
  display: 'flex',
  alignItems: 'center',
  width: '300px',
  gap: '8px',
}));

const Header = () => {
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    // Limpar token e dados do usuário
    localStorage.removeItem('zucropay_token');
    localStorage.removeItem('zucropay_user');
    
    // Redirecionar para login
    navigate('/login');
  };

  // Obter dados do usuário do localStorage
  const userStr = localStorage.getItem('zucropay_user');
  const user = userStr ? JSON.parse(userStr) : null;

  return (
    <StyledAppBar position="fixed">
      <Toolbar>
        <SearchBox>
          <SearchIcon color="action" />
          <input
            style={{
              border: 'none',
              background: 'none',
              outline: 'none',
              width: '100%',
              fontSize: '14px',
            }}
            placeholder="Pesquisar..."
          />
        </SearchBox>
        <Box sx={{ flexGrow: 1 }} />
        <IconButton size="large">
          <Badge badgeContent={4} color="error">
            <NotificationsIcon />
          </Badge>
        </IconButton>
        <Box
          onClick={handleClick}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            ml: 2,
            cursor: 'pointer',
            '&:hover': {
              opacity: 0.8,
            },
          }}
        >
          <Avatar
            sx={{ width: 40, height: 40 }}
            src={user?.avatar || 'https://i.pravatar.cc/300'}
          />
          <Box>
            <Typography variant="subtitle1" fontWeight="medium">
              {user?.name || 'Usuário'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {user?.email || 'email@exemplo.com'}
            </Typography>
          </Box>
        </Box>

        <Menu
          anchorEl={anchorEl}
          open={open}
          onClose={handleClose}
          onClick={handleClose}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          PaperProps={{
            elevation: 3,
            sx: {
              mt: 1.5,
              minWidth: 200,
              borderRadius: 2,
            },
          }}
        >
          <MenuItem onClick={() => navigate('/profile')}>
            <ListItemIcon>
              <Person fontSize="small" />
            </ListItemIcon>
            Meu Perfil
          </MenuItem>
          <MenuItem onClick={() => navigate('/settings')}>
            <ListItemIcon>
              <Settings fontSize="small" />
            </ListItemIcon>
            Configurações
          </MenuItem>
          <Divider />
          <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
            <ListItemIcon>
              <Logout fontSize="small" color="error" />
            </ListItemIcon>
            Sair
          </MenuItem>
        </Menu>
      </Toolbar>
    </StyledAppBar>
  );
};

export default Header; 