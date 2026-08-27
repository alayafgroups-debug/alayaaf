import { useEffect, useMemo, useState } from "react";
import { Edit3, Loader2, PackageMinus, Plus, Save, Send, Trash2, X } from "lucide-react";
import Layout from "@/components/Layout";
import { useI18n } from "@/i18n";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "@/hooks/use-toast";

type Product = { id: string; sku: string; name: string; unit: string };
type Warehouse = { id: string; code: string; name: string };
type Customer = { id: string; number: string; name: string };
type SalesInvoice = { id: string; customerId: string; customer: string };
type Balance = { productId: string; warehouseId: string; quantity: number; value: number };
type IssueLine = { id: number; productId: string; quantity: string; unitCost: string };
type InventoryIssue = {
  id: string;
  number: string;
  date: string;
  issueType: "issue" | "delivery";
  warehouseId: string;
  customerId: string;
  salesInvoiceId: string;
  destination: string;
  reference: string;
  notes: string;
  status: "draft" | "posted";
  accountingStatus: "pending" | "posted" | "not_required";
  journalEntryId: string;
  lines: IssueLine[];
};

const today = () => new Date().toISOString().slice(0, 10);
const newLine = (id = Date.now()): IssueLine => ({ id, productId: "", quantity: "1", unitCost: "" });
const numberValue = (value: string) => Number(value) || 0;

export default function InventoryIssues() {
  const { t, direction, formatNumber } = useI18n();
  const [issues, setIssues] = useState<InventoryIssue[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null | undefined>(undefined);
  const [date, setDate] = useState(today());
  const [issueType, setIssueType] = useState<"issue" | "delivery">("issue");
  const [warehouseId, setWarehouseId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [salesInvoiceId, setSalesInvoiceId] = useState("");
  const [destination, setDestination] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<IssueLine[]>([newLine()]);

  const load = async () => {
    setLoading(true);
    setError("");
    const [issueResult, lineResult, productResult, warehouseResult, customerResult, invoiceResult, balanceResult] = await Promise.all([
      supabase.from("inventory_issues").select("id, issue_number, issue_date, issue_type, warehouse_id, customer_id, sales_invoice_id, destination, reference, notes, status, accounting_status, accounting_journal_entry_id").order("created_at", { ascending: false }),
      supabase.from("inventory_issue_lines").select("id, issue_id, product_id, quantity, unit_cost").order("created_at"),
      supabase.from("inventory_products").select("id, sku, name_ar, unit").eq("item_type", "product").eq("active", true).order("sku"),
      supabase.from("inventory_warehouses").select("id, code, name_ar").eq("active", true).order("code"),
      supabase.from("customers").select("id, customer_number, name").order("name"),
      supabase.from("sales_invoices").select("id, customer_id, customer").order("created_at", { ascending: false }),
      supabase.rpc("list_inventory_balances"),
    ]);
    const firstError = issueResult.error ?? lineResult.error ?? productResult.error ?? warehouseResult.error ?? customerResult.error ?? invoiceResult.error ?? balanceResult.error;
    if (firstError) {
      setError(firstError.message);
      setLoading(false);
      return;
    }
    setProducts((productResult.data ?? []).map((row) => ({ id: String(row.id), sku: String(row.sku), name: String(row.name_ar), unit: String(row.unit) })));
    setWarehouses((warehouseResult.data ?? []).map((row) => ({ id: String(row.id), code: String(row.code), name: String(row.name_ar) })));
    setCustomers((customerResult.data ?? []).map((row) => ({ id: String(row.id), number: String(row.customer_number ?? ""), name: String(row.name ?? "") })));
    setInvoices((invoiceResult.data ?? []).map((row) => ({ id: String(row.id), customerId: String(row.customer_id ?? ""), customer: String(row.customer ?? "") })));
    setBalances((balanceResult.data ?? []).map((row) => ({ productId: String(row.product_id), warehouseId: String(row.warehouse_id), quantity: Number(row.quantity) || 0, value: Number(row.inventory_value) || 0 })));
    setIssues((issueResult.data ?? []).map((row) => ({
      id: String(row.id),
      number: String(row.issue_number),
      date: String(row.issue_date),
      issueType: row.issue_type as InventoryIssue["issueType"],
      warehouseId: String(row.warehouse_id),
      customerId: String(row.customer_id ?? ""),
      salesInvoiceId: String(row.sales_invoice_id ?? ""),
      destination: String(row.destination ?? ""),
      reference: String(row.reference ?? ""),
      notes: String(row.notes ?? ""),
      status: row.status as InventoryIssue["status"],
      accountingStatus: row.accounting_status as InventoryIssue["accountingStatus"],
      journalEntryId: String(row.accounting_journal_entry_id ?? ""),
      lines: (lineResult.data ?? []).filter((line) => line.issue_id === row.id).map((line, index) => ({ id: index + 1, productId: String(line.product_id), quantity: String(line.quantity), unitCost: String(line.unit_cost ?? "") })),
    })));
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const reset = () => {
    setEditingId(undefined);
    setDate(today());
    setIssueType("issue");
    setWarehouseId("");
    setCustomerId("");
    setSalesInvoiceId("");
    setDestination("");
    setReference("");
    setNotes("");
    setLines([newLine()]);
    setError("");
  };
  const startNew = () => { reset(); setEditingId(null); };
  const startEdit = (issue: InventoryIssue) => {
    if (issue.status !== "draft") return;
    setEditingId(issue.id);
    setDate(issue.date);
    setIssueType(issue.issueType);
    setWarehouseId(issue.warehouseId);
    setCustomerId(issue.customerId);
    setSalesInvoiceId(issue.salesInvoiceId);
    setDestination(issue.destination);
    setReference(issue.reference);
    setNotes(issue.notes);
    setLines(issue.lines.length ? issue.lines : [newLine()]);
    setError("");
  };
  const updateLine = (id: number, field: "productId" | "quantity", value: string) => setLines((current) => current.map((line) => line.id === id ? { ...line, [field]: value } : line));
  const balanceFor = (productId: string, selectedWarehouse = warehouseId) => balances.find((balance) => balance.productId === productId && balance.warehouseId === selectedWarehouse) ?? { quantity: 0, value: 0 };
  const estimatedCost = useMemo(() => lines.reduce((sum, line) => {
    const balance = balanceFor(line.productId);
    const average = balance.quantity > 0 ? balance.value / balance.quantity : 0;
    return sum + numberValue(line.quantity) * average;
  }, 0), [lines, warehouseId, balances]);
  const filteredInvoices = invoices.filter((invoice) => !customerId || invoice.customerId === customerId);

  const save = async () => {
    const productIds = lines.map((line) => line.productId).filter(Boolean);
    if (!date || !warehouseId || (issueType === "delivery" && !customerId) || productIds.length !== lines.length || new Set(productIds).size !== productIds.length || lines.some((line) => numberValue(line.quantity) <= 0)) {
      setError(t("أكمل بيانات الصرف وتأكد من عدم تكرار الأصناف وصحة الكميات"));
      return;
    }
    setBusy(true);
    setError("");
    const { error: saveError } = await supabase.rpc("save_inventory_issue", {
      p_id: editingId || null,
      p_issue: {
        issueDate: date,
        issueType,
        warehouseId,
        customerId: customerId || null,
        salesInvoiceId: salesInvoiceId || null,
        destination: destination.trim(),
        reference: reference.trim(),
        notes: notes.trim(),
        lines: lines.map((line) => ({ productId: line.productId, quantity: numberValue(line.quantity) })),
      },
    });
    setBusy(false);
    if (saveError) { setError(saveError.message); return; }
    toast({ title: t("تم حفظ سند الصرف كمسودة") });
    reset();
    await load();
  };

  const post = async (issue: InventoryIssue) => {
    if (!confirm(t("هل تريد ترحيل السند؟ سيتم خصم المخزون وإنشاء قيد تكلفة المبيعات ولن يمكن تعديل السند بعد ذلك."))) return;
    setBusy(true);
    const { error: postError } = await supabase.rpc("post_inventory_issue", { p_id: issue.id });
    setBusy(false);
    if (postError) {
      toast({ title: t("تعذر ترحيل سند الصرف"), description: postError.message, variant: "destructive" });
      return;
    }
    toast({ title: t("تم ترحيل الصرف وقيد تكلفة المبيعات") });
    await load();
  };

  const remove = async (issue: InventoryIssue) => {
    if (!confirm(t("هل تريد حذف مسودة سند الصرف؟"))) return;
    setBusy(true);
    const { error: deleteError } = await supabase.rpc("delete_inventory_issue_draft", { p_id: issue.id });
    setBusy(false);
    if (deleteError) {
      toast({ title: t("تعذر حذف السند"), description: deleteError.message, variant: "destructive" });
      return;
    }
    toast({ title: t("تم حذف المسودة") });
    await load();
  };

  const warehouseName = (id: string) => warehouses.find((warehouse) => warehouse.id === id)?.name ?? "—";
  const customerName = (id: string) => customers.find((customer) => customer.id === id)?.name ?? "—";

  return (
    <Layout>
      <main dir={direction} className="space-y-5">
        <header className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-50 p-2 text-amber-700"><PackageMinus className="h-6 w-6" /></div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{t("سندات الصرف وإشعارات التسليم")}</h1>
              <p className="mt-1 text-sm text-slate-500">{t("صرف المخزون بالمتوسط المرجح مع إنشاء قيد تكلفة المبيعات تلقائياً.")}</p>
            </div>
          </div>
          <button onClick={startNew} className="inline-flex items-center gap-2 rounded bg-amber-600 px-4 py-2 text-sm font-semibold text-white"><Plus className="h-4 w-4" />{t("سند صرف جديد")}</button>
        </header>

        {error && <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        {editingId !== undefined && (
          <section className="rounded-xl border bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-bold">{t(editingId ? "تعديل مسودة الصرف" : "سند صرف جديد")}</h2>
              <button onClick={reset}><X className="h-5 w-5" /></button>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <label className="text-xs text-slate-600">{t("نوع المستند")}<select value={issueType} onChange={(event) => { const next = event.target.value as "issue" | "delivery"; setIssueType(next); if (next === "delivery" && !customerId) setSalesInvoiceId(""); }} className="mt-1 h-10 w-full rounded border px-2"><option value="issue">{t("سند صرف داخلي")}</option><option value="delivery">{t("إشعار تسليم لعميل")}</option></select></label>
              <label className="text-xs text-slate-600">{t("تاريخ الصرف")}<input type="date" max={today()} value={date} onChange={(event) => setDate(event.target.value)} className="mt-1 h-10 w-full rounded border px-3" /></label>
              <label className="text-xs text-slate-600">{t("المستودع")}<select value={warehouseId} onChange={(event) => setWarehouseId(event.target.value)} className="mt-1 h-10 w-full rounded border px-2"><option value="">{t("اختر المستودع")}</option>{warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.code} — {warehouse.name}</option>)}</select></label>
              <label className="text-xs text-slate-600">{t(issueType === "delivery" ? "العميل" : "العميل — اختياري")}<select value={customerId} onChange={(event) => { setCustomerId(event.target.value); setSalesInvoiceId(""); }} className="mt-1 h-10 w-full rounded border px-2"><option value="">{t("بدون عميل")}</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.number} — {customer.name}</option>)}</select></label>
              <label className="text-xs text-slate-600">{t("فاتورة المبيعات — اختياري")}<select value={salesInvoiceId} onChange={(event) => setSalesInvoiceId(event.target.value)} className="mt-1 h-10 w-full rounded border px-2"><option value="">{t("بدون ربط بفاتورة")}</option>{filteredInvoices.map((invoice) => <option key={invoice.id} value={invoice.id}>{invoice.id} — {invoice.customer}</option>)}</select></label>
              <label className="text-xs text-slate-600">{t("جهة التسليم أو المشروع")}<input value={destination} onChange={(event) => setDestination(event.target.value)} className="mt-1 h-10 w-full rounded border px-3" /></label>
              <label className="text-xs text-slate-600">{t("المرجع")}<input value={reference} onChange={(event) => setReference(event.target.value)} className="mt-1 h-10 w-full rounded border px-3" /></label>
              <label className="text-xs text-slate-600 md:col-span-2">{t("ملاحظات")}<input value={notes} onChange={(event) => setNotes(event.target.value)} className="mt-1 h-10 w-full rounded border px-3" /></label>
            </div>

            <div className="mt-5 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-100"><tr><th className="p-2">{t("الصنف")}</th><th className="p-2">{t("الرصيد المتاح")}</th><th className="p-2">{t("الكمية")}</th><th className="p-2">{t("متوسط التكلفة")}</th><th className="p-2" /></tr></thead>
                <tbody>{lines.map((line) => {
                  const balance = balanceFor(line.productId);
                  const average = balance.quantity > 0 ? balance.value / balance.quantity : 0;
                  return <tr key={line.id} className="border-b">
                    <td className="p-2"><select value={line.productId} onChange={(event) => updateLine(line.id, "productId", event.target.value)} className="h-10 w-full min-w-56 rounded border px-2"><option value="">{t("اختر الصنف")}</option>{products.map((product) => <option key={product.id} value={product.id}>{product.sku} — {product.name} ({product.unit})</option>)}</select></td>
                    <td className={`p-2 text-center font-semibold ${balance.quantity < numberValue(line.quantity) ? "text-red-600" : "text-emerald-700"}`}>{formatNumber(balance.quantity, { maximumFractionDigits: 4 })}</td>
                    <td className="p-2"><input type="number" min="0.0001" step="0.0001" value={line.quantity} onChange={(event) => updateLine(line.id, "quantity", event.target.value)} className="h-10 w-28 rounded border px-2" /></td>
                    <td className="p-2 text-center">{formatNumber(average, { minimumFractionDigits: 2, maximumFractionDigits: 4 })} SAR</td>
                    <td className="p-2"><button disabled={lines.length === 1} onClick={() => setLines((current) => current.filter((item) => item.id !== line.id))} className="rounded border border-red-200 p-2 text-red-600 disabled:opacity-40"><Trash2 className="h-4 w-4" /></button></td>
                  </tr>;
                })}</tbody>
              </table>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <button onClick={() => setLines((current) => [...current, newLine(Date.now() + current.length)])} className="rounded border px-3 py-2 text-sm">{t("إضافة صنف")}</button>
              <div className="flex items-center gap-4"><p className="font-bold">{t("التكلفة التقديرية")}: {formatNumber(estimatedCost, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SAR</p><button disabled={busy} onClick={() => void save()} className="inline-flex items-center gap-2 rounded bg-amber-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{t("حفظ المسودة")}</button></div>
            </div>
          </section>
        )}

        <section className="overflow-hidden rounded-xl border bg-white shadow-sm">
          <div className="overflow-x-auto"><table className="min-w-full text-sm">
            <thead className="bg-slate-100 text-slate-600"><tr><th className="p-3">{t("رقم السند")}</th><th className="p-3">{t("النوع")}</th><th className="p-3">{t("التاريخ")}</th><th className="p-3">{t("المستودع")}</th><th className="p-3">{t("العميل")}</th><th className="p-3">{t("التكلفة")}</th><th className="p-3">{t("الحالة")}</th><th className="p-3">{t("الإجراءات")}</th></tr></thead>
            <tbody>{loading ? <tr><td colSpan={8} className="py-14 text-center">{t("جاري التحميل...")}</td></tr> : issues.length === 0 ? <tr><td colSpan={8} className="py-14 text-center text-slate-400">{t("لا توجد سندات صرف")}</td></tr> : issues.map((issue) => <tr key={issue.id} className="border-t">
              <td className="p-3 font-mono">{issue.number}</td><td className="p-3 text-center">{t(issue.issueType === "delivery" ? "إشعار تسليم" : "صرف داخلي")}</td><td className="p-3 text-center">{issue.date}</td><td className="p-3 text-center">{warehouseName(issue.warehouseId)}</td><td className="p-3 text-center">{customerName(issue.customerId)}</td><td className="p-3 text-center font-semibold">{formatNumber(issue.lines.reduce((sum, line) => sum + numberValue(line.quantity) * numberValue(line.unitCost), 0), { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td><td className="p-3 text-center"><span className={`rounded px-2 py-1 text-xs font-semibold ${issue.status === "posted" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{t(issue.status === "posted" ? "مرحّل" : "مسودة")}</span></td>
              <td className="p-3"><div className="flex justify-center gap-1">{issue.status === "draft" && <><button disabled={busy} onClick={() => startEdit(issue)} className="rounded border p-2 text-sky-700" title={t("تعديل")}><Edit3 className="h-4 w-4" /></button><button disabled={busy} onClick={() => void post(issue)} className="rounded border p-2 text-emerald-700" title={t("ترحيل")}><Send className="h-4 w-4" /></button><button disabled={busy} onClick={() => void remove(issue)} className="rounded border p-2 text-red-600" title={t("حذف")}><Trash2 className="h-4 w-4" /></button></>}</div></td>
            </tr>)}</tbody>
          </table></div>
        </section>
      </main>
    </Layout>
  );
}
