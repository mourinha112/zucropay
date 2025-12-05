// ZucroPay API Service - Supabase Version
// Comunicação completa via Supabase + Edge Functions

import { supabase, callAsaasAPI, uploadFile, isSupabaseConfigured } from '../config/supabase';

export { isSupabaseConfigured };

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
  asaasCustomerId?: string;
  asaasApiKey?: string;
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
  asaasPaymentId?: string;
  asaasTransferId?: string;
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
  asaasCustomerId?: string;
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
  asaasPaymentLinkId?: string;
  asaasLinkUrl?: string;
}

export interface CheckoutCustomization {
  id?: string;
  product_id: string;
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

  if (!authData.user) {
    throw new Error('Falha no login');
  }

  // Buscar dados completos do usuário
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', authData.user.id)
    .single();

  if (userError) {
    throw new Error(userError.message);
  }

  return {
    success: true,
    message: 'Login realizado com sucesso',
    user: {
      id: userData.id,
      name: userData.name,
      email: userData.email,
      cpfCnpj: userData.cpf_cnpj,
      phone: userData.phone,
      avatar: userData.avatar,
      balance: userData.balance,
      asaasCustomerId: userData.asaas_customer_id,
      asaasApiKey: userData.asaas_api_key,
    },
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
    asaasCustomerId: userData.asaas_customer_id,
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

  // Criar cobrança PIX via Asaas
  const customerData = {
    name: user.name,
    email: user.email,
    cpfCnpj: user.cpfCnpj || '00000000000',
  };

  // Criar ou buscar cliente
  const customerResponse = await callAsaasAPI('POST', '/customers', customerData);
  const asaasCustomerId = customerResponse.data.id;

  // Criar pagamento PIX
  const paymentData = {
    customer: asaasCustomerId,
    billingType: 'PIX',
    value: amount,
    dueDate: new Date().toISOString().split('T')[0],
    description: description || 'Depósito de saldo',
  };

  const paymentResponse = await callAsaasAPI('POST', '/payments', paymentData);
  const payment = paymentResponse.data;

  // Gerar QR Code PIX
  const pixResponse = await callAsaasAPI('POST', `/payments/${payment.id}/pixQrCode`);
  const pixData = pixResponse.data;

  // Criar transação pendente
  const { data: transaction } = await supabase
    .from('transactions')
    .insert({
      user_id: user.id,
      type: 'deposit',
      amount,
      status: 'pending',
      description: description || 'Depósito via PIX',
      asaas_payment_id: payment.id,
    })
    .select()
    .single();

  return {
    success: true,
    message: 'QR Code PIX gerado com sucesso',
    payment: {
      id: payment.id,
      value: amount,
      status: 'pending',
    },
    pix: {
      payload: pixData.payload,
      encodedImage: pixData.encodedImage,
      expirationDate: pixData.expirationDate,
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

  // Preparar dados bancários
  const bankAccountData = {
    bank: { code: bankAccount.bank },
    accountName: bankAccount.name,
    ownerName: bankAccount.name,
    cpfCnpj: bankAccount.cpfCnpj.replace(/\D/g, ''),
    agency: bankAccount.agency,
    account: bankAccount.account,
    accountDigit: bankAccount.accountDigit,
    bankAccountType: bankAccount.accountType || 'CONTA_CORRENTE',
  };

  // Criar transferência no Asaas
  const transferResponse = await callAsaasAPI('POST', '/transfers', {
    value: amount,
    bankAccount: bankAccountData,
  });

  if (!transferResponse.success) {
    throw new Error(transferResponse.data.errors?.[0]?.description || 'Erro ao criar transferência');
  }

  const transfer = transferResponse.data;

  // Criar transação
  const { data: transaction } = await supabase
    .from('transactions')
    .insert({
      user_id: user.id,
      type: 'withdraw',
      amount,
      status: 'pending',
      description: `Saque para ${bankAccount.name}`,
      asaas_transfer_id: transfer.id,
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
    transfer,
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

export const createProduct = async (product: Product) => {
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

export const updateProduct = async (id: string, product: Partial<Product>) => {
  const updateData: any = {};
  
  if (product.name !== undefined) updateData.name = product.name;
  if (product.description !== undefined) updateData.description = product.description;
  if (product.price !== undefined) updateData.price = product.price;
  if (product.imageUrl !== undefined) updateData.image_url = product.imageUrl;
  if (product.stock !== undefined) updateData.stock = product.stock;
  if (product.active !== undefined) updateData.active = product.active;
  if (product.marketplaceEnabled !== undefined) updateData.marketplace_enabled = product.marketplaceEnabled;
  if (product.commissionPercentage !== undefined) updateData.commission_percentage = product.commissionPercentage;

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

  // Criar cliente no Asaas
  const asaasResponse = await callAsaasAPI('POST', '/customers', {
    name: customer.name,
    cpfCnpj: customer.cpfCnpj.replace(/\D/g, ''),
    email: customer.email,
    phone: customer.phone,
  });

  if (!asaasResponse.success) {
    throw new Error('Erro ao criar cliente no Asaas');
  }

  const asaasCustomer = asaasResponse.data;

  // Salvar no banco
  const { data, error } = await supabase
    .from('asaas_customers')
    .insert({
      user_id: user.id,
      asaas_customer_id: asaasCustomer.id,
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
  // Buscar asaas_customer_id
  const { data: customer } = await supabase
    .from('asaas_customers')
    .select('asaas_customer_id')
    .eq('id', id)
    .single();

  if (customer) {
    // Deletar no Asaas
    await callAsaasAPI('DELETE', `/customers/${customer.asaas_customer_id}`);
  }

  // Deletar no banco
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

  // Buscar customer
  const { data: customer } = await supabase
    .from('asaas_customers')
    .select('asaas_customer_id')
    .eq('id', payment.customerId)
    .single();

  if (!customer) throw new Error('Cliente não encontrado');

  // Criar pagamento no Asaas
  const asaasResponse = await callAsaasAPI('POST', '/payments', {
    customer: customer.asaas_customer_id,
    billingType: payment.billingType,
    value: payment.value,
    dueDate: payment.dueDate,
    description: payment.description,
  });

  if (!asaasResponse.success) {
    throw new Error('Erro ao criar pagamento no Asaas');
  }

  const asaasPayment = asaasResponse.data;

  // Salvar no banco
  const { data, error } = await supabase
    .from('payments')
    .insert({
      user_id: user.id,
      customer_id: payment.customerId,
      asaas_payment_id: asaasPayment.id,
      billing_type: payment.billingType,
      value: payment.value,
      description: payment.description,
      due_date: payment.dueDate,
      status: asaasPayment.status,
      invoice_url: asaasPayment.invoiceUrl,
      bank_slip_url: asaasPayment.bankSlipUrl,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  // Se for PIX, buscar QR Code
  if (payment.billingType === 'PIX') {
    const pixResponse = await callAsaasAPI('GET', `/payments/${asaasPayment.id}/pixQrCode`);
    if (pixResponse.success) {
      const pixData = pixResponse.data;
      await supabase
        .from('payments')
        .update({
          pix_qrcode: pixData.encodedImage,
          pix_copy_paste: pixData.payload,
        })
        .eq('id', data.id);
    }
  }

  return {
    success: true,
    message: 'Cobrança criada com sucesso',
    payment: asaasPayment,
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

export const saveCheckoutCustomization = async (customization: CheckoutCustomization) => {
  const user = await getCurrentUser();
  if (!user) throw new Error('Usuário não autenticado');

  const { error } = await supabase
    .from('checkout_customization')
    .upsert({
      ...customization,
      user_id: user.id,
    });

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

  return {
    success: true,
    paymentLinks: data.map(link => ({
      id: link.id,
      name: link.name,
      description: link.description,
      amount: link.amount,
      billingType: link.billing_type,
      url: link.asaas_link_url,
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

  // Criar link no Asaas
  const asaasResponse = await callAsaasAPI('POST', '/paymentLinks', {
    name: link.name,
    billingType: link.billingType || 'UNDEFINED',
    chargeType: 'DETACHED',
    value: link.amount,
    description: link.description,
    dueDateLimitDays: 30,
  });

  if (!asaasResponse.success) {
    throw new Error('Erro ao criar link de pagamento no Asaas');
  }

  const asaasLink = asaasResponse.data;

  // Salvar no banco
  const { data, error } = await supabase
    .from('payment_links')
    .insert({
      user_id: user.id,
      product_id: link.productId,
      asaas_payment_link_id: asaasLink.id,
      asaas_link_url: asaasLink.url,
      name: link.name,
      description: link.description,
      amount: link.amount,
      billing_type: link.billingType || 'UNDEFINED',
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  return {
    success: true,
    message: 'Link de pagamento criado com sucesso',
    paymentLink: data,
  };
};

export const deletePaymentLink = async (id: string) => {
  // Buscar asaas_payment_link_id
  const { data: link } = await supabase
    .from('payment_links')
    .select('asaas_payment_link_id')
    .eq('id', id)
    .single();

  if (link) {
    // Deletar no Asaas
    await callAsaasAPI('DELETE', `/paymentLinks/${link.asaas_payment_link_id}`);
  }

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
  const { data, error } = await supabase
    .from('payment_links')
    .select(`
      *,
      product:products(*)
    `)
    .eq('id', linkId)
    .eq('active', true)
    .single();

  if (error) throw new Error('Link de pagamento não encontrado');

  return data;
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
}): Promise<{
  success: boolean;
  message?: string;
  payment?: any;
  pix?: any;
}> => {
  // Chamar Edge Function para processar pagamento público
  const EDGE_FUNCTIONS_URL = import.meta.env.VITE_EDGE_FUNCTIONS_URL || 
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

  const response = await fetch(`${EDGE_FUNCTIONS_URL}/public-payment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Erro ao processar pagamento');
  }

  return response.json();
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
};

