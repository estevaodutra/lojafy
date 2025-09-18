-- Corrigir estrutura de roles - Fase 1a
-- Primeiro criar o enum e a coluna role se não existir

-- 1. Criar enum de roles
CREATE TYPE app_role AS ENUM ('super_admin', 'supplier', 'reseller', 'customer');

-- 2. Adicionar coluna role na tabela profiles se não existir
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS role app_role DEFAULT 'customer'::app_role;

-- 3. Expandir tabela profiles com campos específicos para multi-tenant
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS business_name TEXT,
ADD COLUMN IF NOT EXISTS business_cnpj TEXT,
ADD COLUMN IF NOT EXISTS business_address TEXT,
ADD COLUMN IF NOT EXISTS subdomain TEXT,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 4. Criar constraint unique para subdomain se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'profiles_subdomain_key' 
        AND table_name = 'profiles'
    ) THEN
        ALTER TABLE profiles ADD CONSTRAINT profiles_subdomain_key UNIQUE (subdomain);
    END IF;
END $$;