import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Avatar,
  Grid,
  Divider,
  Alert,
  CircularProgress,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Snackbar,
  styled,
} from '@mui/material';
import {
  Person as PersonIcon,
  VerifiedUser as VerifiedIcon,
  CloudUpload as UploadIcon,
  Badge as BadgeIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Pending as PendingIcon,
  Cancel as CancelIcon,
  PhotoCamera as PhotoCameraIcon,
  Description as DocumentIcon,
} from '@mui/icons-material';
import Header from '../../components/Header/Header';
import { createClient } from '@supabase/supabase-js';
import { getAuthToken } from '../../services/api-supabase';

const API_URL = import.meta.env.VITE_API_URL || '';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

// Initialize Supabase client for file uploads
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

interface UserData {
  id: string;
  name: string;
  email: string;
  cpf_cnpj: string | null;
  phone: string | null;
  verification_status: 'pending' | 'submitted' | 'approved' | 'rejected';
  verification_rejection_reason: string | null;
}

interface VerificationData {
  id: string;
  document_type: string;
  document_front_url: string;
  document_back_url: string | null;
  selfie_url: string;
  full_name: string;
  birth_date: string;
  document_number: string;
  status: string;
  rejection_reason: string | null;
  created_at: string;
}

const UploadBox = styled(Paper)(({ theme }) => ({
  border: '2px dashed #c4c4c4',
  borderRadius: 12,
  padding: theme.spacing(3),
  textAlign: 'center',
  cursor: 'pointer',
  transition: 'all 0.3s ease',
  backgroundColor: '#fafafa',
  '&:hover': {
    borderColor: '#5818C8',
    backgroundColor: '#f5f0ff',
  },
}));

const PreviewImage = styled('img')({
  maxWidth: '100%',
  maxHeight: 200,
  borderRadius: 8,
  objectFit: 'cover',
});

const Settings: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  
  // User data
  const [userData, setUserData] = useState<UserData | null>(null);
  const [_verificationData, setVerificationData] = useState<VerificationData | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    cpf_cnpj: '',
  });
  
  // Verification form
  const [verificationForm, setVerificationForm] = useState({
    document_type: 'cnh',
    full_name: '',
    birth_date: '',
    document_number: '',
  });
  
  // File uploads
  const [documentFront, setDocumentFront] = useState<File | null>(null);
  const [documentBack, setDocumentBack] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [documentFrontPreview, setDocumentFrontPreview] = useState<string>('');
  const [documentBackPreview, setDocumentBackPreview] = useState<string>('');
  const [selfiePreview, setSelfiePreview] = useState<string>('');
  
  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);
  const selfieInputRef = useRef<HTMLInputElement>(null);

  // Token obtido via getAuthToken() importado de api-supabase.ts

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    setLoading(true);
    try {
      const token = await getAuthToken();
      if (!token) {
        setSnackbar({ open: true, message: 'Sessão expirada. Faça login novamente.', severity: 'error' });
        return;
      }
      const response = await fetch(`${API_URL}/api/dashboard-data?type=verification`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const data = await response.json();
      
      if (data.user) {
        setUserData(data.user);
        setFormData({
          name: data.user.name || '',
          phone: data.user.phone || '',
          cpf_cnpj: data.user.cpf_cnpj || '',
        });
        setVerificationForm(prev => ({
          ...prev,
          full_name: data.user.name || '',
          document_number: data.user.cpf_cnpj || '',
        }));
      }
      
      if (data.verification) {
        setVerificationData(data.verification);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      setSnackbar({ open: true, message: 'Erro ao carregar dados do usuário', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const token = await getAuthToken();
      if (!token) {
        setSnackbar({ open: true, message: 'Sessão expirada. Faça login novamente.', severity: 'error' });
        return;
      }
      const response = await fetch(`${API_URL}/api/dashboard-data`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSnackbar({ open: true, message: 'Dados salvos com sucesso!', severity: 'success' });
        loadUserData();
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      setSnackbar({ open: true, message: error.message || 'Erro ao salvar dados', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleFileChange = (type: 'front' | 'back' | 'selfie', file: File | null) => {
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const preview = e.target?.result as string;
      if (type === 'front') {
        setDocumentFront(file);
        setDocumentFrontPreview(preview);
      } else if (type === 'back') {
        setDocumentBack(file);
        setDocumentBackPreview(preview);
      } else {
        setSelfie(file);
        setSelfiePreview(preview);
      }
    };
    reader.readAsDataURL(file);
  };

  const uploadFileToSupabase = async (file: File, folder: string): Promise<string> => {
    // Se Supabase não está configurado, usar upload local ou base64
    if (!supabase) {
      // Converter para base64 como fallback
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
        reader.readAsDataURL(file);
      });
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${userData?.id}/${folder}/${Date.now()}.${fileExt}`;
    
    const { error } = await supabase.storage
      .from('verifications')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true
      });
    
    if (error) {
      console.error('Erro no upload:', error);
      // Fallback para base64 se upload falhar
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Erro ao fazer upload da imagem'));
        reader.readAsDataURL(file);
      });
    }
    
    const { data: urlData } = supabase.storage
      .from('verifications')
      .getPublicUrl(fileName);
    
    return urlData.publicUrl;
  };

  const handleSubmitVerification = async () => {
    // Validações
    if (!documentFront) {
      setSnackbar({ open: true, message: 'Envie a foto do documento (frente)', severity: 'error' });
      return;
    }
    if (!selfie) {
      setSnackbar({ open: true, message: 'Envie sua selfie com o documento', severity: 'error' });
      return;
    }
    if (!verificationForm.full_name || !verificationForm.birth_date || !verificationForm.document_number) {
      setSnackbar({ open: true, message: 'Preencha todos os campos obrigatórios', severity: 'error' });
      return;
    }

    setUploading(true);
    try {
      // Upload dos arquivos
      const documentFrontUrl = await uploadFileToSupabase(documentFront, 'documents');
      const documentBackUrl = documentBack ? await uploadFileToSupabase(documentBack, 'documents') : null;
      const selfieUrl = await uploadFileToSupabase(selfie, 'selfies');

      // Determinar qual URL base usar
      const baseUrl = API_BASE_URL || API_URL;
      const apiEndpoint = baseUrl.includes('/api') ? `${baseUrl}/dashboard-data` : `${baseUrl}/api/dashboard-data`;

      // Enviar verificação via API (usando service role, sem problemas de schema cache)
      const token = await getAuthToken();
      if (!token) {
        throw new Error('Sessão expirada. Faça login novamente.');
      }
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          document_type: verificationForm.document_type,
          document_front_url: documentFrontUrl,
          document_back_url: documentBackUrl,
          selfie_url: selfieUrl,
          full_name: verificationForm.full_name,
          birth_date: verificationForm.birth_date,
          document_number: verificationForm.document_number
        })
      });

      const data = await response.json();

      if (data.success) {
        setSnackbar({ open: true, message: 'Documentos enviados com sucesso! Aguarde a análise.', severity: 'success' });
        // Limpar formulário
        setDocumentFront(null);
        setDocumentBack(null);
        setSelfie(null);
        setDocumentFrontPreview('');
        setDocumentBackPreview('');
        setSelfiePreview('');
        loadUserData();
      } else {
        throw new Error(data.error || 'Erro ao enviar documentos');
      }
    } catch (error: any) {
      console.error('Erro no upload:', error);
      setSnackbar({ open: true, message: error.message || 'Erro ao enviar documentos', severity: 'error' });
    } finally {
      setUploading(false);
    }
  };

  const getStatusChip = (status: string) => {
    switch (status) {
      case 'approved':
        return <Chip icon={<CheckCircleIcon />} label="Verificado" color="success" />;
      case 'submitted':
        return <Chip icon={<PendingIcon />} label="Em Análise" color="warning" />;
      case 'rejected':
        return <Chip icon={<CancelIcon />} label="Rejeitado" color="error" />;
      default:
        return <Chip icon={<WarningIcon />} label="Pendente" color="default" />;
    }
  };

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: '#f8f9fa' }}>
        <Header />
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
            <CircularProgress />
          </Box>
        </Container>
      </Box>
    );
  }

  const isVerified = userData?.verification_status === 'approved';
  const isPending = userData?.verification_status === 'submitted';
  const isRejected = userData?.verification_status === 'rejected';
  const canSubmitVerification = !isVerified && !isPending;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f8f9fa' }}>
      <Header />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h4" fontWeight="bold" mb={4} sx={{ color: '#1e293b' }}>
          Configurações
        </Typography>

        <Grid container spacing={3}>
          {/* Dados Pessoais */}
          <Grid item xs={12} md={6}>
            <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid #e2e8f0' }}>
              <CardContent sx={{ p: 4 }}>
                <Box display="flex" alignItems="center" gap={2} mb={3}>
                  <Avatar sx={{ bgcolor: '#5818C8', width: 48, height: 48 }}>
                    <PersonIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="h6" fontWeight="bold">
                      Dados Pessoais
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Gerencie suas informações pessoais
                    </Typography>
                  </Box>
                </Box>

                <Divider sx={{ my: 3 }} />

                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Nome Completo"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="E-mail"
                      value={userData?.email || ''}
                      disabled
                      helperText="O e-mail não pode ser alterado"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="CPF/CNPJ"
                      value={formData.cpf_cnpj}
                      onChange={(e) => setFormData({ ...formData, cpf_cnpj: e.target.value })}
                      placeholder="000.000.000-00"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Telefone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="(11) 99999-9999"
                    />
                  </Grid>
                </Grid>

                <Button
                  variant="contained"
                  fullWidth
                  onClick={handleSaveProfile}
                  disabled={saving}
                  sx={{ 
                    mt: 3, 
                    py: 1.5, 
                    bgcolor: '#5818C8',
                    '&:hover': { bgcolor: '#4a14a8' }
                  }}
                >
                  {saving ? <CircularProgress size={24} color="inherit" /> : 'Salvar Alterações'}
                </Button>
              </CardContent>
            </Card>
          </Grid>

          {/* Status de Verificação */}
          <Grid item xs={12} md={6}>
            <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid #e2e8f0' }}>
              <CardContent sx={{ p: 4 }}>
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Avatar sx={{ bgcolor: isVerified ? '#10b981' : '#f59e0b', width: 48, height: 48 }}>
                      <VerifiedIcon />
                    </Avatar>
                    <Box>
                      <Typography variant="h6" fontWeight="bold">
                        Verificação de Conta
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Status da sua verificação
                      </Typography>
                    </Box>
                  </Box>
                  {getStatusChip(userData?.verification_status || 'pending')}
                </Box>

                <Divider sx={{ my: 3 }} />

                {isVerified && (
                  <Alert severity="success" icon={<CheckCircleIcon />} sx={{ mb: 2 }}>
                    <Typography fontWeight="bold">Conta Verificada!</Typography>
                    <Typography variant="body2">
                      Sua conta foi verificada com sucesso. Você tem acesso a todos os recursos da plataforma.
                    </Typography>
                  </Alert>
                )}

                {isPending && (
                  <Alert severity="info" icon={<PendingIcon />} sx={{ mb: 2 }}>
                    <Typography fontWeight="bold">Em Análise</Typography>
                    <Typography variant="body2">
                      Seus documentos estão sendo analisados. Aguarde a aprovação para ter acesso completo.
                    </Typography>
                  </Alert>
                )}

                {isRejected && (
                  <Alert severity="error" icon={<CancelIcon />} sx={{ mb: 2 }}>
                    <Typography fontWeight="bold">Verificação Rejeitada</Typography>
                    <Typography variant="body2">
                      Motivo: {userData?.verification_rejection_reason || 'Documentos inválidos'}
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      Você pode enviar novamente os documentos corrigidos.
                    </Typography>
                  </Alert>
                )}

                {!isVerified && !isPending && (
                  <Alert severity="warning" icon={<WarningIcon />} sx={{ mb: 2 }}>
                    <Typography fontWeight="bold">Verificação Necessária</Typography>
                    <Typography variant="body2">
                      Para criar produtos e usar a plataforma, você precisa verificar sua identidade.
                    </Typography>
                  </Alert>
                )}

                <Box sx={{ mt: 2, p: 2, bgcolor: '#f8f9fa', borderRadius: 2 }}>
                  <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                    Benefícios da verificação:
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    • Criar e vender produtos<br />
                    • Receber pagamentos<br />
                    • Solicitar saques<br />
                    • Acesso ao marketplace
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Formulário de Verificação */}
          {canSubmitVerification && (
            <Grid item xs={12}>
              <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid #e2e8f0' }}>
                <CardContent sx={{ p: 4 }}>
                  <Box display="flex" alignItems="center" gap={2} mb={3}>
                    <Avatar sx={{ bgcolor: '#5818C8', width: 48, height: 48 }}>
                      <BadgeIcon />
                    </Avatar>
                    <Box>
                      <Typography variant="h6" fontWeight="bold">
                        Enviar Documentos para Verificação
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Envie sua CNH ou RG + uma selfie segurando o documento
                      </Typography>
                    </Box>
                  </Box>

                  <Divider sx={{ my: 3 }} />

                  <Grid container spacing={3}>
                    {/* Dados do Documento */}
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle1" fontWeight="bold" mb={2}>
                        Informações Pessoais
                      </Typography>
                      
                      <Grid container spacing={2}>
                        <Grid item xs={12}>
                          <FormControl fullWidth>
                            <InputLabel>Tipo de Documento</InputLabel>
                            <Select
                              value={verificationForm.document_type}
                              label="Tipo de Documento"
                              onChange={(e) => setVerificationForm({ ...verificationForm, document_type: e.target.value })}
                            >
                              <MenuItem value="cnh">CNH (Carteira de Motorista)</MenuItem>
                              <MenuItem value="rg">RG (Carteira de Identidade)</MenuItem>
                              <MenuItem value="passport">Passaporte</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid item xs={12}>
                          <TextField
                            fullWidth
                            label="Nome Completo (como no documento)"
                            value={verificationForm.full_name}
                            onChange={(e) => setVerificationForm({ ...verificationForm, full_name: e.target.value })}
                            required
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            fullWidth
                            label="Data de Nascimento"
                            type="date"
                            value={verificationForm.birth_date}
                            onChange={(e) => setVerificationForm({ ...verificationForm, birth_date: e.target.value })}
                            InputLabelProps={{ shrink: true }}
                            required
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            fullWidth
                            label="CPF"
                            value={verificationForm.document_number}
                            onChange={(e) => setVerificationForm({ ...verificationForm, document_number: e.target.value })}
                            placeholder="000.000.000-00"
                            required
                          />
                        </Grid>
                      </Grid>
                    </Grid>

                    {/* Upload de Documentos */}
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle1" fontWeight="bold" mb={2}>
                        Upload de Documentos
                      </Typography>
                      
                      <Grid container spacing={2}>
                        {/* Frente do Documento */}
                        <Grid item xs={12} sm={6}>
                          <input
                            type="file"
                            accept="image/*"
                            ref={frontInputRef}
                            style={{ display: 'none' }}
                            onChange={(e) => handleFileChange('front', e.target.files?.[0] || null)}
                          />
                          <UploadBox onClick={() => frontInputRef.current?.click()}>
                            {documentFrontPreview ? (
                              <PreviewImage src={documentFrontPreview} alt="Frente do documento" />
                            ) : (
                              <>
                                <DocumentIcon sx={{ fontSize: 48, color: '#9ca3af', mb: 1 }} />
                                <Typography variant="body2" fontWeight="bold">
                                  Frente do Documento *
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  Clique para enviar
                                </Typography>
                              </>
                            )}
                          </UploadBox>
                        </Grid>

                        {/* Verso do Documento */}
                        <Grid item xs={12} sm={6}>
                          <input
                            type="file"
                            accept="image/*"
                            ref={backInputRef}
                            style={{ display: 'none' }}
                            onChange={(e) => handleFileChange('back', e.target.files?.[0] || null)}
                          />
                          <UploadBox onClick={() => backInputRef.current?.click()}>
                            {documentBackPreview ? (
                              <PreviewImage src={documentBackPreview} alt="Verso do documento" />
                            ) : (
                              <>
                                <DocumentIcon sx={{ fontSize: 48, color: '#9ca3af', mb: 1 }} />
                                <Typography variant="body2" fontWeight="bold">
                                  Verso do Documento
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  Opcional para CNH
                                </Typography>
                              </>
                            )}
                          </UploadBox>
                        </Grid>

                        {/* Selfie */}
                        <Grid item xs={12}>
                          <input
                            type="file"
                            accept="image/*"
                            ref={selfieInputRef}
                            style={{ display: 'none' }}
                            onChange={(e) => handleFileChange('selfie', e.target.files?.[0] || null)}
                          />
                          <UploadBox onClick={() => selfieInputRef.current?.click()}>
                            {selfiePreview ? (
                              <PreviewImage src={selfiePreview} alt="Selfie" />
                            ) : (
                              <>
                                <PhotoCameraIcon sx={{ fontSize: 48, color: '#9ca3af', mb: 1 }} />
                                <Typography variant="body2" fontWeight="bold">
                                  Selfie segurando o documento *
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  Tire uma foto sua segurando o documento ao lado do rosto
                                </Typography>
                              </>
                            )}
                          </UploadBox>
                        </Grid>
                      </Grid>
                    </Grid>
                  </Grid>

                  <Alert severity="info" sx={{ mt: 3 }}>
                    <Typography variant="body2">
                      <strong>Dicas para uma boa verificação:</strong><br />
                      • Certifique-se de que as fotos estejam nítidas e legíveis<br />
                      • Na selfie, segure o documento ao lado do rosto em um local bem iluminado<br />
                      • Todas as informações do documento devem estar visíveis
                    </Typography>
                  </Alert>

                  <Button
                    variant="contained"
                    fullWidth
                    onClick={handleSubmitVerification}
                    disabled={uploading}
                    startIcon={uploading ? <CircularProgress size={20} color="inherit" /> : <UploadIcon />}
                    sx={{ 
                      mt: 3, 
                      py: 1.5, 
                      bgcolor: '#5818C8',
                      '&:hover': { bgcolor: '#4a14a8' }
                    }}
                  >
                    {uploading ? 'Enviando documentos...' : 'Enviar para Verificação'}
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>

        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          <Alert 
            onClose={() => setSnackbar({ ...snackbar, open: false })} 
            severity={snackbar.severity}
            sx={{ width: '100%' }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Container>
    </Box>
  );
};

export default Settings;
