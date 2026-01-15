-- Tabela para armazenar Push Subscriptions
-- Execute este SQL no Supabase SQL Editor

-- Criar tabela de push subscriptions
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Índices
  UNIQUE(user_id, endpoint)
);

-- Índice para busca rápida por usuário
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);

-- RLS (Row Level Security)
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança
DROP POLICY IF EXISTS "Users can manage their own subscriptions" ON push_subscriptions;
CREATE POLICY "Users can manage their own subscriptions" ON push_subscriptions
  FOR ALL USING (auth.uid() = user_id);

-- Permitir service role acesso total
DROP POLICY IF EXISTS "Service role has full access to push_subscriptions" ON push_subscriptions;
CREATE POLICY "Service role has full access to push_subscriptions" ON push_subscriptions
  FOR ALL USING (true);

-- Função para limpar subscriptions antigas (mais de 90 dias sem uso)
CREATE OR REPLACE FUNCTION cleanup_old_push_subscriptions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM push_subscriptions
  WHERE updated_at < NOW() - INTERVAL '90 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verificar se foi criada
SELECT 
  column_name, 
  data_type 
FROM information_schema.columns 
WHERE table_name = 'push_subscriptions'
ORDER BY ordinal_position;
