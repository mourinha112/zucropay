import React, { useState } from 'react';
import {
  AppBar,
  Box,
  Toolbar,
  Typography,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  Chip,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  useTheme,
  useMediaQuery,
  Badge,
} from '@mui/material';
import {
  Logout as LogoutIcon,
  Dashboard as DashboardIcon,
  AdminPanelSettings as AdminIcon,
  Home as HomeIcon,
  Menu as MenuIcon,
  People as PeopleIcon,
  VerifiedUser as VerifiedUserIcon,
  AccountBalance as AccountBalanceIcon,
  ShoppingCart as ShoppingCartIcon,
  Inventory as InventoryIcon,
  Link as LinkIcon,
  History as HistoryIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { Link, useNavigate } from 'react-router-dom';

interface AdminHeaderProps {
  pendingVerifications?: number;
  pendingWithdrawals?: number;
  pendingUsers?: number;
  onTabChange?: (tabIndex: number) => void;
}

const AdminHeader: React.FC<AdminHeaderProps> = ({
  pendingVerifications = 0,
  pendingWithdrawals = 0,
  pendingUsers = 0,
  onTabChange,
}) => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const adminUser = JSON.parse(localStorage.getItem('zucropay_admin_user') || '{"username": "Admin"}');

  const menuItems = [
    { label: 'Dashboard', icon: <DashboardIcon />, tabIndex: 0 },
    { label: 'Usuários', icon: <PeopleIcon />, tabIndex: 1, badge: pendingUsers },
    { label: 'Verificações', icon: <VerifiedUserIcon />, tabIndex: 2, badge: pendingVerifications },
    { label: 'Saques', icon: <AccountBalanceIcon />, tabIndex: 3, badge: pendingWithdrawals },
    { label: 'Vendas', icon: <ShoppingCartIcon />, tabIndex: 4 },
    { label: 'Produtos', icon: <InventoryIcon />, tabIndex: 5 },
    { label: 'Links', icon: <LinkIcon />, tabIndex: 6 },
    { label: 'Logs', icon: <HistoryIcon />, tabIndex: 7 },
  ];

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    localStorage.removeItem('zucropay_admin_token');
    localStorage.removeItem('zucropay_admin_user');
    handleMenuClose();
    navigate('/admin-login');
  };

  const handleMenuItemClick = (tabIndex: number) => {
    if (onTabChange) {
      onTabChange(tabIndex);
    }
    setMobileMenuOpen(false);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Menu Lateral Mobile
  const MobileDrawer = () => (
    <Drawer
      anchor="left"
      open={mobileMenuOpen}
      onClose={() => setMobileMenuOpen(false)}
      PaperProps={{
        sx: {
          width: 280,
          bgcolor: '#0f172a',
          borderRight: '1px solid rgba(255,255,255,0.1)',
        },
      }}
    >
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <AdminIcon sx={{ color: '#e94560', fontSize: 28 }} />
          <Typography variant="h6" sx={{ color: '#f1f5f9', fontWeight: 700 }}>
            Admin
          </Typography>
        </Box>
        <IconButton onClick={() => setMobileMenuOpen(false)} sx={{ color: '#64748b' }}>
          <CloseIcon />
        </IconButton>
      </Box>
      
      <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
      
      <List sx={{ px: 1, py: 2 }}>
        {menuItems.map((item) => (
          <ListItem key={item.label} disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              onClick={() => handleMenuItemClick(item.tabIndex)}
              sx={{
                borderRadius: 2,
                color: '#94a3b8',
                '&:hover': {
                  bgcolor: 'rgba(233, 69, 96, 0.1)',
                  color: '#e94560',
                },
                '&.Mui-selected': {
                  bgcolor: 'rgba(233, 69, 96, 0.15)',
                  color: '#e94560',
                },
              }}
            >
              <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}>
                {item.badge ? (
                  <Badge badgeContent={item.badge} color="error" max={99}>
                    {item.icon}
                  </Badge>
                ) : (
                  item.icon
                )}
              </ListItemIcon>
              <ListItemText 
                primary={item.label} 
                primaryTypographyProps={{ fontWeight: 500 }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      
      <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)', mt: 'auto' }} />
      
      <Box sx={{ p: 2 }}>
        <Link to="/dashboard" style={{ textDecoration: 'none' }}>
          <ListItemButton
            sx={{
              borderRadius: 2,
              bgcolor: 'rgba(88, 24, 200, 0.15)',
              color: '#a78bfa',
              '&:hover': {
                bgcolor: 'rgba(88, 24, 200, 0.25)',
              },
            }}
          >
            <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}>
              <HomeIcon />
            </ListItemIcon>
            <ListItemText primary="Voltar ao Site" primaryTypographyProps={{ fontWeight: 500 }} />
          </ListItemButton>
        </Link>
      </Box>
    </Drawer>
  );

  return (
    <>
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          backgroundColor: '#0f172a',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <Toolbar sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
          {/* Left Side - Logo + Menu Toggle */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {isMobile && (
              <IconButton 
                onClick={() => setMobileMenuOpen(true)}
                sx={{ color: '#94a3b8' }}
              >
                <MenuIcon />
              </IconButton>
            )}
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 2,
                  background: 'linear-gradient(135deg, #e94560 0%, #ff6b6b 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 15px rgba(233, 69, 96, 0.4)',
                }}
              >
                <AdminIcon sx={{ color: 'white', fontSize: 22 }} />
              </Box>
              <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                <Typography
                  variant="body1"
                  sx={{
                    fontWeight: 700,
                    color: '#f1f5f9',
                    letterSpacing: '-0.3px',
                    lineHeight: 1.2,
                  }}
                >
                  Painel Administrativo
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    color: '#64748b',
                    fontSize: '0.7rem',
                  }}
                >
                  ZucroPay • Área Restrita
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* Center - Desktop Menu */}
          {!isMobile && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {menuItems.map((item) => (
                <Box
                  key={item.label}
                  onClick={() => handleMenuItemClick(item.tabIndex)}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.75,
                    px: 2,
                    py: 1,
                    borderRadius: 2,
                    cursor: 'pointer',
                    color: '#94a3b8',
                    transition: 'all 0.2s',
                    '&:hover': {
                      bgcolor: 'rgba(233, 69, 96, 0.1)',
                      color: '#e94560',
                    },
                  }}
                >
                  {item.badge ? (
                    <Badge badgeContent={item.badge} color="error" max={99}>
                      {React.cloneElement(item.icon, { sx: { fontSize: 18 } })}
                    </Badge>
                  ) : (
                    React.cloneElement(item.icon, { sx: { fontSize: 18 } })
                  )}
                  <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                    {item.label}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}

          {/* Right Side - Actions */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {/* Back to site button (desktop only) */}
            {!isMobile && (
              <Link to="/dashboard" style={{ textDecoration: 'none' }}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.75,
                    px: 2,
                    py: 1,
                    borderRadius: 2,
                    bgcolor: 'rgba(88, 24, 200, 0.15)',
                    color: '#a78bfa',
                    transition: 'all 0.2s',
                    '&:hover': {
                      bgcolor: 'rgba(88, 24, 200, 0.25)',
                    },
                  }}
                >
                  <HomeIcon sx={{ fontSize: 18 }} />
                  <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                    Site
                  </Typography>
                </Box>
              </Link>
            )}

            {/* User Profile */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                cursor: 'pointer',
                px: 1.5,
                py: 0.75,
                borderRadius: 2,
                transition: 'all 0.2s',
                '&:hover': {
                  bgcolor: 'rgba(255,255,255,0.05)',
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
                {getInitials(adminUser.username)}
              </Avatar>
              <Box sx={{ display: { xs: 'none', md: 'block' } }}>
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#f1f5f9', lineHeight: 1.2 }}>
                  {adminUser.username}
                </Typography>
                <Chip
                  label="ADMIN"
                  size="small"
                  sx={{
                    height: 16,
                    fontSize: '0.55rem',
                    fontWeight: 700,
                    bgcolor: 'rgba(233, 69, 96, 0.2)',
                    color: '#e94560',
                    border: '1px solid rgba(233, 69, 96, 0.3)',
                    '& .MuiChip-label': { px: 1 },
                  }}
                />
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
                  bgcolor: '#1e293b',
                  border: '1px solid rgba(255,255,255,0.1)',
                  boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
                },
              }}
            >
              <MenuItem disabled sx={{ color: '#f1f5f9' }}>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {adminUser.username}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#64748b' }}>
                    Administrador
                  </Typography>
                </Box>
              </MenuItem>
              <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
              <MenuItem 
                onClick={() => { handleMenuClose(); navigate('/dashboard'); }}
                sx={{ color: '#94a3b8', '&:hover': { color: '#f1f5f9', bgcolor: 'rgba(255,255,255,0.05)' } }}
              >
                <HomeIcon sx={{ mr: 1.5, fontSize: 20, color: '#5818C8' }} />
                Voltar ao Site
              </MenuItem>
              <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
              <MenuItem 
                onClick={handleLogout} 
                sx={{ color: '#e94560', '&:hover': { bgcolor: 'rgba(233, 69, 96, 0.1)' } }}
              >
                <LogoutIcon sx={{ mr: 1.5, fontSize: 20 }} />
                Sair do Admin
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>
      
      <MobileDrawer />
    </>
  );
};

export default AdminHeader;
