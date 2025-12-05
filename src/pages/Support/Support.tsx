import { useState, useRef, useEffect } from 'react';
import {
  Box,
  Paper,
  TextField,
  IconButton,
  Typography,
  Container,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  CircularProgress,
  Grid,
  Chip,
  ListItemButton,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import PersonIcon from '@mui/icons-material/Person';
import Header from '../../components/Header/Header';
import LiveHelpIcon from '@mui/icons-material/LiveHelp';
import ContactSupportIcon from '@mui/icons-material/ContactSupport';
import PhoneIcon from '@mui/icons-material/Phone';
import EmailIcon from '@mui/icons-material/Email';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import AccessTimeIcon from '@mui/icons-material/AccessTime';

interface Message {
  text: string;
  isBot: boolean;
  timestamp: Date;
}

const commonQuestions = [
  "Como faço para começar a receber pagamentos?",
  "Quais são as taxas cobradas?",
  "Como funciona o processo de saque?",
  "Quanto tempo leva para o dinheiro cair na minha conta?",
  "Como integro a ZucroPay ao meu site?",
];

const supportChannels = [
  {
    icon: <WhatsAppIcon />,
    title: "WhatsApp",
    description: "Atendimento rápido via mensagem",
    available: true,
  },
  {
    icon: <PhoneIcon />,
    title: "Telefone",
    description: "Suporte por voz em horário comercial",
    available: true,
  },
  {
    icon: <EmailIcon />,
    title: "E-mail",
    description: "Suporte detalhado por e-mail",
    available: true,
  },
];

export default function Support() {
  const [messages, setMessages] = useState<Message[]>([
    {
      text: "Olá! Eu sou o assistente virtual da Zucropay. Como posso ajudar você hoje?",
      isBot: true,
      timestamp: new Date(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const newMessage: Message = {
      text: inputMessage,
      isBot: false,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, newMessage]);
    setInputMessage('');
    setIsTyping(true);

    setTimeout(() => {
      const botResponse: Message = {
        text: "Estou processando sua solicitação. Como posso ajudar com mais detalhes?",
        isBot: true,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botResponse]);
      setIsTyping(false);
    }, 1500);
  };

  return (
    <>
      <Header />
      <Box sx={{ bgcolor: '#fafafa', minHeight: '100vh', pt: 3 }}>
        <Container maxWidth="xl">
          {/* Page Header */}
          <Box sx={{ mb: 4, pl: 2 }}>
            <Typography variant="h4" sx={{ color: '#7c4dff', fontWeight: 600, mb: 1 }}>
              Central de Suporte
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Estamos aqui para ajudar você 24 horas por dia, 7 dias por semana
            </Typography>
          </Box>

          <Grid container spacing={3}>
            {/* Left Side - Support Info */}
            <Grid item xs={12} md={4}>
              {/* Perguntas Frequentes */}
              <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1 }}>
                  <LiveHelpIcon sx={{ color: '#7c4dff' }} />
                  <Typography variant="h6">Perguntas Frequentes</Typography>
                </Box>
                <List sx={{ py: 0 }}>
                  {commonQuestions.map((question, index) => (
                    <ListItemButton
                      key={index}
                      sx={{
                        py: 1.5,
                        px: 2,
                        '&:hover': { bgcolor: '#f3e5f5', borderRadius: 1 },
                      }}
                    >
                      <ListItemText 
                        primary={question}
                        primaryTypographyProps={{
                          fontSize: '0.95rem',
                          color: '#666',
                        }}
                      />
                    </ListItemButton>
                  ))}
                </List>
              </Paper>

              {/* Canais de Atendimento */}
              <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1 }}>
                  <ContactSupportIcon sx={{ color: '#7c4dff' }} />
                  <Typography variant="h6">Canais de Atendimento</Typography>
                </Box>
                <List sx={{ py: 0 }}>
                  {supportChannels.map((channel, index) => (
                    <ListItem 
                      key={index}
                      sx={{ 
                        px: 0,
                        py: 1.5,
                        borderBottom: index !== supportChannels.length - 1 ? '1px solid #f0f0f0' : 'none'
                      }}
                    >
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: '#7c4dff' }}>
                          {channel.icon}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={channel.title}
                        secondary={channel.description}
                      />
                      <Chip
                        label="Disponível"
                        size="small"
                        sx={{
                          bgcolor: '#e8f5e9',
                          color: '#2e7d32',
                          fontSize: '0.75rem',
                        }}
                      />
                    </ListItem>
                  ))}
                </List>
              </Paper>

              {/* Horário de Atendimento */}
              <Paper sx={{ p: 3, borderRadius: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1 }}>
                  <AccessTimeIcon sx={{ color: '#7c4dff' }} />
                  <Typography variant="h6">Horário de Atendimento</Typography>
                </Box>
                <List sx={{ py: 0 }}>
                  <ListItem sx={{ px: 0, py: 1 }}>
                    <ListItemText
                      primary="Chat AI"
                      secondary="24 horas, 7 dias por semana"
                    />
                  </ListItem>
                  <ListItem sx={{ px: 0, py: 1 }}>
                    <ListItemText
                      primary="WhatsApp"
                      secondary="24 horas, 7 dias por semana"
                    />
                  </ListItem>
                  <ListItem sx={{ px: 0, py: 1 }}>
                    <ListItemText
                      primary="Telefone"
                      secondary="Segunda a Sexta, 9h às 18h"
                    />
                  </ListItem>
                  <ListItem sx={{ px: 0, py: 1 }}>
                    <ListItemText
                      primary="E-mail"
                      secondary="Resposta em até 24 horas úteis"
                    />
                  </ListItem>
                </List>
              </Paper>
            </Grid>

            {/* Right Side - Chat Interface */}
            <Grid item xs={12} md={8}>
              <Paper
                elevation={0}
                sx={{
                  height: 'calc(100vh - 200px)',
                  display: 'flex',
                  flexDirection: 'column',
                  borderRadius: 2,
                  border: '1px solid #e0e0e0',
                }}
              >
                {/* Chat Header */}
                <Box
                  sx={{
                    p: 2,
                    bgcolor: '#7c4dff',
                    color: 'white',
                    borderTopLeftRadius: 8,
                    borderTopRightRadius: 8,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <SmartToyIcon />
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 500 }}>
                        Assistente Virtual
                      </Typography>
                      <Typography variant="caption">
                        Online - Resposta instantânea
                      </Typography>
                    </Box>
                  </Box>
                </Box>

                {/* Messages Area */}
                <Box
                  sx={{
                    flex: 1,
                    overflow: 'auto',
                    p: 3,
                    bgcolor: '#ffffff',
                  }}
                >
                  <List>
                    {messages.map((message, index) => (
                      <ListItem
                        key={index}
                        sx={{
                          flexDirection: message.isBot ? 'row' : 'row-reverse',
                          alignItems: 'flex-start',
                          mb: 2,
                          px: 0,
                        }}
                      >
                        <ListItemAvatar>
                          <Avatar
                            sx={{
                              bgcolor: message.isBot ? '#7c4dff' : '#e0e0e0',
                            }}
                          >
                            {message.isBot ? <SmartToyIcon /> : <PersonIcon />}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          sx={{
                            margin: 0,
                            '& .MuiListItemText-primary': {
                              background: message.isBot ? '#f3e5f5' : '#e3f2fd',
                              padding: '12px 16px',
                              borderRadius: 2,
                              display: 'inline-block',
                              maxWidth: '80%',
                            },
                          }}
                          primary={
                            <>
                              <Typography variant="body1">{message.text}</Typography>
                              <Typography
                                variant="caption"
                                sx={{ display: 'block', mt: 1, color: 'text.secondary' }}
                              >
                                {message.timestamp.toLocaleTimeString()}
                              </Typography>
                            </>
                          }
                        />
                      </ListItem>
                    ))}
                    {isTyping && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 2 }}>
                        <CircularProgress size={20} sx={{ color: '#7c4dff' }} />
                        <Typography variant="body2" color="text.secondary">
                          Assistente está digitando...
                        </Typography>
                      </Box>
                    )}
                  </List>
                  <div ref={messagesEndRef} />
                </Box>

                {/* Input Area */}
                <Box
                  sx={{
                    p: 2,
                    bgcolor: '#ffffff',
                    borderTop: '1px solid #e0e0e0',
                  }}
                >
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <TextField
                      fullWidth
                      variant="outlined"
                      placeholder="Digite sua mensagem..."
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleSendMessage();
                        }
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          '&.Mui-focused fieldset': {
                            borderColor: '#7c4dff',
                          },
                        },
                      }}
                    />
                    <IconButton
                      onClick={handleSendMessage}
                      sx={{
                        bgcolor: '#7c4dff',
                        color: 'white',
                        '&:hover': {
                          bgcolor: '#6c3fff',
                        },
                      }}
                    >
                      <SendIcon />
                    </IconButton>
                  </Box>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </Container>
      </Box>
    </>
  );
} 