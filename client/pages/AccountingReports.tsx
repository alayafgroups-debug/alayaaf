import Layout from "@/components/Layout";
import { Download, Printer, RefreshCw } from "lucide-react";
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

function monthKeys(end: string) {
  const date = new Date(`${end}T00:00:00`);
  return Array.from({ length: date.getMonth() + 1 }, (_, index) => `${date.getFullYear()}-${String(index + 1).padStart(2, "0")}`);
}

export default function AccountingReports() {
  const { t, direction, locale, formatNumber } = useI18n();
  const [active, setActive] = useState<ReportKind>("income");
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
      </section>
    </div>
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
