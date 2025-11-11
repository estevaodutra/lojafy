-- Habilitar Realtime para demo_orders
ALTER TABLE demo_orders REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE demo_orders;

-- Habilitar Realtime para demo_order_items
ALTER TABLE demo_order_items REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE demo_order_items;

-- Habilitar Realtime para product_ranking
ALTER TABLE product_ranking REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE product_ranking;