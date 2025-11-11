-- Habilitar Realtime para tabela orders
ALTER TABLE orders REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE orders;

-- Habilitar Realtime para tabela order_items
ALTER TABLE order_items REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE order_items;