/**
 * ZucroPay JavaScript SDK
 * Biblioteca para integrar pagamentos sem backend
 * 
 * Uso:
 * <script src="https://cdn.zucropay.com/v1/zucropay.js"></script>
 * <script>
 *   const zucropay = new ZucroPay('sua_api_key');
 *   zucropay.createPayment({ amount: 100, customer: {...} });
 * </script>
 */

class ZucroPay {
  constructor(apiKey, options = {}) {
    this.apiKey = apiKey;
    this.baseUrl = options.baseUrl || 'http://localhost:8000/api/v1';
    this.debug = options.debug || false;
  }

  /**
   * Criar pagamento
   * @param {Object} data - Dados do pagamento
   * @returns {Promise<Object>} Resposta da API
   */
  async createPayment(data) {
    try {
      const response = await fetch(`${this.baseUrl}/payments/create.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey
        },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao criar pagamento');
      }

      if (this.debug) {
        console.log('[ZucroPay] Pagamento criado:', result);
      }

      return result;
    } catch (error) {
      console.error('[ZucroPay] Erro:', error);
      throw error;
    }
  }

  /**
   * Consultar status do pagamento
   * @param {string} paymentId - ID do pagamento
   * @returns {Promise<Object>} Status do pagamento
   */
  async getPaymentStatus(paymentId) {
    try {
      const response = await fetch(`${this.baseUrl}/payments/${paymentId}`, {
        headers: {
          'X-API-Key': this.apiKey
        }
      });

      return await response.json();
    } catch (error) {
      console.error('[ZucroPay] Erro ao consultar pagamento:', error);
      throw error;
    }
  }

  /**
   * Criar botão de pagamento
   * @param {string} containerId - ID do container
   * @param {Object} paymentData - Dados do pagamento
   * @param {Object} options - Opções de customização
   */
  createButton(containerId, paymentData, options = {}) {
    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`[ZucroPay] Container #${containerId} não encontrado`);
      return;
    }

    const button = document.createElement('button');
    button.className = 'zucropay-button';
    button.textContent = options.text || 'Pagar com ZucroPay';
    button.style.cssText = `
      background: ${options.color || '#5818C8'};
      color: white;
      border: none;
      padding: 12px 24px;
      font-size: 16px;
      font-weight: 600;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.3s;
    `;

    button.onmouseover = () => {
      button.style.background = options.hoverColor || '#7B2FF7';
      button.style.transform = 'translateY(-2px)';
    };
    button.onmouseout = () => {
      button.style.background = options.color || '#5818C8';
      button.style.transform = 'translateY(0)';
    };

    button.onclick = async () => {
      button.disabled = true;
      button.textContent = 'Processando...';

      try {
        const result = await this.createPayment(paymentData);
        
        if (options.onSuccess) {
          options.onSuccess(result);
        } else {
          // Modal padrão com QR Code
          this.showPaymentModal(result);
        }
      } catch (error) {
        if (options.onError) {
          options.onError(error);
        } else {
          alert('Erro ao processar pagamento: ' + error.message);
        }
      } finally {
        button.disabled = false;
        button.textContent = options.text || 'Pagar com ZucroPay';
      }
    };

    container.appendChild(button);
  }

  /**
   * Exibir modal com QR Code PIX
   * @param {Object} payment - Dados do pagamento
   */
  showPaymentModal(payment) {
    // Criar overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
    `;

    // Criar modal
    const modal = document.createElement('div');
    modal.style.cssText = `
      background: white;
      border-radius: 16px;
      padding: 32px;
      max-width: 500px;
      text-align: center;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    `;

    modal.innerHTML = `
      <h2 style="margin: 0 0 16px; color: #333;">Escaneie o QR Code PIX</h2>
      <p style="color: #666; margin-bottom: 24px;">
        Valor: R$ ${payment.payment.amount.toFixed(2).replace('.', ',')}
      </p>
      <img src="data:image/png;base64,${payment.pix.qr_code_base64}" 
           style="max-width: 300px; margin-bottom: 16px;" />
      <div style="background: #f5f5f5; padding: 12px; border-radius: 8px; font-family: monospace; font-size: 12px; word-break: break-all; margin-bottom: 16px;">
        ${payment.pix.copy_paste}
      </div>
      <button id="zucropay-copy-btn" style="background: #5818C8; color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; margin-right: 8px;">
        📋 Copiar Código PIX
      </button>
      <button id="zucropay-close-btn" style="background: #ccc; color: #333; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer;">
        Fechar
      </button>
      <p style="color: #999; font-size: 12px; margin-top: 16px;">
        ⏳ Aguardando pagamento...
      </p>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Copiar código PIX
    document.getElementById('zucropay-copy-btn').onclick = () => {
      navigator.clipboard.writeText(payment.pix.copy_paste);
      alert('✅ Código PIX copiado!');
    };

    // Fechar modal
    const closeModal = () => overlay.remove();
    document.getElementById('zucropay-close-btn').onclick = closeModal;
    overlay.onclick = (e) => {
      if (e.target === overlay) closeModal();
    };

    // Verificar pagamento a cada 3 segundos
    const checkInterval = setInterval(async () => {
      try {
        const status = await this.getPaymentStatus(payment.payment.id);
        if (status.payment.status === 'RECEIVED' || status.payment.status === 'CONFIRMED') {
          clearInterval(checkInterval);
          modal.innerHTML = `
            <h2 style="color: #4caf50;">✅ Pagamento Confirmado!</h2>
            <p>Obrigado pela sua compra!</p>
          `;
          setTimeout(closeModal, 3000);
        }
      } catch (error) {
        console.error('[ZucroPay] Erro ao verificar pagamento:', error);
      }
    }, 3000);
  }

  /**
   * Criar formulário de checkout inline
   * @param {string} containerId - ID do container
   * @param {Object} options - Opções de customização
   */
  createCheckoutForm(containerId, options = {}) {
    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`[ZucroPay] Container #${containerId} não encontrado`);
      return;
    }

    container.innerHTML = `
      <form id="zucropay-checkout-form" style="max-width: 400px; margin: 0 auto;">
        <h3>${options.title || 'Finalizar Pagamento'}</h3>
        
        <label style="display: block; margin-bottom: 8px; font-weight: 500;">Nome Completo:</label>
        <input type="text" name="name" required style="width: 100%; padding: 10px; margin-bottom: 16px; border: 1px solid #ddd; border-radius: 8px;" />
        
        <label style="display: block; margin-bottom: 8px; font-weight: 500;">Email:</label>
        <input type="email" name="email" required style="width: 100%; padding: 10px; margin-bottom: 16px; border: 1px solid #ddd; border-radius: 8px;" />
        
        <label style="display: block; margin-bottom: 8px; font-weight: 500;">CPF:</label>
        <input type="text" name="document" required placeholder="000.000.000-00" style="width: 100%; padding: 10px; margin-bottom: 16px; border: 1px solid #ddd; border-radius: 8px;" />
        
        <button type="submit" style="width: 100%; background: #5818C8; color: white; border: none; padding: 14px; font-size: 16px; font-weight: 600; border-radius: 8px; cursor: pointer;">
          Pagar R$ ${options.amount.toFixed(2).replace('.', ',')}
        </button>
      </form>
    `;

    document.getElementById('zucropay-checkout-form').onsubmit = async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      
      try {
        const result = await this.createPayment({
          amount: options.amount,
          customer: {
            name: formData.get('name'),
            email: formData.get('email'),
            document: formData.get('document')
          },
          description: options.description || 'Compra online',
          external_reference: options.orderId
        });

        this.showPaymentModal(result);
        
        if (options.onSuccess) {
          options.onSuccess(result);
        }
      } catch (error) {
        alert('Erro: ' + error.message);
        if (options.onError) {
          options.onError(error);
        }
      }
    };
  }
}

// Exportar para uso global
if (typeof window !== 'undefined') {
  window.ZucroPay = ZucroPay;
}

// Exportar para Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ZucroPay;
}
