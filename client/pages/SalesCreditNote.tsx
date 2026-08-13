import Layout from "@/components/Layout";
import { salesFeatures } from "./Sales";
import { Plus, Save, Trash2, ArrowRight } from "lucide-react";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabaseClient";
import ZatcaQrCode from "@/components/ZatcaQrCode";

const zatcaStatusLabels: Record<string, string> = {
  pending: "بانتظار الإرسال",
  cleared: "مصادق من ZATCA",
  reported: "مُبلّغ لـ ZATCA",
  rejected: "مرفوض من ZATCA",
};

const accountingStatusLabels: Record<string, string> = {
  unposted: "غير مُرحّل",
  posted: "قيد مُرحّل",
  failed: "فشل الترحيل",
  reversed: "قيد معكوس",
};

type AccountingAccount = {
  code: string;
  nameAr: string;
};

type CreditNoteItem = {
  id: string;
  description: string;
  account: string;
  quantity: number;
  unitPrice: number;
};

type SavedCreditNote = {
  id: string;
  noteNumber: string;
  noteType: "sales_credit" | "sales_debit";
  originalInvoiceId: string;
  customer: string;
  currency: string;
  date: string;
  orderRef: string;
  reference: string;
  project: string;
  warehouse: string;
  subtotal: number;
  tax: number;
  total: number;
  balanceBefore: number;
  balanceAfter: number;
  items: CreditNoteItem[];
  zatcaStatus: string;
  qrCodeData: string;
  accountingStatus: string;
  accountingJournalEntryId: string;
};

type OriginalInvoice = {
  id: string;
  customer: string;
  total: number;
  adjustedTotal: number;
};

type CreditNoteForm = {
  noteNumber: string;
  noteType: "sales_credit" | "sales_debit";
  originalInvoiceId: string;
  customer: string;
  currency: string;
  date: string;
  orderRef: string;
  reference: string;
  project: string;
  warehouse: string;
  items: CreditNoteItem[];
};

const STORAGE_KEY = "sales-credit-notes";
const START_NUMBER = 100;

const emptyItem = (): CreditNoteItem => ({
  id: crypto.randomUUID(),
  description: "",
  account: "411",
  quantity: 1,
  unitPrice: 0,
});

const buildNoteNumber = (sequence: number) => `CN-${String(sequence).padStart(6, "0")}`;

const extractSequence = (noteNumber: string) => {
  const parsed = Number(noteNumber.replace("CN-", ""));
  return Number.isFinite(parsed) ? parsed : START_NUMBER;
};

const createEmptyForm = (sequence: number): CreditNoteForm => ({
  noteNumber: buildNoteNumber(sequence),
  noteType: "sales_credit",
  originalInvoiceId: "",
  customer: "",
  currency: "SAR",
  date: new Date().toISOString().split("T")[0],
  orderRef: "",
  reference: "",
  project: "",
  warehouse: "",
  items: [emptyItem()],
});

export default function SalesCreditNote() {
  const [savedNotes, setSavedNotes] = useState<SavedCreditNote[]>([]);
  const [invoices, setInvoices] = useState<OriginalInvoice[]>([]);
  const [revenueAccounts, setRevenueAccounts] = useState<AccountingAccount[]>([]);
  const [defaultRevenueAccount, setDefaultRevenueAccount] = useState("411");
  const [nextSequence, setNextSequence] = useState(START_NUMBER);
  const [mode, setMode] = useState<"list" | "create" | "details">("list");
  const [selectedNote, setSelectedNote] = useState<SavedCreditNote | null>(null);
  const [form, setForm] = useState<CreditNoteForm>(() => createEmptyForm(START_NUMBER));

  useEffect(() => {
    const load = async () => {
      const [notesResult, invoicesResult, accountsResult, ruleResult] = await Promise.all([
        supabase
          .from("invoice_adjustment_notes")
          .select("id, note_number, note_type, original_invoice_id, counterparty, currency, issue_date, subtotal, tax, total, balance_before, balance_after, items, zatca_status, qr_code_data, accounting_status, accounting_journal_entry_id")
          .in("note_type", ["sales_credit", "sales_debit"])
          .order("created_at", { ascending: false }),
        supabase
          .from("sales_invoices")
          .select("id, customer, total, adjusted_total, accounting_status")
          .eq("accounting_status", "posted")
          .order("date", { ascending: false }),
        supabase
          .from("accounting_accounts")
          .select("code, name_ar, parent_code")
          .like("code", "4%")
          .order("code"),
        supabase
          .from("accounting_posting_rules")
          .select("revenue_account_code")
          .eq("rule_code", "sales_default")
          .maybeSingle(),
      ]);

      if (!notesResult.error) {
        const parsed = (notesResult.data ?? []).map((row: any) => ({
          id: String(row.id),
          noteNumber: String(row.note_number),
          noteType: row.note_type as "sales_credit" | "sales_debit",
          originalInvoiceId: String(row.original_invoice_id),
          customer: String(row.counterparty),
          currency: String(row.currency),
          date: String(row.issue_date),
          orderRef: "",
          reference: String(row.original_invoice_id),
          project: "",
          warehouse: "",
          subtotal: Number(row.subtotal),
          tax: Number(row.tax),
          total: Number(row.total),
          balanceBefore: Number(row.balance_before),
          balanceAfter: Number(row.balance_after),
          items: Array.isArray(row.items) ? row.items : [],
          zatcaStatus: String(row.zatca_status ?? "pending"),
          qrCodeData: String(row.qr_code_data ?? ""),
          accountingStatus: String(row.accounting_status ?? "unposted"),
          accountingJournalEntryId: String(row.accounting_journal_entry_id ?? ""),
        }));
        setSavedNotes(parsed);
        const sequence = parsed.reduce((max, note) => Math.max(max, extractSequence(note.noteNumber)), START_NUMBER - 1) + 1;
        setNextSequence(sequence);
        setForm(createEmptyForm(sequence));
      }

      if (!invoicesResult.error) {
        setInvoices((invoicesResult.data ?? []).map((row: any) => ({
          id: String(row.id),
          customer: String(row.customer || ""),
          total: Number(String(row.total || "0").replace(/[^0-9.-]/g, "")) || 0,
          adjustedTotal: Number(row.adjusted_total ?? String(row.total || "0").replace(/[^0-9.-]/g, "")) || 0,
        })));
      }

      if (!accountsResult.error) {
        const accountRows = accountsResult.data ?? [];
        setRevenueAccounts(accountRows
          .filter((account: any) => !accountRows.some((child: any) => child.parent_code === account.code))
          .map((row: any) => ({
            code: String(row.code),
            nameAr: String(row.name_ar),
          })));
      }
      if (!ruleResult.error && ruleResult.data?.revenue_account_code) {
        const configuredRevenue = String(ruleResult.data.revenue_account_code);
        setDefaultRevenueAccount(configuredRevenue);
        setForm((current) => ({
          ...current,
          items: current.items.map((item) => ({ ...item, account: configuredRevenue })),
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

  const updateItem = (id: string, key: keyof CreditNoteItem, value: string | number) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item) => (item.id === id ? { ...item, [key]: value } : item)),
    }));
  };

  const addItem = () => setForm((prev) => ({
    ...prev,
    items: [...prev.items, { ...emptyItem(), account: defaultRevenueAccount }],
  }));

  const removeItem = (id: string) =>
    setForm((prev) => ({
      ...prev,
      items: prev.items.length > 1 ? prev.items.filter((item) => item.id !== id) : prev.items,
    }));

  const createNewNote = () => {
    const nextForm = createEmptyForm(nextSequence);
    nextForm.items = nextForm.items.map((item) => ({ ...item, account: defaultRevenueAccount }));
    setForm(nextForm);
    setMode("create");
  };

  const handleSave = async () => {
    if (!form.originalInvoiceId) {
      toast({ title: "الفاتورة الأصلية مطلوبة", description: "كل إشعار يجب أن يكون مرتبطاً بفاتورة مبيعات" });
      return;
    }
    if (!form.customer.trim()) {
      toast({ title: "العميل مطلوب", description: "اختر الفاتورة الأصلية أولاً" });
      return;
    }
    if (total <= 0) {
      toast({ title: "مبلغ الإشعار غير صحيح", description: "أضف بنداً بقيمة أكبر من صفر" });
      return;
    }
    if (form.items.some((item) => !item.account)) {
      toast({ title: "الحساب المحاسبي مطلوب", description: "اختر حساب الإيراد لكل بند من شجرة الحسابات" });
      return;
    }

    const cleanedItems = form.items.filter(
      (item) => item.description.trim() || item.account.trim() || item.unitPrice > 0
    );

    const { data, error } = await supabase.rpc("post_invoice_adjustment_note", {
      p_note_number: form.noteNumber,
      p_note_type: form.noteType,
      p_original_invoice_id: form.originalInvoiceId,
      p_counterparty: form.customer,
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

    const { data: postedNote } = await supabase
      .from("invoice_adjustment_notes")
      .select("accounting_status, accounting_journal_entry_id")
      .eq("id", String(data))
      .single();

    const zatca = await supabase.functions.invoke("zatca-invoice", {
      body: { noteId: String(data) },
    });
    if (zatca.error || zatca.data?.error) {
      const context = (zatca.error as { context?: Response } | null)?.context;
      const payload = context
        ? await context
            .clone()
            .json()
            .catch(() => null)
        : null;
      toast({
        title: "تعذر إرسال الإشعار إلى ZATCA",
        description: String(
          payload?.error ??
            zatca.data?.error ??
            zatca.error?.message ??
            "حدث خطأ غير متوقع",
        ),
        variant: "destructive",
      });
    } else {
      toast({ title: "ZATCA", description: String(zatca.data.message) });
    }

    const invoice = invoices.find((item) => item.id === form.originalInvoiceId)!;
    const signedAmount = form.noteType === "sales_credit" ? -total : total;
    const payload: SavedCreditNote = {
      id: String(data), noteNumber: form.noteNumber, noteType: form.noteType,
      originalInvoiceId: form.originalInvoiceId, customer: form.customer,
      currency: form.currency, date: form.date, orderRef: form.orderRef,
      reference: form.originalInvoiceId, project: form.project, warehouse: form.warehouse,
      subtotal, tax, total, balanceBefore: invoice.adjustedTotal,
      balanceAfter: invoice.adjustedTotal + signedAmount,
      items: cleanedItems.length > 0 ? cleanedItems : [emptyItem()],
      zatcaStatus: String(zatca.data?.status ?? "rejected"),
      qrCodeData: String(zatca.data?.qrCodeData ?? ""),
      accountingStatus: String(postedNote?.accounting_status ?? "posted"),
      accountingJournalEntryId: String(postedNote?.accounting_journal_entry_id ?? ""),
    };
    setSavedNotes((current) => [payload, ...current]);
    setInvoices((current) => current.map((item) => item.id === form.originalInvoiceId ? { ...item, adjustedTotal: payload.balanceAfter } : item));

    const sequence = extractSequence(form.noteNumber) + 1;
    setNextSequence(sequence);
    const nextForm = createEmptyForm(sequence);
    nextForm.items = nextForm.items.map((item) => ({ ...item, account: defaultRevenueAccount }));
    setForm(nextForm);
    setMode("list");
    toast({
      title: form.noteType === "sales_credit" ? "تم ترحيل الإشعار الدائن" : "تم ترحيل الإشعار المدين",
      description: `تم ربط ${payload.noteNumber} بالفاتورة ${payload.originalInvoiceId} وتسجيل القيد المحاسبي`,
    });
  };

  return (
    <Layout subMenu={{ title: "المبيعات", items: salesFeatures }}>
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-foreground">إشعارات تعديل المبيعات</h1>
            <p className="text-sm text-muted-foreground">
              {mode === "list" ? "إشعارات دائنة ومدينة مرتبطة بالفواتير" : "إنشاء إشعار مرتبط بفاتورة مبيعات"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {mode === "list" ? (
              <button
                onClick={createNewNote}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white"
              >
                <Plus className="h-4 w-4" />
                إنشاء إشعار جديد
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
              عدد الإشعارات المرحلة: <span className="font-semibold text-foreground">{savedNotes.length}</span>
            </p>

            {savedNotes.length === 0 ? (
              <p className="text-sm text-muted-foreground">لا يوجد إشعارات محفوظة حالياً.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] text-right text-sm">
                  <thead>
                    <tr className="bg-muted/40">
                      <th className="px-3 py-2">رقم الإشعار</th>
                      <th className="px-3 py-2">النوع</th>
                      <th className="px-3 py-2">الفاتورة الأصلية</th>
                      <th className="px-3 py-2">العميل</th>
                      <th className="px-3 py-2">التاريخ</th>
                      <th className="px-3 py-2">الإجمالي</th>
                      <th className="px-3 py-2">الرصيد بعد الإشعار</th>
                      <th className="px-3 py-2">القيد المحاسبي</th>
                      <th className="px-3 py-2">حالة ZATCA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {savedNotes.map((note) => (
                      <tr key={note.id} className="border-t border-border">
                        <td className="px-3 py-2">
                          <button
                            onClick={() => {
                              setSelectedNote(note);
                              setMode("details");
                            }}
                            className="font-semibold text-primary underline-offset-2 hover:underline"
                          >
                            {note.noteNumber}
                          </button>
                        </td>
                        <td className="px-3 py-2">{note.noteType === "sales_credit" ? "دائن −" : "مدين +"}</td>
                        <td className="px-3 py-2 font-medium">{note.originalInvoiceId}</td>
                        <td className="px-3 py-2">{note.customer}</td>
                        <td className="px-3 py-2">{note.date}</td>
                        <td className="px-3 py-2">{note.total.toFixed(2)} {note.currency}</td>
                        <td className="px-3 py-2 font-semibold">{note.balanceAfter.toFixed(2)} {note.currency}</td>
                        <td className="px-3 py-2">
                          <span className={`rounded-full px-2 py-1 text-xs font-semibold ${
                            note.accountingStatus === "posted"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-amber-100 text-amber-700"
                          }`}>
                            {accountingStatusLabels[note.accountingStatus] ?? note.accountingStatus}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={`rounded-full px-2 py-1 text-xs font-semibold ${
                              note.zatcaStatus === "cleared" ||
                              note.zatcaStatus === "reported"
                                ? "bg-emerald-100 text-emerald-700"
                                : note.zatcaStatus === "rejected"
                                  ? "bg-rose-100 text-rose-700"
                                  : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {zatcaStatusLabels[note.zatcaStatus] ?? note.zatcaStatus}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : mode === "details" && selectedNote ? (
          <div className="space-y-4 rounded-xl border border-border bg-card p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-bold text-foreground">
                {selectedNote.noteNumber}
              </h2>
              <button
                onClick={() => setMode("list")}
                className="rounded-md border border-border px-4 py-2 text-sm font-semibold"
              >
                رجوع للقائمة
              </button>
            </div>
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <p>النوع: {selectedNote.noteType === "sales_credit" ? "إشعار دائن" : "إشعار مدين"}</p>
              <p>الفاتورة الأصلية: {selectedNote.originalInvoiceId}</p>
              <p>العميل: {selectedNote.customer}</p>
              <p>التاريخ: {selectedNote.date}</p>
              <p>المجموع الفرعي: {selectedNote.subtotal.toFixed(2)} {selectedNote.currency}</p>
              <p>الضريبة: {selectedNote.tax.toFixed(2)} {selectedNote.currency}</p>
              <p>الإجمالي: {selectedNote.total.toFixed(2)} {selectedNote.currency}</p>
              <p>
                حالة ZATCA: {zatcaStatusLabels[selectedNote.zatcaStatus] ?? selectedNote.zatcaStatus}
              </p>
              <p>
                القيد المحاسبي: {accountingStatusLabels[selectedNote.accountingStatus] ?? selectedNote.accountingStatus}
              </p>
              {selectedNote.accountingJournalEntryId && (
                <p>رقم القيد: {selectedNote.accountingJournalEntryId}</p>
              )}
            </div>
            <div className="flex items-center gap-4 border-t border-border pt-4">
              {selectedNote.qrCodeData ? (
                <ZatcaQrCode value={selectedNote.qrCodeData} size={112} />
              ) : (
                <div className="flex h-28 w-28 items-center justify-center rounded border border-dashed border-border text-xs text-muted-foreground">
                  QR بعد الاعتماد
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                يظهر رمز الاستجابة السريعة بعد قبول ZATCA للإشعار.
              </p>
            </div>
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
                  <input
                    value={form.noteNumber}
                    readOnly
                    className="h-10 w-full rounded-md border border-border bg-muted/30 px-3 text-sm"
                  />
                </Field>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="نوع الإشعار*">
                    <select
                      value={form.noteType}
                      onChange={(e) => setForm({ ...form, noteType: e.target.value as "sales_credit" | "sales_debit" })}
                      className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                    >
                      <option value="sales_credit">إشعار دائن — يخفض رصيد الفاتورة</option>
                      <option value="sales_debit">إشعار مدين — يزيد رصيد الفاتورة</option>
                    </select>
                  </Field>
                  <Field label="الفاتورة الأصلية*">
                    <select
                      value={form.originalInvoiceId}
                      onChange={(e) => {
                        const invoice = invoices.find((item) => item.id === e.target.value);
                        setForm({ ...form, originalInvoiceId: e.target.value, customer: invoice?.customer || "", reference: e.target.value });
                      }}
                      className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                    >
                      <option value="">اختر الفاتورة</option>
                      {invoices.map((invoice) => (
                        <option key={invoice.id} value={invoice.id}>{invoice.id} — {invoice.customer} — الرصيد {invoice.adjustedTotal.toFixed(2)} SAR</option>
                      ))}
                    </select>
                  </Field>
                </div>

                <Field label="العميل المرتبط بالفاتورة">
                  <input
                    value={form.customer}
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

                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="أمر الشراء">
                    <input
                      value={form.orderRef}
                      onChange={(e) => setForm({ ...form, orderRef: e.target.value })}
                      placeholder="اختياري"
                      className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                    />
                  </Field>
                  <Field label="مرجع الفاتورة">
                    <input
                      value={form.reference}
                      readOnly
                      placeholder="يُحدد من الفاتورة الأصلية"
                      className="h-10 w-full rounded-md border border-border bg-muted/30 px-3 text-sm"
                    />
                  </Field>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="المشروع">
                    <input
                      value={form.project}
                      onChange={(e) => setForm({ ...form, project: e.target.value })}
                      placeholder="اختياري"
                      className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                    />
                  </Field>
                  <Field label="المستودع">
                    <input
                      value={form.warehouse}
                      onChange={(e) => setForm({ ...form, warehouse: e.target.value })}
                      placeholder="اختياري"
                      className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                    />
                  </Field>
                </div>
              </div>
            </div>

            <div className="space-y-3 rounded-xl border border-border bg-card p-4">
              <p className="text-sm font-semibold text-foreground">السعر شامل من الضريبة</p>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-right text-sm">
                  <thead>
                    <tr className="bg-muted/40">
                      <th className="px-3 py-2">الوصف</th>
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
                              placeholder="مفتاح أو خدمة"
                              className="h-10 w-full rounded-md border border-border bg-background px-3"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <select
                              value={item.account}
                              onChange={(e) => updateItem(item.id, "account", e.target.value)}
                              className="h-10 w-full rounded-md border border-border bg-background px-3"
                            >
                              {(revenueAccounts.length ? revenueAccounts : [{ code: "411", nameAr: "إيرادات المبيعات والخدمات" }]).map((account) => (
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
                رمز الاستجابة السريعة يظهر لعرض متطلبات هيئة الزكاة والضريبة والجمارك بالفاتورة الإلكترونية.
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
