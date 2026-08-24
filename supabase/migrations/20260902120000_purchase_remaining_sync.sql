-- Keep legacy and adjusted purchase invoice balance fields synchronized.
-- No sales invoice, ZATCA XML, signing, QR, clearance, or reporting flow is changed.

create or replace function public.validate_purchase_invoice_totals()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_item jsonb;
  v_quantity numeric;
  v_price numeric;
  v_discount numeric;
  v_rate numeric;
  v_line numeric;
  v_subtotal numeric(14,2) := 0;
  v_tax numeric(14,2) := 0;
  v_total numeric(14,2);
  v_paid numeric(14,2);
  v_effective_total numeric(14,2);
begin
  if jsonb_typeof(new.items) <> 'array' or jsonb_array_length(new.items) = 0 then
    raise exception 'PURCHASE_INVOICE_ITEMS_REQUIRED';
  end if;
  if new.vendor_id is null then
    raise exception 'PURCHASE_INVOICE_VENDOR_REQUIRED';
  end if;
  if not exists (select 1 from public.vendors where id = new.vendor_id and status = 'نشط') then
    raise exception 'PURCHASE_INVOICE_VENDOR_INVALID';
  end if;

  for v_item in select value from jsonb_array_elements(new.items)
  loop
    v_quantity := coalesce(nullif(v_item->>'quantity', '')::numeric, 0);
    v_price := coalesce(nullif(v_item->>'unitPrice', '')::numeric, 0);
    v_discount := coalesce(nullif(v_item->>'discount', '')::numeric, 0);
    v_rate := coalesce(nullif(v_item->>'taxPercent', '')::numeric, 0);
    if v_quantity <= 0 or v_price < 0 or v_discount < 0 or v_discount > v_quantity * v_price then
      raise exception 'PURCHASE_INVOICE_ITEM_VALUES_INVALID';
    end if;
    if v_rate not in (0, 15) then
      raise exception 'PURCHASE_INVOICE_TAX_RATE_INVALID';
    end if;
    v_line := round(v_quantity * v_price - v_discount, 2);
    v_subtotal := v_subtotal + v_line;
    v_tax := v_tax + round(v_line * v_rate / 100, 2);
  end loop;

  v_subtotal := round(v_subtotal, 2);
  v_tax := round(v_tax, 2);
  v_total := v_subtotal + v_tax;
  v_paid := coalesce(nullif(regexp_replace(coalesce(new.paid::text, '0'), '[^0-9.-]', '', 'g'), '')::numeric, 0);
  v_effective_total := v_total + coalesce(new.adjustment_total, 0);

  new.subtotal := v_subtotal;
  new.total_tax := v_tax;
  new.total := v_total::text;
  new.adjusted_total := v_effective_total;
  new.remaining := greatest(v_effective_total - v_paid, 0)::text;
  new.adjusted_remaining := greatest(v_effective_total - v_paid, 0);
  return new;
end;
$$;

update public.purchase_invoices
set remaining = coalesce(adjusted_remaining, greatest(coalesce(adjusted_total, subtotal + total_tax) - coalesce(nullif(regexp_replace(coalesce(paid::text, '0'), '[^0-9.-]', '', 'g'), '')::numeric, 0), 0))::text
where remaining is distinct from coalesce(adjusted_remaining, greatest(coalesce(adjusted_total, subtotal + total_tax) - coalesce(nullif(regexp_replace(coalesce(paid::text, '0'), '[^0-9.-]', '', 'g'), '')::numeric, 0), 0))::text;
