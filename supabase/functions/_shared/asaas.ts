// Funções compartilhadas para integração com Asaas
// Usado pelas Edge Functions

const ASAAS_API_URL = Deno.env.get('ASAAS_API_URL') || 'https://api.asaas.com/v3';
const ASAAS_API_KEY = Deno.env.get('ASAAS_API_KEY') || '';

export interface AsaasResponse {
  code: number;
  data: any;
  success: boolean;
}

export async function asaasRequest(
  method: string,
  endpoint: string,
  data?: any,
  apiKey?: string
): Promise<AsaasResponse> {
  const url = `${ASAAS_API_URL}${endpoint}`;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'access_token': apiKey || ASAAS_API_KEY,
    'User-Agent': 'ZucroPay/1.0',
  };

  const options: RequestInit = {
    method,
    headers,
  };

  if (data && (method === 'POST' || method === 'PUT')) {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(url, options);
    const responseData = await response.json();

    return {
      code: response.status,
      data: responseData,
      success: response.ok,
    };
  } catch (error) {
    return {
      code: 0,
      data: { error: error.message },
      success: false,
    };
  }
}

// ========== CLIENTES ==========
export async function asaasCreateCustomer(
  name: string,
  cpfCnpj: string,
  email?: string,
  phone?: string,
  apiKey?: string
): Promise<AsaasResponse> {
  const data: any = { name, cpfCnpj };
  if (email) data.email = email;
  if (phone) data.phone = phone;

  return asaasRequest('POST', '/customers', data, apiKey);
}

export async function asaasGetCustomer(customerId: string, apiKey?: string): Promise<AsaasResponse> {
  return asaasRequest('GET', `/customers/${customerId}`, undefined, apiKey);
}

export async function asaasDeleteCustomer(customerId: string, apiKey?: string): Promise<AsaasResponse> {
  return asaasRequest('DELETE', `/customers/${customerId}`, undefined, apiKey);
}

// ========== PAGAMENTOS ==========
export async function asaasCreatePayment(
  customerId: string,
  billingType: string,
  value: number,
  dueDate: string,
  description?: string,
  extraData?: any,
  apiKey?: string
): Promise<AsaasResponse> {
  const data: any = {
    customer: customerId,
    billingType,
    value,
    dueDate,
  };

  if (description) data.description = description;
  if (extraData) Object.assign(data, extraData);

  return asaasRequest('POST', '/payments', data, apiKey);
}

export async function asaasGetPayment(paymentId: string, apiKey?: string): Promise<AsaasResponse> {
  return asaasRequest('GET', `/payments/${paymentId}`, undefined, apiKey);
}

export async function asaasDeletePayment(paymentId: string, apiKey?: string): Promise<AsaasResponse> {
  return asaasRequest('DELETE', `/payments/${paymentId}`, undefined, apiKey);
}

// ========== PIX ==========
export async function asaasGeneratePixQrCode(paymentId: string, apiKey?: string): Promise<AsaasResponse> {
  return asaasRequest('POST', `/payments/${paymentId}/pixQrCode`, undefined, apiKey);
}

export async function asaasGetPixQrCode(paymentId: string, apiKey?: string): Promise<AsaasResponse> {
  return asaasRequest('GET', `/payments/${paymentId}/pixQrCode`, undefined, apiKey);
}

// ========== TRANSFERÊNCIAS ==========
export async function asaasCreateTransfer(
  value: number,
  bankAccount: any,
  apiKey?: string
): Promise<AsaasResponse> {
  const data = {
    value,
    bankAccount,
  };

  return asaasRequest('POST', '/transfers', data, apiKey);
}

// ========== LINKS DE PAGAMENTO ==========
export async function asaasCreatePaymentLink(
  name: string,
  value: number,
  billingType: string = 'UNDEFINED',
  description?: string,
  apiKey?: string
): Promise<AsaasResponse> {
  const data: any = {
    name,
    billingType,
    chargeType: 'DETACHED',
    value,
    dueDateLimitDays: 30,
  };

  if (description) data.description = description;

  return asaasRequest('POST', '/paymentLinks', data, apiKey);
}

export async function asaasGetPaymentLink(paymentLinkId: string, apiKey?: string): Promise<AsaasResponse> {
  return asaasRequest('GET', `/paymentLinks/${paymentLinkId}`, undefined, apiKey);
}

export async function asaasDeletePaymentLink(paymentLinkId: string, apiKey?: string): Promise<AsaasResponse> {
  return asaasRequest('DELETE', `/paymentLinks/${paymentLinkId}`, undefined, apiKey);
}

// ========== SALDO ==========
export async function asaasGetBalance(apiKey?: string): Promise<AsaasResponse> {
  return asaasRequest('GET', '/finance/balance', undefined, apiKey);
}

// ========== ASSINATURAS ==========
export async function asaasCreateSubscription(
  customerId: string,
  billingType: string,
  value: number,
  cycle: string,
  description?: string,
  apiKey?: string
): Promise<AsaasResponse> {
  const data: any = {
    customer: customerId,
    billingType,
    value,
    cycle,
    nextDueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
  };

  if (description) data.description = description;

  return asaasRequest('POST', '/subscriptions', data, apiKey);
}

