-- Migration: Order Management 3.0 (Archiving, Automations, Preferences, Webhooks)
-- Date: 2026-11-05

-- 1. Extend orders table with archiving & stage tracking columns
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS archived_reason TEXT,
ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS archived_type TEXT DEFAULT 'manual' CHECK (archived_type IN ('manual', 'auto')),
ADD COLUMN IF NOT EXISTS stage_entered_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Create helpful indexes
CREATE INDEX IF NOT EXISTS idx_orders_is_archived ON public.orders(is_archived);
CREATE INDEX IF NOT EXISTS idx_orders_archived_at ON public.orders(archived_at);
CREATE INDEX IF NOT EXISTS idx_orders_stage_entered_at ON public.orders(stage_entered_at);

-- 2. Pipeline Automations table
CREATE TABLE IF NOT EXISTS public.order_pipeline_automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  pipeline_key TEXT NOT NULL DEFAULT 'primary',
  stage_key TEXT NOT NULL,
  event_type TEXT NOT NULL DEFAULT 'stage_inactivity' CHECK (event_type IN ('stage_inactivity', 'stage_entered', 'status_changed')),
  time_limit_hours INTEGER NOT NULL DEFAULT 24,
  action_type TEXT NOT NULL DEFAULT 'archive' CHECK (action_type IN ('archive', 'notify', 'webhook', 'custom')),
  conditions JSONB NOT NULL DEFAULT '{"require_unpaid": true, "block_with_open_ticket": true, "block_with_shipping_label": true}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- 3. Pipeline Automation Execution Logs table
CREATE TABLE IF NOT EXISTS public.order_pipeline_automation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id UUID REFERENCES public.order_pipeline_automations(id) ON DELETE SET NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  order_number TEXT,
  action_taken TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'blocked', 'failed')),
  reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index on automation logs
CREATE INDEX IF NOT EXISTS idx_order_pipeline_automation_logs_created_at ON public.order_pipeline_automation_logs(created_at DESC);

-- 4. Pipeline Webhooks table
CREATE TABLE IF NOT EXISTS public.order_pipeline_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  secret_token TEXT,
  events TEXT[] NOT NULL DEFAULT '{order.archived,order.stage_changed,order.restored}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. User Pipeline Preferences table
CREATE TABLE IF NOT EXISTS public.order_pipeline_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  sort_direction TEXT NOT NULL DEFAULT 'oldest_first' CHECK (sort_direction IN ('oldest_first', 'newest_first', 'longest_time_in_stage', 'shortest_time_in_stage')),
  age_criteria TEXT NOT NULL DEFAULT 'created_at' CHECK (age_criteria IN ('created_at', 'stage_entered_at')),
  default_view TEXT NOT NULL DEFAULT 'pipeline' CHECK (default_view IN ('pipeline', 'list')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.order_pipeline_automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_pipeline_automation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_pipeline_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_pipeline_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Super Admin
DO $$
BEGIN
  -- Automations
  DROP POLICY IF EXISTS "Super admins can manage pipeline automations" ON public.order_pipeline_automations;
  CREATE POLICY "Super admins can manage pipeline automations"
    ON public.order_pipeline_automations
    FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.user_id = auth.uid() AND profiles.role = 'super_admin'
      )
    );

  -- Automation logs
  DROP POLICY IF EXISTS "Super admins can view pipeline automation logs" ON public.order_pipeline_automation_logs;
  CREATE POLICY "Super admins can view pipeline automation logs"
    ON public.order_pipeline_automation_logs
    FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.user_id = auth.uid() AND profiles.role = 'super_admin'
      )
    );

  -- Webhooks
  DROP POLICY IF EXISTS "Super admins can manage pipeline webhooks" ON public.order_pipeline_webhooks;
  CREATE POLICY "Super admins can manage pipeline webhooks"
    ON public.order_pipeline_webhooks
    FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.user_id = auth.uid() AND profiles.role = 'super_admin'
      )
    );

  -- Preferences
  DROP POLICY IF EXISTS "Users can manage their own pipeline preferences" ON public.order_pipeline_preferences;
  CREATE POLICY "Users can manage their own pipeline preferences"
    ON public.order_pipeline_preferences
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
END $$;
