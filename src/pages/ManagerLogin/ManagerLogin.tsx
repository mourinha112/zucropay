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
  SupervisorAccount as ManagerIcon,
  Visibility,
  VisibilityOff,
  Lock as LockIcon,
  Email as EmailIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const ManagerLogin: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Se já está logado como gerente, redirecionar
    const managerToken = localStorage.getItem('zucropay_manager_token');
    if (managerToken) {
      try {
        const payload = JSON.parse(atob(managerToken));
        if (payload.exp && payload.exp > Date.now() && payload.role === 'gerente') {
          navigate('/gerente');
        } else {
          // Token expirado ou role incorreto
          localStorage.removeItem('zucropay_manager_token');
          localStorage.removeItem('zucropay_manager_user');
        }
      } catch {
        localStorage.removeItem('zucropay_manager_token');
        localStorage.removeItem('zucropay_manager_user');
      }
    }
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Chamar API de login (usa a mesma API de admin mas verifica o role)
      const response = await fetch(`${API_BASE_URL}/admin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'login', email, password }),
      });

      const data = await response.json();

      if (data.success) {
        // Verificar se é um gerente
        if (data.admin.role !== 'gerente') {
          setError('Esta área é exclusiva para Gerentes de Conta. Use o login de admin.');
          return;
        }

        localStorage.setItem('zucropay_manager_token', data.token);
        localStorage.setItem('zucropay_manager_user', JSON.stringify({
          username: data.admin.name,
          email: data.admin.email,
          role: data.admin.role
        }));
        
        navigate('/gerente');
      } else {
        setError(data.error || 'Credenciais inválidas');
      }
    } catch (err: any) {
      console.error('Erro no login gerente:', err);
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
        background: 'linear-gradient(135deg, #0d1b2a 0%, #1b263b 50%, #0d1b2a 100%)',
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
          background: 'radial-gradient(circle, rgba(88, 24, 200, 0.2) 0%, transparent 70%)',
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
          background: 'radial-gradient(circle, rgba(34, 197, 94, 0.15) 0%, transparent 70%)',
          bottom: '-150px',
          left: '-100px',
        }}
      />

      <Card
        sx={{
          maxWidth: 420,
          width: '100%',
          background: 'linear-gradient(145deg, #1b263b 0%, #0d1b2a 100%)',
          border: '1px solid rgba(88, 24, 200, 0.3)',
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
            background: 'linear-gradient(90deg, #5818C8, #7c3aed, #5818C8)',
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
                background: 'linear-gradient(135deg, rgba(88, 24, 200, 0.2) 0%, rgba(88, 24, 200, 0.05) 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 2,
                border: '2px solid rgba(88, 24, 200, 0.3)',
              }}
            >
              <ManagerIcon sx={{ fontSize: 40, color: '#7c3aed' }} />
            </Box>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 800,
                color: '#f1f5f9',
                letterSpacing: '-0.5px',
              }}
            >
              Gerente de Conta
            </Typography>
            <Typography variant="body2" sx={{ color: '#94a3b8', mt: 1 }}>
              Área exclusiva para gerentes ZucroPay
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
              label="E-mail do Gerente"
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
                  '&:hover fieldset': { borderColor: 'rgba(88, 24, 200, 0.5)' },
                  '&.Mui-focused fieldset': { borderColor: '#7c3aed' },
                },
                '& .MuiInputLabel-root': { color: '#94a3b8' },
                '& .MuiInputLabel-root.Mui-focused': { color: '#7c3aed' },
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
              label="Senha"
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
                  '&:hover fieldset': { borderColor: 'rgba(88, 24, 200, 0.5)' },
                  '&.Mui-focused fieldset': { borderColor: '#7c3aed' },
                },
                '& .MuiInputLabel-root': { color: '#94a3b8' },
                '& .MuiInputLabel-root.Mui-focused': { color: '#7c3aed' },
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
                bgcolor: '#5818C8',
                fontWeight: 700,
                fontSize: '1rem',
                textTransform: 'none',
                borderRadius: 2,
                '&:hover': {
                  bgcolor: '#4a14a8',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 10px 25px rgba(88, 24, 200, 0.3)',
                },
                transition: 'all 0.2s ease',
              }}
            >
              {loading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                'Acessar Painel de Gerente'
              )}
            </Button>
          </Box>

          {/* Footer */}
          <Box sx={{ mt: 4, textAlign: 'center' }}>
            <Typography variant="caption" sx={{ color: '#64748b' }}>
              Área exclusiva para gerentes de conta autorizados.
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
            ZucroPay © {new Date().getFullYear()} • Gerente de Conta
          </Typography>
        </Box>
      </Card>
    </Box>
  );
};

export default ManagerLogin;
