-- Criar políticas RLS para clientes visualizarem seus próprios pedidos
do $$
begin
  -- orders: clientes podem ver seus próprios pedidos
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'orders'
      and policyname = 'users_select_own_orders'
  ) then
    create policy "users_select_own_orders"
      on public.orders
      for select
      using (user_id = auth.uid());
  end if;

  -- order_items: clientes podem ver itens dos seus pedidos
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'order_items'
      and policyname = 'users_select_items_of_own_orders'
  ) then
    create policy "users_select_items_of_own_orders"
      on public.order_items
      for select
      using (
        exists (
          select 1
          from public.orders o
          where o.id = order_items.order_id
            and o.user_id = auth.uid()
        )
      );
  end if;
end $$;