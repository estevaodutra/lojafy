-- Adicionar coluna para rastrear se senha foi definida
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS password_set BOOLEAN DEFAULT false;