create index if not exists inventory_products_inventory_account_idx on public.inventory_products(inventory_account_code) where inventory_account_code is not null;
create index if not exists inventory_products_cogs_account_idx on public.inventory_products(cogs_account_code) where cogs_account_code is not null;
create index if not exists inventory_products_revenue_account_idx on public.inventory_products(revenue_account_code);
