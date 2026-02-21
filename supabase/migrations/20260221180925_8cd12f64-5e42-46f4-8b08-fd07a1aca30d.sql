-- Fix Security Definer Views: set security_invoker=true
ALTER VIEW public.v_products_with_marketplace SET (security_invoker = true);
ALTER VIEW public.v_products_mercadolivre SET (security_invoker = true);