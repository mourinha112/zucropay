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
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { 
  Search as SearchIcon, 
  Logout as LogoutIcon,
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  ShoppingCart as ShoppingCartIcon,
  Inventory as InventoryIcon,
  Store as StoreIcon,
  IntegrationInstructions as IntegrationIcon,
  AccountBalance as AccountBalanceIcon,
  CardGiftcard as GiftIcon,
  HelpOutline as HelpIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { Link, useNavigate } from 'react-router-dom';

const Header = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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

  const menuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
    { path: '/vendas', label: 'Vendas', icon: <ShoppingCartIcon /> },
    { path: '/produtos', label: 'Produtos', icon: <InventoryIcon /> },
    { path: '/marketplace', label: 'Marketplace', icon: <StoreIcon /> },
    { path: '/integracoes', label: 'Integrações', icon: <IntegrationIcon /> },
    { path: '/financas', label: 'Finanças', icon: <AccountBalanceIcon /> },
    { path: '/indique', label: 'Indique e Ganhe', icon: <GiftIcon /> },
    { path: '/suporte', label: 'Suporte', icon: <HelpIcon /> },
    { path: '/configuracoes', label: 'Configurações', icon: <SettingsIcon /> },
  ];

  const handleMobileMenuToggle = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const handleMobileMenuClose = () => {
    setMobileMenuOpen(false);
  };

  return (
    <>
      <AppBar position="sticky" color="default" elevation={1} sx={{ backgroundColor: 'white' }}>
        <Container maxWidth={false} sx={{ maxWidth: '2000px' }}>
          <Toolbar 
            sx={{ 
              display: 'flex', 
              gap: { xs: 1, md: 4 }, 
              justifyContent: 'space-between',
              px: { xs: 1, md: 2 },
              minHeight: { xs: 56, md: 64 } 
            }}
          >
            {/* Mobile Menu Button */}
            {isMobile && (
              <IconButton
                edge="start"
                color="inherit"
                aria-label="menu"
                onClick={handleMobileMenuToggle}
                sx={{ mr: 1, color: '#5818C8' }}
              >
                <MenuIcon />
              </IconButton>
            )}

            {/* Logo - Centralizado no mobile */}
            <Link 
              to="/" 
              style={{ 
                textDecoration: 'none', 
                display: 'flex', 
                alignItems: 'center',
                flex: isMobile ? 1 : 'none',
                justifyContent: isMobile ? 'center' : 'flex-start'
              }}
            >
              <Box
                component="img"
                src="/logotipo.png"
                alt="ZucroPay"
                sx={{
                  height: { xs: 45, md: 65 },
                  width: 'auto',
                  objectFit: 'contain',
                  display: 'block',
                  marginLeft: { xs: 0, md: 2 },
                }}
              />
            </Link>

            {/* Desktop: Search and Navigation Container */}
            {!isMobile && (
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
                  {menuItems.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      style={{
                        textDecoration: 'none',
                        color: item.path === '/dashboard' ? '#5818C8' : 'inherit',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                      }}
                    >
                      {item.label}
                    </Link>
                  ))}
                </Box>
              </Box>
            )}

            {/* User Profile */}
            <Box 
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: { xs: 0.5, md: 1 },
                cursor: 'pointer',
                '&:hover': { opacity: 0.8 },
                ml: { xs: 'auto', md: 0 }
              }}
              onClick={handleMenuOpen}
            >
              <Avatar sx={{ width: { xs: 28, md: 32 }, height: { xs: 28, md: 32 }, bgcolor: '#5818C8' }}>
                {getInitials(userName)}
              </Avatar>
              {!isMobile && (
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {userName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {userEmail || 'Usuário'}
                  </Typography>
                </Box>
              )}
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

    {/* Mobile Drawer Menu */}
    <Drawer
      anchor="left"
      open={mobileMenuOpen}
      onClose={handleMobileMenuClose}
      PaperProps={{
        sx: {
          width: 280,
          pt: 2,
        },
      }}
    >
      {/* User Info in Drawer */}
      <Box sx={{ px: 2, pb: 2, borderBottom: '1px solid #e0e0e0' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
          <Avatar sx={{ width: 40, height: 40, bgcolor: '#5818C8' }}>
            {getInitials(userName)}
          </Avatar>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {userName}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {userEmail || 'Usuário'}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Menu Items */}
      <List sx={{ pt: 1 }}>
        {menuItems.map((item) => (
          <ListItem
            key={item.path}
            component={Link}
            to={item.path}
            onClick={handleMobileMenuClose}
            sx={{
              color: 'inherit',
              textDecoration: 'none',
              '&:hover': {
                backgroundColor: '#f5f5f5',
              },
            }}
          >
            <ListItemIcon sx={{ color: item.path === '/dashboard' ? '#5818C8' : 'inherit', minWidth: 40 }}>
              {item.icon}
            </ListItemIcon>
            <ListItemText 
              primary={item.label}
              primaryTypographyProps={{
                sx: {
                  fontWeight: item.path === '/dashboard' ? 600 : 400,
                  color: item.path === '/dashboard' ? '#5818C8' : 'inherit',
                },
              }}
            />
          </ListItem>
        ))}
      </List>

      <Divider sx={{ my: 1 }} />

      {/* Logout in Drawer */}
      <List>
        <ListItem
          onClick={() => {
            handleMobileMenuClose();
            handleLogout();
          }}
          sx={{
            cursor: 'pointer',
            '&:hover': {
              backgroundColor: '#f5f5f5',
            },
          }}
        >
          <ListItemIcon sx={{ minWidth: 40 }}>
            <LogoutIcon />
          </ListItemIcon>
          <ListItemText primary="Sair" />
        </ListItem>
      </List>
    </Drawer>
  </>
  );
};

export default Header;
