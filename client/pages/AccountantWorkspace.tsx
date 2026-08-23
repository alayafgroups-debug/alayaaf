import { BookOpen, Calculator, Download, Landmark, Printer, RefreshCw, Scale, WalletCards } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import Layout from "@/components/Layout";
import { useI18n } from "@/i18n";
import { supabase } from "@/lib/supabaseClient";
import { exportReportExcel, printReport, type ReportColumn } from "@/lib/reportExport";

type View = "trial" | "statement" | "general" | "subsidiary" | "reconciliation" | "revalue";
type Account = { code: string; name_ar: string; name_en: string | null };
type Entry = { id: string; date: string; description: string; reference: string };
type JournalLine = { entryId: string; account: string; debit: number; credit: number; counterparty: string };
type TableRow = Record<string, string | number>;

const REPORTS: { id: View; label: string; icon: typeof Scale; realData: boolean }[] = [
  { id: "trial", label: "ميزان المراجعة", icon: Scale, realData: true },
  { id: "statement", label: "كشف الحساب", icon: WalletCards, realData: true },
  { id: "general", label: "دفتر الأستاذ العام", icon: BookOpen, realData: true },
  { id: "subsidiary", label: "دفتر الأستاذ المساعد", icon: BookOpen, realData: true },
  { id: "reconciliation", label: "تسوية مصرفية", icon: Landmark, realData: false },
  { id: "revalue", label: "إعادة تقييم العملة الأجنبية", icon: Calculator, realData: false },
];

const amount = (value: unknown) => Number(value ?? 0) || 0;

export default function AccountantWorkspace() {
  const { t, direction, locale, formatNumber } = useI18n();
  const today = new Date().toISOString().slice(0, 10);
  const [view, setView] = useState<View>("trial");
  const [dateFrom, setDateFrom] = useState(() => `${today.slice(0, 4)}-01-01`);
  const [dateTo, setDateTo] = useState(today);
  const [accountFilter, setAccountFilter] = useState("");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [lines, setLines] = useState<JournalLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    const [accountsResult, entriesResult] = await Promise.all([
      supabase.from("accounting_accounts").select("code, name_ar, name_en").order("code"),
      supabase.from("accounting_journal_entries").select("id, entry_date, description, source_document_id").eq("status", "posted").lte("entry_date", dateTo).order("entry_date"),
    ]);
    const initialError = accountsResult.error ?? entriesResult.error;
    if (initialError) { setError(initialError.message); setLoading(false); return; }
    const ids = (entriesResult.data ?? []).map((entry) => entry.id);
    const linesResult = ids.length
      ? await supabase.from("accounting_journal_lines").select("journal_entry_id, account_code, debit, credit, counterparty").in("journal_entry_id", ids)
      : { data: [], error: null };
    if (linesResult.error) { setError(linesResult.error.message); setLoading(false); return; }
    setAccounts((accountsResult.data ?? []) as Account[]);
    setEntries((entriesResult.data ?? []).map((entry) => ({ id: entry.id, date: String(entry.entry_date), description: String(entry.description ?? ""), reference: String(entry.source_document_id ?? entry.id) })));
    setLines((linesResult.data ?? []).map((line) => ({ entryId: String(line.journal_entry_id), account: String(line.account_code), debit: amount(line.debit), credit: amount(line.credit), counterparty: String(line.counterparty ?? "") })));
    setLoading(false);
  };

  useEffect(() => { void load(); }, [dateTo]);

  const accountNames = useMemo(() => new Map(accounts.map((account) => [account.code, locale === "en" && account.name_en ? account.name_en : account.name_ar])), [accounts, locale]);
  const entryById = useMemo(() => new Map(entries.map((entry) => [entry.id, entry])), [entries]);
  const currentReport = REPORTS.find((report) => report.id === view) ?? REPORTS[0];

  const { columns, rows, summary } = useMemo(() => {
    const money = (value: number) => formatNumber(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const withinRange = lines.filter((line) => {
      const date = entryById.get(line.entryId)?.date ?? "";
      return date >= dateFrom && date <= dateTo && (!accountFilter || line.account === accountFilter);
    });
    const totals = withinRange.reduce((sum, line) => ({ debit: sum.debit + line.debit, credit: sum.credit + line.credit }), { debit: 0, credit: 0 });

    if (view === "trial") {
      const grouped = new Map<string, { debit: number; credit: number }>();
      withinRange.forEach((line) => {
        const value = grouped.get(line.account) ?? { debit: 0, credit: 0 };
        value.debit += line.debit;
        value.credit += line.credit;
        grouped.set(line.account, value);
      });
      return {
        columns: [{ key: "code", label: t("رقم الحساب") }, { key: "account", label: t("الحساب") }, { key: "debit", label: t("مدين SAR") }, { key: "credit", label: t("دائن SAR") }, { key: "balance", label: t("الرصيد SAR") }],
        rows: [...grouped.entries()].map(([code, value]) => ({ code, account: accountNames.get(code) ?? code, debit: money(value.debit), credit: money(value.credit), balance: money(value.debit - value.credit) })),
        summary: [{ label: t("إجمالي المدين"), value: money(totals.debit) }, { label: t("إجمالي الدائن"), value: money(totals.credit) }],
      };
    }

    if (view === "statement") {
      const grouped = new Map<string, { debit: number; credit: number; count: number }>();
      withinRange.forEach((line) => {
        const value = grouped.get(line.account) ?? { debit: 0, credit: 0, count: 0 };
        value.debit += line.debit;
        value.credit += line.credit;
        value.count += 1;
        grouped.set(line.account, value);
      });
      return {
        columns: [{ key: "account", label: t("الحساب") }, { key: "count", label: t("عدد الحركات") }, { key: "debit", label: t("مدين SAR") }, { key: "credit", label: t("دائن SAR") }, { key: "balance", label: t("الرصيد SAR") }],
        rows: [...grouped.entries()].map(([code, value]) => ({ account: `${code} - ${accountNames.get(code) ?? code}`, count: value.count, debit: money(value.debit), credit: money(value.credit), balance: money(value.debit - value.credit) })),
        summary: [{ label: t("إجمالي الرصيد"), value: money(totals.debit - totals.credit) }],
      };
    }

    const ordered = [...withinRange].sort((a, b) => (entryById.get(a.entryId)?.date ?? "").localeCompare(entryById.get(b.entryId)?.date ?? ""));
    const opening = lines.filter((line) => {
      const date = entryById.get(line.entryId)?.date ?? "";
      return date < dateFrom && (!accountFilter || line.account === accountFilter);
    }).reduce((sum, line) => sum + line.debit - line.credit, 0);
    let balance = opening;
    const movementRows = ordered.map((line) => {
      balance += line.debit - line.credit;
      const entry = entryById.get(line.entryId);
      return { date: entry?.date ?? "", reference: entry?.reference ?? line.entryId, account: `${line.account} - ${accountNames.get(line.account) ?? line.account}`, counterparty: line.counterparty || "—", description: entry?.description || "—", debit: money(line.debit), credit: money(line.credit), balance: money(balance) };
    });
    return {
      columns: [
        { key: "date", label: t("التاريخ") }, { key: "reference", label: t("الرقم") }, { key: "account", label: t("الحساب") },
        ...(view === "subsidiary" ? [{ key: "counterparty", label: t("الحسابات المقابلة") }] : []),
        { key: "description", label: t("الحركة") }, { key: "debit", label: t("مدين SAR") }, { key: "credit", label: t("دائن SAR") }, { key: "balance", label: t("الرصيد SAR") },
      ],
      rows: movementRows,
      summary: [{ label: t("الرصيد الختامي"), value: money(balance) }, { label: t("عدد السجلات"), value: movementRows.length }],
    };
  }, [accountFilter, accountNames, dateFrom, dateTo, entryById, formatNumber, lines, t, view]);

  const exportOptions = { title: t(currentReport.label), subtitle: `${t("من تاريخ")} ${dateFrom} ${t("إلى تاريخ")} ${dateTo}`, columns: columns as ReportColumn[], rows, fileName: currentReport.label, summary, landscape: true };

  return <Layout><main dir={direction} className="min-h-full bg-slate-50 p-4">
    <div className="mx-auto max-w-[1600px] overflow-hidden rounded border border-slate-200 bg-white shadow-sm">
      <header className="border-t-2 border-red-700 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[11px] text-slate-400">{t("المحاسبة والمالية")} / {t("مساحة عمل المحاسب")}</p><h1 className="text-base font-bold text-slate-800">{t("مساحة عمل المحاسب")}</h1></div><div className="flex gap-1"><button onClick={() => void load()} className="rounded border border-slate-200 p-2" title={t("تحديث")}><RefreshCw className="h-4 w-4" /></button>{currentReport.realData && <><button onClick={() => printReport(exportOptions)} className="rounded border border-slate-200 p-2" title={t("طباعة")}><Printer className="h-4 w-4" /></button><button onClick={() => exportReportExcel(exportOptions)} className="rounded border border-slate-200 p-2" title={t("تصدير Excel")}><Download className="h-4 w-4" /></button></>}</div></div>
      </header>
      <div className="grid grid-cols-2 border-b border-slate-100 md:grid-cols-3 xl:grid-cols-6">{REPORTS.map((report) => { const Icon = report.icon; return <button key={report.id} onClick={() => setView(report.id)} className={`flex items-center justify-center gap-2 border-s border-b border-slate-100 px-3 py-3 text-xs font-semibold ${view === report.id ? "bg-slate-800 text-white" : "text-slate-600 hover:bg-slate-50"}`}><Icon className="h-4 w-4" />{t(report.label)}</button>; })}</div>
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3"><div className="flex flex-wrap gap-2"><label className="text-xs text-slate-500">{t("من تاريخ")}<input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} className="mt-1 block rounded border border-slate-200 bg-white px-2 py-1.5 text-xs" /></label><label className="text-xs text-slate-500">{t("إلى تاريخ")}<input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} className="mt-1 block rounded border border-slate-200 bg-white px-2 py-1.5 text-xs" /></label><label className="text-xs text-slate-500">{t("الحساب")}<select value={accountFilter} onChange={(event) => setAccountFilter(event.target.value)} className="mt-1 block max-w-60 rounded border border-slate-200 bg-white px-2 py-1.5 text-xs"><option value="">{t("كل الحسابات")}</option>{accounts.map((account) => <option key={account.code} value={account.code}>{account.code} - {locale === "en" && account.name_en ? account.name_en : account.name_ar}</option>)}</select></label></div><span className="text-xs font-semibold text-slate-500">SAR</span></div>
      {!currentReport.realData ? <section className="px-5 py-20 text-center"><h2 className="text-sm font-bold text-slate-700">{t(currentReport.label)}</h2><p className="mx-auto mt-3 max-w-2xl text-xs leading-6 text-slate-500">{view === "reconciliation" ? t("لم يتم إعداد حساب بنكي للتسوية بعد. ستظهر الحركات البنكية وكشوف الحساب بمجرد ربط الحساب البنكي واستيراد كشفه.") : t("لا توجد أرصدة عملات أجنبية قابلة لإعادة التقييم للفترة المحددة. يتطلب هذا التقرير أسعار صرف معتمدة وحركات بعملة أجنبية.")}</p></section> : <section className="p-4"><h2 className="mb-3 text-center text-sm font-bold text-slate-800">{t(currentReport.label)}</h2>{loading ? <p className="py-16 text-center text-sm text-slate-500">{t("جاري التحميل...")}</p> : error ? <p className="py-16 text-center text-sm text-red-600">{error}</p> : <><div className="overflow-x-auto"><table className="min-w-full text-[11px]"><thead className="bg-slate-100 text-slate-600"><tr>{columns.map((column) => <th key={column.key} className="border-b px-3 py-2 text-center">{column.label}</th>)}</tr></thead><tbody>{rows.length ? rows.map((row, index) => <tr key={`${index}-${row.reference ?? row.account ?? "row"}`} className="border-b border-slate-100">{columns.map((column) => <td key={column.key} className="px-3 py-2 text-center">{row[column.key] || "—"}</td>)}</tr>) : <tr><td colSpan={columns.length} className="py-16 text-center text-slate-400">{t("لا توجد حركات مرحّلة للفترة المحددة")}</td></tr>}</tbody></table></div><div className="mt-3 flex flex-wrap justify-end gap-4 border-t border-slate-100 pt-3 text-xs font-semibold text-slate-700">{summary.map((item) => <span key={item.label}>{item.label}: <b className="text-indigo-700">{item.value}</b></span>)}</div></>}</section>}
    </div>
  </main></Layout>;
}
