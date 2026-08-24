import { Download, Printer, RefreshCw, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/i18n";
import { supabase } from "@/lib/supabaseClient";
import { exportReportExcel, printReport, type ReportColumn } from "@/lib/reportExport";

type PurchaseItem = {
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxPercent: number;
};

type PurchaseInvoice = {
  id: string;
  date: string;
  dueDate: string;
  vendor: string;
  vendorId: string;
  total: number;
  paid: number;
  remaining: number;
  status: string;
  items: PurchaseItem[];
};

type DebitNote = {
  id: string;
  number: string;
  date: string;
  vendor: string;
  vendorId: string;
  total: number;
};

type Vendor = { id: string; name: string; currency: string; openingBalance: number };
type PurchasePayment = { id: string; invoiceId: string; vendorId: string; amount: number; date: string };
type ReportRow = Record<string, string | number>;

const REPORT_TYPES = {
  summary: "ملخص أرصدة الموردين",
  statement: "كشف حساب مورد",
  details: "تفاصيل حساب المورد",
  product: "المشتريات بحسب المنتج أو الخدمة",
  vendor: "المشتريات بحسب مورد",
  currency: "المشتريات بحسب العملة",
} as const;

type PurchaseReportType = keyof typeof REPORT_TYPES;

function number(value: unknown) {
  return Number(value ?? 0) || 0;
}

function mapInvoice(row: Record<string, unknown>): PurchaseInvoice {
  const adjustedRemaining = row.adjusted_remaining == null ? null : number(row.adjusted_remaining);
  return {
    id: String(row.id ?? ""),
    date: String(row.date ?? ""),
    dueDate: String(row.due_date ?? ""),
    vendor: String(row.vendor ?? ""),
    vendorId: String(row.vendor_id ?? ""),
    total: number(row.total),
    paid: number(row.paid),
    remaining: adjustedRemaining ?? number(row.remaining),
    status: String(row.status ?? ""),
    items: Array.isArray(row.items)
      ? row.items.map((item) => {
          const value = item as Record<string, unknown>;
          return {
            description: String(value.description ?? ""),
            quantity: number(value.quantity),
            unitPrice: number(value.unitPrice),
            discount: number(value.discount),
            taxPercent: number(value.taxPercent),
          };
        })
      : [],
  };
}

function reportType(label: string): PurchaseReportType | null {
  return (Object.keys(REPORT_TYPES) as PurchaseReportType[]).find(
    (key) => REPORT_TYPES[key] === label,
  ) ?? null;
}

function inPeriod(date: string, from: string, to: string) {
  return Boolean(date && date >= from && date <= to);
}

export default function PurchaseReportDetails({ report, onClose }: { report: string; onClose: () => void }) {
  const { t, direction, formatNumber } = useI18n();
  const type = reportType(report);
  const today = new Date().toISOString().slice(0, 10);
  const [dateFrom, setDateFrom] = useState(() => `${today.slice(0, 4)}-01-01`);
  const [dateTo, setDateTo] = useState(today);
  const [selectedVendor, setSelectedVendor] = useState("");
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
  const [notes, setNotes] = useState<DebitNote[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [payments, setPayments] = useState<PurchasePayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    const [invoiceResult, noteResult, vendorResult, paymentResult] = await Promise.all([
      supabase.from("purchase_invoices").select("*").order("date", { ascending: true }),
      supabase.from("invoice_adjustment_notes").select("id, note_number, issue_date, counterparty, total, original_invoice_id").eq("note_type", "purchase_debit").order("issue_date", { ascending: true }),
      supabase.from("vendors").select("id, name, currency, opening_balance"),
      supabase.from("purchase_payments").select("id, invoice_id, vendor_id, amount, payment_date").order("payment_date", { ascending: true }),
    ]);

    const firstError = invoiceResult.error ?? noteResult.error ?? vendorResult.error ?? paymentResult.error;
    if (firstError) {
      setError(firstError.message);
      setLoading(false);
      return;
    }

    const loadedVendors = (vendorResult.data ?? []).map((row) => ({
      id: String(row.id),
      name: String(row.name ?? ""),
      currency: String(row.currency ?? "SAR") || "SAR",
      openingBalance: number(row.opening_balance),
    }));
    const vendorIdByUniqueName = new Map<string, string>();
    loadedVendors.forEach((vendor) => {
      if (loadedVendors.filter((candidate) => candidate.name === vendor.name).length === 1) vendorIdByUniqueName.set(vendor.name, vendor.id);
    });
    const loadedInvoices = (invoiceResult.data ?? []).map((row) => mapInvoice(row as Record<string, unknown>));
    const invoiceById = new Map(loadedInvoices.map((invoice) => [invoice.id, invoice]));
    setInvoices(loadedInvoices);
    setNotes((noteResult.data ?? []).map((row) => {
      const vendor = String(row.counterparty ?? "");
      const originalInvoice = invoiceById.get(String(row.original_invoice_id ?? ""));
      return { id: String(row.id), number: String(row.note_number ?? row.id), date: String(row.issue_date ?? ""), vendor, vendorId: originalInvoice?.vendorId || vendorIdByUniqueName.get(vendor) || "", total: number(row.total) };
    }));
    setVendors(loadedVendors);
    setPayments((paymentResult.data ?? []).map((row) => ({ id: String(row.id), invoiceId: String(row.invoice_id), vendorId: String(row.vendor_id), amount: number(row.amount), date: String(row.payment_date ?? "") })));
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const vendorOptions = useMemo(() => vendors.slice().sort((first, second) => first.name.localeCompare(second.name)), [vendors]);

  const { columns, rows, summary } = useMemo(() => {
    const invoiceRows = invoices.filter((invoice) => inPeriod(invoice.date, dateFrom, dateTo) && (!selectedVendor || invoice.vendorId === selectedVendor));
    const noteRows = notes.filter((note) => inPeriod(note.date, dateFrom, dateTo) && (!selectedVendor || note.vendorId === selectedVendor));
    const paymentRows = payments.filter((payment) => inPeriod(payment.date, dateFrom, dateTo) && (!selectedVendor || payment.vendorId === selectedVendor));
    const vendorById = new Map(vendors.map((vendor) => [vendor.id, vendor]));
    const currencyByVendor = new Map(vendors.map((vendor) => [vendor.id, vendor.currency]));
    const openingByVendor = new Map(vendors.map((vendor) => [vendor.id, vendor.openingBalance]));
    const vendorName = (vendorId: string, fallback = "") => vendorById.get(vendorId)?.name || fallback || t("مورد غير مربوط");
    const money = (value: number) => formatNumber(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const totalInvoices = invoiceRows.reduce((sum, invoice) => sum + invoice.total, 0);
    const totalPayments = paymentRows.reduce((sum, payment) => sum + payment.amount, 0);

    if (type === "product") {
      const grouped = new Map<string, { quantity: number; subtotal: number; tax: number; total: number; vendors: Set<string> }>();
      invoiceRows.forEach((invoice) => invoice.items.forEach((item) => {
        const key = item.description || t("بند غير محدد");
        const current = grouped.get(key) ?? { quantity: 0, subtotal: 0, tax: 0, total: 0, vendors: new Set<string>() };
        const subtotal = item.quantity * item.unitPrice * (1 - item.discount / 100);
        const tax = subtotal * item.taxPercent / 100;
        current.quantity += item.quantity;
        current.subtotal += subtotal;
        current.tax += tax;
        current.total += subtotal + tax;
        if (invoice.vendorId) current.vendors.add(invoice.vendorId);
        grouped.set(key, current);
      }));
      return {
        columns: [
          { key: "item", label: t("المنتج أو الخدمة") }, { key: "quantity", label: t("الكمية") },
          { key: "vendors", label: t("عدد الموردين") }, { key: "subtotal", label: t("قبل الضريبة") },
          { key: "tax", label: t("الضريبة") }, { key: "total", label: t("الإجمالي") },
        ],
        rows: [...grouped.entries()].map(([item, value]) => ({ item, quantity: money(value.quantity), vendors: value.vendors.size, subtotal: money(value.subtotal), tax: money(value.tax), total: money(value.total) })),
        summary: [{ label: t("إجمالي المشتريات"), value: money(totalInvoices) }],
      };
    }

    if (type === "vendor" || type === "summary") {
      const grouped = new Map<string, { name: string; invoices: number; purchases: number; paid: number; notes: number }>();
      invoiceRows.forEach((invoice) => {
        const key = invoice.vendorId || `legacy-invoice:${invoice.id}`;
        const current = grouped.get(key) ?? { name: vendorName(invoice.vendorId, invoice.vendor), invoices: 0, purchases: 0, paid: 0, notes: 0 };
        current.invoices += 1;
        current.purchases += invoice.total;
        grouped.set(key, current);
      });
      paymentRows.forEach((payment) => {
        const current = grouped.get(payment.vendorId) ?? { name: vendorName(payment.vendorId), invoices: 0, purchases: 0, paid: 0, notes: 0 };
        current.paid += payment.amount;
        grouped.set(payment.vendorId, current);
      });
      noteRows.forEach((note) => {
        const key = note.vendorId || `legacy-note:${note.id}`;
        const current = grouped.get(key) ?? { name: vendorName(note.vendorId, note.vendor), invoices: 0, purchases: 0, paid: 0, notes: 0 };
        current.notes += note.total;
        grouped.set(key, current);
      });
      return {
        columns: [
          { key: "vendor", label: t("المورد") }, { key: "currency", label: t("العملة") }, { key: "invoices", label: t("عدد الفواتير") },
          { key: "purchases", label: t("إجمالي المشتريات") }, { key: "paid", label: t("المدفوع") },
          { key: "notes", label: t("إشعارات مدينة") }, { key: "balance", label: t("الرصيد المستحق") },
        ],
        rows: [...grouped.entries()].map(([vendorId, value]) => ({
          vendor: value.name, currency: currencyByVendor.get(vendorId) ?? "SAR", invoices: value.invoices,
          purchases: money(value.purchases), paid: money(value.paid), notes: money(value.notes),
          balance: money((openingByVendor.get(vendorId) ?? 0) + value.purchases - value.notes - value.paid),
        })),
        summary: [{ label: t("إجمالي الرصيد المستحق"), value: money(totalInvoices - noteRows.reduce((sum, note) => sum + note.total, 0) - totalPayments) }],
      };
    }

    if (type === "currency") {
      const grouped = new Map<string, { invoices: number; purchases: number; paid: number; remaining: number }>();
      invoiceRows.forEach((invoice) => {
        const currency = currencyByVendor.get(invoice.vendorId) ?? "SAR";
        const current = grouped.get(currency) ?? { invoices: 0, purchases: 0, paid: 0, remaining: 0 };
        current.invoices += 1;
        current.purchases += invoice.total;
        grouped.set(currency, current);
      });
      paymentRows.forEach((payment) => {
        const currency = currencyByVendor.get(payment.vendorId) ?? "SAR";
        const current = grouped.get(currency) ?? { invoices: 0, purchases: 0, paid: 0, remaining: 0 };
        current.paid += payment.amount;
        grouped.set(currency, current);
      });
      return {
        columns: [{ key: "currency", label: t("العملة") }, { key: "invoices", label: t("عدد الفواتير") }, { key: "purchases", label: t("إجمالي المشتريات") }, { key: "paid", label: t("المدفوع") }, { key: "remaining", label: t("الرصيد المستحق") }],
        rows: [...grouped.entries()].map(([currency, value]) => ({ currency, invoices: value.invoices, purchases: money(value.purchases), paid: money(value.paid), remaining: money(value.purchases - value.paid) })),
        summary: [{ label: t("إجمالي المشتريات"), value: money(totalInvoices) }],
      };
    }

    const movements = [
      ...invoiceRows.map((invoice) => ({ date: invoice.date, reference: invoice.id, vendor: vendorName(invoice.vendorId, invoice.vendor), movement: t("فاتورة مشتريات"), debit: 0, credit: invoice.total, balanceEffect: invoice.total })),
      ...noteRows.map((note) => ({ date: note.date, reference: note.number, vendor: vendorName(note.vendorId, note.vendor), movement: t("إشعار مدين"), debit: note.total, credit: 0, balanceEffect: -note.total })),
      ...paymentRows.map((payment) => ({ date: payment.date, reference: payment.id, vendor: vendorName(payment.vendorId), movement: t("سداد مورد"), debit: payment.amount, credit: 0, balanceEffect: -payment.amount })),
    ].sort((a, b) => a.date.localeCompare(b.date) || a.reference.localeCompare(b.reference));
    let running = selectedVendor ? (openingByVendor.get(selectedVendor) ?? 0) : 0;
    const movementRows = movements.map((movement) => {
      running += movement.balanceEffect;
      return { vendor: movement.vendor, date: movement.date, reference: movement.reference, movement: movement.movement, debit: money(movement.debit), credit: money(movement.credit), balance: money(running) };
    });
    return {
      columns: [{ key: "vendor", label: t("المورد") }, { key: "date", label: t("التاريخ") }, { key: "reference", label: t("الرقم") }, { key: "movement", label: t("الحركة") }, { key: "debit", label: t("مدين") }, { key: "credit", label: t("دائن") }, { key: "balance", label: t("الرصيد") }],
      rows: movementRows,
      summary: [{ label: t("الرصيد الختامي"), value: money(running) }],
    };
  }, [dateFrom, dateTo, formatNumber, invoices, notes, payments, selectedVendor, t, type, vendors]);

  const title = type ? report : t("تقرير المشتريات");
  const exportOptions = { title, subtitle: `${t("من تاريخ")} ${dateFrom} ${t("إلى تاريخ")} ${dateTo}`, columns: columns as ReportColumn[], rows, fileName: title, summary, landscape: true };

  return <div dir={direction} className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/40 p-4" onMouseDown={onClose}>
    <section className="mx-auto w-full max-w-7xl overflow-hidden rounded border border-slate-200 bg-white shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
      <header className="border-t-2 border-red-600 px-4 py-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button onClick={onClose} className="rounded p-1.5 text-slate-500 hover:bg-slate-100" title={t("إغلاق")}><X className="h-4 w-4" /></button>
          <div className="text-center"><p className="text-[10px] text-slate-400">{t("المشتريات")} / {t("التقارير")}</p><h2 className="text-sm font-bold text-slate-800">{title}</h2></div>
          <div className="flex gap-1"><button onClick={() => void load()} className="rounded border border-slate-200 p-1.5" title={t("تحديث")}><RefreshCw className="h-3.5 w-3.5" /></button><button onClick={() => printReport(exportOptions)} className="rounded border border-slate-200 p-1.5" title={t("طباعة")}><Printer className="h-3.5 w-3.5" /></button><button onClick={() => exportReportExcel(exportOptions)} className="rounded border border-slate-200 p-1.5" title={t("تصدير Excel")}><Download className="h-3.5 w-3.5" /></button></div>
        </div>
      </header>
      <div className="flex flex-wrap items-end justify-between gap-3 border-y border-slate-100 bg-slate-50 px-4 py-3">
        <div className="flex flex-wrap gap-2"><label className="text-xs text-slate-500">{t("من تاريخ")}<input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} className="mt-1 block rounded border border-slate-200 bg-white px-2 py-1.5 text-xs" /></label><label className="text-xs text-slate-500">{t("إلى تاريخ")}<input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} className="mt-1 block rounded border border-slate-200 bg-white px-2 py-1.5 text-xs" /></label><label className="text-xs text-slate-500">{t("المورد")}<select value={selectedVendor} onChange={(event) => setSelectedVendor(event.target.value)} className="mt-1 block rounded border border-slate-200 bg-white px-2 py-1.5 text-xs"><option value="">{t("كل الموردين")}</option>{vendorOptions.map((vendor) => <option key={vendor.id} value={vendor.id}>{vendor.name}</option>)}</select></label></div>
        <span className="text-xs font-medium text-slate-500">SAR</span>
      </div>
      <div className="p-4">
        {loading ? <p className="py-16 text-center text-sm text-slate-500">{t("جاري التحميل...")}</p> : error ? <p className="py-16 text-center text-sm text-red-600">{error}</p> : <><div className="overflow-x-auto"><table className="min-w-full text-xs"><thead className="bg-slate-100 text-slate-600"><tr>{columns.map((column) => <th key={column.key} className="border-b px-3 py-2 text-center font-semibold">{column.label}</th>)}</tr></thead><tbody>{rows.length ? rows.map((row, index) => <tr key={`${index}-${String(row.reference ?? row.vendor ?? row.item ?? "row")}`} className="border-b border-slate-100"><>{columns.map((column) => <td key={column.key} className="px-3 py-2 text-center text-slate-700">{row[column.key] || "—"}</td>)}</></tr>) : <tr><td colSpan={columns.length} className="px-3 py-12 text-center text-slate-400">{t("لا توجد بيانات للفترة المحددة")}</td></tr>}</tbody></table></div><div className="mt-3 flex flex-wrap justify-end gap-4 border-t border-slate-100 pt-3 text-xs">{summary.map((item) => <span key={item.label} className="font-semibold text-slate-700">{item.label}: <b className="text-indigo-700">{item.value}</b></span>)}</div></>}
      </div>
    </section>
  </div>;
}
