CREATE TABLE IF NOT EXISTS public.invoice_adjustment_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  note_number TEXT NOT NULL UNIQUE,
  note_type TEXT NOT NULL CHECK (note_type IN ('sales_credit', 'sales_debit', 'purchase_debit')),
  original_invoice_table TEXT NOT NULL CHECK (original_invoice_table IN ('sales_invoices', 'purchase_invoices')),
  original_invoice_id TEXT NOT NULL,
  counterparty TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'SAR',
  issue_date DATE NOT NULL,
  subtotal NUMERIC(14,2) NOT NULL CHECK (subtotal >= 0),
  tax NUMERIC(14,2) NOT NULL CHECK (tax >= 0),
  total NUMERIC(14,2) NOT NULL CHECK (total > 0),
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'posted' CHECK (status IN ('draft', 'posted', 'cancelled')),
  balance_before NUMERIC(14,2) NOT NULL,
  balance_after NUMERIC(14,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoice_adjustment_original
  ON public.invoice_adjustment_notes(original_invoice_table, original_invoice_id);

CREATE TABLE IF NOT EXISTS public.accounting_journal_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entry_date DATE NOT NULL,
  reference_type TEXT NOT NULL,
  reference_id UUID NOT NULL UNIQUE REFERENCES public.invoice_adjustment_notes(id) ON DELETE RESTRICT,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'posted' CHECK (status IN ('draft', 'posted', 'reversed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.accounting_journal_lines (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  journal_entry_id UUID NOT NULL REFERENCES public.accounting_journal_entries(id) ON DELETE RESTRICT,
  account_code TEXT NOT NULL,
  account_name TEXT NOT NULL,
  debit NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (debit >= 0),
  credit NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (credit >= 0),
  counterparty TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ((debit > 0 AND credit = 0) OR (credit > 0 AND debit = 0))
);

ALTER TABLE public.sales_invoices
  ADD COLUMN IF NOT EXISTS adjustment_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS adjusted_total NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS adjusted_remaining NUMERIC(14,2);

ALTER TABLE public.purchase_invoices
  ADD COLUMN IF NOT EXISTS adjustment_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS adjusted_total NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS adjusted_remaining NUMERIC(14,2);

CREATE OR REPLACE FUNCTION public.post_invoice_adjustment_note(
  p_note_number TEXT,
  p_note_type TEXT,
  p_original_invoice_id TEXT,
  p_counterparty TEXT,
  p_currency TEXT,
  p_issue_date DATE,
  p_subtotal NUMERIC,
  p_tax NUMERIC,
  p_total NUMERIC,
  p_items JSONB
) RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_note_id UUID;
  v_entry_id UUID;
  v_invoice_table TEXT;
  v_base_total NUMERIC;
  v_paid NUMERIC;
  v_old_adjustment NUMERIC;
  v_signed_amount NUMERIC;
  v_before NUMERIC;
  v_after NUMERIC;
BEGIN
  IF p_note_type NOT IN ('sales_credit', 'sales_debit', 'purchase_debit') THEN
    RAISE EXCEPTION 'Unsupported adjustment note type';
  END IF;
  IF p_total <= 0 OR ABS((p_subtotal + p_tax) - p_total) > 0.02 THEN
    RAISE EXCEPTION 'Invalid note totals';
  END IF;
  IF EXISTS (SELECT 1 FROM public.invoice_adjustment_notes WHERE note_number = p_note_number) THEN
    RAISE EXCEPTION 'Duplicate note number';
  END IF;

  v_invoice_table := CASE WHEN p_note_type IN ('sales_credit', 'sales_debit') THEN 'sales_invoices' ELSE 'purchase_invoices' END;
  v_signed_amount := CASE WHEN p_note_type = 'sales_debit' THEN p_total ELSE -p_total END;

  IF v_invoice_table = 'sales_invoices' THEN
    SELECT
      COALESCE(NULLIF(regexp_replace(COALESCE(total::TEXT, ''), '[^0-9.-]', '', 'g'), '')::NUMERIC, 0),
      COALESCE(NULLIF(regexp_replace(COALESCE(paid::TEXT, ''), '[^0-9.-]', '', 'g'), '')::NUMERIC, 0),
      COALESCE(adjustment_total, 0)
    INTO v_base_total, v_paid, v_old_adjustment
    FROM public.sales_invoices WHERE id::TEXT = p_original_invoice_id FOR UPDATE;
  ELSE
    SELECT
      COALESCE(NULLIF(regexp_replace(COALESCE(total::TEXT, ''), '[^0-9.-]', '', 'g'), '')::NUMERIC, 0),
      COALESCE(NULLIF(regexp_replace(COALESCE(paid::TEXT, ''), '[^0-9.-]', '', 'g'), '')::NUMERIC, 0),
      COALESCE(adjustment_total, 0)
    INTO v_base_total, v_paid, v_old_adjustment
    FROM public.purchase_invoices WHERE id::TEXT = p_original_invoice_id FOR UPDATE;
  END IF;

  IF NOT FOUND THEN RAISE EXCEPTION 'Original invoice not found'; END IF;
  v_before := v_base_total + v_old_adjustment;
  v_after := v_before + v_signed_amount;
  IF v_after < 0 THEN RAISE EXCEPTION 'Adjustment exceeds original invoice value'; END IF;

  INSERT INTO public.invoice_adjustment_notes (
    note_number, note_type, original_invoice_table, original_invoice_id, counterparty,
    currency, issue_date, subtotal, tax, total, items, status, balance_before, balance_after
  ) VALUES (
    p_note_number, p_note_type, v_invoice_table, p_original_invoice_id, p_counterparty,
    COALESCE(NULLIF(p_currency, ''), 'SAR'), p_issue_date, p_subtotal, p_tax, p_total,
    COALESCE(p_items, '[]'::jsonb), 'posted', v_before, v_after
  ) RETURNING id INTO v_note_id;

  IF v_invoice_table = 'sales_invoices' THEN
    UPDATE public.sales_invoices SET
      adjustment_total = v_old_adjustment + v_signed_amount,
      adjusted_total = v_after,
      adjusted_remaining = GREATEST(v_after - v_paid, 0),
      status = CASE
        WHEN GREATEST(v_after - v_paid, 0) = 0 THEN 'مدفوعة بالكامل'
        WHEN v_paid > 0 THEN 'مدفوعة جزئياً'
        ELSE 'مفتوحة'
      END
    WHERE id::TEXT = p_original_invoice_id;
  ELSE
    UPDATE public.purchase_invoices SET
      adjustment_total = v_old_adjustment + v_signed_amount,
      adjusted_total = v_after,
      adjusted_remaining = GREATEST(v_after - v_paid, 0),
      status = CASE
        WHEN GREATEST(v_after - v_paid, 0) = 0 THEN 'مدفوعة بالكامل'
        WHEN v_paid > 0 THEN 'مدفوعة جزئياً'
        ELSE 'مفتوحة'
      END
    WHERE id::TEXT = p_original_invoice_id;
  END IF;

  INSERT INTO public.accounting_journal_entries(entry_date, reference_type, reference_id, description)
  VALUES (p_issue_date, p_note_type, v_note_id, p_note_number || ' - ' || p_counterparty)
  RETURNING id INTO v_entry_id;

  IF p_note_type = 'sales_credit' THEN
    INSERT INTO public.accounting_journal_lines(journal_entry_id, account_code, account_name, debit, credit, counterparty) VALUES
      (v_entry_id, '411', 'إيرادات المبيعات والخدمات', p_subtotal, 0, p_counterparty),
      (v_entry_id, '219', 'ضريبة المبيعات المستحقة', p_tax, 0, p_counterparty),
      (v_entry_id, '112', 'ذمم العملاء', 0, p_total, p_counterparty);
  ELSIF p_note_type = 'sales_debit' THEN
    INSERT INTO public.accounting_journal_lines(journal_entry_id, account_code, account_name, debit, credit, counterparty) VALUES
      (v_entry_id, '112', 'ذمم العملاء', p_total, 0, p_counterparty),
      (v_entry_id, '411', 'إيرادات المبيعات والخدمات', 0, p_subtotal, p_counterparty),
      (v_entry_id, '219', 'ضريبة المبيعات المستحقة', 0, p_tax, p_counterparty);
  ELSE
    INSERT INTO public.accounting_journal_lines(journal_entry_id, account_code, account_name, debit, credit, counterparty) VALUES
      (v_entry_id, '2112', 'ذمم الموردين المستحقة', p_total, 0, p_counterparty),
      (v_entry_id, '511', 'المشتريات والمصروفات', 0, p_subtotal, p_counterparty),
      (v_entry_id, '2111', 'ضريبة القيمة المضافة على المشتريات', 0, p_tax, p_counterparty);
  END IF;

  IF ABS((SELECT COALESCE(SUM(debit), 0) - COALESCE(SUM(credit), 0) FROM public.accounting_journal_lines WHERE journal_entry_id = v_entry_id)) > 0.01 THEN
    RAISE EXCEPTION 'Journal entry is not balanced';
  END IF;

  RETURN v_note_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_adjusted_invoice_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.invoice_adjustment_notes
    WHERE original_invoice_table = TG_TABLE_NAME
      AND original_invoice_id = OLD.id::TEXT
      AND status <> 'cancelled'
  ) THEN
    RAISE EXCEPTION 'Cannot delete an invoice linked to posted adjustment notes';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS protect_adjusted_sales_invoice ON public.sales_invoices;
CREATE TRIGGER protect_adjusted_sales_invoice
BEFORE DELETE ON public.sales_invoices
FOR EACH ROW EXECUTE FUNCTION public.prevent_adjusted_invoice_delete();

DROP TRIGGER IF EXISTS protect_adjusted_purchase_invoice ON public.purchase_invoices;
CREATE TRIGGER protect_adjusted_purchase_invoice
BEFORE DELETE ON public.purchase_invoices
FOR EACH ROW EXECUTE FUNCTION public.prevent_adjusted_invoice_delete();

ALTER TABLE public.invoice_adjustment_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_journal_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY invoice_adjustment_notes_authenticated ON public.invoice_adjustment_notes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY accounting_journal_entries_authenticated ON public.accounting_journal_entries FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY accounting_journal_lines_authenticated ON public.accounting_journal_lines FOR ALL TO authenticated USING (true) WITH CHECK (true);
