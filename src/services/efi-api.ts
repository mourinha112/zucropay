// ZucroPay - EfiBank API Service
// Serviço para comunicação com a API da EfiBank via Vercel

import { getAuthToken } from '../config/supabase';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

// ========================================
// FUNÇÃO AUXILIAR
// ========================================

const callEfiAPI = async (action: string, params: Record<string, unknown> = {}): Promise<any> => {
  const token = await getAuthToken();

  try {
    const response = await fetch(`${API_BASE_URL}/efi-api`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ action, ...params }),
    });

    const responseText = await response.text();
    if (!responseText) {
      throw new Error('API EfiBank retornou resposta vazia');
    }

    let result;
    try {
      result = JSON.parse(responseText);
    } catch {
      console.error('Invalid JSON response from EfiBank API:', responseText);
      throw new Error('Resposta inválida da API EfiBank');
    }

    return result;
  } catch (error: any) {
    console.error('callEfiAPI error:', error);
    throw new Error(error.message || 'Erro ao conectar com a API EfiBank');
  }
};

// ========================================
// STATUS DA API
// ========================================

export const getEfiStatus = async (): Promise<{
  success: boolean;
  message?: string;
  configured?: boolean;
  sandbox?: boolean;
  hasPixKey?: boolean;
}> => {
  try {
    const response = await fetch(`${API_BASE_URL}/efi-api`, {
      method: 'GET',
    });
    return await response.json();
  } catch (error: any) {
    return { success: false, message: error.message };
  }
};

// ========================================
// PIX
// ========================================

export const createPixCharge = async (params: {
  value: number;
  description?: string;
  customerName?: string;
  customerCpf?: string;
  expiration?: number;
}): Promise<{
  success: boolean;
  message?: string;
  payment?: {
    txid: string;
    status: string;
    value: number;
    pixCopyPaste: string;
    pixQrCode: string;
    locationId: number;
    expiration: number;
    createdAt: string;
  };
}> => {
  return callEfiAPI('createPixCharge', params);
};

export const getPixCharge = async (txid: string): Promise<{
  success: boolean;
  message?: string;
  payment?: {
    txid: string;
    status: string;
    value: number;
    paidValue?: number;
    paidAt?: string;
  };
}> => {
  return callEfiAPI('getPixCharge', { txid });
};

export const getPixQrCode = async (locationId: number): Promise<{
  success: boolean;
  message?: string;
  qrCode?: {
    qrcode: string;
    imagemQrcode: string;
  };
}> => {
  return callEfiAPI('getPixQrCode', { locationId });
};

// ========================================
// CARTÃO DE CRÉDITO
// ========================================

export interface CardCustomer {
  name: string;
  email: string;
  cpf: string;
  birth?: string;
  phone?: string;
}

export interface CardPayment {
  paymentToken: string;
}

export interface BillingAddress {
  street: string;
  number: string;
  neighborhood: string;
  zipcode: string;
  city: string;
  state: string;
}

export const createCardCharge = async (params: {
  value: number;
  description?: string;
  installments?: number;
  customer: CardCustomer;
  card: CardPayment;
  billingAddress?: BillingAddress;
}): Promise<{
  success: boolean;
  message?: string;
  payment?: {
    chargeId: number;
    status: string;
    total: number;
    installments: number;
    installmentValue: number;
  };
}> => {
  return callEfiAPI('createCardCharge', params);
};

export const getCardCharge = async (chargeId: number): Promise<{
  success: boolean;
  message?: string;
  payment?: any;
}> => {
  return callEfiAPI('getCardCharge', { chargeId });
};

// ========================================
// BOLETO
// ========================================

export interface BoletoCustomer {
  name: string;
  email: string;
  cpf: string;
  phone?: string;
}

export const createBoletoCharge = async (params: {
  value: number;
  description?: string;
  customer: BoletoCustomer;
  dueDate?: string;
  message?: string;
}): Promise<{
  success: boolean;
  message?: string;
  payment?: {
    chargeId: number;
    status: string;
    barcode: string;
    boletoUrl: string;
    boletoPdf: string;
    expireAt: string;
  };
}> => {
  return callEfiAPI('createBoletoCharge', params);
};

export const getBoletoCharge = async (chargeId: number): Promise<{
  success: boolean;
  message?: string;
  payment?: any;
}> => {
  return callEfiAPI('getBoletoCharge', { chargeId });
};

// ========================================
// STATUS DE PAGAMENTO
// ========================================

export const getPaymentStatus = async (
  paymentType: 'PIX' | 'CARD' | 'BOLETO',
  paymentId: string
): Promise<{
  success: boolean;
  message?: string;
  payment?: any;
}> => {
  return callEfiAPI('getPaymentStatus', { paymentType, paymentId });
};

// ========================================
// HELPERS
// ========================================

// Mapear status da EfiBank para status interno
export const mapEfiStatus = (status: string, paymentType: 'PIX' | 'CARD' | 'BOLETO'): string => {
  if (paymentType === 'PIX') {
    const statusMap: Record<string, string> = {
      'ATIVA': 'PENDING',
      'CONCLUIDA': 'RECEIVED',
      'REMOVIDA_PELO_USUARIO_RECEBEDOR': 'CANCELLED',
      'REMOVIDA_PELO_PSP': 'EXPIRED',
    };
    return statusMap[status] || status;
  }

  // Cartão e Boleto
  const statusMap: Record<string, string> = {
    'new': 'PENDING',
    'waiting': 'PENDING',
    'approved': 'RECEIVED',
    'paid': 'RECEIVED',
    'unpaid': 'OVERDUE',
    'refunded': 'REFUNDED',
    'contested': 'CHARGEBACK',
    'canceled': 'CANCELLED',
  };
  return statusMap[status] || status.toUpperCase();
};

// Verificar se pagamento foi confirmado
export const isPaymentConfirmed = (status: string): boolean => {
  const confirmedStatuses = ['RECEIVED', 'CONFIRMED', 'CONCLUIDA', 'approved', 'paid'];
  return confirmedStatuses.includes(status);
};

