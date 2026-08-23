import Layout from "@/components/Layout";
import { Download, Printer, RefreshCw, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/i18n";
import { supabase } from "@/lib/supabaseClient";

type ReportKind = "income" | "comprehensive" | "position";
type Account = { code: string; name_ar: string; name_en: string | null };
type Entry = { id: string; entry_date: string };
type Line = { journal_entry_id: string; account_code: string; debit: number; credit: number };
type Row = { label: string; values: number[]; total: number };

const REPORTS: { kind: ReportKind; label: string }[] = [
  { kind: "income", label: "قائمة الدخل" },
  { kind: "comprehensive", label: "قائمة الدخل الشامل" },
  { kind: "position", label: "قائمة المركز المالي" },
];

const REPORT_CATALOG = [
  { title: "ميزان المراجعة", items: ["ميزان المراجعة", "ميزان المراجعة حسب المشروع", "دفتر الأستاذ العام", "دفتر الأستاذ المساعد"] },
  { title: "سندات", items: ["سندات القبض", "سندات الصرف", "كشف حساب الصندوق", "كشف حساب البنك"] },
  { title: "المبيعات", items: ["كشف حساب عميل", "تفاصيل حساب العميل", "أعمار الديون", "المبيعات بحسب العميل"] },
  { title: "مشتريات", items: ["ملخص أرصدة الموردين", "كشف حساب مورد", "أعمار الديون للموردين", "قائمة المدفوعات النقدية"] },
  { title: "الرواتب", items: ["كشف حساب موظف", "كشف رواتب الموظفين", "تقرير البدلات والاستقطاعات", "تقرير مستحقات نهاية الخدمة"] },
  { title: "الزكاة والضريبة", items: ["تقرير ضريبة القيمة المضافة", "تقرير الإقرارات الضريبية", "تقرير الزكاة"] },
  { title: "إضافات", items: ["المصاريف المقدمة", "الأصول الثابتة", "الإهلاك المتراكم", "تكلفة المبيعات", "تقارير الإدارة (PDF)"] },
] as const;

function monthKeys(end: string) {
  const date = new Date(`${end}T00:00:00`);
  return Array.from({ length: date.getMonth() + 1 }, (_, index) => `${date.getFullYear()}-${String(index + 1).padStart(2, "0")}`);
}

export default function AccountingReports() {
  const { t, direction, locale, formatNumber } = useI18n();
  const [active, setActive] = useState<ReportKind>("income");
  const [selectedCatalogReport, setSelectedCatalogReport] = useState<string | null>(null);
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [lines, setLines] = useState<Line[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true); setError("");
    const [{ data: accountData, error: accountError }, { data: entryData, error: entryError }] = await Promise.all([
      supabase.from("accounting_accounts").select("code, name_ar, name_en").order("code"),
      supabase.from("accounting_journal_entries").select("id, entry_date").eq("status", "posted").lte("entry_date", endDate).order("entry_date"),
    ]);
    if (accountError || entryError) { setError(accountError?.message ?? entryError?.message ?? t("تعذر تحميل التقارير")); setLoading(false); return; }
    const ids = (entryData ?? []).map((entry) => entry.id);
    const { data: lineData, error: lineError } = ids.length
      ? await supabase.from("accounting_journal_lines").select("journal_entry_id, account_code, debit, credit").in("journal_entry_id", ids)
      : { data: [], error: null };
    if (lineError) { setError(lineError.message); setLoading(false); return; }
    setAccounts((accountData ?? []) as Account[]); setEntries((entryData ?? []) as Entry[]); setLines((lineData ?? []) as Line[]); setLoading(false);
  };

  useEffect(() => { void load(); }, [endDate]);

  const report = useMemo(() => buildReport(active, endDate, accounts, entries, lines, locale), [active, endDate, accounts, entries, lines, locale]);
  const activeLabel = REPORTS.find((report) => report.kind === active)?.label ?? "";

  return <Layout><main dir={direction} className="min-h-full bg-slate-50 p-4">
    <div className="mx-auto max-w-[1600px] overflow-hidden rounded border border-slate-200 bg-white shadow-sm">
      <header className="border-t-2 border-red-600 px-4 py-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-1">{REPORTS.map((reportItem) => <button key={reportItem.kind} onClick={() => setActive(reportItem.kind)} className={`rounded px-3 py-1.5 text-xs font-semibold ${active === reportItem.kind ? "bg-blue-700 text-white" : "text-slate-600 hover:bg-slate-100"}`}>{t(reportItem.label)}</button>)}</div>
          <div className="flex items-center gap-2"><input value={endDate} onChange={(event) => setEndDate(event.target.value)} type="date" className="rounded border border-slate-200 px-2 py-1 text-xs" /><button onClick={() => void load()} className="rounded border border-slate-200 p-1.5" title={t("تحديث")}><RefreshCw className="h-3.5 w-3.5" /></button><button className="rounded border border-slate-200 p-1.5" title={t("طباعة")}><Printer className="h-3.5 w-3.5" /></button><button className="rounded border border-slate-200 p-1.5" title={t("تصدير")}><Download className="h-3.5 w-3.5" /></button></div>
        </div>
      </header>
      <section className="p-4">
        <h1 className="text-center text-sm font-bold text-slate-800">{t(activeLabel)}</h1><p className="mt-1 text-center text-[11px] text-slate-400">{t("حتى تاريخ")} {endDate}</p>
        {loading ? <State text={t("جاري التحميل...")} /> : error ? <State text={error} /> : <ReportTable report={report} headers={active === "position" ? [t("الرصيد")] : report.months.map((month) => month)} formatNumber={formatNumber} />}

        <section className="mt-6 border-t border-slate-200 pt-5">
          <h2 className="mb-3 text-sm font-bold text-slate-800">{t("باقي التقارير")}</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {REPORT_CATALOG.map((section) => <div key={section.title} className="overflow-hidden rounded border border-slate-200 bg-white">
              <h3 className="bg-slate-800 px-3 py-2 text-xs font-bold text-white">{t(section.title)}</h3>
              <div className="divide-y divide-slate-100">{section.items.map((item) => <button key={item} onClick={() => setSelectedCatalogReport(item)} className="flex w-full items-center justify-between px-3 py-2 text-start text-xs text-slate-600 hover:bg-blue-50 hover:text-blue-700"><span>{t(item)}</span><span className="text-slate-300">‹</span></button>)}</div>
            </div>)}
          </div>
        </section>
      </section>
    </div>
    {selectedCatalogReport ? <ReportDetailsModal report={selectedCatalogReport} endDate={endDate} onClose={() => setSelectedCatalogReport(null)} /> : null}
  </main></Layout>;
}

function buildReport(kind: ReportKind, endDate: string, accounts: Account[], entries: Entry[], lines: Line[], locale: string) {
  const accountName = new Map(accounts.map((account) => [account.code, locale === "en" && account.name_en ? account.name_en : account.name_ar]));
  const entryMonth = new Map(entries.map((entry) => [entry.id, entry.entry_date.slice(0, 7)]));
  const months = kind === "position" ? [endDate] : monthKeys(endDate);
  const buckets = new Map<string, number[]>();
  for (const line of lines) {
    const root = line.account_code.charAt(0); const month = entryMonth.get(line.journal_entry_id); const index = months.indexOf(month ?? "");
    if (index < 0 && kind !== "position") continue;
    const include = kind === "position" ? ["1", "2", "3"].includes(root) : ["4", "5"].includes(root);
    if (!include) continue;
    const normal = root === "4" || root === "2" || root === "3" ? Number(line.credit) - Number(line.debit) : Number(line.debit) - Number(line.credit);
    const values = buckets.get(line.account_code) ?? Array(months.length).fill(0);
    if (kind === "position") for (let i = 0; i < values.length; i++) values[i] += normal; else values[index] += normal;
    buckets.set(line.account_code, values);
  }
  const rows: Row[] = [...buckets.entries()].map(([code, values]) => ({ label: `${code} - ${accountName.get(code) ?? code}`, values, total: values.reduce((sum, value) => sum + value, 0) }));
  if (kind === "comprehensive") rows.push({ label: locale === "en" ? "Other comprehensive income" : "الدخل الشامل الآخر", values: Array(months.length).fill(0), total: 0 });
  return { months: kind === "position" ? [endDate] : months, rows };
}

function ReportTable({ report, headers, formatNumber }: { report: { rows: Row[] }; headers: string[]; formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string }) {
  const { t } = useI18n();
  const total = Array(headers.length).fill(0) as number[];
  report.rows.forEach((row) => row.values.forEach((value, index) => { if (index < total.length) total[index] += value; }));
  return <div className="mt-4 overflow-x-auto"><table className="min-w-full text-[11px]"><thead className="bg-slate-100 text-slate-600"><tr><th className="min-w-64 border-b px-3 py-2 text-start">{t("البند")}</th>{headers.map((header) => <th key={header} className="min-w-28 border-b px-2 py-2">{header}</th>)}</tr></thead><tbody>{report.rows.map((row) => <tr key={row.label} className="border-b border-slate-100"><td className="px-3 py-2 font-medium">{row.label}</td>{headers.map((_, index) => <td key={index} className="px-2 py-2 text-center text-indigo-600">{formatNumber(row.values[index] ?? row.total, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>)}</tr>)}</tbody><tfoot className="bg-slate-100 font-bold"><tr><td className="px-3 py-2">{t("الإجمالي")}</td>{total.map((value, index) => <td key={index} className="px-2 py-2 text-center">{formatNumber(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>)}</tr></tfoot></table></div>;
}
function State({ text }: { text: string }) { return <div className="py-16 text-center text-sm text-slate-500">{text}</div>; }

function ReportDetailsModal({ report, endDate, onClose }: { report: string; endDate: string; onClose: () => void }) {
  const { t, direction, formatNumber } = useI18n();
  const detailRows = [
    { counterparty: "", date: "", reference: "", debit: 0, credit: 0, balance: 0 },
  ];

  return <div dir={direction} className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" onMouseDown={onClose}>
    <section className="max-h-[90vh] w-full max-w-6xl overflow-auto rounded-xl bg-white shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
      <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <div><p className="text-xs text-slate-400">{t("التقارير")} / {t("المبيعات")}</p><h2 className="mt-1 text-lg font-bold text-slate-800">{t(report)}</h2></div>
        <button onClick={onClose} className="rounded p-2 text-slate-500 hover:bg-slate-100" title={t("إغلاق")}><X className="h-5 w-5" /></button>
      </header>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 px-5 py-3">
        <div className="flex flex-wrap gap-2"><select className="rounded border border-slate-200 bg-white px-3 py-2 text-xs"><option>{t("كل العملاء")}</option></select><select className="rounded border border-slate-200 bg-white px-3 py-2 text-xs"><option>{t("كل الفروع")}</option></select><input type="date" value={endDate} readOnly className="rounded border border-slate-200 bg-white px-3 py-2 text-xs" /></div>
        <div className="flex gap-2"><button className="rounded border border-slate-200 bg-white px-3 py-2 text-xs">{t("تفاصيل")}</button><button className="rounded bg-blue-700 px-3 py-2 text-xs text-white">{t("تحديث")}</button></div>
      </div>
      <div className="p-5"><div className="overflow-x-auto rounded border border-slate-200"><table className="min-w-full text-xs"><thead className="bg-slate-100 text-slate-600"><tr><th className="px-3 py-3 text-start">{t("جهة التعامل")}</th><th className="px-3 py-3">{t("التاريخ")}</th><th className="px-3 py-3">{t("الرقم")}</th><th className="px-3 py-3">{t("الحركة")}</th><th className="px-3 py-3">{t("مدين")}</th><th className="px-3 py-3">{t("دائن")}</th><th className="px-3 py-3">{t("الرصيد")}</th></tr></thead><tbody>{detailRows.map((row, index) => <tr key={index} className="border-t border-slate-100"><td className="px-3 py-4 text-slate-400">{t("لا توجد بيانات للفترة المحددة")}</td><td className="px-3 py-4 text-center">—</td><td className="px-3 py-4 text-center">—</td><td className="px-3 py-4 text-center">—</td><td className="px-3 py-4 text-center">{formatNumber(row.debit, { minimumFractionDigits: 2 })}</td><td className="px-3 py-4 text-center">{formatNumber(row.credit, { minimumFractionDigits: 2 })}</td><td className="px-3 py-4 text-center">{formatNumber(row.balance, { minimumFractionDigits: 2 })}</td></tr>)}</tbody></table></div>
      <p className="mt-3 text-xs text-slate-400">{t("سيتم ربط هذا التقرير بحركات العملاء والفواتير والسداد الفعلية عند تفعيل مصدره المحاسبي.")}</p></div>
    </section>
  </div>;
}
