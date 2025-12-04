import React, { useState } from 'react';
import {
  Box,
  Container,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Link as MuiLink,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import * as api from '../../services/api-supabase';

const Register: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    cpfCnpj: '',
    phone: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    if (formData.password.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres');
      return;
    }

    setLoading(true);

    try {
      const response = await api.register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        cpfCnpj: formData.cpfCnpj || undefined,
        phone: formData.phone || undefined,
      });

      if (response.success) {
        navigate('/');
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao fazer cadastro');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        py: 4,
      }}
    >
      <Container maxWidth="sm">
        <Card>
          <CardContent sx={{ p: 4 }}>
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
                Criar Conta
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Preencha seus dados para começar
              </Typography>
            </Box>

            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            <form onSubmit={handleRegister}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  label="Nome Completo *"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  required
                  fullWidth
                  autoFocus
                />
                <TextField
                  label="Email *"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  required
                  fullWidth
                  autoComplete="email"
                />
                <TextField
                  label="CPF/CNPJ"
                  value={formData.cpfCnpj}
                  onChange={(e) => handleChange('cpfCnpj', e.target.value)}
                  fullWidth
                  placeholder="000.000.000-00"
                />
                <TextField
                  label="Telefone"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  fullWidth
                  placeholder="(00) 00000-0000"
                />
                <TextField
                  label="Senha *"
                  type="password"
                  value={formData.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  required
                  fullWidth
                  helperText="Mínimo 6 caracteres"
                />
                <TextField
                  label="Confirmar Senha *"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => handleChange('confirmPassword', e.target.value)}
                  required
                  fullWidth
                />

                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  fullWidth
                  disabled={loading}
                  sx={{
                    mt: 2,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                    },
                  }}
                >
                  {loading ? <CircularProgress size={24} color="inherit" /> : 'Criar Conta'}
                </Button>

                <Box sx={{ textAlign: 'center', mt: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Já tem uma conta?{' '}
                    <MuiLink
                      component="button"
                      type="button"
                      onClick={() => navigate('/login')}
                      sx={{ cursor: 'pointer' }}
                    >
                      Faça login
                    </MuiLink>
                  </Typography>
                </Box>
              </Box>
            </form>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};

export default Register;
