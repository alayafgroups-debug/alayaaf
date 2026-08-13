import Layout from "@/components/Layout";
import { purchasesFeatures } from "./Purchases";
import { ArrowRight, Plus, Save, Trash2 } from "lucide-react";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabaseClient";

type DebitNoteItem = {
  id: string;
  description: string;
  account: string;
  quantity: number;
  unitPrice: number;
};

type ExpenseAccount = {
  code: string;
  nameAr: string;
};

type DebitNote = {
  id: string;
  noteNumber: string;
  originalInvoiceId: string;
  supplier: string;
  currency: string;
  date: string;
  orderRef: string;
  project: string;
  subtotal: number;
  tax: number;
  total: number;
  balanceBefore: number;
  balanceAfter: number;
  items: DebitNoteItem[];
};

type PurchaseInvoiceOption = {
  id: string;
  supplier: string;
  purchaseOrder: string;
  adjustedTotal: number;
};

type DebitNoteForm = Omit<DebitNote, "id" | "subtotal" | "tax" | "total" | "balanceBefore" | "balanceAfter">;

const STORAGE_KEY = "purchase-debit-notes";
const START_NUMBER = 100;

const emptyItem = (): DebitNoteItem => ({
  id: crypto.randomUUID(),
  description: "",
  account: "511",
  quantity: 1,
  unitPrice: 0,
});

const buildNumber = (num: number) => `DN-${String(num).padStart(6, "0")}`;
const extractNumber = (noteNumber: string) => Number(noteNumber.split("-")[1] || START_NUMBER);

const createEmptyForm = (num: number): DebitNoteForm => ({
  noteNumber: buildNumber(num),
  originalInvoiceId: "",
  supplier: "",
  currency: "SAR",
  date: new Date().toISOString().split("T")[0],
  orderRef: "",
  project: "",
  items: [emptyItem()],
});

export default function PurchaseDebitNotes() {
  const [mode, setMode] = useState<"list" | "create">("list");
  const [rows, setRows] = useState<DebitNote[]>([]);
  const [invoices, setInvoices] = useState<PurchaseInvoiceOption[]>([]);
  const [expenseAccounts, setExpenseAccounts] = useState<ExpenseAccount[]>([]);
  const [defaultExpenseAccount, setDefaultExpenseAccount] = useState("511");
  const [nextNumber, setNextNumber] = useState(START_NUMBER);
  const [form, setForm] = useState<DebitNoteForm>(() => createEmptyForm(START_NUMBER));

  useEffect(() => {
    const load = async () => {
      const [notesResult, invoicesResult, accountsResult, ruleResult] = await Promise.all([
        supabase
          .from("invoice_adjustment_notes")
          .select("id, note_number, original_invoice_id, counterparty, currency, issue_date, subtotal, tax, total, balance_before, balance_after, items")
          .eq("note_type", "purchase_debit")
          .order("created_at", { ascending: false }),
        supabase
          .from("purchase_invoices")
          .select("id, vendor, po_number, total, adjusted_total")
          .order("date", { ascending: false }),
        supabase
          .from("accounting_accounts")
          .select("code, name_ar, parent_code")
          .like("code", "5%")
          .order("code"),
        supabase
          .from("accounting_posting_rules")
          .select("purchase_account_code")
          .eq("rule_code", "sales_default")
          .maybeSingle(),
      ]);

      if (!notesResult.error) {
        const parsed = (notesResult.data ?? []).map((row: any) => ({
          id: String(row.id), noteNumber: String(row.note_number),
          originalInvoiceId: String(row.original_invoice_id), supplier: String(row.counterparty),
          currency: String(row.currency), date: String(row.issue_date), orderRef: "", project: "",
          subtotal: Number(row.subtotal), tax: Number(row.tax), total: Number(row.total),
          balanceBefore: Number(row.balance_before), balanceAfter: Number(row.balance_after),
          items: Array.isArray(row.items) ? row.items : [],
        }));
        setRows(parsed);
        const sequence = parsed.reduce((max, note) => Math.max(max, extractNumber(note.noteNumber)), START_NUMBER - 1) + 1;
        setNextNumber(sequence);
        setForm(createEmptyForm(sequence));
      }

      if (!invoicesResult.error) {
        setInvoices((invoicesResult.data ?? []).map((row: any) => ({
          id: String(row.id),
          supplier: String(row.vendor || "مورد غير محدد"),
          purchaseOrder: String(row.po_number || ""),
          adjustedTotal: Number(row.adjusted_total ?? String(row.total || "0").replace(/[^0-9.-]/g, "")) || 0,
        })));
      }
      if (!accountsResult.error) {
        const accountRows = accountsResult.data ?? [];
        setExpenseAccounts(accountRows
          .filter((account: any) => !accountRows.some((child: any) => child.parent_code === account.code))
          .map((account: any) => ({ code: String(account.code), nameAr: String(account.name_ar) })));
      }
      if (!ruleResult.error && ruleResult.data?.purchase_account_code) {
        const configuredAccount = String(ruleResult.data.purchase_account_code);
        setDefaultExpenseAccount(configuredAccount);
        setForm((current) => ({
          ...current,
          items: current.items.map((item) => ({ ...item, account: configuredAccount })),
        }));
      }
    };
    load();
  }, []);

  const subtotal = useMemo(
    () => form.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
    [form.items]
  );
  const tax = useMemo(() => subtotal * 0.15, [subtotal]);
  const total = useMemo(() => subtotal + tax, [subtotal, tax]);

  const updateItem = (id: string, key: keyof DebitNoteItem, value: string | number) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item) => (item.id === id ? { ...item, [key]: value } : item)),
    }));
  };

  const addItem = () => setForm((prev) => ({
    ...prev,
    items: [...prev.items, { ...emptyItem(), account: defaultExpenseAccount }],
  }));

  const removeItem = (id: string) =>
    setForm((prev) => ({
      ...prev,
      items: prev.items.length > 1 ? prev.items.filter((item) => item.id !== id) : prev.items,
    }));

  const createNew = () => {
    const nextForm = createEmptyForm(nextNumber);
    nextForm.items = nextForm.items.map((item) => ({ ...item, account: defaultExpenseAccount }));
    setForm(nextForm);
    setMode("create");
  };

  const handleSave = async () => {
    if (!form.originalInvoiceId) {
      toast({ title: "الفاتورة الأصلية مطلوبة", description: "كل إشعار مدين يجب أن يرتبط بفاتورة مشتريات" });
      return;
    }
    if (!form.supplier.trim()) {
      toast({ title: "المورد مطلوب", description: "اختر الفاتورة الأصلية أولاً" });
      return;
    }
    if (total <= 0) {
      toast({ title: "مبلغ الإشعار غير صحيح", description: "أضف بنداً بقيمة أكبر من صفر" });
      return;
    }
    if (form.items.some((item) => !item.account)) {
      toast({ title: "الحساب المحاسبي مطلوب", description: "اختر حساب المصروف لكل بند من شجرة الحسابات" });
      return;
    }

    const cleanedItems = form.items.filter((item) => item.description.trim() || item.account.trim() || item.unitPrice > 0);
    const { data, error } = await supabase.rpc("post_invoice_adjustment_note", {
      p_note_number: form.noteNumber,
      p_note_type: "purchase_debit",
      p_original_invoice_id: form.originalInvoiceId,
      p_counterparty: form.supplier,
      p_currency: form.currency,
      p_issue_date: form.date,
      p_subtotal: subtotal,
      p_tax: tax,
      p_total: total,
      p_items: cleanedItems.length > 0 ? cleanedItems : [emptyItem()],
    });
    if (error) {
      toast({ title: "تعذر ترحيل الإشعار", description: error.message, variant: "destructive" });
      return;
    }

    const invoice = invoices.find((item) => item.id === form.originalInvoiceId)!;
    const payload: DebitNote = {
      id: String(data), ...form, subtotal, tax, total,
      balanceBefore: invoice.adjustedTotal,
      balanceAfter: invoice.adjustedTotal - total,
      items: cleanedItems.length > 0 ? cleanedItems : [emptyItem()],
    };
    setRows((current) => [payload, ...current]);
    setInvoices((current) => current.map((item) => item.id === form.originalInvoiceId ? { ...item, adjustedTotal: payload.balanceAfter } : item));

    const sequence = extractNumber(form.noteNumber) + 1;
    setNextNumber(sequence);
    const nextForm = createEmptyForm(sequence);
    nextForm.items = nextForm.items.map((item) => ({ ...item, account: defaultExpenseAccount }));
    setForm(nextForm);
    setMode("list");
    toast({ title: "تم ترحيل إشعار مدين", description: `تم ربط ${payload.noteNumber} بالفاتورة ${payload.originalInvoiceId} وتسجيل القيد المحاسبي` });
  };

  return (
    <Layout subMenu={{ title: "المشتريات", items: purchasesFeatures }}>
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-foreground">إشعار مدين</h1>
            <p className="text-sm text-muted-foreground">
              {mode === "list" ? "عرض الإشعارات المدينة" : "إنشاء إشعار مدين جديد"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {mode === "list" ? (
              <button
                onClick={createNew}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white"
              >
                <Plus className="h-4 w-4" />
                إنشاء إشعار مدين جديد
              </button>
            ) : (
              <>
                <button
                  onClick={() => setMode("list")}
                  className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium"
                >
                  <ArrowRight className="h-4 w-4" />
                  الرجوع للإشعارات
                </button>
                <button
                  onClick={handleSave}
                  className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white"
                >
                  <Save className="h-4 w-4" />
                  حفظ الإشعار
                </button>
              </>
            )}
          </div>
        </div>

        {mode === "list" ? (
          <div className="space-y-4 rounded-xl border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">
              عدد الإشعارات المدينة: <span className="font-semibold text-foreground">{rows.length}</span>
            </p>
            {rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">لا توجد إشعارات محفوظة حالياً.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] text-right text-sm">
                  <thead>
                    <tr className="bg-muted/40">
                      <th className="px-3 py-2">رقم الإشعار</th>
                      <th className="px-3 py-2">الفاتورة الأصلية</th>
                      <th className="px-3 py-2">المورد</th>
                      <th className="px-3 py-2">التاريخ</th>
                      <th className="px-3 py-2">الإجمالي</th>
                      <th className="px-3 py-2">الرصيد بعد الإشعار</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.id} className="border-t border-border">
                        <td className="px-3 py-2 font-semibold text-primary">{row.noteNumber}</td>
                        <td className="px-3 py-2 font-medium">{row.originalInvoiceId}</td>
                        <td className="px-3 py-2">{row.supplier}</td>
                        <td className="px-3 py-2">{row.date}</td>
                        <td className="px-3 py-2">{row.total.toFixed(2)} {row.currency}</td>
                        <td className="px-3 py-2 font-semibold">{row.balanceAfter.toFixed(2)} {row.currency}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
              <div className="space-y-3 rounded-xl border border-border bg-card p-4">
                <div className="flex h-14 w-36 items-center justify-center rounded-md bg-slate-700 text-xs font-semibold text-white">
                  شركة لاكجري العياف
                </div>
                <h2 className="text-xl font-bold text-foreground">شركة لاكجري العياف</h2>
                <p className="text-sm text-muted-foreground">الشيخ محمد بن جبير</p>
                <p className="text-sm text-muted-foreground">مكة المكرمة</p>
                <p className="text-sm text-muted-foreground">المملكة العربية السعودية</p>
                <p className="text-sm text-muted-foreground">رقم التسجيل الضريبي: 314559705300003</p>
              </div>

              <div className="space-y-3 rounded-xl border border-border bg-card p-4">
                <Field label="رقم الإشعار">
                  <input value={form.noteNumber} readOnly className="h-10 w-full rounded-md border border-border bg-muted/30 px-3 text-sm" />
                </Field>
                <Field label="الفاتورة الأصلية*">
                  <select
                    value={form.originalInvoiceId}
                    onChange={(e) => {
                      const invoice = invoices.find((item) => item.id === e.target.value);
                      setForm({ ...form, originalInvoiceId: e.target.value, supplier: invoice?.supplier || "" });
                    }}
                    className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                  >
                    <option value="">اختر رقم الفاتورة واسم المورد</option>
                    {invoices.map((invoice) => (
                      <option key={invoice.id} value={invoice.id}>
                        فاتورة {invoice.id} — المورد: {invoice.supplier}{invoice.purchaseOrder ? ` — أمر الشراء: ${invoice.purchaseOrder}` : ""} — الرصيد: {invoice.adjustedTotal.toFixed(2)} SAR
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="المورد المرتبط بالفاتورة">
                  <input
                    value={form.supplier}
                    readOnly
                    placeholder="يُحدد تلقائياً من الفاتورة"
                    className="h-10 w-full rounded-md border border-border bg-muted/30 px-3 text-sm"
                  />
                </Field>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="العملة*">
                    <input
                      value={form.currency}
                      onChange={(e) => setForm({ ...form, currency: e.target.value })}
                      className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                    />
                  </Field>
                  <Field label="التاريخ*">
                    <input
                      type="date"
                      value={form.date}
                      onChange={(e) => setForm({ ...form, date: e.target.value })}
                      className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                    />
                  </Field>
                </div>
                <Field label="أمر شراء">
                  <input
                    value={form.orderRef}
                    onChange={(e) => setForm({ ...form, orderRef: e.target.value })}
                    placeholder="اختياري"
                    className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                  />
                </Field>
                <Field label="المشروع">
                  <input
                    value={form.project}
                    onChange={(e) => setForm({ ...form, project: e.target.value })}
                    placeholder="اختياري"
                    className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                  />
                </Field>
              </div>
            </div>

            <div className="space-y-3 rounded-xl border border-border bg-card p-4">
              <p className="text-sm font-semibold text-foreground">السعر شامل من الضريبة</p>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-right text-sm">
                  <thead>
                    <tr className="bg-muted/40">
                      <th className="px-3 py-2">الوصف*</th>
                      <th className="px-3 py-2">حساب*</th>
                      <th className="px-3 py-2">الكمية*</th>
                      <th className="px-3 py-2">السعر*</th>
                      <th className="px-3 py-2">المجموع</th>
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {form.items.map((item) => {
                      const lineTotal = item.quantity * item.unitPrice;
                      return (
                        <tr key={item.id} className="border-t border-border">
                          <td className="px-3 py-2">
                            <input
                              value={item.description}
                              onChange={(e) => updateItem(item.id, "description", e.target.value)}
                              placeholder="مطلوب"
                              className="h-10 w-full rounded-md border border-border bg-background px-3"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <select
                              value={item.account}
                              onChange={(e) => updateItem(item.id, "account", e.target.value)}
                              className="h-10 w-full rounded-md border border-border bg-background px-3"
                            >
                              {(expenseAccounts.length ? expenseAccounts : [{ code: "511", nameAr: "المشتريات والمصروفات" }]).map((account) => (
                                <option key={account.code} value={account.code}>
                                  {account.code} — {account.nameAr}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min={1}
                              value={item.quantity}
                              onChange={(e) => updateItem(item.id, "quantity", Number(e.target.value) || 1)}
                              className="h-10 w-24 rounded-md border border-border bg-background px-3"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min={0}
                              value={item.unitPrice}
                              onChange={(e) => updateItem(item.id, "unitPrice", Number(e.target.value) || 0)}
                              className="h-10 w-32 rounded-md border border-border bg-background px-3"
                            />
                          </td>
                          <td className="px-3 py-2 font-semibold">{lineTotal.toFixed(2)} ﷼</td>
                          <td className="px-3 py-2">
                            <button
                              onClick={() => removeItem(item.id)}
                              className="rounded-md border border-red-200 px-3 py-2 text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={addItem}
                  className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium"
                >
                  <Plus className="h-4 w-4" />
                  أضف بند
                </button>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
              <div className="rounded-xl border border-border bg-card p-4 text-xs text-muted-foreground">
                يتم توليد البيانات لعرض متطلبات ضريبة القيمة المضافة في الإشعار.
              </div>

              <div className="space-y-2 rounded-xl border border-border bg-card p-4 text-sm">
                <div className="flex items-center justify-between">
                  <span>المجموع الفرعي</span>
                  <span>{subtotal.toFixed(2)} ﷼</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>إجمالي ضريبة القيمة المضافة</span>
                  <span>{tax.toFixed(2)} ﷼</span>
                </div>
                <div className="flex items-center justify-between border-t border-border pt-2 text-base font-semibold">
                  <span>المجموع</span>
                  <span>{total.toFixed(2)} ﷼</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid items-center gap-2 sm:grid-cols-[140px_1fr]">
      <label className="text-sm font-medium text-foreground">{label}</label>
      {children}
    </div>
  );
}
