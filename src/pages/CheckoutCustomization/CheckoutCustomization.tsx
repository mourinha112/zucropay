import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  TextField,
  Switch,
  FormControlLabel,
  Tabs,
  Tab,
  IconButton,
  Alert,
  Snackbar,
  Divider,
  Grid,
  Card,
  CardMedia,
  Slider,
  Chip,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
  Visibility as VisibilityIcon,
  CloudUpload as UploadIcon,
  Timer as TimerIcon,
  Palette as PaletteIcon,
  Image as ImageIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import Header from '../../components/Header/Header';
import * as api from '../../services/api-supabase';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

interface CheckoutCustomization {
  productId: number | string;
  productName: string;
  
  // Imagens
  logoUrl?: string;
  bannerUrl?: string;
  backgroundUrl?: string;
  
  // Cores
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  buttonColor: string;
  
  // Cronômetro
  timerEnabled: boolean;
  timerMinutes: number;
  timerMessage: string;
  
  // Textos personalizados
  customTitle?: string;
  customDescription?: string;
  customButtonText?: string;
  successMessage?: string;
  
  // Configurações avançadas
  showLogo: boolean;
  showBanner: boolean;
  showTimer: boolean;
  showStock: boolean;
  allowQuantity: boolean;
}

const CheckoutCustomization: React.FC = () => {
  const navigate = useNavigate();
  const { productId } = useParams<{ productId: string }>();
  const [tabValue, setTabValue] = useState(0);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [uploading, setUploading] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  const [customization, setCustomization] = useState<CheckoutCustomization>({
    productId: parseInt(productId || '0'),
    productName: '',
    
    primaryColor: '#5818C8',
    secondaryColor: '#7B2FF7',
    backgroundColor: '#FFFFFF',
    textColor: '#333333',
    buttonColor: '#5818C8',
    
    timerEnabled: false,
    timerMinutes: 15,
    timerMessage: '⏰ Oferta expira em:',
    
    showLogo: true,
    showBanner: true,
    showTimer: false,
    showStock: true,
    allowQuantity: true,
  });

  useEffect(() => {
    loadCustomization();
    loadProductInfo();
  }, [productId]);

  const loadProductInfo = async () => {
    // Carregar informações do produto via Supabase
    try {
      const result = await api.getProduct(productId!);
      if (result.success && result.product) {
        setCustomization(prev => ({ ...prev, productName: result.product.name }));
      }
    } catch (error) {
      console.error('Erro ao carregar produto:', error);
    }
  };

  const loadCustomization = async () => {
    // Carregar personalização salva via Supabase
    try {
      const result = await api.getCheckoutCustomization(productId!);
      if (result) {
        setCustomization(prev => ({ ...prev, ...result }));
      }
    } catch (error) {
      console.error('Erro ao carregar personalização:', error);
    }
  };

  const handleSave = async () => {
    try {
      await api.saveCheckoutCustomization(customization);
      showSnackbar('Personalização salva com sucesso!', 'success');
    } catch (error: any) {
      console.error('Erro ao salvar:', error);
      showSnackbar(error.message || 'Erro ao salvar personalização', 'error');
    }
  };

  const handleImageUpload = async (file: File, type: 'logo' | 'banner' | 'background') => {
    setUploading(true);

    try {
      const result = await api.uploadImage(file);
      if (result.success) {
        setCustomization(prev => ({
          ...prev,
          [`${type}Url`]: result.url,
        }));
        showSnackbar('Imagem enviada com sucesso!', 'success');
      } else {
        throw new Error('Erro ao enviar imagem');
      }
    } catch (error: any) {
      showSnackbar(error.message || 'Erro ao enviar imagem', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'banner' | 'background') => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showSnackbar('Imagem muito grande. Máximo 5MB', 'error');
        return;
      }
      handleImageUpload(file, type);
    }
  };

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Preview do Checkout
  const CheckoutPreview = () => (
    <Card 
      sx={{ 
        maxWidth: 500, 
        mx: 'auto',
        bgcolor: customization.backgroundColor,
        color: customization.textColor,
        border: '1px solid #ddd',
      }}
    >
      {customization.showBanner && customization.bannerUrl && (
        <CardMedia
          component="img"
          height="200"
          image={customization.bannerUrl}
          alt="Banner"
        />
      )}
      
      <Box sx={{ p: 3 }}>
        {customization.showLogo && customization.logoUrl && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
            <img src={customization.logoUrl} alt="Logo" style={{ maxHeight: 80, maxWidth: '100%' }} />
          </Box>
        )}

        <Typography variant="h5" fontWeight={600} gutterBottom sx={{ color: customization.textColor }}>
          {customization.customTitle || customization.productName}
        </Typography>

        <Typography variant="body2" sx={{ mb: 2, color: customization.textColor }}>
          {customization.customDescription || 'Descrição do produto'}
        </Typography>

        {customization.showTimer && customization.timerEnabled && (
          <Alert severity="warning" icon={<TimerIcon />} sx={{ mb: 2 }}>
            {customization.timerMessage} {customization.timerMinutes} minutos
          </Alert>
        )}

        {customization.showStock && (
          <Chip label="Estoque: 50 unidades" color="success" size="small" sx={{ mb: 2 }} />
        )}

        <Typography variant="h4" fontWeight={700} sx={{ mb: 2, color: customization.primaryColor }}>
          R$ 99,90
        </Typography>

        {customization.allowQuantity && (
          <TextField
            label="Quantidade"
            type="number"
            defaultValue={1}
            size="small"
            sx={{ mb: 2, width: 100 }}
          />
        )}

        <Button
          variant="contained"
          fullWidth
          size="large"
          sx={{
            bgcolor: customization.buttonColor,
            color: '#fff',
            fontWeight: 600,
            '&:hover': {
              bgcolor: customization.buttonColor,
              filter: 'brightness(0.9)',
            },
          }}
        >
          {customization.customButtonText || '💳 Finalizar Compra'}
        </Button>
      </Box>
    </Card>
  );

  return (
    <>
      <Header />
      <Box sx={{ minHeight: '100vh', backgroundColor: '#f5f5f5', py: 4 }}>
        <Container maxWidth="xl">
          {/* Header */}
          <Box sx={{ mb: 4 }}>
            <Button
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate('/produtos')}
              sx={{ mb: 2 }}
            >
              Voltar para Produtos
            </Button>
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="h4" fontWeight={600} gutterBottom>
                  🎨 Personalizar Checkout
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  {customization.productName}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  variant="outlined"
                  startIcon={<VisibilityIcon />}
                  onClick={() => setPreviewMode(!previewMode)}
                >
                  {previewMode ? 'Ocultar' : 'Visualizar'}
                </Button>
                <Button
                  variant="contained"
                  startIcon={<SaveIcon />}
                  onClick={handleSave}
                  sx={{
                    background: 'linear-gradient(135deg, #5818C8 0%, #7B2FF7 100%)',
                  }}
                >
                  Salvar Alterações
                </Button>
              </Box>
            </Box>
          </Box>

          <Grid container spacing={3}>
            {/* Configurações */}
            <Grid item xs={12} md={previewMode ? 7 : 12}>
              <Paper sx={{ borderRadius: 2 }}>
                <Tabs value={tabValue} onChange={handleTabChange} variant="scrollable" scrollButtons="auto">
                  <Tab icon={<ImageIcon />} label="Imagens" iconPosition="start" />
                  <Tab icon={<PaletteIcon />} label="Cores" iconPosition="start" />
                  <Tab icon={<TimerIcon />} label="Cronômetro" iconPosition="start" />
                  <Tab label="Textos" />
                  <Tab label="Avançado" />
                </Tabs>

                <Box sx={{ p: 3 }}>
                  {/* Tab 1: Imagens */}
                  <TabPanel value={tabValue} index={0}>
                    <Typography variant="h6" gutterBottom>📸 Imagens do Checkout</Typography>
                    <Divider sx={{ mb: 3 }} />

                    <Grid container spacing={3}>
                      {/* Logo */}
                      <Grid item xs={12} md={4}>
                        <Paper sx={{ p: 2, textAlign: 'center', border: '2px dashed #ddd' }}>
                          <Typography variant="subtitle2" gutterBottom fontWeight={600}>
                            Logo
                          </Typography>
                          {customization.logoUrl ? (
                            <Box>
                              <img 
                                src={customization.logoUrl} 
                                alt="Logo" 
                                style={{ maxWidth: '100%', maxHeight: 100, marginBottom: 8 }} 
                              />
                              <IconButton 
                                size="small" 
                                color="error"
                                onClick={() => setCustomization(prev => ({ ...prev, logoUrl: '' }))}
                              >
                                <DeleteIcon />
                              </IconButton>
                            </Box>
                          ) : (
                            <Button
                              component="label"
                              variant="outlined"
                              startIcon={<UploadIcon />}
                              disabled={uploading}
                              fullWidth
                            >
                              Enviar Logo
                              <input
                                type="file"
                                hidden
                                accept="image/*"
                                onChange={(e) => handleFileChange(e, 'logo')}
                              />
                            </Button>
                          )}
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                            Máx: 5MB • PNG, JPG
                          </Typography>
                        </Paper>
                      </Grid>

                      {/* Banner */}
                      <Grid item xs={12} md={4}>
                        <Paper sx={{ p: 2, textAlign: 'center', border: '2px dashed #ddd' }}>
                          <Typography variant="subtitle2" gutterBottom fontWeight={600}>
                            Banner
                          </Typography>
                          {customization.bannerUrl ? (
                            <Box>
                              <img 
                                src={customization.bannerUrl} 
                                alt="Banner" 
                                style={{ maxWidth: '100%', maxHeight: 100, marginBottom: 8 }} 
                              />
                              <IconButton 
                                size="small" 
                                color="error"
                                onClick={() => setCustomization(prev => ({ ...prev, bannerUrl: '' }))}
                              >
                                <DeleteIcon />
                              </IconButton>
                            </Box>
                          ) : (
                            <Button
                              component="label"
                              variant="outlined"
                              startIcon={<UploadIcon />}
                              disabled={uploading}
                              fullWidth
                            >
                              Enviar Banner
                              <input
                                type="file"
                                hidden
                                accept="image/*"
                                onChange={(e) => handleFileChange(e, 'banner')}
                              />
                            </Button>
                          )}
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                            Máx: 5MB • 1200x400px
                          </Typography>
                        </Paper>
                      </Grid>

                      {/* Background */}
                      <Grid item xs={12} md={4}>
                        <Paper sx={{ p: 2, textAlign: 'center', border: '2px dashed #ddd' }}>
                          <Typography variant="subtitle2" gutterBottom fontWeight={600}>
                            Fundo
                          </Typography>
                          {customization.backgroundUrl ? (
                            <Box>
                              <img 
                                src={customization.backgroundUrl} 
                                alt="Background" 
                                style={{ maxWidth: '100%', maxHeight: 100, marginBottom: 8 }} 
                              />
                              <IconButton 
                                size="small" 
                                color="error"
                                onClick={() => setCustomization(prev => ({ ...prev, backgroundUrl: '' }))}
                              >
                                <DeleteIcon />
                              </IconButton>
                            </Box>
                          ) : (
                            <Button
                              component="label"
                              variant="outlined"
                              startIcon={<UploadIcon />}
                              disabled={uploading}
                              fullWidth
                            >
                              Enviar Fundo
                              <input
                                type="file"
                                hidden
                                accept="image/*"
                                onChange={(e) => handleFileChange(e, 'background')}
                              />
                            </Button>
                          )}
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                            Máx: 5MB • Pattern/Texture
                          </Typography>
                        </Paper>
                      </Grid>
                    </Grid>
                  </TabPanel>

                  {/* Tab 2: Cores */}
                  <TabPanel value={tabValue} index={1}>
                    <Typography variant="h6" gutterBottom>🎨 Cores do Checkout</Typography>
                    <Divider sx={{ mb: 3 }} />

                    <Grid container spacing={3}>
                      <Grid item xs={12} md={6}>
                        <TextField
                          label="Cor Primária"
                          type="color"
                          value={customization.primaryColor}
                          onChange={(e) => setCustomization(prev => ({ ...prev, primaryColor: e.target.value }))}
                          fullWidth
                          InputProps={{
                            startAdornment: (
                              <Box sx={{ width: 40, height: 40, bgcolor: customization.primaryColor, borderRadius: 1, mr: 2 }} />
                            ),
                          }}
                        />
                      </Grid>

                      <Grid item xs={12} md={6}>
                        <TextField
                          label="Cor Secundária"
                          type="color"
                          value={customization.secondaryColor}
                          onChange={(e) => setCustomization(prev => ({ ...prev, secondaryColor: e.target.value }))}
                          fullWidth
                          InputProps={{
                            startAdornment: (
                              <Box sx={{ width: 40, height: 40, bgcolor: customization.secondaryColor, borderRadius: 1, mr: 2 }} />
                            ),
                          }}
                        />
                      </Grid>

                      <Grid item xs={12} md={6}>
                        <TextField
                          label="Cor de Fundo"
                          type="color"
                          value={customization.backgroundColor}
                          onChange={(e) => setCustomization(prev => ({ ...prev, backgroundColor: e.target.value }))}
                          fullWidth
                          InputProps={{
                            startAdornment: (
                              <Box sx={{ width: 40, height: 40, bgcolor: customization.backgroundColor, borderRadius: 1, mr: 2, border: '1px solid #ddd' }} />
                            ),
                          }}
                        />
                      </Grid>

                      <Grid item xs={12} md={6}>
                        <TextField
                          label="Cor do Texto"
                          type="color"
                          value={customization.textColor}
                          onChange={(e) => setCustomization(prev => ({ ...prev, textColor: e.target.value }))}
                          fullWidth
                          InputProps={{
                            startAdornment: (
                              <Box sx={{ width: 40, height: 40, bgcolor: customization.textColor, borderRadius: 1, mr: 2 }} />
                            ),
                          }}
                        />
                      </Grid>

                      <Grid item xs={12} md={6}>
                        <TextField
                          label="Cor do Botão"
                          type="color"
                          value={customization.buttonColor}
                          onChange={(e) => setCustomization(prev => ({ ...prev, buttonColor: e.target.value }))}
                          fullWidth
                          InputProps={{
                            startAdornment: (
                              <Box sx={{ width: 40, height: 40, bgcolor: customization.buttonColor, borderRadius: 1, mr: 2 }} />
                            ),
                          }}
                        />
                      </Grid>
                    </Grid>

                    <Alert severity="info" sx={{ mt: 3 }}>
                      💡 <strong>Dica:</strong> Use cores que combinem com a identidade visual da sua marca
                    </Alert>
                  </TabPanel>

                  {/* Tab 3: Cronômetro */}
                  <TabPanel value={tabValue} index={2}>
                    <Typography variant="h6" gutterBottom>⏰ Cronômetro de Urgência</Typography>
                    <Divider sx={{ mb: 3 }} />

                    <FormControlLabel
                      control={
                        <Switch
                          checked={customization.timerEnabled}
                          onChange={(e) => setCustomization(prev => ({ ...prev, timerEnabled: e.target.checked }))}
                          color="primary"
                        />
                      }
                      label="Ativar Cronômetro"
                    />

                    {customization.timerEnabled && (
                      <Box sx={{ mt: 3 }}>
                        <Typography gutterBottom>Tempo do cronômetro (minutos)</Typography>
                        <Slider
                          value={customization.timerMinutes}
                          onChange={(_e, value) => setCustomization(prev => ({ ...prev, timerMinutes: value as number }))}
                          min={1}
                          max={60}
                          marks={[
                            { value: 5, label: '5min' },
                            { value: 15, label: '15min' },
                            { value: 30, label: '30min' },
                            { value: 60, label: '60min' },
                          ]}
                          valueLabelDisplay="on"
                        />

                        <TextField
                          label="Mensagem do Cronômetro"
                          value={customization.timerMessage}
                          onChange={(e) => setCustomization(prev => ({ ...prev, timerMessage: e.target.value }))}
                          fullWidth
                          sx={{ mt: 3 }}
                          placeholder="⏰ Oferta expira em:"
                        />

                        <Alert severity="warning" sx={{ mt: 3 }}>
                          <strong>Atenção:</strong> O cronômetro cria senso de urgência e pode aumentar as conversões
                        </Alert>
                      </Box>
                    )}
                  </TabPanel>

                  {/* Tab 4: Textos */}
                  <TabPanel value={tabValue} index={3}>
                    <Typography variant="h6" gutterBottom>📝 Textos Personalizados</Typography>
                    <Divider sx={{ mb: 3 }} />

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <TextField
                        label="Título Personalizado"
                        value={customization.customTitle || ''}
                        onChange={(e) => setCustomization(prev => ({ ...prev, customTitle: e.target.value }))}
                        fullWidth
                        placeholder="Deixe vazio para usar o nome do produto"
                      />

                      <TextField
                        label="Descrição Personalizada"
                        value={customization.customDescription || ''}
                        onChange={(e) => setCustomization(prev => ({ ...prev, customDescription: e.target.value }))}
                        fullWidth
                        multiline
                        rows={3}
                        placeholder="Descrição que aparece no checkout"
                      />

                      <TextField
                        label="Texto do Botão"
                        value={customization.customButtonText || ''}
                        onChange={(e) => setCustomization(prev => ({ ...prev, customButtonText: e.target.value }))}
                        fullWidth
                        placeholder="💳 Finalizar Compra"
                      />

                      <TextField
                        label="Mensagem de Sucesso"
                        value={customization.successMessage || ''}
                        onChange={(e) => setCustomization(prev => ({ ...prev, successMessage: e.target.value }))}
                        fullWidth
                        multiline
                        rows={2}
                        placeholder="Obrigado pela sua compra! 🎉"
                      />
                    </Box>
                  </TabPanel>

                  {/* Tab 5: Avançado */}
                  <TabPanel value={tabValue} index={4}>
                    <Typography variant="h6" gutterBottom>⚙️ Configurações Avançadas</Typography>
                    <Divider sx={{ mb: 3 }} />

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={customization.showLogo}
                            onChange={(e) => setCustomization(prev => ({ ...prev, showLogo: e.target.checked }))}
                          />
                        }
                        label="Exibir Logo"
                      />

                      <FormControlLabel
                        control={
                          <Switch
                            checked={customization.showBanner}
                            onChange={(e) => setCustomization(prev => ({ ...prev, showBanner: e.target.checked }))}
                          />
                        }
                        label="Exibir Banner"
                      />

                      <FormControlLabel
                        control={
                          <Switch
                            checked={customization.showTimer}
                            onChange={(e) => setCustomization(prev => ({ ...prev, showTimer: e.target.checked }))}
                          />
                        }
                        label="Exibir Cronômetro no Checkout"
                      />

                      <FormControlLabel
                        control={
                          <Switch
                            checked={customization.showStock}
                            onChange={(e) => setCustomization(prev => ({ ...prev, showStock: e.target.checked }))}
                          />
                        }
                        label="Exibir Estoque"
                      />

                      <FormControlLabel
                        control={
                          <Switch
                            checked={customization.allowQuantity}
                            onChange={(e) => setCustomization(prev => ({ ...prev, allowQuantity: e.target.checked }))}
                          />
                        }
                        label="Permitir Alterar Quantidade"
                      />
                    </Box>

                    <Alert severity="info" sx={{ mt: 3 }}>
                      💡 Desative opções que não são necessárias para simplificar o checkout
                    </Alert>
                  </TabPanel>
                </Box>
              </Paper>
            </Grid>

            {/* Preview */}
            {previewMode && (
              <Grid item xs={12} md={5}>
                <Paper sx={{ p: 3, position: 'sticky', top: 20 }}>
                  <Typography variant="h6" gutterBottom fontWeight={600}>
                    👁️ Pré-visualização
                  </Typography>
                  <Divider sx={{ mb: 3 }} />
                  <CheckoutPreview />
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 2, textAlign: 'center' }}>
                    Esta é uma prévia aproximada. O checkout real pode ter pequenas diferenças.
                  </Typography>
                </Paper>
              </Grid>
            )}
          </Grid>
        </Container>
      </Box>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default CheckoutCustomization;
