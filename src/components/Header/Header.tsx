import React, { useState, useEffect } from 'react';
import {
  AppBar,
  Box,
  Toolbar,
  IconButton,
  Typography,
  InputBase,
  Avatar,
  Container,
  Menu,
  MenuItem,
  Divider,
} from '@mui/material';
import { Search as SearchIcon, Logout as LogoutIcon } from '@mui/icons-material';
import { Link, useNavigate } from 'react-router-dom';

const Header = () => {
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [userName, setUserName] = useState('Usuário');
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    // Pegar dados do usuário do localStorage ou API
    const token = localStorage.getItem('zucropay_token');
    if (token) {
      try {
        // Decodificar o token JWT para pegar os dados do usuário
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUserName(payload.name || payload.email || 'Usuário');
        setUserEmail(payload.email || '');
      } catch (error) {
        console.error('Erro ao decodificar token:', error);
      }
    }
  }, []);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    localStorage.removeItem('zucropay_token');
    localStorage.removeItem('zucropay_user');
    handleMenuClose();
    navigate('/login');
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <AppBar position="sticky" color="default" elevation={1} sx={{ backgroundColor: 'white' }}>
      <Container maxWidth={false} sx={{ maxWidth: '2000px' }}>
        <Toolbar sx={{ display: 'flex', gap: 4, justifyContent: 'space-between' }}>
          {/* Logo */}
          <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
          <Box
  component="img"
  src="/logotipo.png"
  alt="ZucroPay"
  sx={{
    height: 65,
    width: 'auto',
    objectFit: 'contain',
    display: 'block',
    marginLeft: 2,
  }}
/>
          </Link>

          {/* Search and Navigation Container */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              flex: 1,
              justifyContent: 'center',
            }}
          >
            {/* Search Bar */}
            <Box
              sx={{
                position: 'relative',
                backgroundColor: '#f8f9fa',
                borderRadius: 2,
                width: '300px',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <IconButton sx={{ p: 1 }}>
                <SearchIcon />
              </IconButton>
              <InputBase
                placeholder="Pesquisar..."
                sx={{
                  flex: 1,
                  '& .MuiInputBase-input': {
                    p: 1,
                  },
                }}
              />
            </Box>

            {/* Navigation Links */}
            <Box sx={{ display: 'flex', gap: 4 }}>
              <Link to="/dashboard" style={{ textDecoration: 'none', color: '#5818C8', display: 'flex', alignItems: 'center', gap: 1 }}>
                Dashboard
              </Link>
              <Link to="/vendas" style={{ textDecoration: 'none', color: 'text.primary', display: 'flex', alignItems: 'center', gap: 1 }}>
                Vendas
              </Link>
              <Link to="/produtos" style={{ textDecoration: 'none', color: 'text.primary', display: 'flex', alignItems: 'center', gap: 1 }}>
                Produtos
              </Link>
              <Link to="/marketplace" style={{ textDecoration: 'none', color: 'text.primary', display: 'flex', alignItems: 'center', gap: 1 }}>
                Marketplace
              </Link>
              <Link to="/integracoes" style={{ textDecoration: 'none', color: 'text.primary', display: 'flex', alignItems: 'center', gap: 1 }}>
                Integrações
              </Link>
              <Link to="/financas" style={{ textDecoration: 'none', color: 'text.primary', display: 'flex', alignItems: 'center', gap: 1 }}>
                Finanças
              </Link>
              <Link to="/indique" style={{ textDecoration: 'none', color: 'text.primary', display: 'flex', alignItems: 'center', gap: 1 }}>
                Indique e Ganhe
              </Link>
              <Link to="/suporte" style={{ textDecoration: 'none', color: 'text.primary', display: 'flex', alignItems: 'center', gap: 1 }}>
                Suporte
              </Link>
            </Box>
          </Box>

          {/* User Profile */}
          <Box 
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1,
              cursor: 'pointer',
              '&:hover': { opacity: 0.8 }
            }}
            onClick={handleMenuOpen}
          >
            <Avatar sx={{ width: 32, height: 32, bgcolor: '#5818C8' }}>
              {getInitials(userName)}
            </Avatar>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {userName}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {userEmail || 'Usuário'}
              </Typography>
            </Box>
          </Box>
          
          {/* User Menu */}
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
          >
            <MenuItem disabled>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {userName}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {userEmail}
                </Typography>
              </Box>
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleLogout}>
              <LogoutIcon sx={{ mr: 1, fontSize: 20 }} />
              Sair
            </MenuItem>
          </Menu>
        </Toolbar>
      </Container>
    </AppBar>
  );
};

export default Header;
