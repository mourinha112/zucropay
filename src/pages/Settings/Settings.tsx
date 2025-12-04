import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  TextField,
  Stack,
  Alert,
  Card,
  CardContent,
  Chip,
  Divider,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Computer as LocalhostIcon,
  Cloud as NgrokIcon,
  Dns as VpsIcon,
  Save as SaveIcon,
  RestartAlt as ResetIcon,
  CheckCircle,
  Edit as EditIcon,
  ContentCopy,
} from '@mui/icons-material';
import {
  getSystemConfig,
  changeEnvironmentMode,
  updateCustomUrls,
  resetToDefault,
  PREDEFINED_CONFIGS,
} from '../../config/config';
import type { EnvironmentMode, SystemConfig } from '../../config/config';

const Settings: React.FC = () => {
  const [config, setConfig] = useState<SystemConfig>(getSystemConfig());
  const [customBackendUrl, setCustomBackendUrl] = useState('');
  const [customFrontendUrl, setCustomFrontendUrl] = useState('');
  const [showCustomFields, setShowCustomFields] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    const currentConfig = getSystemConfig();
    setConfig(currentConfig);
    setCustomBackendUrl(currentConfig.backendUrl);
    setCustomFrontendUrl(currentConfig.frontendUrl);
  }, []);

  const handleModeChange = (mode: EnvironmentMode) => {
    changeEnvironmentMode(mode);
    const newConfig = PREDEFINED_CONFIGS[mode];
    setConfig(newConfig);
    setCustomBackendUrl(newConfig.backendUrl);
    setCustomFrontendUrl(newConfig.frontendUrl);
    setShowCustomFields(false);
    showSuccessMessage();
  };

  const handleSaveCustomUrls = () => {
    updateCustomUrls(customBackendUrl, customFrontendUrl);
    const updatedConfig = getSystemConfig();
    setConfig(updatedConfig);
    setShowCustomFields(false);
    showSuccessMessage();
  };

  const handleReset = () => {
    resetToDefault();
    const defaultConfig = getSystemConfig();
    setConfig(defaultConfig);
    setCustomBackendUrl(defaultConfig.backendUrl);
    setCustomFrontendUrl(defaultConfig.frontendUrl);
    setShowCustomFields(false);
    showSuccessMessage();
  };

  const showSuccessMessage = () => {
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getIconForMode = (mode: EnvironmentMode) => {
    switch (mode) {
      case 'localhost':
        return <LocalhostIcon sx={{ fontSize: 40 }} />;
      case 'ngrok':
        return <NgrokIcon sx={{ fontSize: 40 }} />;
      case 'vps':
        return <VpsIcon sx={{ fontSize: 40 }} />;
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
          ⚙️ Configurações do Sistema
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Configure o modo de operação e URLs do sistema
        </Typography>
      </Box>

      {saveSuccess && (
        <Alert severity="success" sx={{ mb: 3 }}>
          ✅ Configuração salva com sucesso! As mudanças já estão ativas.
        </Alert>
      )}

      {/* Configuração Atual */}
      <Paper sx={{ p: 3, mb: 3, bgcolor: '#f5f5f5' }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CheckCircle color="success" />
          Configuração Atual
        </Typography>
        <Divider sx={{ my: 2 }} />
        <Stack spacing={2}>
          <Box>
            <Typography variant="subtitle2" color="text.secondary">
              Modo Ativo:
            </Typography>
            <Chip
              label={config.mode.toUpperCase()}
              color="primary"
              icon={getIconForMode(config.mode)}
              sx={{ mt: 1 }}
            />
          </Box>
          <Box>
            <Typography variant="subtitle2" color="text.secondary">
              URL do Backend:
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
              <TextField
                value={config.backendUrl}
                size="small"
                fullWidth
                InputProps={{ readOnly: true }}
              />
              <Tooltip title="Copiar">
                <IconButton onClick={() => copyToClipboard(config.backendUrl)}>
                  <ContentCopy />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
          <Box>
            <Typography variant="subtitle2" color="text.secondary">
              URL do Frontend:
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
              <TextField
                value={config.frontendUrl}
                size="small"
                fullWidth
                InputProps={{ readOnly: true }}
              />
              <Tooltip title="Copiar">
                <IconButton onClick={() => copyToClipboard(config.frontendUrl)}>
                  <ContentCopy />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </Stack>
      </Paper>

      {/* Modos Pré-Configurados */}
      <Typography variant="h6" gutterBottom sx={{ mt: 4, mb: 2 }}>
        Escolher Modo de Operação
      </Typography>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 3 }}>
        {/* Localhost */}
        <Card
          sx={{
            flex: 1,
            border: config.mode === 'localhost' ? '2px solid #1976d2' : '1px solid #e0e0e0',
            cursor: 'pointer',
            transition: 'all 0.3s',
            '&:hover': {
              boxShadow: 4,
              transform: 'translateY(-4px)',
            },
          }}
          onClick={() => handleModeChange('localhost')}
        >
          <CardContent sx={{ textAlign: 'center' }}>
            <LocalhostIcon sx={{ fontSize: 60, color: '#1976d2', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Localhost
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Desenvolvimento local
            </Typography>
            <Typography variant="caption" sx={{ display: 'block', fontFamily: 'monospace' }}>
              Backend: localhost:8000
            </Typography>
            <Typography variant="caption" sx={{ display: 'block', fontFamily: 'monospace' }}>
              Frontend: localhost:5173
            </Typography>
            {config.mode === 'localhost' && (
              <Chip label="Ativo" color="primary" size="small" sx={{ mt: 2 }} />
            )}
          </CardContent>
        </Card>

        {/* Ngrok */}
        <Card
          sx={{
            flex: 1,
            border: config.mode === 'ngrok' ? '2px solid #1976d2' : '1px solid #e0e0e0',
            cursor: 'pointer',
            transition: 'all 0.3s',
            '&:hover': {
              boxShadow: 4,
              transform: 'translateY(-4px)',
            },
          }}
          onClick={() => handleModeChange('ngrok')}
        >
          <CardContent sx={{ textAlign: 'center' }}>
            <NgrokIcon sx={{ fontSize: 60, color: '#00c853', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Ngrok
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Testes externos via túneis
            </Typography>
            <Typography variant="caption" sx={{ display: 'block', fontFamily: 'monospace', fontSize: '0.7rem' }}>
              *.ngrok-free.app
            </Typography>
            {config.mode === 'ngrok' && (
              <Chip label="Ativo" color="primary" size="small" sx={{ mt: 2 }} />
            )}
          </CardContent>
        </Card>

        {/* VPS */}
        <Card
          sx={{
            flex: 1,
            border: config.mode === 'vps' ? '2px solid #1976d2' : '1px solid #e0e0e0',
            cursor: 'pointer',
            transition: 'all 0.3s',
            '&:hover': {
              boxShadow: 4,
              transform: 'translateY(-4px)',
            },
          }}
          onClick={() => handleModeChange('vps')}
        >
          <CardContent sx={{ textAlign: 'center' }}>
            <VpsIcon sx={{ fontSize: 60, color: '#ff6f00', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              VPS / Servidor
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Produção em servidor dedicado
            </Typography>
            <Typography variant="caption" sx={{ display: 'block', fontFamily: 'monospace' }}>
              IP ou domínio próprio
            </Typography>
            {config.mode === 'vps' && (
              <Chip label="Ativo" color="primary" size="small" sx={{ mt: 2 }} />
            )}
          </CardContent>
        </Card>
      </Stack>

      {/* URLs Customizadas */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6">
            URLs Customizadas
          </Typography>
          <Button
            startIcon={<EditIcon />}
            onClick={() => setShowCustomFields(!showCustomFields)}
            variant="outlined"
            size="small"
          >
            {showCustomFields ? 'Cancelar' : 'Editar URLs'}
          </Button>
        </Box>

        {showCustomFields && (
          <>
            <Alert severity="info" sx={{ mb: 2 }}>
              Configure URLs personalizadas para VPS, ngrok customizado ou outros ambientes.
            </Alert>
            <Stack spacing={2}>
              <TextField
                label="URL do Backend"
                value={customBackendUrl}
                onChange={(e) => setCustomBackendUrl(e.target.value)}
                fullWidth
                placeholder="https://seu-backend.com"
                helperText="Ex: https://api.zucropay.com ou http://123.456.789.0:8000"
              />
              <TextField
                label="URL do Frontend"
                value={customFrontendUrl}
                onChange={(e) => setCustomFrontendUrl(e.target.value)}
                fullWidth
                placeholder="https://seu-frontend.com"
                helperText="Ex: https://zucropay.com ou http://123.456.789.0"
              />
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleSaveCustomUrls}
                fullWidth
                size="large"
              >
                Salvar URLs Customizadas
              </Button>
            </Stack>
          </>
        )}
      </Paper>

      {/* Ações */}
      <Stack direction="row" spacing={2}>
        <Button
          variant="outlined"
          startIcon={<ResetIcon />}
          onClick={handleReset}
          color="warning"
        >
          Resetar para Padrão (Localhost)
        </Button>
      </Stack>

      {/* Informações */}
      <Paper sx={{ p: 3, mt: 3, bgcolor: '#f9f9f9' }}>
        <Typography variant="h6" gutterBottom>
          ℹ️ Como Funciona
        </Typography>
        <Divider sx={{ my: 2 }} />
        <Stack spacing={1}>
          <Typography variant="body2">
            • <strong>Localhost:</strong> Para desenvolvimento local. Backend em http://localhost:8000 e frontend em http://localhost:5173
          </Typography>
          <Typography variant="body2">
            • <strong>Ngrok:</strong> Para testes com clientes externos. Usa túneis ngrok temporários. Adiciona automaticamente headers especiais.
          </Typography>
          <Typography variant="body2">
            • <strong>VPS:</strong> Para produção em servidor dedicado. Configure o IP ou domínio do seu servidor.
          </Typography>
          <Typography variant="body2" sx={{ mt: 2, color: 'warning.main' }}>
            ⚠️ <strong>Importante:</strong> Após mudar o modo, o sistema usará automaticamente as novas URLs em todas as requisições.
          </Typography>
          <Typography variant="body2" sx={{ color: 'info.main' }}>
            💡 <strong>Dica:</strong> Se usar ngrok, atualize as URLs customizadas cada vez que reiniciar os túneis (eles geram URLs novas).
          </Typography>
        </Stack>
      </Paper>
    </Container>
  );
};

export default Settings;
