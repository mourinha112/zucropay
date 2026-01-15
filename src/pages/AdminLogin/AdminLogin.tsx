import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
} from '@mui/material';
import {
  AdminPanelSettings as AdminIcon,
  Visibility,
  VisibilityOff,
  Lock as LockIcon,
  Email as EmailIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const AdminLogin: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Se já está logado como admin, redirecionar
    const adminToken = localStorage.getItem('zucropay_admin_token');
    if (adminToken) {
      try {
        const payload = JSON.parse(atob(adminToken));
        if (payload.exp && payload.exp > Date.now()) {
          navigate('/admin');
        } else {
          // Token expirado
          localStorage.removeItem('zucropay_admin_token');
          localStorage.removeItem('zucropay_admin_user');
        }
      } catch {
        localStorage.removeItem('zucropay_admin_token');
        localStorage.removeItem('zucropay_admin_user');
      }
    }
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Chamar API de login admin
      const response = await fetch(`${API_BASE_URL}/admin-login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem('zucropay_admin_token', data.token);
        localStorage.setItem('zucropay_admin_user', JSON.stringify({
          username: data.admin.name,
          email: data.admin.email,
          role: data.admin.role
        }));
        
        navigate('/admin');
      } else {
        setError(data.error || 'Credenciais inválidas');
      }
    } catch (err: any) {
      console.error('Erro no login admin:', err);
      setError('Erro ao conectar com o servidor. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
        padding: 2,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background decoration */}
      <Box
        sx={{
          position: 'absolute',
          width: 500,
          height: 500,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(233, 69, 96, 0.15) 0%, transparent 70%)',
          top: '-200px',
          right: '-100px',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          width: 400,
          height: 400,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(88, 24, 200, 0.15) 0%, transparent 70%)',
          bottom: '-150px',
          left: '-100px',
        }}
      />

      <Card
        sx={{
          maxWidth: 420,
          width: '100%',
          background: 'linear-gradient(145deg, #1e293b 0%, #0f172a 100%)',
          border: '1px solid rgba(233, 69, 96, 0.3)',
          borderRadius: 4,
          overflow: 'hidden',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Gradient border top */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            background: 'linear-gradient(90deg, #e94560, #ff6b6b, #e94560)',
          }}
        />

        <CardContent sx={{ p: 4 }}>
          {/* Logo/Header */}
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(233, 69, 96, 0.2) 0%, rgba(233, 69, 96, 0.05) 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 2,
                border: '2px solid rgba(233, 69, 96, 0.3)',
              }}
            >
              <AdminIcon sx={{ fontSize: 40, color: '#e94560' }} />
            </Box>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 800,
                color: '#f1f5f9',
                letterSpacing: '-0.5px',
              }}
            >
              Admin ZucroPay
            </Typography>
            <Typography variant="body2" sx={{ color: '#94a3b8', mt: 1 }}>
              Acesso restrito ao painel administrativo
            </Typography>
          </Box>

          {/* Alerts */}
          {error && (
            <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
              {error}
            </Alert>
          )}

          {/* Form */}
          <Box component="form" onSubmit={handleLogin}>
            <TextField
              fullWidth
              label="E-mail do Admin"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              autoComplete="email"
              sx={{
                mb: 2,
                '& .MuiOutlinedInput-root': {
                  bgcolor: 'rgba(255,255,255,0.05)',
                  color: '#f1f5f9',
                  '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
                  '&:hover fieldset': { borderColor: 'rgba(233, 69, 96, 0.5)' },
                  '&.Mui-focused fieldset': { borderColor: '#e94560' },
                },
                '& .MuiInputLabel-root': { color: '#94a3b8' },
                '& .MuiInputLabel-root.Mui-focused': { color: '#e94560' },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailIcon sx={{ color: '#64748b' }} />
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              fullWidth
              label="Senha Admin"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              sx={{
                mb: 3,
                '& .MuiOutlinedInput-root': {
                  bgcolor: 'rgba(255,255,255,0.05)',
                  color: '#f1f5f9',
                  '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
                  '&:hover fieldset': { borderColor: 'rgba(233, 69, 96, 0.5)' },
                  '&.Mui-focused fieldset': { borderColor: '#e94560' },
                },
                '& .MuiInputLabel-root': { color: '#94a3b8' },
                '& .MuiInputLabel-root.Mui-focused': { color: '#e94560' },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon sx={{ color: '#64748b' }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                      sx={{ color: '#64748b' }}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading}
              sx={{
                py: 1.5,
                bgcolor: '#e94560',
                fontWeight: 700,
                fontSize: '1rem',
                textTransform: 'none',
                borderRadius: 2,
                '&:hover': {
                  bgcolor: '#d63850',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 10px 25px rgba(233, 69, 96, 0.3)',
                },
                transition: 'all 0.2s ease',
              }}
            >
              {loading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                'Entrar no Painel Admin'
              )}
            </Button>
          </Box>

          {/* Footer */}
          <Box sx={{ mt: 4, textAlign: 'center' }}>
            <Typography variant="caption" sx={{ color: '#64748b' }}>
              Esta área é exclusiva para administradores do sistema.
            </Typography>
          </Box>
        </CardContent>

        {/* Footer bar */}
        <Box
          sx={{
            bgcolor: 'rgba(0, 0, 0, 0.2)',
            py: 2,
            px: 3,
            borderTop: '1px solid rgba(255, 255, 255, 0.05)',
          }}
        >
          <Typography
            variant="caption"
            sx={{ color: '#64748b', display: 'block', textAlign: 'center' }}
          >
            ZucroPay © {new Date().getFullYear()} • Painel Administrativo
          </Typography>
        </Box>
      </Card>
    </Box>
  );
};

export default AdminLogin;
