import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Alert,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Divider,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  ContentCopy as CopyIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import Header from '../../components/Header/Header';
import * as api from '../../services/api-supabase';

interface Webhook {
  id: string;
  url: string;
  secret: string;
  events: string[];
  status: 'active' | 'inactive' | 'failed';
  last_success_at: string | null;
  last_failure_at: string | null;
  failure_count: number;
  created_at: string;
}

const WebhooksConfig: React.FC = () => {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<Webhook | null>(null);
  const [copiedSecret, setCopiedSecret] = useState('');
  
  // Form state
  const [url, setUrl] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>([
    'PAYMENT_RECEIVED',
    'PAYMENT_PENDING',
    'PAYMENT_OVERDUE',
  ]);
  const [message, setMessage] = useState({ type: '', text: '' });

  const availableEvents = [
    { value: 'PAYMENT_RECEIVED', label: 'Pagamento Confirmado', description: 'Quando o pagamento é confirmado' },
    { value: 'PAYMENT_PENDING', label: 'Pagamento Pendente', description: 'Quando o pagamento é criado' },
    { value: 'PAYMENT_OVERDUE', label: 'Pagamento Vencido', description: 'Quando o pagamento vence' },
    { value: 'PAYMENT_REFUNDED', label: 'Pagamento Estornado', description: 'Quando o pagamento é estornado' },
  ];

  useEffect(() => {
    loadWebhooks();
  }, []);

  const loadWebhooks = async () => {
    try {
      const result = await api.getWebhooks();
      if (result.success) {
        setWebhooks(result.webhooks);
      }
    } catch (error) {
      console.error('Erro ao carregar webhooks:', error);
      showMessage('error', 'Erro ao carregar webhooks');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (webhook?: Webhook) => {
    if (webhook) {
      setEditingWebhook(webhook);
      setUrl(webhook.url);
      setSelectedEvents(webhook.events || []);
    } else {
      setEditingWebhook(null);
      setUrl('');
      setSelectedEvents(['PAYMENT_RECEIVED', 'PAYMENT_PENDING', 'PAYMENT_OVERDUE']);
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingWebhook(null);
    setUrl('');
    setSelectedEvents([]);
  };

  const handleSaveWebhook = async () => {
    if (!url) {
      showMessage('error', 'URL é obrigatória');
      return;
    }

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      showMessage('error', 'URL deve começar com http:// ou https://');
      return;
    }

    try {
      let result;
      
      if (editingWebhook) {
        result = await api.updateWebhook(editingWebhook.id, {
          url,
          events: selectedEvents,
        });
      } else {
        result = await api.createWebhook({
          url,
          events: selectedEvents,
        });
      }
      
      if (result.success) {
        showMessage('success', result.message);
        loadWebhooks();
        handleCloseDialog();
      }
    } catch (error: any) {
      console.error('Erro ao salvar webhook:', error);
      showMessage('error', error.message || 'Erro ao salvar webhook');
    }
  };

  const handleDeleteWebhook = async (id: string) => {
    if (!confirm('Tem certeza que deseja deletar este webhook?')) {
      return;
    }

    try {
      const result = await api.deleteWebhook(id);
      
      if (result.success) {
        showMessage('success', 'Webhook deletado com sucesso');
        loadWebhooks();
      }
    } catch (error: any) {
      console.error('Erro ao deletar webhook:', error);
      showMessage('error', error.message || 'Erro ao deletar webhook');
    }
  };

  const handleToggleStatus = async (webhook: Webhook) => {
    const newStatus = webhook.status === 'active' ? 'inactive' : 'active';
    
    try {
      const result = await api.updateWebhook(webhook.id, { status: newStatus });
      
      if (result.success) {
        showMessage('success', `Webhook ${newStatus === 'active' ? 'ativado' : 'desativado'}`);
        loadWebhooks();
      } else {
        showMessage('error', data.message);
      }
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      showMessage('error', 'Erro ao atualizar status');
    }
  };

  const handleCopySecret = (secret: string) => {
    navigator.clipboard.writeText(secret);
    setCopiedSecret(secret);
    setTimeout(() => setCopiedSecret(''), 2000);
  };

  const handleEventToggle = (event: string) => {
    setSelectedEvents(prev =>
      prev.includes(event)
        ? prev.filter(e => e !== event)
        : [...prev, event]
    );
  };

  const showMessage = (type: string, text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'inactive':
        return 'default';
      case 'failed':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'Ativo';
      case 'inactive':
        return 'Inativo';
      case 'failed':
        return 'Falhando';
      default:
        return status;
    }
  };

  return (
    <>
      <Header />
      <Box sx={{ minHeight: '100vh', backgroundColor: '#f5f5f5', pt: 10 }}>
        <Box sx={{ maxWidth: '1400px', mx: 'auto', p: 3 }}>
          {/* Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
            <Box>
              <Typography variant="h4" fontWeight={600} gutterBottom>
                🔔 Webhooks
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Configure URLs para receber notificações em tempo real sobre pagamentos
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
            >
              Novo Webhook
            </Button>
          </Box>

          {/* Message Alert */}
          {message.text && (
            <Alert severity={message.type as any} sx={{ mb: 3 }} onClose={() => setMessage({ type: '', text: '' })}>
              {message.text}
            </Alert>
          )}

          {/* Info Card */}
          <Paper sx={{ p: 3, mb: 4, bgcolor: '#e3f2fd' }}>
            <Typography variant="h6" fontWeight={600} gutterBottom color="primary">
              📖 Como funcionam os Webhooks?
            </Typography>
            <Typography variant="body2" paragraph>
              Webhooks enviam notificações HTTP para sua aplicação quando eventos importantes acontecem, como confirmação de pagamento.
            </Typography>
            <Box component="ul" sx={{ pl: 3, m: 0 }}>
              <li><Typography variant="body2">Configure uma URL que receberá as notificações</Typography></li>
              <li><Typography variant="body2">Escolha quais eventos você quer receber</Typography></li>
              <li><Typography variant="body2">Valide a assinatura usando o secret fornecido</Typography></li>
              <li><Typography variant="body2">Responda com status 200 para confirmar o recebimento</Typography></li>
            </Box>
          </Paper>

          {/* Webhooks Table */}
          <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
            {loading ? (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <Typography>Carregando webhooks...</Typography>
              </Box>
            ) : webhooks.length === 0 ? (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  Nenhum webhook configurado
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Clique em "Novo Webhook" para configurar sua primeira URL
                </Typography>
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>URL</strong></TableCell>
                      <TableCell><strong>Eventos</strong></TableCell>
                      <TableCell><strong>Status</strong></TableCell>
                      <TableCell><strong>Secret</strong></TableCell>
                      <TableCell><strong>Última Tentativa</strong></TableCell>
                      <TableCell align="right"><strong>Ações</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {webhooks.map((webhook) => (
                      <TableRow key={webhook.id}>
                        <TableCell>
                          <Typography variant="body2" sx={{ maxWidth: 300, wordBreak: 'break-all' }}>
                            {webhook.url}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {webhook.events.map((event) => (
                              <Chip
                                key={event}
                                label={event}
                                size="small"
                                color="primary"
                                variant="outlined"
                              />
                            ))}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={getStatusLabel(webhook.status)}
                            color={getStatusColor(webhook.status) as any}
                            size="small"
                            onClick={() => handleToggleStatus(webhook)}
                            sx={{ cursor: 'pointer' }}
                          />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                              {webhook.secret.substring(0, 12)}...
                            </Typography>
                            <Tooltip title={copiedSecret === webhook.secret ? 'Copiado!' : 'Copiar'}>
                              <IconButton
                                size="small"
                                onClick={() => handleCopySecret(webhook.secret)}
                              >
                                <CopyIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                        <TableCell>
                          {webhook.last_success_at ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <CheckCircleIcon fontSize="small" color="success" />
                              <Typography variant="body2">
                                {new Date(webhook.last_success_at).toLocaleString('pt-BR')}
                              </Typography>
                            </Box>
                          ) : webhook.last_failure_at ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <ErrorIcon fontSize="small" color="error" />
                              <Typography variant="body2">
                                {new Date(webhook.last_failure_at).toLocaleString('pt-BR')}
                              </Typography>
                            </Box>
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              Nunca usado
                            </Typography>
                          )}
                          {webhook.failure_count > 0 && (
                            <Typography variant="caption" color="error">
                              {webhook.failure_count} falha(s)
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="right">
                          <IconButton
                            size="small"
                            onClick={() => handleOpenDialog(webhook)}
                            color="primary"
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteWebhook(webhook.id)}
                            color="error"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>

          {/* Example Code */}
          <Paper sx={{ p: 4, mt: 4, bgcolor: '#1e1e1e', color: '#d4d4d4' }}>
            <Typography variant="h6" fontWeight={600} gutterBottom sx={{ color: '#fff' }}>
              📝 Exemplo de implementação do webhook
            </Typography>
            <Typography variant="body2" sx={{ mb: 2, color: '#aaa' }}>
              Código PHP para receber e validar webhooks:
            </Typography>
            <pre style={{ margin: 0, overflow: 'auto', fontSize: '0.875rem' }}>
              <code>{`<?php
// webhook.php
$payload = file_get_contents('php://input');
$data = json_decode($payload, true);

// Validar assinatura
$signature = $_SERVER['HTTP_X_ZUCROPAY_SIGNATURE'] ?? '';
$secret = 'SEU_WEBHOOK_SECRET'; // Use o secret da tabela
$expectedSignature = hash_hmac('sha256', $payload, $secret);

if (!hash_equals($expectedSignature, $signature)) {
    http_response_code(401);
    exit('Assinatura inválida');
}

// Processar evento
switch ($data['event']) {
    case 'PAYMENT_RECEIVED':
        // Pagamento confirmado!
        $paymentId = $data['payment']['id'];
        $value = $data['payment']['value'];
        
        // Atualizar seu banco de dados
        // Enviar email
        // Liberar produto
        break;
}

// Sempre retornar 200
http_response_code(200);
echo json_encode(['received' => true]);`}</code>
            </pre>
          </Paper>
        </Box>
      </Box>

      {/* Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" fontWeight={600}>
              {editingWebhook ? 'Editar Webhook' : 'Novo Webhook'}
            </Typography>
            <IconButton onClick={handleCloseDialog}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="URL do Webhook"
              placeholder="https://sua-loja.com.br/webhook.php"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              sx={{ mb: 3 }}
              helperText="URL que receberá as notificações. Deve ser HTTPS em produção."
            />

            <Divider sx={{ mb: 2 }} />

            <Typography variant="subtitle2" fontWeight={600} gutterBottom>
              Eventos a Receber:
            </Typography>
            <FormGroup>
              {availableEvents.map((event) => (
                <FormControlLabel
                  key={event.value}
                  control={
                    <Checkbox
                      checked={selectedEvents.includes(event.value)}
                      onChange={() => handleEventToggle(event.value)}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2" fontWeight={500}>
                        {event.label}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {event.description}
                      </Typography>
                    </Box>
                  }
                />
              ))}
            </FormGroup>

            {editingWebhook && (
              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  <strong>Secret atual:</strong> {editingWebhook.secret}
                </Typography>
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleSaveWebhook}
            disabled={!url || selectedEvents.length === 0}
          >
            {editingWebhook ? 'Salvar' : 'Criar Webhook'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default WebhooksConfig;
