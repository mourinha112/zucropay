-- ============================================
-- ZUCROPAY - POLÍTICAS DE SEGURANÇA (RLS)
-- Execute este script no SQL Editor do Supabase
-- ============================================

-- ========================================
-- HABILITAR RLS EM TODAS AS TABELAS
-- ========================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkout_customization ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE balance_reserves ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;

-- ========================================
-- REMOVER POLICIES ANTIGAS (se existirem)
-- ========================================

-- Users
DROP POLICY IF EXISTS "Users can view own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Users can insert own data" ON users;
DROP POLICY IF EXISTS "Service role full access users" ON users;

-- Products
DROP POLICY IF EXISTS "Users can view own products" ON products;
DROP POLICY IF EXISTS "Users can view marketplace products" ON products;
DROP POLICY IF EXISTS "Users can insert own products" ON products;
DROP POLICY IF EXISTS "Users can update own products" ON products;
DROP POLICY IF EXISTS "Users can delete own products" ON products;
DROP POLICY IF EXISTS "Service role full access products" ON products;

-- Payments
DROP POLICY IF EXISTS "Users can view own payments" ON payments;
DROP POLICY IF EXISTS "Users can insert own payments" ON payments;
DROP POLICY IF EXISTS "Users can update own payments" ON payments;
DROP POLICY IF EXISTS "Service role full access payments" ON payments;

-- Transactions
DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can insert own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can update own transactions" ON transactions;
DROP POLICY IF EXISTS "Service role full access transactions" ON transactions;

-- Payment Links
DROP POLICY IF EXISTS "Users can view own payment links" ON payment_links;
DROP POLICY IF EXISTS "Users can insert own payment links" ON payment_links;
DROP POLICY IF EXISTS "Users can update own payment links" ON payment_links;
DROP POLICY IF EXISTS "Users can delete own payment links" ON payment_links;
DROP POLICY IF EXISTS "Public can view active payment links" ON payment_links;
DROP POLICY IF EXISTS "Service role full access payment_links" ON payment_links;

-- Checkout Customization
DROP POLICY IF EXISTS "Users can view own checkout customization" ON checkout_customization;
DROP POLICY IF EXISTS "Anyone can view checkout customization by product" ON checkout_customization;
DROP POLICY IF EXISTS "Users can insert own checkout customization" ON checkout_customization;
DROP POLICY IF EXISTS "Users can update own checkout customization" ON checkout_customization;
DROP POLICY IF EXISTS "Users can delete own checkout customization" ON checkout_customization;
DROP POLICY IF EXISTS "Service role full access checkout_customization" ON checkout_customization;

-- Bank Accounts
DROP POLICY IF EXISTS "Users can view own bank accounts" ON bank_accounts;
DROP POLICY IF EXISTS "Users can insert own bank accounts" ON bank_accounts;
DROP POLICY IF EXISTS "Users can update own bank accounts" ON bank_accounts;
DROP POLICY IF EXISTS "Users can delete own bank accounts" ON bank_accounts;
DROP POLICY IF EXISTS "Service role full access bank_accounts" ON bank_accounts;

-- API Keys
DROP POLICY IF EXISTS "Users can view own api keys" ON api_keys;
DROP POLICY IF EXISTS "Users can insert own api keys" ON api_keys;
DROP POLICY IF EXISTS "Users can update own api keys" ON api_keys;
DROP POLICY IF EXISTS "Users can delete own api keys" ON api_keys;
DROP POLICY IF EXISTS "Service role full access api_keys" ON api_keys;

-- Webhooks
DROP POLICY IF EXISTS "Users can view own webhooks" ON webhooks;
DROP POLICY IF EXISTS "Users can insert own webhooks" ON webhooks;
DROP POLICY IF EXISTS "Users can update own webhooks" ON webhooks;
DROP POLICY IF EXISTS "Users can delete own webhooks" ON webhooks;
DROP POLICY IF EXISTS "Service role full access webhooks" ON webhooks;

-- User Verifications
DROP POLICY IF EXISTS "Users can view own verification" ON user_verifications;
DROP POLICY IF EXISTS "Users can insert own verification" ON user_verifications;
DROP POLICY IF EXISTS "Users can update own verification" ON user_verifications;
DROP POLICY IF EXISTS "Service role full access user_verifications" ON user_verifications;

-- Balance Reserves
DROP POLICY IF EXISTS "Users can view own reserves" ON balance_reserves;
DROP POLICY IF EXISTS "Service role full access balance_reserves" ON balance_reserves;

-- Push Subscriptions
DROP POLICY IF EXISTS "Users can manage own push subscriptions" ON push_subscriptions;
DROP POLICY IF EXISTS "Service role full access push_subscriptions" ON push_subscriptions;

-- Withdrawals
DROP POLICY IF EXISTS "Users can view own withdrawals" ON withdrawals;
DROP POLICY IF EXISTS "Users can insert own withdrawals" ON withdrawals;
DROP POLICY IF EXISTS "Service role full access withdrawals" ON withdrawals;

-- ========================================
-- CRIAR NOVAS POLICIES
-- ========================================

-- ==========================================
-- USERS - Apenas próprios dados
-- ==========================================
CREATE POLICY "users_select_own" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "users_update_own" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "users_service_role" ON users
  FOR ALL USING (auth.role() = 'service_role');

-- ==========================================
-- PRODUCTS - Próprios + Marketplace público
-- ==========================================
CREATE POLICY "products_select_own" ON products
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "products_select_marketplace" ON products
  FOR SELECT USING (marketplace_enabled = true AND active = true);

CREATE POLICY "products_insert_own" ON products
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "products_update_own" ON products
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "products_delete_own" ON products
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "products_service_role" ON products
  FOR ALL USING (auth.role() = 'service_role');

-- ==========================================
-- PAYMENTS - Apenas próprios dados
-- ==========================================
CREATE POLICY "payments_select_own" ON payments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "payments_insert_own" ON payments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "payments_update_own" ON payments
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "payments_service_role" ON payments
  FOR ALL USING (auth.role() = 'service_role');

-- ==========================================
-- TRANSACTIONS - Apenas próprios dados
-- ==========================================
CREATE POLICY "transactions_select_own" ON transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "transactions_insert_own" ON transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "transactions_update_own" ON transactions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "transactions_service_role" ON transactions
  FOR ALL USING (auth.role() = 'service_role');

-- ==========================================
-- PAYMENT_LINKS - Próprios + Público para checkout
-- ==========================================
CREATE POLICY "payment_links_select_own" ON payment_links
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "payment_links_select_public" ON payment_links
  FOR SELECT USING (active = true);

CREATE POLICY "payment_links_insert_own" ON payment_links
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "payment_links_update_own" ON payment_links
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "payment_links_delete_own" ON payment_links
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "payment_links_service_role" ON payment_links
  FOR ALL USING (auth.role() = 'service_role');

-- ==========================================
-- CHECKOUT_CUSTOMIZATION - Próprios + Público
-- ==========================================
CREATE POLICY "checkout_select_own" ON checkout_customization
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "checkout_select_public" ON checkout_customization
  FOR SELECT USING (true);

CREATE POLICY "checkout_insert_own" ON checkout_customization
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "checkout_update_own" ON checkout_customization
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "checkout_delete_own" ON checkout_customization
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "checkout_service_role" ON checkout_customization
  FOR ALL USING (auth.role() = 'service_role');

-- ==========================================
-- AFFILIATES - Próprios (afiliado ou dono)
-- ==========================================
CREATE POLICY "affiliates_select_own" ON affiliates
  FOR SELECT USING (auth.uid() = affiliate_user_id OR auth.uid() = product_owner_id);

CREATE POLICY "affiliates_insert_own" ON affiliates
  FOR INSERT WITH CHECK (auth.uid() = affiliate_user_id);

CREATE POLICY "affiliates_update_own" ON affiliates
  FOR UPDATE USING (auth.uid() = affiliate_user_id);

CREATE POLICY "affiliates_delete_own" ON affiliates
  FOR DELETE USING (auth.uid() = affiliate_user_id);

CREATE POLICY "affiliates_service_role" ON affiliates
  FOR ALL USING (auth.role() = 'service_role');

-- ==========================================
-- AFFILIATE_SALES - Via afiliação
-- ==========================================
CREATE POLICY "affiliate_sales_select" ON affiliate_sales
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM affiliates 
      WHERE affiliates.id = affiliate_sales.affiliate_id 
      AND (affiliates.affiliate_user_id = auth.uid() OR affiliates.product_owner_id = auth.uid())
    )
  );

CREATE POLICY "affiliate_sales_service_role" ON affiliate_sales
  FOR ALL USING (auth.role() = 'service_role');

-- ==========================================
-- BANK_ACCOUNTS - Apenas próprios dados
-- ==========================================
CREATE POLICY "bank_accounts_select_own" ON bank_accounts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "bank_accounts_insert_own" ON bank_accounts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "bank_accounts_update_own" ON bank_accounts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "bank_accounts_delete_own" ON bank_accounts
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "bank_accounts_service_role" ON bank_accounts
  FOR ALL USING (auth.role() = 'service_role');

-- ==========================================
-- API_KEYS - Apenas próprios dados
-- ==========================================
CREATE POLICY "api_keys_select_own" ON api_keys
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "api_keys_insert_own" ON api_keys
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "api_keys_update_own" ON api_keys
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "api_keys_delete_own" ON api_keys
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "api_keys_service_role" ON api_keys
  FOR ALL USING (auth.role() = 'service_role');

-- ==========================================
-- WEBHOOKS - Apenas próprios dados
-- ==========================================
CREATE POLICY "webhooks_select_own" ON webhooks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "webhooks_insert_own" ON webhooks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "webhooks_update_own" ON webhooks
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "webhooks_delete_own" ON webhooks
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "webhooks_service_role" ON webhooks
  FOR ALL USING (auth.role() = 'service_role');

-- ==========================================
-- WEBHOOK_LOGS - Via webhook
-- ==========================================
CREATE POLICY "webhook_logs_select" ON webhook_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM webhooks 
      WHERE webhooks.id = webhook_logs.webhook_id 
      AND webhooks.user_id = auth.uid()
    )
  );

CREATE POLICY "webhook_logs_service_role" ON webhook_logs
  FOR ALL USING (auth.role() = 'service_role');

-- ==========================================
-- USER_VERIFICATIONS - Apenas próprios dados
-- ==========================================
CREATE POLICY "verifications_select_own" ON user_verifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "verifications_insert_own" ON user_verifications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "verifications_update_own" ON user_verifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "verifications_service_role" ON user_verifications
  FOR ALL USING (auth.role() = 'service_role');

-- ==========================================
-- BALANCE_RESERVES - Apenas próprios dados
-- ==========================================
CREATE POLICY "reserves_select_own" ON balance_reserves
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "reserves_service_role" ON balance_reserves
  FOR ALL USING (auth.role() = 'service_role');

-- ==========================================
-- PUSH_SUBSCRIPTIONS - Apenas próprios dados
-- ==========================================
CREATE POLICY "push_select_own" ON push_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "push_insert_own" ON push_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "push_delete_own" ON push_subscriptions
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "push_service_role" ON push_subscriptions
  FOR ALL USING (auth.role() = 'service_role');

-- ==========================================
-- WITHDRAWALS - Apenas próprios dados
-- ==========================================
CREATE POLICY "withdrawals_select_own" ON withdrawals
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "withdrawals_insert_own" ON withdrawals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "withdrawals_service_role" ON withdrawals
  FOR ALL USING (auth.role() = 'service_role');

-- ========================================
-- VERIFICAR SE POLICIES ESTÃO ATIVAS
-- ========================================

SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ========================================
-- FIM DAS POLÍTICAS DE SEGURANÇA
-- ========================================
