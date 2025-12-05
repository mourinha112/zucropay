 import React, { useState, useEffect } from 'react';
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
  InputAdornment,
  IconButton,
  Divider,
  Chip,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Email as EmailIcon,
  Lock as LockIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import * as api from '../../services/api-supabase';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!api.isSupabaseConfigured()) {
      setError('⚠️ Supabase não configurado! Configure as variáveis de ambiente VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.');
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.login({ email, password });
      
      if (response.success) {
        // Token já foi salvo pelo api.ts
        navigate('/');
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (testEmail: string, testPassword: string) => {
    setEmail(testEmail);
    setPassword(testPassword);
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: '#ffffff',
        display: 'flex',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Elementos decorativos de fundo */}
      <Box
        sx={{
          position: 'absolute',
          top: -200,
          right: -200,
          width: 600,
          height: 600,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(101, 27, 229, 0.04) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: -250,
          left: -250,
          width: 700,
          height: 700,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(56, 15, 127, 0.03) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />

      {/* Lado Esquerdo - Branding */}
      <Box
        sx={{
          flex: 1,
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 8,
          position: 'relative',
          zIndex: 1,
          backgroundColor: '#ffffff',
        }}
      >
        <Box sx={{ maxWidth: 550, width: '100%' }}>
          {/* Logo */}
          <Box
            component="img"
            src="/logotipo.png"
            alt="ZucroPay"
            sx={{
              width: '100%',
              maxWidth: 320,
              height: 'auto',
              mb: 6,
              filter: 'drop-shadow(0 4px 20px rgba(101, 27, 229, 0.15))',
            }}
          />

          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              color: '#1e293b',
              mb: 3,
              lineHeight: 1.3,
            }}
          >
            Gateway de Pagamentos Completo
          </Typography>

          <Typography
            variant="h6"
            sx={{
              color: '#64748b',
              mb: 6,
              fontWeight: 400,
              lineHeight: 1.6,
            }}
          >
            Simplifique suas transações e acelere seu crescimento com tecnologia de ponta
          </Typography>

          {/* Features Cards */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {[
              {
                icon: '💳',
                title: 'Múltiplos Métodos',
                desc: 'PIX, Cartão de Crédito, Boleto e muito mais',
              },
              {
                icon: '⚡',
                title: 'Processamento Rápido',
                desc: 'Aprovação instantânea e notificações em tempo real',
              },
              {
                icon: '�',
                title: 'Segurança Bancária',
                desc: 'Criptografia de ponta a ponta e certificação PCI',
              },
              {
                icon: '📈',
                title: 'Analytics Avançado',
                desc: 'Dashboard completo com métricas de performance',
              },
            ].map((feature, index) => (
              <Box
                key={index}
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 2.5,
                  p: 2.5,
                  borderRadius: 3,
                  backgroundColor: '#fafafa',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid #f0f0f0',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': {
                    backgroundColor: '#ffffff',
                    borderColor: 'rgba(101, 27, 229, 0.15)',
                    transform: 'translateX(8px)',
                    boxShadow: '0 8px 24px rgba(101, 27, 229, 0.08)',
                  },
                }}
              >
                <Box
                  sx={{
                    fontSize: 28,
                    width: 52,
                    height: 52,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 2.5,
                    background: 'linear-gradient(135deg, rgba(101, 27, 229, 0.1) 0%, rgba(56, 15, 127, 0.1) 100%)',
                    flexShrink: 0,
                  }}
                >
                  {feature.icon}
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography
                    variant="subtitle1"
                    sx={{
                      fontWeight: 700,
                      color: '#1e293b',
                      mb: 0.5,
                      fontSize: '1.05rem',
                    }}
                  >
                    {feature.title}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: '#64748b',
                      lineHeight: 1.5,
                    }}
                  >
                    {feature.desc}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>

          {/* Trust Badges */}
          <Box
            sx={{
              mt: 6,
              pt: 4,
              borderTop: '1px solid #f0f0f0',
              display: 'flex',
              alignItems: 'center',
              gap: 3,
            }}
          >
            <Box
              sx={{
                flex: 1,
                textAlign: 'center',
                p: 2,
                borderRadius: 2,
                backgroundColor: '#fafafa',
                border: '1px solid #f0f0f0',
              }}
            >
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#651BE5', mb: 0.5 }}>
                99.9%
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                Uptime
              </Typography>
            </Box>
            <Box
              sx={{
                flex: 1,
                textAlign: 'center',
                p: 2,
                borderRadius: 2,
                backgroundColor: '#fafafa',
                border: '1px solid #f0f0f0',
              }}
            >
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#651BE5', mb: 0.5 }}>
                PCI DSS
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                Certificado
              </Typography>
            </Box>
            <Box
              sx={{
                flex: 1,
                textAlign: 'center',
                p: 2,
                borderRadius: 2,
                backgroundColor: '#fafafa',
                border: '1px solid #f0f0f0',
              }}
            >
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#651BE5', mb: 0.5 }}>
                24/7
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                Suporte
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Lado Direito - Formulário */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: { xs: 3, sm: 4, md: 6 },
          position: 'relative',
          zIndex: 1,
        }}
      >
        <Container maxWidth="sm">
          <Card
            elevation={0}
            sx={{
              borderRadius: 4,
              border: '1px solid rgba(101, 27, 229, 0.12)',
              overflow: 'visible',
              boxShadow: '0 20px 60px rgba(101, 27, 229, 0.08)',
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(20px)',
            }}
          >
            <CardContent sx={{ p: { xs: 3, sm: 5 } }}>
              {/* Logo Mobile */}
              <Box
                sx={{
                  display: { xs: 'flex', md: 'none' },
                  justifyContent: 'center',
                  mb: 4,
                }}
              >
                <Box
                  component="img"
                  src="/logotipo.png"
                  alt="ZucroPay"
                  sx={{
                    width: '100%',
                    maxWidth: 200,
                    height: 'auto',
                  }}
                />
              </Box>

              <Box sx={{ textAlign: 'center', mb: 4 }}>
                <Typography
                  variant="h4"
                  component="h1"
                  gutterBottom
                  sx={{
                    fontWeight: 800,
                    color: '#1e293b',
                    fontSize: { xs: '1.75rem', sm: '2.125rem' },
                  }}
                >
                  Acesse sua conta
                </Typography>
                <Typography
                  variant="body1"
                  sx={{
                    color: '#64748b',
                    fontWeight: 500,
                  }}
                >
                  Entre para gerenciar seus pagamentos
                </Typography>
              </Box>

              {error && (
                <Alert
                  severity="error"
                  sx={{
                    mb: 3,
                    borderRadius: 2,
                    '& .MuiAlert-icon': {
                      fontSize: 24,
                    },
                  }}
                >
                  {error}
                </Alert>
              )}

              <form onSubmit={handleLogin}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <TextField
                    label="Email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    fullWidth
                    autoComplete="email"
                    autoFocus
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <EmailIcon sx={{ color: '#94a3b8' }} />
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                        backgroundColor: '#f8fafc',
                        '& fieldset': {
                          borderColor: '#e5e7eb',
                        },
                        '&:hover fieldset': {
                          borderColor: '#667eea',
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: '#667eea',
                        },
                      },
                    }}
                  />

                  <TextField
                    label="Senha"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    fullWidth
                    autoComplete="current-password"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <LockIcon sx={{ color: '#94a3b8' }} />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowPassword(!showPassword)}
                            edge="end"
                            sx={{ color: '#94a3b8' }}
                          >
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                        backgroundColor: '#f8fafc',
                        '& fieldset': {
                          borderColor: '#e5e7eb',
                        },
                        '&:hover fieldset': {
                          borderColor: '#667eea',
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: '#667eea',
                        },
                      },
                    }}
                  />

                  <Box sx={{ textAlign: 'right' }}>
                    <MuiLink
                      component="button"
                      type="button"
                      variant="body2"
                      sx={{
                        color: '#667eea',
                        textDecoration: 'none',
                        fontWeight: 600,
                        '&:hover': {
                          textDecoration: 'underline',
                        },
                      }}
                    >
                      Esqueceu a senha?
                    </MuiLink>
                  </Box>

                  <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    fullWidth
                    disabled={loading}
                    sx={{
                      py: 2,
                      borderRadius: 2.5,
                      textTransform: 'none',
                      fontSize: 17,
                      fontWeight: 700,
                      letterSpacing: 0.5,
                      background: 'linear-gradient(135deg, #651BE5 0%, #380F7F 100%)',
                      boxShadow: '0 8px 24px rgba(101, 27, 229, 0.35)',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #5519cc 0%, #2f0d6b 100%)',
                        boxShadow: '0 12px 32px rgba(101, 27, 229, 0.45)',
                        transform: 'translateY(-2px)',
                      },
                      '&:active': {
                        transform: 'translateY(0)',
                      },
                      '&:disabled': {
                        background: 'linear-gradient(135deg, #cbd5e1 0%, #94a3b8 100%)',
                        boxShadow: 'none',
                      },
                    }}
                  >
                    {loading ? (
                      <CircularProgress size={24} sx={{ color: 'white' }} />
                    ) : (
                      'Entrar na Plataforma'
                    )}
                  </Button>
                </Box>
              </form>

              <Divider sx={{ my: 4 }}>
                <Chip label="OU" size="small" sx={{ backgroundColor: '#f1f5f9', color: '#64748b' }} />
              </Divider>

              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Não tem uma conta?
                </Typography>
                <Button
                  variant="outlined"
                  fullWidth
                  onClick={() => navigate('/register')}
                  sx={{
                    py: 1.5,
                    borderRadius: 2,
                    textTransform: 'none',
                    fontSize: 16,
                    fontWeight: 600,
                    borderColor: '#e5e7eb',
                    color: '#667eea',
                    '&:hover': {
                      borderColor: '#667eea',
                      backgroundColor: '#f8fafc',
                    },
                  }}
                >
                  Criar conta grátis
                </Button>
              </Box>

              {/* Contas de Teste */}
              <Box sx={{ mt: 4, p: 3, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e5e7eb' }}>
                <Typography
                  variant="caption"
                  sx={{
                    display: 'block',
                    mb: 2,
                    fontWeight: 700,
                    color: '#475569',
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                  }}
                >
                  🧪 Contas de Teste
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <Button
                    size="small"
                    variant="text"
                    onClick={() => handleQuickLogin('zucro@zucro.com', 'zucro2025')}
                    sx={{
                      justifyContent: 'flex-start',
                      textTransform: 'none',
                      color: '#64748b',
                      p: 1.5,
                      borderRadius: 1.5,
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      '&:hover': {
                        backgroundColor: '#ffffff',
                        borderColor: '#667eea',
                        color: '#667eea',
                      },
                    }}
                  >
                    <Box sx={{ textAlign: 'left', width: '100%' }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        zucro@zucro.com
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                        Senha: zucro2025
                      </Typography>
                    </Box>
                  </Button>
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* Footer */}
          <Box
            sx={{
              mt: 5,
              pt: 4,
              borderTop: '1px solid rgba(101, 27, 229, 0.1)',
            }}
          >
            <Typography
              variant="caption"
              sx={{
                display: 'block',
                textAlign: 'center',
                color: '#94a3b8',
                fontWeight: 500,
              }}
            >
              © 2025 ZucroPay. Gateway de Pagamentos Seguro.
            </Typography>
            <Typography
              variant="caption"
              sx={{
                display: 'block',
                textAlign: 'center',
                color: '#cbd5e1',
                mt: 0.5,
                fontSize: '0.7rem',
              }}
            >
              Protegido por criptografia de ponta a ponta
            </Typography>
          </Box>
        </Container>
      </Box>
    </Box>
  );
};

export default Login;
