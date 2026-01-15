import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  CardMedia,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Chip,
  MenuItem,
  CardActions,
  Alert,
  Snackbar,
  Skeleton,
  Grid,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Link as LinkIcon,
  QrCode as QrCodeIcon,
  ContentCopy as CopyIcon,
  ShoppingCart as ShoppingCartIcon,
  Settings as SettingsIcon,
  Warning as WarningIcon,
  VerifiedUser as VerifiedUserIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/Header/Header';
import * as api from '../../services/api-supabase';
import dataCache from '../../services/data-cache';

const API_URL = import.meta.env.VITE_API_URL || '';

interface Product {
  id?: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  stock?: number;
  active?: boolean;
  totalSales?: number;
  totalReceived?: number;
  links?: PaymentLink[];
}

interface PaymentLink {
  id?: string;
  productId?: string;
  url?: string;
  name?: string;
  amount?: number;
  active?: boolean;
  clicks?: number;
  paymentsCount?: number;
  totalReceived?: number;
}

const Products: React.FC = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [paymentLinks, setPaymentLinks] = useState<PaymentLink[]>([]);
  const [_loading, setLoading] = useState(true);
  const [openProductDialog, setOpenProductDialog] = useState(false);
  const [openLinkDialog, setOpenLinkDialog] = useState(false);
  const [openLinkCreatedDialog, setOpenLinkCreatedDialog] = useState(false);
  const [createdLinkUrl, setCreatedLinkUrl] = useState('');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [verificationStatus, setVerificationStatus] = useState<string>('pending');
  
  const [formData, setFormData] = useState<Product>({
    name: '',
    description: '',
    price: 0,
    imageUrl: '',
    stock: undefined,
    active: true,
  });
  
  const [linkFormData, setLinkFormData] = useState({
    billingType: 'UNDEFINED' as 'BOLETO' | 'CREDIT_CARD' | 'PIX' | 'UNDEFINED',
  });

  const isVerified = verificationStatus === 'approved';

  useEffect(() => {
    loadData();
    loadVerificationStatus();
  }, []);

  // Carregar status de verificação
  const loadVerificationStatus = async () => {
    try {
      const token = localStorage.getItem('zucropay_token');
      const response = await fetch(`${API_URL}/api/dashboard-data?type=verification`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (data.user?.verification_status) {
        setVerificationStatus(data.user.verification_status);
      }
    } catch (error) {
      console.error('Erro ao verificar status:', error);
    }
  };

  // Carregar tudo de uma vez via API otimizada COM CACHE
  const loadData = async (forceRefresh = false) => {
    // Primeiro, verificar se tem dados em cache para mostrar instantaneamente
    const cached = dataCache.getCached<any>('products');
    if (cached?.success && !forceRefresh) {
      setProducts(cached.products || []);
      setPaymentLinks(cached.links || []);
      setLoading(false);
      // Revalidar em background
      revalidateInBackground();
      return;
    }

    setLoading(true);
    try {
      const result = await dataCache.getProducts();
      
      if (result.success) {
        setProducts(result.products || []);
        setPaymentLinks(result.links || []);
      }
    } catch (error: any) {
      showSnackbar(error.message || 'Erro ao carregar dados', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Revalidar dados em background sem mostrar loading
  const revalidateInBackground = async () => {
    try {
      const token = localStorage.getItem('zucropay_token');
      const response = await fetch(`${API_URL}/api/produtos-data`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const result = await response.json();
      if (result.success) {
        setProducts(result.products || []);
        setPaymentLinks(result.links || []);
      }
    } catch (error) {
      console.error('Background revalidation failed:', error);
    }
  };

  // Manter funções antigas para ações específicas
  const loadProducts = () => loadData();
  const loadPaymentLinks = () => loadData();

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleOpenProductDialog = (product?: Product) => {
    // Se não está verificado e não está editando, mostrar aviso
    if (!isVerified && !product) {
      showSnackbar('Você precisa verificar sua conta para criar produtos. Acesse Configurações.', 'error');
      return;
    }
    
    if (product) {
      setEditingProduct(product);
      setFormData(product);
      setImagePreview(product.imageUrl || '');
    } else {
      setEditingProduct(null);
      setFormData({
        name: '',
        description: '',
        price: 0,
        imageUrl: '',
        stock: undefined,
        active: true,
      });
      setImagePreview('');
    }
    setOpenProductDialog(true);
  };

  const handleCloseProductDialog = () => {
    setOpenProductDialog(false);
    setEditingProduct(null);
    setImagePreview('');
    setUploading(false);
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tamanho (máx 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showSnackbar('Imagem muito grande. Tamanho máximo: 5MB', 'error');
      return;
    }

    // Validar tipo
    if (!file.type.startsWith('image/')) {
      showSnackbar('Por favor, selecione uma imagem válida', 'error');
      return;
    }

    setUploading(true);
    try {
      const result = await api.uploadImage(file);
      // URL já vem completa do Supabase Storage
      const imageUrl = result.url;
      setFormData({ ...formData, imageUrl });
      setImagePreview(imageUrl);
      showSnackbar('Imagem enviada com sucesso!', 'success');
    } catch (error: any) {
      showSnackbar(error.message || 'Erro ao fazer upload da imagem', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProduct = async () => {
    try {
      if (editingProduct?.id) {
        await api.updateProduct(editingProduct.id, formData);
        showSnackbar('Produto atualizado com sucesso!', 'success');
        
        // Limpar cache do checkout para atualizar automaticamente
        const link = getProductLink(editingProduct.id);
        if (link?.url) {
          const linkId = link.url.split('/').pop();
          if (linkId) {
            sessionStorage.removeItem(`checkout_${linkId}`);
          }
        }
      } else {
        await api.createProduct(formData);
        showSnackbar('Produto criado com sucesso!', 'success');
      }
      handleCloseProductDialog();
      loadProducts();
      loadPaymentLinks();
    } catch (error: any) {
      showSnackbar(error.message || 'Erro ao salvar produto', 'error');
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este produto?')) {
      try {
        await api.deleteProduct(id);
        showSnackbar('Produto excluído com sucesso!', 'success');
        loadProducts();
      } catch (error: any) {
        showSnackbar(error.message || 'Erro ao excluir produto', 'error');
      }
    }
  };

  const handleGenerateLink = async () => {
    if (!selectedProduct) return;
    
    try {
      const linkData = {
        productId: selectedProduct.id,
        name: selectedProduct.name,
        description: selectedProduct.description || '',
        amount: selectedProduct.price,
        billingType: linkFormData.billingType,
      };
      
      const result = await api.createPaymentLink(linkData);
      
      // Gerar URL do checkout
      const checkoutUrl = `${window.location.origin}/checkout/${result.paymentLink.id}`;
      setCreatedLinkUrl(checkoutUrl);
      setOpenLinkDialog(false);
      setOpenLinkCreatedDialog(true);
      setSelectedProduct(null);
      loadPaymentLinks();
    } catch (error: any) {
      showSnackbar(error.message || 'Erro ao criar link', 'error');
    }
  };

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    showSnackbar('Link copiado para a área de transferência!', 'success');
  };

  const getProductLink = (productId: string) => {
    return paymentLinks.find(link => link.productId === productId);
  };

  return (
    <>
      <Header />
      <Box sx={{ minHeight: '100vh', backgroundColor: '#fafafa', py: 4 }}>
        <Container maxWidth="lg">
          {/* Alerta de Verificação */}
          {!isVerified && (
            <Alert 
              severity={verificationStatus === 'submitted' ? 'info' : 'warning'}
              icon={verificationStatus === 'submitted' ? <VerifiedUserIcon /> : <WarningIcon />}
              sx={{ mb: 3, borderRadius: 2 }}
              action={
                verificationStatus !== 'submitted' && (
                  <Button color="inherit" size="small" onClick={() => navigate('/configuracoes')}>
                    Verificar Agora
                  </Button>
                )
              }
            >
              {verificationStatus === 'submitted' ? (
                <>
                  <strong>Verificação em análise!</strong> Aguarde a aprovação para criar produtos.
                </>
              ) : verificationStatus === 'rejected' ? (
                <>
                  <strong>Verificação rejeitada.</strong> Acesse as configurações para enviar novamente.
                </>
              ) : (
                <>
                  <strong>Conta não verificada.</strong> Para criar produtos e receber pagamentos, você precisa verificar sua identidade.
                </>
              )}
            </Alert>
          )}

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
            <Box>
              <Typography variant="h4" component="h1" gutterBottom>
                🛍️ Produtos
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Gerencie seus produtos e crie links de pagamento
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenProductDialog()}
              disabled={!isVerified}
              sx={{
                background: isVerified 
                  ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
                  : '#e0e0e0',
                '&:hover': {
                  background: isVerified 
                    ? 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)'
                    : '#e0e0e0',
                },
              }}
            >
              Novo Produto
            </Button>
          </Box>

          {/* Lista de Produtos */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 3 }}>
            {products.map((product) => {
              const link = getProductLink(product.id!);
              
              return (
                <Box key={product.id}>
                  <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    {product.imageUrl && (
                      <CardMedia
                        component="img"
                        height="200"
                        image={product.imageUrl}
                        alt={product.name}
                        sx={{ objectFit: 'cover' }}
                      />
                    )}
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                        <Typography variant="h6" component="h2">
                          {product.name}
                        </Typography>
                        <Chip
                          label={product.active ? 'Ativo' : 'Inativo'}
                          color={product.active ? 'success' : 'default'}
                          size="small"
                        />
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {product.description || 'Sem descrição'}
                      </Typography>
                      <Typography variant="h5" color="primary" sx={{ mb: 1 }}>
                        R$ {product.price.toFixed(2)}
                      </Typography>
                      {product.stock !== undefined && (
                        <Typography variant="caption" color="text.secondary">
                          Estoque: {product.stock} unidades
                        </Typography>
                      )}
                      
                      {link && (
                        <Box sx={{ mt: 2, p: 1, bgcolor: '#f0f0f0', borderRadius: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LinkIcon fontSize="small" color="primary" />
                            <Typography variant="caption" sx={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {link.paymentsCount || 0} vendas • R$ {(link.totalReceived || 0).toFixed(2)}
                            </Typography>
                            <IconButton size="small" onClick={() => handleCopyLink(link.url!)}>
                              <CopyIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        </Box>
                      )}
                    </CardContent>
                    <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                      <Box>
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleOpenProductDialog(product)}
                          title="Editar produto"
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          sx={{ color: '#7B2FF7' }}
                          onClick={() => navigate(`/produtos/personalizar/${product.id}`)}
                          title="Personalizar checkout"
                        >
                          <SettingsIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteProduct(product.id!)}
                          title="Deletar produto"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<QrCodeIcon />}
                        onClick={() => {
                          setSelectedProduct(product);
                          setOpenLinkDialog(true);
                        }}
                        disabled={!!link}
                      >
                        {link ? 'Link Criado' : 'Gerar Link'}
                      </Button>
                    </CardActions>
                  </Card>
                </Box>
              );
            })}
          </Box>

          {products.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <ShoppingCartIcon sx={{ fontSize: 80, color: '#ddd', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                Nenhum produto cadastrado
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                {isVerified 
                  ? 'Comece criando seu primeiro produto' 
                  : 'Verifique sua conta para começar a criar produtos'}
              </Typography>
              <Button
                variant="contained"
                startIcon={isVerified ? <AddIcon /> : <VerifiedUserIcon />}
                onClick={() => isVerified ? handleOpenProductDialog() : navigate('/configuracoes')}
              >
                {isVerified ? 'Criar Produto' : 'Verificar Conta'}
              </Button>
            </Box>
          )}
        </Container>
      </Box>

      {/* Dialog Criar/Editar Produto */}
      <Dialog open={openProductDialog} onClose={handleCloseProductDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingProduct ? 'Editar Produto' : 'Novo Produto'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              label="Nome do Produto"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="Descrição"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              multiline
              rows={3}
              fullWidth
            />
            <TextField
              label="Preço (R$)"
              type="number"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
              fullWidth
              required
              inputProps={{ step: '0.01', min: '0' }}
            />
            
            {/* Upload de Imagem */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1, color: '#666' }}>
                Imagem do Produto
              </Typography>
              
              {imagePreview && (
                <Box
                  sx={{
                    width: '100%',
                    height: 200,
                    borderRadius: 2,
                    mb: 2,
                    overflow: 'hidden',
                    border: '2px solid #e5e7eb',
                    backgroundImage: `url(${imagePreview})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                />
              )}
              
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  variant="outlined"
                  component="label"
                  fullWidth
                  disabled={uploading}
                  sx={{ py: 1.5 }}
                >
                  {uploading ? 'Enviando...' : imagePreview ? 'Trocar Imagem' : 'Escolher Imagem'}
                  <input
                    type="file"
                    hidden
                    accept="image/*"
                    onChange={handleImageUpload}
                  />
                </Button>
                
                {imagePreview && (
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={() => {
                      setFormData({ ...formData, imageUrl: '' });
                      setImagePreview('');
                    }}
                  >
                    Remover
                  </Button>
                )}
              </Box>
              
              <Typography variant="caption" sx={{ display: 'block', mt: 1, color: '#999' }}>
                Formatos aceitos: JPEG, PNG, GIF, WEBP (máx. 5MB)
              </Typography>
            </Box>
            
            <TextField
              label="Estoque"
              type="number"
              value={formData.stock || ''}
              onChange={(e) => setFormData({ ...formData, stock: e.target.value ? parseInt(e.target.value) : undefined })}
              fullWidth
              placeholder="Deixe em branco para estoque ilimitado"
            />
            <TextField
              label="Status"
              select
              value={formData.active ? 'true' : 'false'}
              onChange={(e) => setFormData({ ...formData, active: e.target.value === 'true' })}
              fullWidth
            >
              <MenuItem value="true">Ativo</MenuItem>
              <MenuItem value="false">Inativo</MenuItem>
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseProductDialog}>Cancelar</Button>
          <Button
            onClick={handleSaveProduct}
            variant="contained"
            disabled={!formData.name || formData.price <= 0}
          >
            {editingProduct ? 'Atualizar' : 'Criar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Gerar Link de Pagamento */}
      <Dialog open={openLinkDialog} onClose={() => setOpenLinkDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Gerar Link de Pagamento</DialogTitle>
        <DialogContent>
          {selectedProduct && (
            <Box sx={{ mt: 2 }}>
              <Alert severity="info" sx={{ mb: 3 }}>
                Você está gerando um link de pagamento para: <strong>{selectedProduct.name}</strong>
              </Alert>
              <TextField
                label="Tipo de Pagamento"
                select
                value={linkFormData.billingType}
                onChange={(e) => setLinkFormData({ ...linkFormData, billingType: e.target.value as any })}
                fullWidth
                helperText="Escolha o método de pagamento ou deixe indefinido para aceitar todos"
              >
                <MenuItem value="UNDEFINED">Todos os métodos</MenuItem>
                <MenuItem value="PIX">PIX</MenuItem>
                <MenuItem value="BOLETO">Boleto</MenuItem>
                <MenuItem value="CREDIT_CARD">Cartão de Crédito</MenuItem>
              </TextField>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenLinkDialog(false)}>Cancelar</Button>
          <Button onClick={handleGenerateLink} variant="contained">
            Gerar Link
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Link Criado */}
      <Dialog open={openLinkCreatedDialog} onClose={() => setOpenLinkCreatedDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: '#4caf50', color: 'white' }}>
          ✅ Link Criado com Sucesso!
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Alert severity="success" sx={{ mb: 3 }}>
            Seu link de checkout está pronto para ser compartilhado!
          </Alert>
          <Typography variant="subtitle2" gutterBottom>
            Link do Checkout:
          </Typography>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1, 
            p: 2, 
            bgcolor: '#f5f5f5', 
            borderRadius: 1,
            border: '1px solid #ddd'
          }}>
            <Typography 
              variant="body2" 
              sx={{ 
                flex: 1, 
                wordBreak: 'break-all',
                fontFamily: 'monospace',
                fontSize: '0.85rem'
              }}
            >
              {createdLinkUrl}
            </Typography>
            <IconButton 
              color="primary" 
              onClick={() => {
                navigator.clipboard.writeText(createdLinkUrl);
                showSnackbar('Link copiado!', 'success');
              }}
            >
              <CopyIcon />
            </IconButton>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenLinkCreatedDialog(false)}>
            Fechar
          </Button>
          <Button 
            variant="contained" 
            startIcon={<CopyIcon />}
            onClick={() => {
              navigator.clipboard.writeText(createdLinkUrl);
              showSnackbar('Link copiado!', 'success');
            }}
          >
            Copiar Link
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default Products;
