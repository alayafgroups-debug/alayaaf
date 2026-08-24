import { Download, Printer, RefreshCw, ShieldCheck, Tags, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import Layout from "@/components/Layout";
import { useI18n } from "@/i18n";
import { supabase } from "@/lib/supabaseClient";
import { exportReportExcel, printReport, type ReportColumn } from "@/lib/reportExport";

type Item = { description: string; quantity: number; unitPrice: number; discount: number; taxPercent: number };
type SourceDocument = { table: string; id: string; number: string; date: string; counterparty: string; side: "sales" | "purchases"; items: Item[]; eligible: boolean };
type Classification = { document_table: string; document_id: string; line_index: number };
type SummaryGroup = { document_side: string; tax_category: string; supply_type: string; document_count: number; taxable_amount: number; tax_amount: number };
type DetailLine = { id: string; document_table: string; document_id: string; document_date: string; document_side: string; line_description: string; tax_category: string; supply_type: string; tax_rate: number; taxable_amount: number; tax_amount: number };
type DraftClass = { lineIndex: number; taxCategory: string; supplyType: string };
type ReportRow = Record<string, string | number>;

const number = (value: unknown) => Number(value ?? 0) || 0;
const mapItems = (items: unknown): Item[] => Array.isArray(items) ? items.map((item) => { const row = item as Record<string, unknown>; return { description: String(row.description ?? ""), quantity: number(row.quantity), unitPrice: number(row.unitPrice), discount: number(row.discount), taxPercent: number(row.taxPercent) }; }) : [];
const categoryNames: Record<string, string> = { standard: "النسبة الأساسية 15%", zero_rated: "نسبة صفر", exempt: "معفى", out_of_scope: "خارج النطاق" };
const supplyNames: Record<string, string> = { domestic: "محلي", export: "تصدير", import: "استيراد", reverse_charge: "احتساب عكسي" };

export default function TaxReports() {
  const { t, direction, formatNumber } = useI18n();
  const today = new Date().toISOString().slice(0, 10);
  const [dateFrom, setDateFrom] = useState(() => `${today.slice(0, 4)}-01-01`);
  const [dateTo, setDateTo] = useState(today);
  const [mode, setMode] = useState<"summary" | "details" | "classification">("summary");
  const [groups, setGroups] = useState<SummaryGroup[]>([]);
  const [details, setDetails] = useState<DetailLine[]>([]);
  const [documents, setDocuments] = useState<SourceDocument[]>([]);
  const [classifications, setClassifications] = useState<Classification[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<SourceDocument | null>(null);
  const [draft, setDraft] = useState<DraftClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const invalidRange = dateFrom > dateTo;
  const money = (value: number) => formatNumber(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const load = async () => {
    if (invalidRange) { setError(t("تاريخ البداية يجب أن يسبق تاريخ النهاية")); return; }
    setLoading(true); setError("");
    const [summaryResult, detailResult, salesResult, notesResult, classResult] = await Promise.all([
      supabase.rpc("get_vat_report_summary", { p_date_from: dateFrom, p_date_to: dateTo }),
      supabase.from("accounting_vat_report_lines").select("*").eq("report_eligible", true).gte("document_date", dateFrom).lte("document_date", dateTo).order("document_date"),
      supabase.from("sales_invoices").select("id, date, customer, items, accounting_status").gte("date", dateFrom).lte("date", dateTo),
      supabase.from("invoice_adjustment_notes").select("id, note_number, note_type, issue_date, counterparty, items, status, accounting_status").eq("status", "posted").gte("issue_date", dateFrom).lte("issue_date", dateTo),
      supabase.from("accounting_vat_line_classifications").select("document_table, document_id, line_index").gte("document_date", dateFrom).lte("document_date", dateTo),
    ]);
    const firstError = summaryResult.error ?? detailResult.error ?? salesResult.error ?? notesResult.error ?? classResult.error;
    if (firstError) { setError(firstError.message); setLoading(false); return; }
    const sourceDocuments: SourceDocument[] = [
      ...(salesResult.data ?? []).map((row) => ({ table: "sales_invoices", id: String(row.id), number: String(row.id), date: String(row.date), counterparty: String(row.customer ?? ""), side: "sales" as const, items: mapItems(row.items), eligible: row.accounting_status === "posted" })),
      ...(notesResult.data ?? []).map((row) => ({ table: "invoice_adjustment_notes", id: String(row.id), number: String(row.note_number), date: String(row.issue_date), counterparty: String(row.counterparty ?? ""), side: (row.note_type === "purchase_debit" ? "purchases" : "sales") as "sales" | "purchases", items: mapItems(row.items), eligible: row.accounting_status === "posted" })),
    ];
    setGroups((summaryResult.data ?? []) as SummaryGroup[]);
    setDetails((detailResult.data ?? []) as DetailLine[]);
    setDocuments(sourceDocuments.filter((document) => document.items.length > 0).sort((first, second) => first.date.localeCompare(second.date)));
    setClassifications((classResult.data ?? []) as Classification[]);
    setLoading(false);
  };

  useEffect(() => { void load(); }, [dateFrom, dateTo]);

  const classifiedCount = useMemo(() => {
    const result = new Map<string, number>();
    classifications.forEach((item) => { const key = `${item.document_table}:${item.document_id}`; result.set(key, (result.get(key) ?? 0) + 1); });
    return result;
  }, [classifications]);
  const unclassified = documents.filter((document) => (classifiedCount.get(`${document.table}:${document.id}`) ?? 0) !== document.items.length);
  const summaryRows = useMemo<ReportRow[]>(() => {
    const rows = groups.map((group) => ({
      side: t(group.document_side === "sales" ? "مبيعات" : "مشتريات"),
      category: t(categoryNames[group.tax_category] ?? group.tax_category),
      supply: t(supplyNames[group.supply_type] ?? group.supply_type),
      documents: number(group.document_count),
      base: money(number(group.taxable_amount)),
      tax: money(number(group.tax_amount)),
    }));
    const salesBase = groups.filter((group) => group.document_side === "sales").reduce((sum, group) => sum + number(group.taxable_amount), 0);
    const salesTax = groups.filter((group) => group.document_side === "sales").reduce((sum, group) => sum + number(group.tax_amount), 0);
    const purchaseBase = groups.filter((group) => group.document_side === "purchases").reduce((sum, group) => sum + number(group.taxable_amount), 0);
    const purchaseTax = groups.filter((group) => group.document_side === "purchases").reduce((sum, group) => sum + number(group.tax_amount), 0);
    return [...rows,
      { side: t("الإجمالي"), category: t("إجمالي المبيعات"), supply: "—", documents: "—", base: money(salesBase), tax: money(salesTax) },
      { side: t("الإجمالي"), category: t("إجمالي المشتريات المرحلة"), supply: "—", documents: "—", base: money(purchaseBase), tax: money(purchaseTax) },
      { side: t("الصافي"), category: t("صافي الضريبة المستحقة داخليًا"), supply: "—", documents: "—", base: "—", tax: money(salesTax - purchaseTax) },
    ];
  }, [groups, formatNumber, t]);

  const columns: ReportColumn[] = mode === "details"
    ? [{ key: "date", label: t("التاريخ") }, { key: "document", label: t("المستند") }, { key: "description", label: t("الوصف") }, { key: "side", label: t("النوع") }, { key: "category", label: t("الفئة الضريبية") }, { key: "supply", label: t("نوع التوريد") }, { key: "base", label: t("المبلغ الخاضع") }, { key: "tax", label: t("الضريبة") }]
    : [{ key: "side", label: t("النوع") }, { key: "category", label: t("الفئة الضريبية") }, { key: "supply", label: t("نوع التوريد") }, { key: "documents", label: t("عدد المستندات") }, { key: "base", label: t("المبلغ الخاضع للضريبة SAR") }, { key: "tax", label: t("مبلغ الضريبة SAR") }];
  const detailRows: ReportRow[] = details.map((line) => ({ date: line.document_date, document: line.document_id, description: line.line_description || "—", side: t(line.document_side === "sales" ? "مبيعات" : "مشتريات"), category: t(categoryNames[line.tax_category] ?? line.tax_category), supply: t(supplyNames[line.supply_type] ?? line.supply_type), base: money(number(line.taxable_amount)), tax: money(number(line.tax_amount)) }));
  const exportRows = mode === "details" ? detailRows : summaryRows;
  const reportTitle = mode === "details" ? t("تفاصيل ضريبة القيمة المضافة") : t("ملخص ضريبة القيمة المضافة");
  const exportOptions = { title: reportTitle, subtitle: `${dateFrom} — ${dateTo}`, columns, rows: exportRows, fileName: reportTitle, landscape: true };

  const openClassification = (document: SourceDocument) => {
    setSelectedDocument(document);
    setDraft(document.items.map((_, lineIndex) => ({ lineIndex, taxCategory: "", supplyType: "" })));
    setError("");
  };
  const saveClassification = async () => {
    if (!selectedDocument || draft.some((item) => !item.taxCategory || !item.supplyType)) { setError(t("يجب اختيار الفئة الضريبية ونوع التوريد لكل بند")); return; }
    setSaving(true); setError("");
    const { error: saveError } = await supabase.rpc("save_vat_document_classification", { p_document_table: selectedDocument.table, p_document_id: selectedDocument.id, p_lines: draft });
    setSaving(false);
    if (saveError) { setError(saveError.message); return; }
    setSelectedDocument(null); await load();
  };

  return <Layout><main dir={direction} className="min-h-full bg-slate-50 p-4"><div className="mx-auto max-w-[1500px] overflow-hidden rounded border border-slate-200 bg-white shadow-sm">
    <header className="flex flex-wrap items-center justify-between gap-3 border-t-2 border-red-700 px-4 py-3"><div><p className="text-[11px] text-slate-400">{t("التقارير")}</p><h1 className="text-base font-bold">{t("تقارير ضريبة القيمة المضافة")}</h1></div><div className="flex gap-1"><button onClick={() => void load()} className="rounded border p-2"><RefreshCw className="h-4 w-4" /></button>{mode !== "classification" && <><button onClick={() => printReport(exportOptions)} className="rounded border p-2"><Printer className="h-4 w-4" /></button><button onClick={() => exportReportExcel(exportOptions)} className="rounded border p-2"><Download className="h-4 w-4" /></button></>}</div></header>
    <div className="flex flex-wrap items-center justify-between gap-3 border-y bg-slate-50 px-4 py-3"><div className="flex rounded bg-slate-200/60 p-1"><button onClick={() => setMode("summary")} className={`rounded px-3 py-1.5 text-xs ${mode === "summary" ? "bg-white font-bold shadow" : ""}`}>{t("ملخص")}</button><button onClick={() => setMode("details")} className={`rounded px-3 py-1.5 text-xs ${mode === "details" ? "bg-white font-bold shadow" : ""}`}>{t("تفاصيل")}</button><button onClick={() => setMode("classification")} className={`rounded px-3 py-1.5 text-xs ${mode === "classification" ? "bg-white font-bold shadow" : ""}`}><Tags className="me-1 inline h-3 w-3" />{t("التصنيف")} ({unclassified.length})</button></div><div className="flex gap-2"><input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} className="rounded border px-2 py-1.5 text-xs" /><input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} className="rounded border px-2 py-1.5 text-xs" /></div></div>
    {error && <div className="border-b border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700">{error}</div>}
    <section className="p-4">{loading ? <p className="py-20 text-center text-sm text-slate-500">{t("جاري التحميل...")}</p> : mode === "classification" ? <div><p className="mb-3 text-xs text-slate-500">{t("لن تُدرج المستندات غير المصنفة في التقرير الرسمي، ولا يتم استنتاج الإعفاء أو التصدير من نسبة الصفر.")}</p><div className="overflow-x-auto"><table className="min-w-full text-xs"><thead className="bg-slate-100"><tr><th className="px-3 py-2">{t("التاريخ")}</th><th className="px-3 py-2">{t("المستند")}</th><th className="px-3 py-2">{t("جهة التعامل")}</th><th className="px-3 py-2">{t("عدد البنود")}</th><th className="px-3 py-2">{t("حالة الترحيل")}</th><th /></tr></thead><tbody>{unclassified.length ? unclassified.map((document) => <tr key={`${document.table}:${document.id}`} className="border-b"><td className="px-3 py-2 text-center">{document.date}</td><td className="px-3 py-2 text-center">{document.number}</td><td className="px-3 py-2">{document.counterparty || "—"}</td><td className="px-3 py-2 text-center">{document.items.length}</td><td className="px-3 py-2 text-center"><span className={`rounded px-2 py-1 ${document.eligible ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{t(document.eligible ? "مرحّل وقابل للإدراج" : "غير مرحّل — غير مدرج")}</span></td><td className="px-3 py-2 text-center"><button onClick={() => openClassification(document)} className="rounded bg-blue-700 px-3 py-1.5 text-white">{t("تصنيف البنود")}</button></td></tr>) : <tr><td colSpan={6} className="py-12 text-center text-slate-400">{t("تم تصنيف جميع المستندات في الفترة")}</td></tr>}</tbody></table></div></div> : <><div className="mb-3 flex items-center gap-2 rounded bg-emerald-50 px-3 py-2 text-xs text-emerald-800"><ShieldCheck className="h-4 w-4" />{t("يعرض التقرير المستندات المصنفة والمرحلة فقط")}</div><div className="mb-3 rounded bg-amber-50 px-3 py-2 text-xs text-amber-800">{t("فواتير المشتريات غير مدرجة حتى اكتمال مرحلة ترحيل المشتريات المحاسبي؛ لا يتم احتساب ضريبة مدخلات غير مرحلة.")}</div><div className="overflow-x-auto"><table className="min-w-full text-xs"><thead className="bg-slate-100"><tr>{columns.map((column) => <th key={column.key} className="px-3 py-2 text-center">{column.label}</th>)}</tr></thead><tbody>{exportRows.length ? exportRows.map((row, index) => <tr key={index} className="border-b">{columns.map((column) => <td key={column.key} className="px-3 py-2 text-center">{row[column.key] ?? "—"}</td>)}</tr>) : <tr><td colSpan={columns.length} className="py-16 text-center text-slate-400">{t("لا توجد بيانات ضريبية مصنفة ومرحلة للفترة")}</td></tr>}</tbody></table></div></>}</section>
  </div>
  {selectedDocument && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" onMouseDown={() => setSelectedDocument(null)}><section className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-xl bg-white shadow-2xl" onMouseDown={(event) => event.stopPropagation()}><header className="flex items-center justify-between border-b px-5 py-4"><div><h2 className="font-bold">{t("تصنيف بنود الضريبة")}</h2><p className="text-xs text-slate-500">{selectedDocument.number}</p></div><button onClick={() => setSelectedDocument(null)}><X className="h-5 w-5" /></button></header><div className="overflow-x-auto p-5"><table className="min-w-full text-xs"><thead className="bg-slate-100"><tr><th className="px-3 py-2">{t("البند")}</th><th className="px-3 py-2">{t("نسبة الضريبة")}</th><th className="px-3 py-2">{t("الفئة الضريبية")}</th><th className="px-3 py-2">{t("نوع التوريد")}</th></tr></thead><tbody>{selectedDocument.items.map((item, index) => <tr key={index} className="border-b"><td className="px-3 py-2">{item.description || `#${index + 1}`}</td><td className="px-3 py-2 text-center">{item.taxPercent}%</td><td className="px-3 py-2"><select value={draft[index]?.taxCategory ?? ""} onChange={(event) => setDraft((current) => current.map((value, row) => row === index ? { ...value, taxCategory: event.target.value } : value))} className="w-full rounded border p-2"><option value="">{t("تحديد")}</option>{item.taxPercent === 15 && <option value="standard">{t("النسبة الأساسية 15%")}</option>}{item.taxPercent === 0 && <><option value="zero_rated">{t("نسبة صفر")}</option><option value="exempt">{t("معفى")}</option><option value="out_of_scope">{t("خارج النطاق")}</option></>}</select></td><td className="px-3 py-2"><select value={draft[index]?.supplyType ?? ""} onChange={(event) => setDraft((current) => current.map((value, row) => row === index ? { ...value, supplyType: event.target.value } : value))} className="w-full rounded border p-2"><option value="">{t("تحديد")}</option><option value="domestic">{t("محلي")}</option>{selectedDocument.side === "sales" && <option value="export">{t("تصدير")}</option>}{selectedDocument.side === "purchases" && <><option value="import">{t("استيراد")}</option><option value="reverse_charge">{t("احتساب عكسي")}</option></>}</select></td></tr>)}</tbody></table></div><footer className="flex justify-end gap-2 border-t px-5 py-4"><button onClick={() => setSelectedDocument(null)} className="rounded border px-4 py-2 text-sm">{t("إلغاء")}</button><button disabled={saving} onClick={() => void saveClassification()} className="rounded bg-blue-700 px-4 py-2 text-sm text-white disabled:opacity-50">{saving ? t("جاري الحفظ...") : t("حفظ التصنيف")}</button></footer></section></div>}
  </main></Layout>;
}
