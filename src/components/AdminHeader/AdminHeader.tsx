import React, { useState, useEffect } from 'react';
import {
  AppBar,
  Box,
  Toolbar,
  IconButton,
  Typography,
  Avatar,
  Container,
  Menu,
  MenuItem,
  Divider,
  Chip,
} from '@mui/material';
import {
  Logout as LogoutIcon,
  Dashboard as DashboardIcon,
  AdminPanelSettings as AdminIcon,
  Home as HomeIcon,
} from '@mui/icons-material';
import { Link, useNavigate } from 'react-router-dom';

const AdminHeader = () => {
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [userName, setUserName] = useState('Admin');
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('zucropay_token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUserName(payload.name || payload.email || 'Admin');
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
    <AppBar
      position="sticky"
      elevation={1}
      sx={{
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e5e7eb',
      }}
    >
      <Container maxWidth={false} sx={{ maxWidth: '2000px' }}>
        <Toolbar sx={{ display: 'flex', gap: 3, justifyContent: 'space-between', py: 1 }}>
          {/* Logo e Título */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              component="img"
              src="/logotipo.png"
              alt="ZucroPay"
              sx={{
                height: 50,
                width: 'auto',
                objectFit: 'contain',
              }}
            />
            <Box
              sx={{
                height: 30,
                width: 1,
                bgcolor: '#e5e7eb',
                mx: 1,
              }}
            />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: 1.5,
                  background: 'linear-gradient(135deg, #e94560 0%, #ff6b6b 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(233, 69, 96, 0.3)',
                }}
              >
                <AdminIcon sx={{ color: 'white', fontSize: 20 }} />
              </Box>
              <Box>
                <Typography
                  variant="body1"
                  sx={{
                    fontWeight: 700,
                    color: '#1e293b',
                    letterSpacing: '-0.3px',
                    lineHeight: 1.2,
                  }}
                >
                  Painel Admin
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    color: '#64748b',
                    fontSize: '0.65rem',
                  }}
                >
                  Área Restrita
                </Typography>
              </Box>
            </Box>
            <Chip
              label="ADMIN"
              size="small"
              sx={{
                ml: 0.5,
                bgcolor: 'rgba(233, 69, 96, 0.1)',
                color: '#e94560',
                fontWeight: 700,
                fontSize: '0.6rem',
                height: 20,
                border: '1px solid rgba(233, 69, 96, 0.2)',
              }}
            />
          </Box>

          {/* Navigation */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Link to="/dashboard" style={{ textDecoration: 'none' }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  px: 2,
                  py: 1,
                  borderRadius: 2,
                  color: '#64748b',
                  transition: 'all 0.2s',
                  '&:hover': {
                    bgcolor: '#f1f5f9',
                    color: '#1e293b',
                  },
                }}
              >
                <HomeIcon sx={{ fontSize: 20 }} />
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  Voltar ao Site
                </Typography>
              </Box>
            </Link>
            <Link to="/admin" style={{ textDecoration: 'none' }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  px: 2,
                  py: 1,
                  borderRadius: 2,
                  bgcolor: 'rgba(233, 69, 96, 0.1)',
                  color: '#e94560',
                  transition: 'all 0.2s',
                  '&:hover': {
                    bgcolor: 'rgba(233, 69, 96, 0.15)',
                  },
                }}
              >
                <DashboardIcon sx={{ fontSize: 20 }} />
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  Dashboard Admin
                </Typography>
              </Box>
            </Link>
          </Box>

          {/* User Profile */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              cursor: 'pointer',
              px: 2,
              py: 1,
              borderRadius: 2,
              transition: 'all 0.2s',
              '&:hover': {
                bgcolor: '#f1f5f9',
              },
            }}
            onClick={handleMenuOpen}
          >
            <Avatar
              sx={{
                width: 36,
                height: 36,
                bgcolor: '#e94560',
                fontSize: '0.9rem',
                fontWeight: 700,
              }}
            >
              {getInitials(userName)}
            </Avatar>
            <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
              <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b', lineHeight: 1.2 }}>
                {userName}
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.7rem' }}>
                Administrador
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
            PaperProps={{
              sx: {
                mt: 1,
                minWidth: 200,
                borderRadius: 2,
                boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
              },
            }}
          >
            <MenuItem disabled>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {userName}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {userEmail}
                </Typography>
              </Box>
            </MenuItem>
            <Divider />
            <MenuItem onClick={() => { handleMenuClose(); navigate('/dashboard'); }}>
              <HomeIcon sx={{ mr: 1.5, fontSize: 20, color: '#5818C8' }} />
              Voltar ao Site
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleLogout} sx={{ color: '#e94560' }}>
              <LogoutIcon sx={{ mr: 1.5, fontSize: 20 }} />
              Sair
            </MenuItem>
          </Menu>
        </Toolbar>
      </Container>
    </AppBar>
  );
};

export default AdminHeader;

