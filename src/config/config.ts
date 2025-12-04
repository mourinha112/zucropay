// ============================================
// 🔧 CONFIGURAÇÃO DO SISTEMA - EDITE AQUI!
// ============================================

// 👉 ESCOLHA O MODO ATIVO (descomente apenas 1 linha):
const ACTIVE_MODE = 'localhost';  // Desenvolvimento local
// const ACTIVE_MODE = 'ngrok';      // Testes externos com ngrok
// const ACTIVE_MODE = 'vps';        // Produção em servidor

// ============================================
// 📍 CONFIGURAÇÕES DE URL POR MODO
// ============================================

const CONFIGS = {
  // 🖥️ LOCALHOST - Desenvolvimento Local
  localhost: {
    backendUrl: 'http://localhost:8000',
    frontendUrl: 'http://localhost:5173',
  },

  // ☁️ NGROK - Testes Externos
  // 👉 ATUALIZE AS URLs TODA VEZ QUE REINICIAR O NGROK!
  ngrok: {
    backendUrl: 'https://cc31cd46ab04.ngrok-free.app',  // ← Cole a URL do ngrok do BACKEND aqui
    frontendUrl: 'https://8912dc6d2a43.ngrok-free.app', // ← Cole a URL do ngrok do FRONTEND aqui
  },

  // 🌐 VPS - Produção
  vps: {
    backendUrl: 'http://seu-ip-vps:8000',     // ← Cole o IP/domínio do seu servidor
    frontendUrl: 'http://seu-ip-vps',         // ← Cole o IP/domínio do seu servidor
  },
};

// ============================================
// ⚙️ NÃO MEXA DAQUI PARA BAIXO
// ============================================

export type EnvironmentMode = keyof typeof CONFIGS;

export interface SystemConfig {
  mode: EnvironmentMode;
  backendUrl: string;
  frontendUrl: string;
  description: string;
}

const CONFIG_STORAGE_KEY = 'zucropay_system_config';

export const PREDEFINED_CONFIGS: Record<EnvironmentMode, SystemConfig> = {
  localhost: {
    mode: 'localhost',
    ...CONFIGS.localhost,
    description: 'Desenvolvimento local - ideal para testes internos',
  },
  ngrok: {
    mode: 'ngrok',
    ...CONFIGS.ngrok,
    description: 'Ngrok Tunnels - ideal para demonstrações e testes externos',
  },
  vps: {
    mode: 'vps',
    ...CONFIGS.vps,
    description: 'VPS/Servidor Dedicado - produção',
  },
};

const DEFAULT_CONFIG: SystemConfig = PREDEFINED_CONFIGS[ACTIVE_MODE];

/**
 * Obter configuração atual do sistema
 * Ignora localStorage e usa sempre a configuração do código
 */
export const getSystemConfig = (): SystemConfig => {
  return DEFAULT_CONFIG;
};

/**
 * Salvar configuração do sistema
 */
export const setSystemConfig = (config: SystemConfig): void => {
  try {
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
    console.log('✅ Configuração salva:', config.mode);
  } catch (error) {
    console.error('Erro ao salvar configuração:', error);
    throw error;
  }
};

/**
 * Alterar modo e atualizar URLs automaticamente
 */
export const changeEnvironmentMode = (mode: EnvironmentMode): void => {
  const config = PREDEFINED_CONFIGS[mode];
  setSystemConfig(config);
};

/**
 * Atualizar URLs customizadas (para VPS ou ngrok personalizado)
 */
export const updateCustomUrls = (backendUrl: string, frontendUrl: string): void => {
  const currentConfig = getSystemConfig();
  const newConfig: SystemConfig = {
    ...currentConfig,
    backendUrl,
    frontendUrl,
  };
  setSystemConfig(newConfig);
};

/**
 * Obter URL do backend configurada
 */
export const getBackendUrl = (): string => {
  return getSystemConfig().backendUrl;
};

/**
 * Obter URL do frontend configurada
 */
export const getFrontendUrl = (): string => {
  return getSystemConfig().frontendUrl;
};

/**
 * Resetar para configuração padrão
 */
export const resetToDefault = (): void => {
  setSystemConfig(DEFAULT_CONFIG);
};

/**
 * Verificar se está usando ngrok (para adicionar headers especiais)
 */
export const isUsingNgrok = (): boolean => {
  const mode: EnvironmentMode = ACTIVE_MODE as EnvironmentMode;
  return mode === 'ngrok';
};

/**
 * Obter headers necessários baseado no modo
 */
export const getRequiredHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Se está usando ngrok, adiciona header especial
  if (isUsingNgrok()) {
    headers['ngrok-skip-browser-warning'] = '69420';
  }

  return headers;
};

export default {
  getSystemConfig,
  setSystemConfig,
  changeEnvironmentMode,
  updateCustomUrls,
  getBackendUrl,
  getFrontendUrl,
  resetToDefault,
  isUsingNgrok,
  getRequiredHeaders,
  PREDEFINED_CONFIGS,
};
