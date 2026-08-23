import { Download, Printer, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import Layout from "@/components/Layout";
import { useI18n } from "@/i18n";
import { supabase } from "@/lib/supabaseClient";
import { exportReportExcel, printReport, type ReportColumn } from "@/lib/reportExport";

type InvoiceItem = { quantity: number; unitPrice: number; discount: number; taxPercent: number };
type TaxTotal = { base: number; tax: number };
type TaxData = { salesStandard: TaxTotal; salesZero: TaxTotal; purchaseStandard: TaxTotal; purchaseZero: TaxTotal };
type Row = Record<string, string | number>;

const empty: TaxTotal = { base: 0, tax: 0 };
const value = (input: unknown) => Number(input ?? 0) || 0;

function invoiceItems(items: unknown): InvoiceItem[] {
  return Array.isArray(items) ? items.map((item) => {
    const row = item as Record<string, unknown>;
    return { quantity: value(row.quantity), unitPrice: value(row.unitPrice), discount: value(row.discount), taxPercent: value(row.taxPercent) };
  }) : [];
}

function addItem(target: TaxTotal, item: InvoiceItem, multiplier = 1) {
  const base = Math.max(0, item.quantity * item.unitPrice - item.discount);
  target.base += base * multiplier;
  target.tax += base * item.taxPercent / 100 * multiplier;
}

export default function TaxReports() {
  const { t, direction, formatNumber } = useI18n();
  const today = new Date().toISOString().slice(0, 10);
  const [dateFrom, setDateFrom] = useState(() => `${today.slice(0, 4)}-01-01`);
  const [dateTo, setDateTo] = useState(today);
  const [mode, setMode] = useState<"summary" | "details">("summary");
  const [data, setData] = useState<TaxData>({ salesStandard: { ...empty }, salesZero: { ...empty }, purchaseStandard: { ...empty }, purchaseZero: { ...empty } });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true); setError("");
    const [salesResult, purchasesResult, notesResult] = await Promise.all([
      supabase.from("sales_invoices").select("id, date, items").gte("date", dateFrom).lte("date", dateTo),
      supabase.from("purchase_invoices").select("id, date, items").gte("date", dateFrom).lte("date", dateTo),
      supabase.from("invoice_adjustment_notes").select("note_type, issue_date, subtotal, tax").eq("status", "posted").gte("issue_date", dateFrom).lte("issue_date", dateTo),
    ]);
    const requestError = salesResult.error ?? purchasesResult.error ?? notesResult.error;
    if (requestError) { setError(requestError.message); setLoading(false); return; }

    const next: TaxData = { salesStandard: { ...empty }, salesZero: { ...empty }, purchaseStandard: { ...empty }, purchaseZero: { ...empty } };
    (salesResult.data ?? []).forEach((invoice) => invoiceItems(invoice.items).forEach((item) => addItem(item.taxPercent === 15 ? next.salesStandard : next.salesZero, item)));
    (purchasesResult.data ?? []).forEach((invoice) => invoiceItems(invoice.items).forEach((item) => addItem(item.taxPercent === 15 ? next.purchaseStandard : next.purchaseZero, item)));
    (notesResult.data ?? []).forEach((note) => {
      const base = value(note.subtotal); const tax = value(note.tax);
      if (note.note_type === "sales_credit") { next.salesStandard.base -= base; next.salesStandard.tax -= tax; }
      if (note.note_type === "sales_debit") { next.salesStandard.base += base; next.salesStandard.tax += tax; }
      if (note.note_type === "purchase_debit") { next.purchaseStandard.base -= base; next.purchaseStandard.tax -= tax; }
    });
    setData(next); setLoading(false);
  };

  useEffect(() => { void load(); }, [dateFrom, dateTo]);

  const report = useMemo(() => {
    const money = (amount: number) => formatNumber(amount, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const salesBase = data.salesStandard.base + data.salesZero.base;
    const salesTax = data.salesStandard.tax + data.salesZero.tax;
    const purchaseBase = data.purchaseStandard.base + data.purchaseZero.base;
    const purchaseTax = data.purchaseStandard.tax + data.purchaseZero.tax;
    const summaryRows: Row[] = [
      { section: t("ضريبة القيمة المضافة على الإيرادات"), code: "", name: "", base: "", tax: "", adjustment: "" },
      { section: "", code: "1", name: t("المبيعات الخاضعة للنسبة الأساسية (15%)"), base: money(data.salesStandard.base), tax: money(data.salesStandard.tax), adjustment: money(0) },
      { section: "", code: "2", name: t("المبيعات الخاضعة لنسبة صفر أو غير المصنفة"), base: money(data.salesZero.base), tax: money(data.salesZero.tax), adjustment: money(0) },
      { section: "", code: "3", name: t("إجمالي المبيعات"), base: money(salesBase), tax: money(salesTax), adjustment: money(0) },
      { section: t("ضريبة القيمة المضافة على المشتريات"), code: "", name: "", base: "", tax: "", adjustment: "" },
      { section: "", code: "7", name: t("المشتريات الخاضعة للنسبة الأساسية (15%)"), base: money(data.purchaseStandard.base), tax: money(data.purchaseStandard.tax), adjustment: money(0) },
      { section: "", code: "8", name: t("المشتريات بنسبة صفر أو غير المصنفة"), base: money(data.purchaseZero.base), tax: money(data.purchaseZero.tax), adjustment: money(0) },
      { section: "", code: "12", name: t("إجمالي المشتريات"), base: money(purchaseBase), tax: money(purchaseTax), adjustment: money(0) },
      { section: "", code: "13", name: t("صافي ضريبة القيمة المضافة المستحقة عن الفترة"), base: money(salesBase - purchaseBase), tax: money(salesTax - purchaseTax), adjustment: money(0) },
    ];
    const detailRows: Row[] = [
      { type: t("مبيعات"), name: t("ضريبة القيمة المضافة على الإيرادات (15%)"), base: money(data.salesStandard.base), tax: money(data.salesStandard.tax) },
      { type: t("مبيعات"), name: t("مبيعات بنسبة صفر أو غير مصنفة"), base: money(data.salesZero.base), tax: money(data.salesZero.tax) },
      { type: t("مشتريات"), name: t("ضريبة القيمة المضافة على المشتريات (15%)"), base: money(data.purchaseStandard.base), tax: money(data.purchaseStandard.tax) },
      { type: t("مشتريات"), name: t("مشتريات بنسبة صفر أو غير مصنفة"), base: money(data.purchaseZero.base), tax: money(data.purchaseZero.tax) },
    ];
    const columns: ReportColumn[] = mode === "summary"
      ? [{ key: "code", label: t("رقم الخانة") }, { key: "name", label: t("البند") }, { key: "base", label: t("المبلغ الخاضع للضريبة SAR") }, { key: "tax", label: t("مبلغ الضريبة SAR") }, { key: "adjustment", label: t("تعديلات") }]
      : [{ key: "type", label: t("نوع الضريبة") }, { key: "name", label: t("اسم الضريبة") }, { key: "base", label: t("المبلغ الخاضع للضريبة SAR") }, { key: "tax", label: t("مبلغ الضريبة SAR") }];
    return { columns, rows: mode === "summary" ? summaryRows : detailRows, summary: [{ label: t("صافي الضريبة المستحقة"), value: money(salesTax - purchaseTax) }] };
  }, [data, formatNumber, mode, t]);

  const title = mode === "summary" ? t("ضريبة القيمة المضافة") : t("الضرائب");
  const exportOptions = { title, subtitle: `${t("من تاريخ")} ${dateFrom} ${t("إلى تاريخ")} ${dateTo}`, columns: report.columns, rows: report.rows, fileName: title, summary: report.summary, landscape: true };

  return <Layout><main dir={direction} className="min-h-full bg-slate-50 p-4"><div className="mx-auto max-w-[1500px] overflow-hidden rounded border border-slate-200 bg-white shadow-sm">
    <header className="border-t-2 border-red-700 px-4 py-2"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[11px] text-slate-400">{t("التقارير")}</p><h1 className="text-sm font-bold text-slate-800">{title}</h1></div><div className="flex gap-1"><button onClick={() => void load()} className="rounded border border-slate-200 p-1.5" title={t("تحديث")}><RefreshCw className="h-3.5 w-3.5" /></button><button onClick={() => printReport(exportOptions)} className="rounded border border-slate-200 p-1.5" title={t("طباعة")}><Printer className="h-3.5 w-3.5" /></button><button onClick={() => exportReportExcel(exportOptions)} className="rounded border border-slate-200 p-1.5" title={t("تصدير Excel")}><Download className="h-3.5 w-3.5" /></button></div></div></header>
    <div className="flex flex-wrap items-center justify-between gap-3 border-y border-slate-100 bg-white px-4 py-2"><div className="flex rounded bg-slate-100 p-1"><button onClick={() => setMode("summary")} className={`rounded px-3 py-1.5 text-xs ${mode === "summary" ? "bg-white font-bold shadow-sm" : "text-slate-500"}`}>{t("ملخص")}</button><button onClick={() => setMode("details")} className={`rounded px-3 py-1.5 text-xs ${mode === "details" ? "bg-white font-bold shadow-sm" : "text-slate-500"}`}>{t("تفاصيل")}</button></div><div className="flex flex-wrap gap-2"><input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} className="rounded border border-slate-200 px-2 py-1.5 text-xs" /><input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} className="rounded border border-slate-200 px-2 py-1.5 text-xs" /><span className="rounded bg-slate-50 px-2 py-1.5 text-xs text-slate-500">SAR</span></div></div>
    <section className="p-4">{loading ? <p className="py-20 text-center text-sm text-slate-500">{t("جاري التحميل...")}</p> : error ? <p className="py-20 text-center text-sm text-red-600">{error}</p> : <><div className="overflow-x-auto"><table className="min-w-full text-xs"><thead className="bg-slate-100 text-slate-700"><tr>{report.columns.map((column) => <th key={column.key} className="border-b px-3 py-2 text-center">{column.label}</th>)}</tr></thead><tbody>{report.rows.map((row, index) => row.section ? <tr key={index} className="bg-slate-50"><td colSpan={report.columns.length} className="px-3 py-2 font-bold text-slate-700">{row.section}</td></tr> : <tr key={index} className={`border-b border-slate-100 ${row.code === "3" || row.code === "12" || row.code === "13" ? "font-bold" : ""}`}>{report.columns.map((column) => <td key={column.key} className="px-3 py-2 text-center">{row[column.key] || "—"}</td>)}</tr>)}</tbody></table></div><div className="mt-3 border-t border-slate-100 pt-3 text-end text-xs font-bold text-slate-700">{report.summary[0].label}: <span className="text-indigo-700">{report.summary[0].value} SAR</span></div><p className="mt-4 text-[11px] leading-5 text-slate-400">{t("تعتمد هذه النتائج على الفواتير والإشعارات المرحلة في الفترة المحددة. تصنيف التصدير والاستيراد والإعفاء يتطلب حفظ فئة ضريبية واضحة في المستند قبل استخدام التقرير كإقرار رسمي.")}</p></>}</section>
  </div></main></Layout>;
}
