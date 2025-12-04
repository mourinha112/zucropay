// ZucroPay API Service
// Comunicação com backend PHP

import { getBackendUrl, getRequiredHeaders } from '../config/config';

// URL base dinâmica - lê da configuração
const getApiBaseUrl = (): string => {
  return getBackendUrl();
};

// Armazenamento do token
export const setAuthToken = (token: string | null) => {
  if (token) {
    localStorage.setItem('zucropay_token', token);
  } else {
    localStorage.removeItem('zucropay_token');
  }
};

// Token atual
const getAuthToken = () => {
  return localStorage.getItem('zucropay_token');
};

// Headers padrão
const getHeaders = () => {
  // Inicia com headers baseados no modo (inclui ngrok-skip-browser-warning se necessário)
  const headers = getRequiredHeaders();
  
  // SEMPRE pegar do localStorage para garantir token atualizado
  const token = localStorage.getItem('zucropay_token');
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
};

// Função genérica para fazer requisições
async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const API_BASE_URL = getApiBaseUrl(); // URL dinâmica
  const url = `${API_BASE_URL}/${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      ...getHeaders(),
      ...options.headers,
    },
  });
  
  // Verificar se a resposta é JSON
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    const text = await response.text();
    console.error('Resposta não é JSON:', text.substring(0, 500));
    throw new Error('Servidor retornou HTML ao invés de JSON. Verifique se o backend está rodando corretamente.');
  }
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || 'Erro na requisição');
  }
  
  return data;
}

// ========== AUTENTICAÇÃO ==========
export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  cpfCnpj?: string;
  phone?: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  cpfCnpj?: string;
  phone?: string;
  avatar?: string;
  balance: number;
  asaasCustomerId?: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  token: string;
  user: User;
}

export const login = async (data: LoginData): Promise<AuthResponse> => {
  const response = await request<AuthResponse>('login.php', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  
  if (response.token) {
    setAuthToken(response.token);
    // Salvar dados do usuário também
    localStorage.setItem('zucropay_user', JSON.stringify(response.user));
  }
  
  return response;
};

export const register = async (data: RegisterData): Promise<AuthResponse> => {
  const response = await request<AuthResponse>('register.php', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  
  if (response.token) {
    setAuthToken(response.token);
    // Salvar dados do usuário também
    localStorage.setItem('zucropay_user', JSON.stringify(response.user));
  }
  
  return response;
};

export const logout = () => {
  setAuthToken(null);
};

// ========== SALDO E TRANSAÇÕES ==========
export interface Balance {
  available: number;
  pending: number;
  total: number;
}

export interface Transaction {
  id: number;
  type: string;
  amount: number;
  status: string;
  description: string;
  createdAt: string;
}

export const getBalance = async (): Promise<{ success: boolean; balance: Balance }> => {
  return request<{ success: boolean; balance: Balance }>('balance.php');
};

export const deposit = async (amount: number, description?: string) => {
  return request('deposit.php', {
    method: 'POST',
    body: JSON.stringify({ amount, description }),
  });
};

export const withdraw = async (amount: number, bankAccount: any) => {
  return request('withdraw.php', {
    method: 'POST',
    body: JSON.stringify({ amount, bankAccount }),
  });
};

export const getTransactions = async (limit = 50, offset = 0, type?: string) => {
  const params = new URLSearchParams({ limit: limit.toString(), offset: offset.toString() });
  if (type) params.append('type', type);
  
  return request<{ success: boolean; transactions: Transaction[] }>(
    `transactions.php?${params.toString()}`
  );
};

// ========== PRODUTOS ==========
export interface Product {
  id?: number;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  stock?: number;
  active?: boolean;
}

export const getProducts = async () => {
  return request<{ success: boolean; products: Product[] }>('products.php');
};

export const getProduct = async (id: number) => {
  return request<{ success: boolean; product: Product }>(`products.php?id=${id}`);
};

export const createProduct = async (product: Product) => {
  return request('products.php', {
    method: 'POST',
    body: JSON.stringify(product),
  });
};

export const updateProduct = async (id: number, product: Partial<Product>) => {
  return request('products.php', {
    method: 'PUT',
    body: JSON.stringify({ id, ...product }),
  });
};

export const deleteProduct = async (id: number) => {
  return request('products.php', {
    method: 'DELETE',
    body: JSON.stringify({ id }),
  });
};

// ========== MARKETPLACE ==========
export interface MarketplaceProduct extends Product {
  owner_name?: string;
  affiliate_count?: number;
  is_affiliated?: boolean;
}

export interface Affiliate {
  id: number;
  product_id: number;
  affiliate_user_id: number;
  product_owner_id: number;
  affiliate_link: string;
  commission_percentage: number;
  total_sales: number;
  total_earned: number;
  status: 'active' | 'inactive';
  created_at: string;
  product_name?: string;
  product_description?: string;
  product_price?: number;
  product_image?: string;
  owner_name?: string;
  owner_email?: string;
}

// Listar produtos do marketplace (público)
export const getMarketplaceProducts = async () => {
  return request<{ success: boolean; products: MarketplaceProduct[] }>('marketplace.php');
};

// Listar meus produtos (para habilitar/desabilitar no marketplace)
export const getMyMarketplaceProducts = async () => {
  return request<{ success: boolean; products: MarketplaceProduct[] }>('marketplace.php?my-products=1');
};

// Listar minhas afiliações
export const getMyAffiliates = async () => {
  return request<{ success: boolean; affiliates: Affiliate[] }>('marketplace.php?my-affiliates=1');
};

// Afiliar-se a um produto
export const affiliateToProduct = async (productId: number) => {
  return request('marketplace.php?affiliate=1', {
    method: 'POST',
    body: JSON.stringify({ productId }),
  });
};

// Habilitar/desabilitar produto no marketplace
export const toggleProductMarketplace = async (
  productId: number,
  marketplaceEnabled: boolean,
  commissionPercentage?: number
) => {
  return request('marketplace.php', {
    method: 'PUT',
    body: JSON.stringify({
      productId,
      marketplaceEnabled: marketplaceEnabled ? 1 : 0,
      commissionPercentage: commissionPercentage || 30,
    }),
  });
};

// Cancelar afiliação
export const cancelAffiliation = async (affiliateId: number) => {
  return request(`marketplace.php?id=${affiliateId}`, {
    method: 'DELETE',
  });
};

// Upload de imagem
export const uploadImage = async (file: File): Promise<{ success: boolean; url: string; filename: string }> => {
  const formData = new FormData();
  formData.append('image', file);
  
  const token = localStorage.getItem('zucropay_token');
  const API_BASE_URL = getApiBaseUrl(); // URL dinâmica
  
  try {
    const response = await fetch(`${API_BASE_URL}/upload-image.php`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        ...getRequiredHeaders(), // Headers dinâmicos baseados no modo
      },
      body: formData,
    });
    
    // Tentar pegar o texto da resposta primeiro
    const text = await response.text();
    
    // Tentar fazer parse do JSON
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error('Resposta não é JSON:', text);
      throw new Error('Erro no servidor. Verifique se o backend está rodando corretamente.');
    }
    
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Erro ao fazer upload');
    }
    
    return data;
  } catch (error: any) {
    console.error('Erro no upload:', error);
    throw error;
  }
};

// ========== LINKS DE PAGAMENTO ==========
export interface PaymentLink {
  id?: number;
  productId?: number;
  name: string;
  description?: string;
  amount: number;
  billingType?: 'BOLETO' | 'CREDIT_CARD' | 'PIX' | 'UNDEFINED';
  url?: string;
  active?: boolean;
  clicks?: number;
  paymentsCount?: number;
  totalReceived?: number;
}

export const getPaymentLinks = async () => {
  return request<{ success: boolean; paymentLinks: PaymentLink[] }>('payment-links.php');
};

export const createPaymentLink = async (link: PaymentLink) => {
  return request('payment-links.php', {
    method: 'POST',
    body: JSON.stringify(link),
  });
};

export const deletePaymentLink = async (id: number) => {
  return request('payment-links.php', {
    method: 'DELETE',
    body: JSON.stringify({ id }),
  });
};

// ========== CLIENTES ==========
export interface Customer {
  id?: number;
  name: string;
  cpfCnpj: string;
  email?: string;
  phone?: string;
}

export const getCustomers = async () => {
  return request<{ success: boolean; customers: Customer[] }>('customers.php');
};

export const createCustomer = async (customer: Customer) => {
  return request('customers.php', {
    method: 'POST',
    body: JSON.stringify(customer),
  });
};

export const deleteCustomer = async (id: number) => {
  return request('customers.php', {
    method: 'DELETE',
    body: JSON.stringify({ id }),
  });
};

// ========== PAGAMENTOS/COBRANÇAS ==========
export interface Payment {
  customerId: number;
  billingType: 'BOLETO' | 'CREDIT_CARD' | 'PIX' | 'UNDEFINED';
  value: number;
  dueDate: string;
  description?: string;
}

export const getPayments = async () => {
  return request<{ success: boolean; payments: any[] }>('payments.php');
};

export const createPayment = async (payment: Payment) => {
  return request('payments.php', {
    method: 'POST',
    body: JSON.stringify(payment),
  });
};

// ========== PERSONALIZAÇÃO DE CHECKOUT ==========
export interface CheckoutCustomization {
  id?: number;
  product_id: number;
  logo_url?: string;
  banner_url?: string;
  background_image_url?: string;
  primary_color?: string;
  secondary_color?: string;
  text_color?: string;
  background_color?: string;
  countdown_enabled?: boolean;
  countdown_minutes?: number;
  countdown_text?: string;
  guarantee_enabled?: boolean;
  guarantee_days?: number;
  guarantee_text?: string;
  testimonials_enabled?: boolean;
  testimonials?: Array<{
    name: string;
    text: string;
    avatar?: string;
    rating?: number;
  }>;
  faq_enabled?: boolean;
  faq?: Array<{
    question: string;
    answer: string;
  }>;
  security_badges_enabled?: boolean;
  whatsapp_support?: string;
  custom_css?: string;
}

export const getCheckoutCustomization = async (productId: number): Promise<CheckoutCustomization> => {
  return request<CheckoutCustomization>(`checkout-customization.php?product_id=${productId}`);
};

export const saveCheckoutCustomization = async (customization: CheckoutCustomization) => {
  return request('checkout-customization.php', {
    method: 'POST',
    body: JSON.stringify(customization),
  });
};

export const deleteCheckoutCustomization = async (productId: number) => {
  return request(`checkout-customization.php?product_id=${productId}`, {
    method: 'DELETE',
  });
};

// ========== PUBLIC CHECKOUT (SEM AUTENTICAÇÃO) ==========
export const getPublicPaymentLink = async (linkId: string) => {
  const API_BASE_URL = getApiBaseUrl(); // URL dinâmica
  
  // Não usa autenticação - é público!
  const response = await fetch(`${API_BASE_URL}/public-payment-link.php?id=${linkId}`, {
    method: 'GET',
    headers: getRequiredHeaders(), // Headers dinâmicos baseados no modo
  });

  if (!response.ok) {
    throw new Error('Link de pagamento não encontrado');
  }

  // Validar se a resposta é JSON
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    const text = await response.text();
    console.error('Resposta não é JSON:', text.substring(0, 500));
    throw new Error('Resposta inválida do servidor');
  }

  return response.json();
};

export const createPublicPayment = async (data: {
  linkId: string;
  customer: {
    name: string;
    email: string;
    cpfCnpj: string;
    phone: string;
  };
  billingType: 'PIX' | 'CREDIT_CARD' | 'BOLETO';
  creditCard?: {
    number: string;
    name: string;
    expiryMonth: string;
    expiryYear: string;
    ccv: string;
  };
}) => {
  const API_BASE_URL = getApiBaseUrl(); // URL dinâmica
  
  // Não usa autenticação - é público!
  const response = await fetch(`${API_BASE_URL}/public-payment.php`, {
    method: 'POST',
    headers: getRequiredHeaders(), // Headers dinâmicos baseados no modo
    body: JSON.stringify(data),
  });

  // Validar se a resposta é JSON
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    const text = await response.text();
    console.error('Resposta não é JSON:', text.substring(0, 500));
    throw new Error('Resposta inválida do servidor');
  }

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || 'Erro ao processar pagamento');
  }

  return result;
};

export default {
  // Auth
  login,
  register,
  logout,
  setAuthToken,
  getAuthToken,
  
  // Balance
  getBalance,
  deposit,
  withdraw,
  getTransactions,
  
  // Products
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  
  // Payment Links
  getPaymentLinks,
  createPaymentLink,
  deletePaymentLink,
  
  // Customers
  getCustomers,
  createCustomer,
  deleteCustomer,
  
  // Payments
  getPayments,
  createPayment,
  
  // Checkout Customization
  getCheckoutCustomization,
  saveCheckoutCustomization,
  deleteCheckoutCustomization,
  
  // Public Checkout (sem autenticação)
  getPublicPaymentLink,
  createPublicPayment,
};
