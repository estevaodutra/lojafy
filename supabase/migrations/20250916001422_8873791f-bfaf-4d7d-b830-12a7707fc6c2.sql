-- Add public RLS policies for ranking functionality

-- Policy for orders table: Allow public access to confirmed orders from last 30 days
CREATE POLICY "Anyone can view confirmed orders for ranking" 
ON public.orders 
FOR SELECT 
USING (
  status IN ('confirmed', 'shipped', 'delivered', 'processing') 
  AND created_at >= NOW() - INTERVAL '30 days'
);

-- Policy for order_items table: Allow public access to items from valid orders
CREATE POLICY "Anyone can view order items for ranking" 
ON public.order_items 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.orders 
    WHERE orders.id = order_items.order_id 
    AND orders.status IN ('confirmed', 'shipped', 'delivered', 'processing')
    AND orders.created_at >= NOW() - INTERVAL '30 days'
  )
);

-- Policy for profiles table: Allow public access to basic profile data for ranking
CREATE POLICY "Anyone can view basic profile data for ranking" 
ON public.profiles 
FOR SELECT 
USING (true);