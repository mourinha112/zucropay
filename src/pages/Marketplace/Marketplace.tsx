import React, { useState, useEffect } from 'react';
import { Box, Typography, Tabs, Tab, Card, CardContent, Button, Grid, Chip, Switch, FormControlLabel, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Alert, IconButton, Tooltip, Paper, Stack, Divider, CardActions } from '@mui/material';
import { Store as StoreIcon, TrendingUp as TrendingUpIcon, ContentCopy as CopyIcon, CheckCircle as CheckCircleIcon, Cancel as CancelIcon, AttachMoney as MoneyIcon, People as PeopleIcon, Share as ShareIcon, Settings as SettingsIcon, Link as LinkIcon } from '@mui/icons-material';
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

const Marketplace: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [marketplaceProducts, setMarketplaceProducts] = useState<any[]>([]);
  const [myProducts, setMyProducts] = useState<any[]>([]);
  const [myAffiliates, setMyAffiliates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [commissionDialog, setCommissionDialog] = useState(false);
  const [affiliateLinkDialog, setAffiliateLinkDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [selectedAffiliate, setSelectedAffiliate] = useState<any>(null);
  const [commission, setCommission] = useState(30);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    loadData();
  }, [tabValue]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (tabValue === 0) {
        const response = await api.getMarketplaceProducts();
        setMarketplaceProducts(response.products || []);
      } else if (tabValue === 1) {
        const response = await api.getMyMarketplaceProducts();
        setMyProducts(response.products || []);
      } else if (tabValue === 2) {
        const response = await api.getMyAffiliates();
        setMyAffiliates(response.affiliates || []);
      }
    } catch (error: any) {
      setErrorMessage(error.message || 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleAffiliate = async (product: any) => {
    try {
      const response: any = await api.affiliateToProduct(product.id);
      setSelectedAffiliate({
        ...product,
        affiliate_link: response.affiliate?.affiliate_link || `aff_${product.id}_${Date.now()}`
      });
      setAffiliateLinkDialog(true);
      showSuccess('Afiliação realizada com sucesso!');
      loadData();
    } catch (error: any) {
      setErrorMessage(error.message || 'Erro ao se afiliar');
    }
  };

  const handleConfigureProduct = (product: any) => {
    setSelectedProduct(product);
    setCommission(product.commission_percentage || 30);
    setEditMode(true);
    setCommissionDialog(true);
  };

  const handleToggleMarketplace = async (product: any, enabled: boolean) => {
    if (enabled) {
      setSelectedProduct(product);
      setCommission(product.commission_percentage || 30);
      setEditMode(false);
      setCommissionDialog(true);
    } else {
      try {
        await api.toggleProductMarketplace(product.id, false);
        showSuccess('Produto removido do marketplace');
        loadData();
      } catch (error: any) {
        setErrorMessage(error.message || 'Erro ao atualizar produto');
      }
    }
  };

  const handleSaveCommission = async () => {
    if (!selectedProduct) return;
    try {
      await api.toggleProductMarketplace(selectedProduct.id, true, commission);
      showSuccess(editMode ? 'Comissão atualizada!' : 'Produto habilitado no marketplace!');
      setCommissionDialog(false);
      setEditMode(false);
      loadData();
    } catch (error: any) {
      setErrorMessage(error.message || 'Erro ao salvar');
    }
  };

  const handleCancelAffiliation = async (affiliate: any) => {
    if (!confirm('Deseja cancelar esta afiliação?')) return;
    try {
      await api.cancelAffiliation(affiliate.id);
      showSuccess('Afiliação cancelada');
      loadData();
    } catch (error: any) {
      setErrorMessage(error.message || 'Erro ao cancelar afiliação');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showSuccess('Link copiado!');
  };

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(''), 4000);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <>
      <Header />
      <Box sx={{ minHeight: '100vh', backgroundColor: '#f5f5f5', pt: 10 }}>
        <Box sx={{ maxWidth: '1400px', mx: 'auto', p: 3 }}>
          <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}> Marketplace</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>Venda produtos de outros usuários e ganhe comissão</Typography>

          {successMessage && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMessage('')}>{successMessage}</Alert>}
          {errorMessage && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErrorMessage('')}>{errorMessage}</Alert>}

          <Paper sx={{ mb: 3, borderRadius: 2 }}>
            <Tabs value={tabValue} onChange={handleTabChange} variant="fullWidth">
              <Tab icon={<StoreIcon />} label="Produtos Disponíveis" iconPosition="start" />
              <Tab icon={<MoneyIcon />} label="Meus Produtos" iconPosition="start" />
              <Tab icon={<ShareIcon />} label="Minhas Afiliações" iconPosition="start" />
            </Tabs>
          </Paper>

          <TabPanel value={tabValue} index={0}>
            {loading ? (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <Typography>Carregando produtos...</Typography>
              </Box>
            ) : marketplaceProducts.length === 0 ? (
              <Paper sx={{ p: 8, textAlign: 'center', borderRadius: 3, bgcolor: 'white' }}>
                <StoreIcon sx={{ fontSize: 80, color: '#bdbdbd', mb: 3 }} />
                <Typography variant="h5" fontWeight={600} gutterBottom>
                  Nenhum produto disponível
                </Typography>
                <Typography color="text.secondary">
                  Aguarde novos produtos serem adicionados ao marketplace
                </Typography>
              </Paper>
            ) : (
              <Grid container spacing={3}>
                {marketplaceProducts.map((product) => (
                  <Grid item xs={12} sm={6} md={4} key={product.id}>
                    <Card
                      sx={{
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        borderRadius: 3,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          transform: 'translateY(-8px)',
                          boxShadow: '0 12px 24px rgba(0,0,0,0.15)',
                        },
                      }}
                    >
                      <Box
                        sx={{
                          height: 240,
                          width: '100%',
                          position: 'relative',
                          overflow: 'hidden',
                          bgcolor: product.image_url ? '#f5f5f5' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        }}
                      >
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.name}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                            }}
                          />
                        ) : (
                          <Box
                            sx={{
                              width: '100%',
                              height: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <StoreIcon sx={{ fontSize: 80, color: 'white', opacity: 0.5 }} />
                          </Box>
                        )}
                      </Box>
                      
                      <CardContent sx={{ flexGrow: 1, p: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', mb: 2 }}>
                          <Typography variant="h6" fontWeight={600} sx={{ flex: 1, pr: 1 }}>
                            {product.name}
                          </Typography>
                          {product.is_affiliated && (
                            <Chip
                              icon={<CheckCircleIcon />}
                              label="Afiliado"
                              color="success"
                              size="small"
                              sx={{ fontWeight: 600 }}
                            />
                          )}
                        </Box>

                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            mb: 3,
                            minHeight: 44,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {product.description || 'Sem descrição disponível'}
                        </Typography>

                        <Divider sx={{ my: 2 }} />

                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Typography variant="caption" color="text.secondary" fontWeight={500}>
                              Preço
                            </Typography>
                            <Chip
                              label={formatCurrency(product.price)}
                              color="primary"
                              size="small"
                              sx={{ fontWeight: 700, fontSize: '0.875rem' }}
                            />
                          </Box>

                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Typography variant="caption" color="text.secondary" fontWeight={500}>
                              Sua Comissão
                            </Typography>
                            <Chip
                              label={`${product.commission_percentage}% = ${formatCurrency((product.price * product.commission_percentage) / 100)}`}
                              color="success"
                              size="small"
                              sx={{ fontWeight: 700 }}
                            />
                          </Box>

                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <PeopleIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                              <Typography variant="caption" color="text.secondary">
                                {product.affiliate_count || 0} afiliado(s)
                              </Typography>
                            </Box>
                            <Typography variant="caption" color="text.secondary">
                              Por: <strong>{product.owner_name}</strong>
                            </Typography>
                          </Box>
                        </Box>
                      </CardContent>

                      <CardActions sx={{ p: 2, pt: 0 }}>
                        {product.is_affiliated ? (
                          <Button
                            fullWidth
                            variant="outlined"
                            color="success"
                            size="large"
                            startIcon={<LinkIcon />}
                            onClick={() => {
                              setSelectedAffiliate(product);
                              setAffiliateLinkDialog(true);
                            }}
                            sx={{ borderRadius: 2, fontWeight: 600, py: 1.5 }}
                          >
                            Ver Meu Link
                          </Button>
                        ) : (
                          <Button
                            fullWidth
                            variant="contained"
                            size="large"
                            startIcon={<TrendingUpIcon />}
                            onClick={() => handleAffiliate(product)}
                            sx={{
                              borderRadius: 2,
                              fontWeight: 600,
                              py: 1.5,
                              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                              '&:hover': {
                                background: 'linear-gradient(135deg, #5568d3 0%, #63408a 100%)',
                              },
                            }}
                          >
                            Afiliar e Vender
                          </Button>
                        )}
                      </CardActions>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            {loading ? (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <Typography>Carregando seus produtos...</Typography>
              </Box>
            ) : myProducts.length === 0 ? (
              <Paper sx={{ p: 8, textAlign: 'center', borderRadius: 3, bgcolor: 'white' }}>
                <MoneyIcon sx={{ fontSize: 80, color: '#bdbdbd', mb: 3 }} />
                <Typography variant="h5" fontWeight={600} gutterBottom>
                  Você ainda não tem produtos
                </Typography>
                <Typography color="text.secondary" sx={{ mb: 3 }}>
                  Crie produtos na aba "Produtos" e depois habilite-os aqui no marketplace
                </Typography>
              </Paper>
            ) : (
              <Grid container spacing={3}>
                {myProducts.map((product) => (
                  <Grid item xs={12} sm={6} md={4} key={product.id}>
                    <Card
                      sx={{
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        borderRadius: 3,
                        boxShadow: product.marketplace_enabled
                          ? '0 4px 16px rgba(76, 175, 80, 0.3)'
                          : '0 2px 8px rgba(0,0,0,0.08)',
                        border: product.marketplace_enabled ? '2px solid #4caf50' : 'none',
                        transition: 'all 0.3s ease',
                      }}
                    >
                      <Box
                        sx={{
                          height: 240,
                          width: '100%',
                          position: 'relative',
                          overflow: 'hidden',
                          bgcolor: product.image_url
                            ? '#f5f5f5'
                            : product.marketplace_enabled
                            ? '#e8f5e9'
                            : '#f5f5f5',
                        }}
                      >
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.name}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                            }}
                          />
                        ) : (
                          <Box
                            sx={{
                              width: '100%',
                              height: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <StoreIcon sx={{ fontSize: 80, color: '#bdbdbd' }} />
                          </Box>
                        )}
                      </Box>

                      <CardContent sx={{ flexGrow: 1, p: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', mb: 2 }}>
                          <Typography variant="h6" fontWeight={600} sx={{ flex: 1, pr: 1 }}>
                            {product.name}
                          </Typography>
                          {product.marketplace_enabled && (
                            <Chip
                              icon={<CheckCircleIcon />}
                              label="Ativo no Marketplace"
                              color="success"
                              size="small"
                              sx={{ fontWeight: 600 }}
                            />
                          )}
                        </Box>

                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            mb: 3,
                            minHeight: 44,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {product.description || 'Sem descrição disponível'}
                        </Typography>

                        <Divider sx={{ my: 2 }} />

                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Typography variant="caption" color="text.secondary" fontWeight={500}>
                              Preço do Produto
                            </Typography>
                            <Chip
                              label={formatCurrency(product.price)}
                              color="primary"
                              size="small"
                              sx={{ fontWeight: 700 }}
                            />
                          </Box>

                          {product.marketplace_enabled && (
                            <>
                              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Typography variant="caption" color="text.secondary" fontWeight={500}>
                                  Comissão Afiliados
                                </Typography>
                                <Chip
                                  label={`${product.commission_percentage}%`}
                                  color="warning"
                                  size="small"
                                  sx={{ fontWeight: 700 }}
                                />
                              </Box>

                              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Typography variant="caption" color="text.secondary" fontWeight={500}>
                                  Você Recebe
                                </Typography>
                                <Chip
                                  label={formatCurrency(product.price - (product.price * product.commission_percentage) / 100)}
                                  color="success"
                                  size="small"
                                  sx={{ fontWeight: 700 }}
                                />
                              </Box>

                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                                <PeopleIcon fontSize="small" sx={{ color: 'success.main' }} />
                                <Typography variant="body2" color="success.main" fontWeight={600}>
                                  {product.affiliate_count || 0} afiliado(s) promovendo este produto
                                </Typography>
                              </Box>
                            </>
                          )}
                        </Box>
                      </CardContent>

                      <CardActions sx={{ p: 2, pt: 0, flexDirection: 'column', gap: 1 }}>
                        {product.marketplace_enabled && (
                          <Button
                            fullWidth
                            variant="outlined"
                            color="primary"
                            size="medium"
                            startIcon={<SettingsIcon />}
                            onClick={() => handleConfigureProduct(product)}
                            sx={{ borderRadius: 2, fontWeight: 600 }}
                          >
                            Configurar Comissão
                          </Button>
                        )}
                        
                        <FormControlLabel
                          control={
                            <Switch
                              checked={Boolean(product.marketplace_enabled)}
                              onChange={(e) => handleToggleMarketplace(product, e.target.checked)}
                              color="success"
                            />
                          }
                          label={
                            <Typography variant="body2" fontWeight={600}>
                              {product.marketplace_enabled ? 'Desabilitar Marketplace' : 'Habilitar no Marketplace'}
                            </Typography>
                          }
                          sx={{ ml: 0, width: '100%' }}
                        />
                      </CardActions>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </TabPanel>

          <TabPanel value={tabValue} index={2}>
            {loading ? <Typography>Carregando...</Typography> : myAffiliates.length === 0 ? (
              <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 2 }}>
                <ShareIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6">Você ainda não tem afiliações</Typography>
              </Paper>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {myAffiliates.map((affiliate) => (
                  <Card key={affiliate.id} sx={{ borderRadius: 2 }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', gap: 2, flexWrap: { xs: 'wrap', md: 'nowrap' } }}>
                        <Box sx={{ width: { xs: '100%', md: 150 } }}>
                          {affiliate.product_image ? (
                            <img src={affiliate.product_image} alt={affiliate.product_name} style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 8 }} />
                          ) : (
                            <Box sx={{ width: '100%', height: 120, bgcolor: '#f5f5f5', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <StoreIcon sx={{ fontSize: 48, color: '#bdbdbd' }} />
                            </Box>
                          )}
                        </Box>
                        <Box sx={{ flex: 1 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="h6">{affiliate.product_name}</Typography>
                            <IconButton size="small" color="error" onClick={() => handleCancelAffiliation(affiliate)}><CancelIcon /></IconButton>
                          </Box>
                          <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                            <Chip label={formatCurrency(affiliate.product_price || 0)} size="small" />
                            <Chip label={`${affiliate.commission_percentage}%`} color="success" size="small" />
                          </Stack>
                          <Paper sx={{ p: 2, bgcolor: '#f9f9f9', mb: 2, borderRadius: 1 }}>
                            <Typography variant="caption" fontWeight={600}>Seu Link:</Typography>
                            <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                              <TextField value={`${window.location.origin}/checkout/${affiliate.affiliate_link}`} size="small" fullWidth InputProps={{ readOnly: true }} />
                              <IconButton onClick={() => copyToClipboard(`${window.location.origin}/checkout/${affiliate.affiliate_link}`)}><CopyIcon /></IconButton>
                            </Box>
                          </Paper>
                          <Box sx={{ display: 'flex', gap: 3 }}>
                            <Box>
                              <Typography variant="caption" color="text.secondary">Vendas</Typography>
                              <Typography variant="h6">{affiliate.total_sales || 0}</Typography>
                            </Box>
                            <Box>
                              <Typography variant="caption" color="text.secondary">Ganho</Typography>
                              <Typography variant="h6" color="success.main">{formatCurrency(affiliate.total_earned || 0)}</Typography>
                            </Box>
                          </Box>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            )}
          </TabPanel>

          <Dialog open={commissionDialog} onClose={() => setCommissionDialog(false)} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ fontWeight: 600, fontSize: '1.5rem' }}>
              {editMode ? '⚙️ Configurar Comissão' : '🚀 Habilitar no Marketplace'}
            </DialogTitle>
            <DialogContent>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3, mt: 1 }}>
                {editMode
                  ? 'Ajuste a porcentagem de comissão que os afiliados receberão por venda.'
                  : 'Configure a comissão dos afiliados para começar a vender através do marketplace.'}
              </Typography>
              <TextField
                label="Comissão para Afiliados (%)"
                type="number"
                value={commission}
                onChange={(e) => setCommission(Number(e.target.value))}
                fullWidth
                inputProps={{ min: 1, max: 100 }}
                helperText="Valor entre 1% e 100%"
                sx={{ mb: 3 }}
              />
              {selectedProduct && (
                <Paper
                  sx={{
                    p: 3,
                    bgcolor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'primary.light',
                  }}
                >
                  <Typography variant="subtitle2" fontWeight={700} gutterBottom color="primary">
                    💰 Simulação de Venda
                  </Typography>
                  <Divider sx={{ my: 1.5 }} />
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" color="text.secondary">
                        Preço do Produto:
                      </Typography>
                      <Typography variant="h6" fontWeight={700}>
                        {formatCurrency(selectedProduct.price)}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" color="warning.main" fontWeight={600}>
                        Comissão Afiliado ({commission}%):
                      </Typography>
                      <Typography variant="h6" fontWeight={700} color="warning.main">
                        - {formatCurrency((selectedProduct.price * commission) / 100)}
                      </Typography>
                    </Box>
                    <Divider />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" color="success.main" fontWeight={700}>
                        Você Recebe:
                      </Typography>
                      <Typography variant="h5" fontWeight={700} color="success.main">
                        {formatCurrency(selectedProduct.price - (selectedProduct.price * commission) / 100)}
                      </Typography>
                    </Box>
                  </Box>
                </Paper>
              )}
            </DialogContent>
            <DialogActions sx={{ p: 3 }}>
              <Button onClick={() => setCommissionDialog(false)} size="large">
                Cancelar
              </Button>
              <Button
                onClick={handleSaveCommission}
                variant="contained"
                size="large"
                sx={{
                  px: 4,
                  fontWeight: 600,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                }}
              >
                {editMode ? 'Salvar Alterações' : 'Habilitar Agora'}
              </Button>
            </DialogActions>
          </Dialog>

          {/* Modal de Link de Afiliado */}
          <Dialog
            open={affiliateLinkDialog}
            onClose={() => setAffiliateLinkDialog(false)}
            maxWidth="md"
            fullWidth
          >
            <DialogTitle sx={{ fontWeight: 600, fontSize: '1.5rem', pb: 1 }}>
              🎉 Parabéns! Você está afiliado
            </DialogTitle>
            <DialogContent>
              {selectedAffiliate && (
                <Box>
                  <Paper
                    sx={{
                      p: 3,
                      mb: 3,
                      borderRadius: 2,
                      bgcolor: 'success.50',
                      border: '2px solid',
                      borderColor: 'success.main',
                    }}
                  >
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
                      {selectedAffiliate.image_url ? (
                        <img
                          src={selectedAffiliate.image_url}
                          alt={selectedAffiliate.name}
                          style={{
                            width: 80,
                            height: 80,
                            objectFit: 'cover',
                            borderRadius: 8,
                          }}
                        />
                      ) : (
                        <Box
                          sx={{
                            width: 80,
                            height: 80,
                            bgcolor: '#f5f5f5',
                            borderRadius: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <StoreIcon sx={{ fontSize: 40, color: '#bdbdbd' }} />
                        </Box>
                      )}
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="h6" fontWeight={700} gutterBottom>
                          {selectedAffiliate.name}
                        </Typography>
                        <Stack direction="row" spacing={1}>
                          <Chip
                            label={formatCurrency(selectedAffiliate.price)}
                            size="small"
                            color="primary"
                          />
                          <Chip
                            label={`Você ganha: ${formatCurrency((selectedAffiliate.price * selectedAffiliate.commission_percentage) / 100)}`}
                            size="small"
                            color="success"
                            sx={{ fontWeight: 600 }}
                          />
                        </Stack>
                      </Box>
                    </Box>
                  </Paper>

                  <Typography variant="subtitle1" fontWeight={700} gutterBottom sx={{ mb: 2 }}>
                    🔗 Seu Link de Afiliado
                  </Typography>
                  <Paper
                    sx={{
                      p: 2,
                      bgcolor: '#f9f9f9',
                      borderRadius: 2,
                      border: '1px solid #e0e0e0',
                    }}
                  >
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <TextField
                        value={`${window.location.origin}/checkout/${selectedAffiliate.affiliate_link || `aff_${selectedAffiliate.id}`}`}
                        fullWidth
                        InputProps={{
                          readOnly: true,
                          sx: {
                            fontFamily: 'monospace',
                            fontSize: '0.9rem',
                            bgcolor: 'white',
                          },
                        }}
                      />
                      <Tooltip title="Copiar Link">
                        <IconButton
                          color="primary"
                          onClick={() =>
                            copyToClipboard(
                              `${window.location.origin}/checkout/${selectedAffiliate.affiliate_link || `aff_${selectedAffiliate.id}`}`
                            )
                          }
                          sx={{
                            bgcolor: 'primary.main',
                            color: 'white',
                            '&:hover': { bgcolor: 'primary.dark' },
                          }}
                        >
                          <CopyIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Paper>

                  <Paper
                    sx={{
                      p: 3,
                      mt: 3,
                      borderRadius: 2,
                      bgcolor: 'rgba(102, 126, 234, 0.05)',
                      border: '1px solid rgba(102, 126, 234, 0.2)',
                    }}
                  >
                    <Typography variant="subtitle2" fontWeight={700} gutterBottom color="primary">
                      📊 Como Funciona
                    </Typography>
                    <Box component="ul" sx={{ m: 0, pl: 2 }}>
                      <li>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          Compartilhe este link nas suas redes sociais, WhatsApp, email, etc.
                        </Typography>
                      </li>
                      <li>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          Quando alguém comprar através do seu link, você ganha{' '}
                          <strong>{selectedAffiliate.commission_percentage}%</strong> de comissão
                        </Typography>
                      </li>
                      <li>
                        <Typography variant="body2">
                          Acompanhe suas vendas e ganhos na aba "Minhas Afiliações"
                        </Typography>
                      </li>
                    </Box>
                  </Paper>
                </Box>
              )}
            </DialogContent>
            <DialogActions sx={{ p: 3 }}>
              <Button
                onClick={() => setAffiliateLinkDialog(false)}
                variant="contained"
                size="large"
                fullWidth
                sx={{
                  fontWeight: 600,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                }}
              >
                Entendi, vou divulgar!
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
      </Box>
    </>
  );
};

export default Marketplace;
