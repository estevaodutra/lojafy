-- Add subscription plan enum
CREATE TYPE public.subscription_plan AS ENUM ('free', 'premium');

-- Add subscription fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN subscription_plan subscription_plan DEFAULT 'free',
ADD COLUMN subscription_expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN subscription_payment_url TEXT DEFAULT 'https://kwfy.app/c/Qeuh5bFm';

-- Create index for subscription queries
CREATE INDEX idx_profiles_subscription_plan ON public.profiles(subscription_plan);
CREATE INDEX idx_profiles_subscription_expires ON public.profiles(subscription_expires_at);

-- Update existing resellers to free plan
UPDATE public.profiles 
SET subscription_plan = 'free' 
WHERE role = 'reseller' AND subscription_plan IS NULL;