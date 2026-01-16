// ZucroPay API Service - Supabase Version
// Comunicação completa via Supabase + EfiBank

import { supabase, callEfiAPI, uploadFile, isSupabaseConfigured } from '../config/supabase';

// Re-exportar para compatibilidade (deprecado)
export { callEfiAPI as callAsaasAPI } from '../config/supabase';

export { isSupabaseConfigured };

// ========================================
// HELPER: Obter token atualizado da sessão
// ========================================

/**
 * Obtém o token de autenticação atualizado da sessão do Supabase.
 * O Supabase renova automaticamente tokens expirados.
 * Atualiza o localStorage para manter sincronizado.
 */
export const getAuthToken = async (): Promise<string | null> => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session) {
      // Sessão expirada ou inválida - limpar localStorage
      localStorage.removeItem('zucropay_token');
      return null;
    }
    // Atualizar localStorage com token atual
    localStorage.setItem('zucropay_token', session.access_token);
    return session.access_token;
  } catch {
    return null;
  }
};

// ========================================
// TIPOS E INTERFACES
// ========================================

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
  id: string;
  name: string;
  email: string;
  cpfCnpj?: string;
  phone?: string;
  avatar?: string;
  balance: number;
  efiCustomerId?: string;  // ID na EfiBank
}

export interface AuthResponse {
  success: boolean;
  message: string;
  user: User;
}

export interface Balance {
  available: number;
  pending: number;
  total: number;
}

export interface Transaction {
  id: string;
  type: string;
  amount: number;
  status: string;
  description: string;
  createdAt: string;
  efiTxid?: string;       // PIX txid
  efiChargeId?: string;   // Cartão/Boleto charge_id
  efiTransferId?: string; // Transferência
}

export interface Product {
  id?: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  stock?: number;
  active?: boolean;
  marketplaceEnabled?: boolean;
  commissionPercentage?: number;
}

export interface Customer {
  id?: string;
  name: string;
  cpfCnpj: string;
  email?: string;
  phone?: string;
  efiCustomerId?: string;  // ID do cliente na EfiBank
}

export interface Payment {
  customerId: string;
  billingType: 'BOLETO' | 'CREDIT_CARD' | 'PIX' | 'UNDEFINED';
  value: number;
  dueDate: string;
  description?: string;
}

export interface PaymentLink {
  id?: string;
  productId?: string;
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

export interface CheckoutCustomization {
  id?: string;
  product_id?: string;
  productId?: string | number;
  productName?: string;
  logo_url?: string;
  logoUrl?: string;
  banner_url?: string;
  bannerUrl?: string;
  background_image_url?: string;
  backgroundUrl?: string;
  primary_color?: string;
  primaryColor?: string;
  secondary_color?: string;
  secondaryColor?: string;
  text_color?: string;
  textColor?: string;
  background_color?: string;
  backgroundColor?: string;
  buttonColor?: string;
  countdown_enabled?: boolean;
  countdown_minutes?: number;
  countdown_text?: string;
  // Timer (alias for countdown)
  timerEnabled?: boolean;
  timerMinutes?: number;
  timerMessage?: string;
  guarantee_enabled?: boolean;
  guaranteeEnabled?: boolean;
  guarantee_days?: number;
  guaranteeDays?: number;
  guarantee_text?: string;
  guaranteeText?: string;
  testimonials_enabled?: boolean;
  showTestimonials?: boolean;
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

export interface MarketplaceProduct extends Product {
  owner_name?: string;
  affiliate_count?: number;
  is_affiliated?: boolean;
}

export interface Affiliate {
  id: string;
  product_id: string;
  affiliate_user_id: string;
  product_owner_id: string;
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

// ========================================
// AUTENTICAÇÃO
// ========================================

export const login = async (data: LoginData): Promise<AuthResponse> => {
  // Login via Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: data.email,
    password: data.password,
  });

  if (authError) {
    throw new Error(authError.message);
  }

  if (!authData.user || !authData.session) {
    throw new Error('Falha no login');
  }

  // Salvar token no localStorage para o PrivateRoute funcionar
  localStorage.setItem('zucropay_token', authData.session.access_token);

  // Buscar dados completos do usuário
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', authData.user.id)
    .single();

  if (userError) {
    throw new Error(userError.message);
  }

  // Salvar dados do usuário no localStorage
  const user = {
    id: userData.id,
    name: userData.name,
    email: userData.email,
    cpfCnpj: userData.cpf_cnpj,
    phone: userData.phone,
    avatar: userData.avatar,
    balance: userData.balance,
    asaasCustomerId: userData.asaas_customer_id,
    asaasApiKey: userData.asaas_api_key,
  };
  localStorage.setItem('zucropay_user', JSON.stringify(user));

  return {
    success: true,
    message: 'Login realizado com sucesso',
    user,
  };
};

export const register = async (data: RegisterData): Promise<AuthResponse> => {
  // Registrar via Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
  });

  if (authError) {
    throw new Error(authError.message);
  }

  if (!authData.user) {
    throw new Error('Falha no registro');
  }

  // Criar registro na tabela users
  const { error: userError } = await supabase
    .from('users')
    .insert({
      id: authData.user.id,
      name: data.name,
      email: data.email,
      cpf_cnpj: data.cpfCnpj,
      phone: data.phone,
      password_hash: '', // Hash será gerenciado pelo Supabase Auth
    });

  if (userError) {
    // Se falhar ao criar o usuário, deletar da auth
    await supabase.auth.admin.deleteUser(authData.user.id);
    throw new Error(userError.message);
  }

  // Buscar usuário completo
  const { data: userData } = await supabase
    .from('users')
    .select('*')
    .eq('id', authData.user.id)
    .single();

  return {
    success: true,
    message: 'Registro realizado com sucesso',
    user: {
      id: userData.id,
      name: userData.name,
      email: userData.email,
      cpfCnpj: userData.cpf_cnpj,
      phone: userData.phone,
      avatar: userData.avatar,
      balance: userData.balance,
    },
  };
};

export const logout = async () => {
  // Limpar localStorage
  localStorage.removeItem('zucropay_token');
  localStorage.removeItem('zucropay_user');
  
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
};

export const getCurrentUser = async (): Promise<User | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return null;

  const { data: userData } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!userData) return null;

  return {
    id: userData.id,
    name: userData.name,
    email: userData.email,
    cpfCnpj: userData.cpf_cnpj,
    phone: userData.phone,
    avatar: userData.avatar,
    balance: userData.balance,
    efiCustomerId: userData.efi_customer_id,
  };
};

// ========================================
// SALDO E TRANSAÇÕES
// ========================================

export const getBalance = async (): Promise<{ success: boolean; balance: Balance }> => {
  const user = await getCurrentUser();
  if (!user) throw new Error('Usuário não autenticado');

  // Buscar saldo disponível
  const available = user.balance;

  // Calcular saldo pendente
  const { data: pendingTransactions } = await supabase
    .from('transactions')
    .select('amount')
    .eq('user_id', user.id)
    .eq('status', 'pending')
    .in('type', ['deposit', 'payment_received']);

  const pending = pendingTransactions?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;

  return {
    success: true,
    balance: {
      available,
      pending,
      total: available + pending,
    },
  };
};

export const deposit = async (amount: number, description?: string) => {
  const user = await getCurrentUser();
  if (!user) throw new Error('Usuário não autenticado');

  // Criar cobrança PIX via EfiBank
  const response = await callEfiAPI('createPixCharge', {
    value: amount,
    description: description || 'Depósito via PIX',
    customerName: user.name,
    customerCpf: user.cpfCnpj?.replace(/\D/g, ''),
    expiration: 3600, // 1 hora
  });

  if (!response.success) {
    throw new Error(response.message || 'Erro ao gerar cobrança PIX');
  }

  const pixPayment = response.payment;

  // Criar transação pendente
  const { data: transaction } = await supabase
    .from('transactions')
    .insert({
      user_id: user.id,
      type: 'deposit',
      amount,
      status: 'pending',
      description: description || 'Depósito via PIX',
      efi_txid: pixPayment.txid,
    })
    .select()
    .single();

  return {
    success: true,
    message: 'QR Code PIX gerado com sucesso',
    payment: {
      id: pixPayment.txid,
      value: amount,
      status: 'pending',
    },
    // Formato compatível com o frontend existente
    pix: {
      payload: pixPayment.pixCopyPaste,
      encodedImage: pixPayment.pixQrCode,
      expirationDate: pixPayment.expiration,
    },
    transaction,
  };
};

export const withdraw = async (amount: number, bankAccount: any) => {
  const user = await getCurrentUser();
  if (!user) throw new Error('Usuário não autenticado');

  if (user.balance < amount) {
    throw new Error('Saldo insuficiente');
  }

  if (amount < 10) {
    throw new Error('Valor mínimo para saque: R$ 10,00');
  }

  // Criar solicitação de saque no banco
  // A transferência será processada pelo admin via EfiBank
  const { data: withdrawalRequest, error } = await supabase
    .from('withdrawal_requests')
    .insert({
      user_id: user.id,
      amount,
      status: 'pending',
      bank_code: bankAccount.bank,
      bank_name: bankAccount.bankName || bankAccount.bank,
      agency: bankAccount.agency,
      account: bankAccount.account,
      account_digit: bankAccount.accountDigit,
      account_type: bankAccount.accountType || 'CONTA_CORRENTE',
      holder_name: bankAccount.name,
      holder_cpf_cnpj: bankAccount.cpfCnpj?.replace(/\D/g, ''),
      pix_key: bankAccount.pixKey || null,
    })
    .select()
    .single();

  if (error) {
    // Se a tabela não existir, criar transação diretamente
    const { data: transaction } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        type: 'withdraw',
        amount,
        status: 'pending',
        description: `Saque para ${bankAccount.name}`,
        metadata: { bankAccount },
      })
      .select()
      .single();

    // Subtrair do saldo
    await supabase
      .from('users')
      .update({ balance: user.balance - amount })
      .eq('id', user.id);

    return {
      success: true,
      message: 'Saque solicitado com sucesso! Será processado em até 1 dia útil.',
      transaction,
    };
  }

  // Criar transação de saque
  const { data: transaction } = await supabase
    .from('transactions')
    .insert({
      user_id: user.id,
      type: 'withdraw',
      amount,
      status: 'pending',
      description: `Saque para ${bankAccount.name}`,
    })
    .select()
    .single();

  // Subtrair do saldo
  await supabase
    .from('users')
    .update({ balance: user.balance - amount })
    .eq('id', user.id);

  return {
    success: true,
    message: 'Saque solicitado com sucesso! Será processado em até 1 dia útil.',
    transaction,
    withdrawalRequest,
  };
};

export const getTransactions = async (limit = 50, offset = 0, type?: string) => {
  const user = await getCurrentUser();
  if (!user) throw new Error('Usuário não autenticado');

  let query = supabase
    .from('transactions')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (type) {
    query = query.eq('type', type);
  }

  const { data: transactions, error } = await query;

  if (error) throw new Error(error.message);

  return {
    success: true,
    transactions: transactions.map(t => ({
      id: t.id,
      type: t.type,
      amount: t.amount,
      status: t.status,
      description: t.description,
      createdAt: t.created_at,
      asaasPaymentId: t.asaas_payment_id,
      asaasTransferId: t.asaas_transfer_id,
    })),
  };
};

// ========================================
// PRODUTOS
// ========================================

export const getProducts = async () => {
  const user = await getCurrentUser();
  if (!user) throw new Error('Usuário não autenticado');

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  return {
    success: true,
    products: data.map(p => ({
      id: p.id,
      name: p.name,
      description: p.description,
      price: p.price,
      imageUrl: p.image_url,
      stock: p.stock,
      active: p.active,
      marketplaceEnabled: p.marketplace_enabled,
      commissionPercentage: p.commission_percentage,
    })),
  };
};

export const getProduct = async (id: string) => {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw new Error(error.message);

  return {
    success: true,
    product: {
      id: data.id,
      name: data.name,
      description: data.description,
      price: data.price,
      imageUrl: data.image_url,
      stock: data.stock,
      active: data.active,
      marketplaceEnabled: data.marketplace_enabled,
      commissionPercentage: data.commission_percentage,
    },
  };
};

export const createProduct = async (product: Product & { fee_payer?: 'seller' | 'buyer' }) => {
  const user = await getCurrentUser();
  if (!user) throw new Error('Usuário não autenticado');

  const { data, error } = await supabase
    .from('products')
    .insert({
      user_id: user.id,
      name: product.name,
      description: product.description,
      price: product.price,
      image_url: product.imageUrl,
      stock: product.stock,
      active: product.active !== false,
      fee_payer: product.fee_payer || 'seller', // Quem paga a taxa
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  return {
    success: true,
    message: 'Produto criado com sucesso',
    product: data,
  };
};

export const updateProduct = async (id: string, product: Partial<Product & { fee_payer?: 'seller' | 'buyer' }>) => {
  const updateData: any = {};

  if (product.name !== undefined) updateData.name = product.name;
  if (product.description !== undefined) updateData.description = product.description;
  if (product.price !== undefined) updateData.price = product.price;
  if (product.imageUrl !== undefined) updateData.image_url = product.imageUrl;
  if (product.stock !== undefined) updateData.stock = product.stock;
  if (product.active !== undefined) updateData.active = product.active;
  if (product.marketplaceEnabled !== undefined) updateData.marketplace_enabled = product.marketplaceEnabled;
  if (product.commissionPercentage !== undefined) updateData.commission_percentage = product.commissionPercentage;
  if (product.fee_payer !== undefined) updateData.fee_payer = product.fee_payer;

  const { error } = await supabase
    .from('products')
    .update(updateData)
    .eq('id', id);

  if (error) throw new Error(error.message);

  return {
    success: true,
    message: 'Produto atualizado com sucesso',
  };
};

export const deleteProduct = async (id: string) => {
  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);

  return {
    success: true,
    message: 'Produto excluído com sucesso',
  };
};

// ========================================
// UPLOAD DE IMAGEM
// ========================================

export const uploadImage = async (file: File): Promise<{ success: boolean; url: string; filename: string }> => {
  const user = await getCurrentUser();
  if (!user) throw new Error('Usuário não autenticado');

  // Gerar nome único para o arquivo
  const fileExt = file.name.split('.').pop();
  const fileName = `${user.id}/${Date.now()}.${fileExt}`;

  // Upload para Supabase Storage
  const result = await uploadFile('images', fileName, file);

  return {
    success: true,
    url: result.url,
    filename: result.path,
  };
};

// ========================================
// CLIENTES
// ========================================

export const getCustomers = async () => {
  const user = await getCurrentUser();
  if (!user) throw new Error('Usuário não autenticado');

  const { data, error } = await supabase
    .from('asaas_customers')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  return {
    success: true,
    customers: data,
  };
};

export const createCustomer = async (customer: Customer) => {
  const user = await getCurrentUser();
  if (!user) throw new Error('Usuário não autenticado');

  // EfiBank não requer criar clientes separadamente
  // Os dados do cliente são enviados junto com a cobrança
  // Salvamos apenas localmente para referência
  const { data, error } = await supabase
    .from('asaas_customers')
    .insert({
      user_id: user.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      cpf_cnpj: customer.cpfCnpj,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  return {
    success: true,
    message: 'Cliente criado com sucesso',
    customer: data,
  };
};

export const deleteCustomer = async (id: string) => {
  // Deletar no banco local
  const { error } = await supabase
    .from('asaas_customers')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);

  return {
    success: true,
    message: 'Cliente excluído',
  };
};

// ========================================
// PAGAMENTOS/COBRANÇAS
// ========================================

export const getPayments = async () => {
  const user = await getCurrentUser();
  if (!user) throw new Error('Usuário não autenticado');

  const { data, error } = await supabase
    .from('payments')
    .select(`
      *,
      customer:asaas_customers(name, email, cpf_cnpj)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw new Error(error.message);

  return {
    success: true,
    payments: data,
  };
};

export const createPayment = async (payment: Payment) => {
  const user = await getCurrentUser();
  if (!user) throw new Error('Usuário não autenticado');

  // Buscar customer com todos os dados necessários
  const { data: customer } = await supabase
    .from('asaas_customers')
    .select('*')
    .eq('id', payment.customerId)
    .single();

  if (!customer) throw new Error('Cliente não encontrado');

  // Criar pagamento via EfiBank
  let efiPayment;
  
  if (payment.billingType === 'PIX') {
    // Cobrança PIX
    const efiResponse = await callEfiAPI('createPixCharge', {
      value: payment.value,
      description: payment.description || 'Pagamento',
      customerName: customer?.name,
      customerCpf: customer?.cpf_cnpj?.replace(/\D/g, ''),
      expiration: 3600,
    });

    if (!efiResponse.success) {
      throw new Error(efiResponse.message || 'Erro ao criar cobrança PIX');
    }
    efiPayment = efiResponse.payment;
  } else {
    // Boleto ou Cartão - usar endpoint de cobranças
    const efiResponse = await callEfiAPI('createCharge', {
      value: payment.value,
      description: payment.description || 'Pagamento',
      customerName: customer?.name,
      customerCpf: customer?.cpf_cnpj?.replace(/\D/g, ''),
      billingType: payment.billingType,
      dueDate: payment.dueDate,
    });

    if (!efiResponse.success) {
      throw new Error(efiResponse.message || 'Erro ao criar cobrança');
    }
    efiPayment = efiResponse.payment;
  }

  // Salvar no banco
  const { error } = await supabase
    .from('payments')
    .insert({
      user_id: user.id,
      customer_id: payment.customerId,
      efi_txid: efiPayment.txid,
      efi_charge_id: efiPayment.chargeId,
      billing_type: payment.billingType,
      value: payment.value,
      description: payment.description,
      due_date: payment.dueDate,
      status: efiPayment.status || 'PENDING',
      pix_qrcode: efiPayment.pixQrCode,
      pix_copy_paste: efiPayment.pixCopyPaste,
      bank_slip_url: efiPayment.boletoUrl,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  return {
    success: true,
    message: 'Cobrança criada com sucesso',
    payment: efiPayment,
  };
};

// ========================================
// CHECKOUT CUSTOMIZATION
// ========================================

export const getCheckoutCustomization = async (productId: string): Promise<CheckoutCustomization> => {
  const { data, error } = await supabase
    .from('checkout_customization')
    .select('*')
    .eq('product_id', productId)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(error.message);
  }

  return data || { product_id: productId };
};

export const saveCheckoutCustomization = async (customization: Partial<CheckoutCustomization> & { productId?: string | number }) => {
  const user = await getCurrentUser();
  if (!user) throw new Error('Usuário não autenticado');

  // Mapear campos camelCase para snake_case
  const data: any = {
    user_id: user.id,
    product_id: customization.product_id || customization.productId,
    logo_url: customization.logo_url || customization.logoUrl,
    banner_url: customization.banner_url || customization.bannerUrl,
    background_image_url: customization.background_image_url || customization.backgroundUrl,
    primary_color: customization.primary_color || customization.primaryColor,
    secondary_color: customization.secondary_color || customization.secondaryColor,
    text_color: customization.text_color || customization.textColor,
    background_color: customization.background_color || customization.backgroundColor,
    countdown_enabled: customization.countdown_enabled ?? customization.timerEnabled,
    countdown_minutes: customization.countdown_minutes ?? customization.timerMinutes,
    countdown_text: customization.countdown_text || customization.timerMessage,
    guarantee_enabled: customization.guarantee_enabled ?? customization.guaranteeEnabled,
    guarantee_days: customization.guarantee_days ?? customization.guaranteeDays,
    guarantee_text: customization.guarantee_text || customization.guaranteeText,
    testimonials_enabled: customization.testimonials_enabled ?? customization.showTestimonials,
    testimonials: customization.testimonials,
  };

  // Remover campos undefined
  Object.keys(data).forEach(key => data[key] === undefined && delete data[key]);

  const { error } = await supabase
    .from('checkout_customization')
    .upsert(data);

  if (error) throw new Error(error.message);

  return {
    success: true,
    message: 'Personalização salva com sucesso',
  };
};

export const deleteCheckoutCustomization = async (productId: string) => {
  const { error } = await supabase
    .from('checkout_customization')
    .delete()
    .eq('product_id', productId);

  if (error) throw new Error(error.message);

  return {
    success: true,
    message: 'Personalização excluída',
  };
};

// ========================================
// MARKETPLACE
// ========================================

export const getMyMarketplaceProducts = async () => {
  const user = await getCurrentUser();
  if (!user) throw new Error('Usuário não autenticado');

  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      affiliates:affiliates(count)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  return {
    success: true,
    products: data,
  };
};

export const getMarketplaceProducts = async () => {
  await getCurrentUser();

  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      owner:users!products_user_id_fkey(name),
      affiliates:affiliates(count)
    `)
    .eq('active', true)
    .eq('marketplace_enabled', true)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  return {
    success: true,
    products: data,
  };
};

export const getMyAffiliates = async () => {
  const user = await getCurrentUser();
  if (!user) throw new Error('Usuário não autenticado');

  const { data, error } = await supabase
    .from('affiliates')
    .select(`
      *,
      product:products(*),
      owner:users!affiliates_product_owner_id_fkey(name, email)
    `)
    .eq('affiliate_user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  return {
    success: true,
    affiliates: data,
  };
};

export const affiliateToProduct = async (productId: string) => {
  const user = await getCurrentUser();
  if (!user) throw new Error('Usuário não autenticado');

  // Buscar produto
  const { data: product } = await supabase
    .from('products')
    .select('user_id, commission_percentage')
    .eq('id', productId)
    .eq('active', true)
    .eq('marketplace_enabled', true)
    .single();

  if (!product) throw new Error('Produto não encontrado ou não disponível');

  if (product.user_id === user.id) {
    throw new Error('Você não pode se afiliar ao seu próprio produto');
  }

  // Gerar link único
  const affiliateLink = `aff_${Date.now()}_${user.id.substring(0, 8)}_${productId.substring(0, 8)}`;

  // Criar afiliação
  const { data, error } = await supabase
    .from('affiliates')
    .insert({
      product_id: productId,
      affiliate_user_id: user.id,
      product_owner_id: product.user_id,
      affiliate_link: affiliateLink,
      commission_percentage: product.commission_percentage,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('Você já está afiliado a este produto');
    }
    throw new Error(error.message);
  }

  return {
    success: true,
    message: 'Afiliação realizada com sucesso!',
    affiliate: data,
  };
};

export const cancelAffiliation = async (affiliateId: string) => {
  const { error } = await supabase
    .from('affiliates')
    .update({ status: 'inactive' })
    .eq('id', affiliateId);

  if (error) throw new Error(error.message);

  return {
    success: true,
    message: 'Afiliação cancelada com sucesso',
  };
};

export const toggleProductMarketplace = async (
  productId: string,
  marketplaceEnabled: boolean,
  commissionPercentage?: number
) => {
  const updateData: any = {
    marketplace_enabled: marketplaceEnabled,
  };

  if (commissionPercentage !== undefined) {
    updateData.commission_percentage = commissionPercentage;
  }

  const { error } = await supabase
    .from('products')
    .update(updateData)
    .eq('id', productId);

  if (error) throw new Error(error.message);

  return {
    success: true,
    message: marketplaceEnabled 
      ? 'Produto habilitado no marketplace!' 
      : 'Produto removido do marketplace',
  };
};

// ========================================
// LINKS DE PAGAMENTO
// ========================================

export const getPaymentLinks = async () => {
  const user = await getCurrentUser();
  if (!user) throw new Error('Usuário não autenticado');

  const { data, error } = await supabase
    .from('payment_links')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  // Gerar URL do checkout do ZucroPay
  const baseUrl = window.location.origin;
  
  return {
    success: true,
    paymentLinks: data.map(link => ({
      id: link.id,
      productId: link.product_id,
      name: link.name,
      description: link.description,
      amount: link.amount,
      billingType: link.billing_type,
      url: `${baseUrl}/checkout/${link.id}`,
      asaasUrl: link.asaas_link_url,
      active: link.active,
      clicks: link.clicks,
      paymentsCount: link.payments_count,
      totalReceived: link.total_received,
    })),
  };
};

export const createPaymentLink = async (link: PaymentLink) => {
  const user = await getCurrentUser();
  if (!user) throw new Error('Usuário não autenticado');

  // EfiBank não tem links de pagamento diretos como Asaas
  // Salvamos apenas no banco e usamos nosso próprio checkout
  // Geramos um ID local único para compatibilidade com o schema
  const localLinkId = `efi_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  const checkoutUrl = `${window.location.origin}/checkout/`;

  const { data, error } = await supabase
    .from('payment_links')
    .insert({
      user_id: user.id,
      product_id: link.productId,
      name: link.name,
      description: link.description,
      amount: link.amount,
      billing_type: link.billingType || 'UNDEFINED',
      asaas_payment_link_id: localLinkId, // ID local para EfiBank
      asaas_link_url: checkoutUrl, // Será atualizado com o ID real após insert
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  // Atualizar a URL com o ID real do payment link
  const finalCheckoutUrl = `${window.location.origin}/checkout/${data.id}`;
  await supabase
    .from('payment_links')
    .update({ asaas_link_url: finalCheckoutUrl })
    .eq('id', data.id);

  return {
    success: true,
    message: 'Link de pagamento criado com sucesso',
    paymentLink: { ...data, asaas_link_url: finalCheckoutUrl },
  };
};

export const deletePaymentLink = async (id: string) => {
  // Deletar no banco
  const { error } = await supabase
    .from('payment_links')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);

  return {
    success: true,
    message: 'Link de pagamento excluído',
  };
};

// ========================================
// PUBLIC CHECKOUT (SEM AUTENTICAÇÃO)
// ========================================

export const getPublicPaymentLink = async (linkId: string) => {
  // Usar API pública que bypassa RLS - não requer autenticação
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
  
  const response = await fetch(`${API_BASE_URL}/get-public-link?id=${encodeURIComponent(linkId)}`);
  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || 'Link de pagamento não encontrado');
  }
  
  // Dados já vêm mapeados da API
  return result.data;
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
    paymentToken?: string; // Token EfiBank (se disponível)
    number?: string;
    name?: string;
    expiryMonth?: string;
    expiryYear?: string;
    cvv?: string;
    brand?: string;
  };
  installments?: number;
  billingAddress?: {
    street: string;
    number: string;
    neighborhood: string;
    zipcode: string;
    city: string;
    state: string;
  };
}): Promise<{
  success: boolean;
  message?: string;
  payment?: any;
}> => {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

  // Usar a nova API EfiBank
  const apiData: any = {
    linkId: data.linkId,
    billingType: data.billingType,
    customerName: data.customer.name,
    customerEmail: data.customer.email,
    customerCpfCnpj: data.customer.cpfCnpj,
    customerPhone: data.customer.phone,
    cardInstallments: data.installments || 1,
    billingAddress: data.billingAddress,
  };

  // Dados do cartão (envio direto)
  if (data.creditCard) {
    apiData.cardNumber = data.creditCard.number;
    apiData.cardName = data.creditCard.name;
    apiData.cardExpiryMonth = data.creditCard.expiryMonth;
    apiData.cardExpiryYear = data.creditCard.expiryYear;
    apiData.cardCvv = data.creditCard.cvv;
    apiData.cardBrand = data.creditCard.brand;
    // Token se disponível
    if (data.creditCard.paymentToken) {
      apiData.cardPaymentToken = data.creditCard.paymentToken;
    }
  }

  const response = await fetch(`${API_BASE_URL}/efi-public-payment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(apiData),
  });

  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.message || result.error || 'Erro ao processar pagamento');
  }

  // Mapear resposta para o formato esperado pelo frontend
  return {
    success: true,
    payment: {
      id: result.payment?.id,
      txid: result.payment?.txid,
      chargeId: result.payment?.chargeId,
      status: result.payment?.status,
      // PIX
      pixCode: result.payment?.pixCode,
      pixQrCode: result.payment?.pixQrCode,
      // Boleto
      barcode: result.payment?.barcode,
      boletoUrl: result.payment?.boletoUrl,
      boletoPdf: result.payment?.boletoPdf,
      expireAt: result.payment?.expireAt,
      // Cartão
      installments: result.payment?.installments,
      paymentUrl: result.payment?.paymentUrl, // Link de pagamento EfiBank
    },
  };
};

// ========================================
// API KEYS
// ========================================

export interface ApiKey {
  id: string;
  name: string;
  api_key: string;
  api_key_full?: string;
  created_at: string;
  last_used_at?: string;
  is_active: boolean;
}

export const getApiKeys = async (): Promise<{ success: boolean; apiKeys: ApiKey[] }> => {
  const user = await getCurrentUser();
  if (!user) throw new Error('Usuário não autenticado');

  const { data, error } = await supabase
    .from('api_keys')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  return {
    success: true,
    apiKeys: data || [],
  };
};

export const createApiKey = async (name: string): Promise<{ success: boolean; apiKey: ApiKey }> => {
  const user = await getCurrentUser();
  if (!user) throw new Error('Usuário não autenticado');

  // Gerar uma API key única
  const apiKey = `zp_${crypto.randomUUID().replace(/-/g, '')}`;

  const { data, error } = await supabase
    .from('api_keys')
    .insert({
      user_id: user.id,
      name,
      api_key: apiKey,
      is_active: true,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  return {
    success: true,
    apiKey: data,
  };
};

export const deleteApiKey = async (id: string): Promise<{ success: boolean }> => {
  const { error } = await supabase
    .from('api_keys')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);

  return { success: true };
};

// ========================================
// WEBHOOKS
// ========================================

export interface Webhook {
  id: string;
  url: string;
  secret?: string;
  events: string[];
  status: 'active' | 'inactive' | 'failed';
  created_at: string;
  last_triggered_at?: string;
  last_success_at?: string | null;
  last_failure_at?: string | null;
  failure_count?: number;
}

export const getWebhooks = async (): Promise<{ success: boolean; webhooks: Webhook[] }> => {
  const user = await getCurrentUser();
  if (!user) throw new Error('Usuário não autenticado');

  const { data, error } = await supabase
    .from('webhooks')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  return {
    success: true,
    webhooks: data || [],
  };
};

export const createWebhook = async (webhook: { url: string; events: string[] }): Promise<{ success: boolean; webhook: Webhook; message: string }> => {
  const user = await getCurrentUser();
  if (!user) throw new Error('Usuário não autenticado');

  const { data, error } = await supabase
    .from('webhooks')
    .insert({
      user_id: user.id,
      url: webhook.url,
      events: webhook.events,
      status: 'active',
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  return {
    success: true,
    webhook: data,
    message: 'Webhook criado com sucesso',
  };
};

export const updateWebhook = async (id: string, updates: Partial<Webhook>): Promise<{ success: boolean; message: string }> => {
  const { error } = await supabase
    .from('webhooks')
    .update(updates)
    .eq('id', id);

  if (error) throw new Error(error.message);

  return {
    success: true,
    message: 'Webhook atualizado com sucesso',
  };
};

export const deleteWebhook = async (id: string): Promise<{ success: boolean; message: string }> => {
  const { error } = await supabase
    .from('webhooks')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);

  return {
    success: true,
    message: 'Webhook deletado com sucesso',
  };
};

// Exportar tudo como default também
export default {
  login,
  register,
  logout,
  getCurrentUser,
  getBalance,
  deposit,
  withdraw,
  getTransactions,
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  uploadImage,
  getCustomers,
  createCustomer,
  deleteCustomer,
  getPayments,
  createPayment,
  getCheckoutCustomization,
  saveCheckoutCustomization,
  deleteCheckoutCustomization,
  getMarketplaceProducts,
  getMyMarketplaceProducts,
  getMyAffiliates,
  affiliateToProduct,
  cancelAffiliation,
  toggleProductMarketplace,
  getPaymentLinks,
  createPaymentLink,
  deletePaymentLink,
  getPublicPaymentLink,
  createPublicPayment,
  getApiKeys,
  createApiKey,
  deleteApiKey,
  getWebhooks,
  createWebhook,
  updateWebhook,
  deleteWebhook,
};

