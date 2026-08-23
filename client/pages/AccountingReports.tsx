import Layout from "@/components/Layout";
import {
  ChevronDown,
  Download,
  FileSpreadsheet,
  FileText,
  Printer,
  RefreshCw,
  Search,
} from "lucide-react";
import { useState } from "react";
import { useI18n } from "@/i18n";

const reports = [
  "قائمة الدخل",
  "الميزانية العمومية",
  "دفتر الأستاذ العام",
  "التدفقات النقدية - الطريقة غير المباشرة",
  "ميزان المراجعة المالي",
  "الإيرادات النقدية",
  "تقارير الإدارة (PDF)",
] as const;

const months = ["الإجمالي", "يناير 2026", "فبراير 2026", "مارس 2026", "أبريل 2026", "مايو 2026", "يونيو 2026", "يوليو 2026", "أغسطس 2026"];
const incomeRows = ["إيرادات المبيعات", "إيرادات الخدمات", "إجمالي الإيرادات", "تكلفة المبيعات", "مجمل الربح", "المصروفات التشغيلية", "صافي الربح"];
const ledgerRows = ["411 إيرادات المبيعات", "413 إيرادات الخدمات", "511 تكلفة المبيعات", "521 المصروفات التشغيلية", "111 النقد وما يعادله", "112 الذمم المدينة"];

function value(row: number, column: number) {
  const base = (row + 1) * (column + 2) * 1243.75;
  return column < 2 ? "0.00" : base.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function AccountingReports() {
  const { t, direction, formatNumber } = useI18n();
  const [activeReport, setActiveReport] = useState<(typeof reports)[number]>(reports[0]);
  const [period, setPeriod] = useState("2026-08-31");
  const isLedger = activeReport === "دفتر الأستاذ العام";
  const isPdf = activeReport === "تقارير الإدارة (PDF)";
  const isCash = activeReport === "التدفقات النقدية - الطريقة غير المباشرة";
  const rows = isLedger ? ledgerRows : incomeRows;

  return (
    <Layout>
      <main dir={direction} className="min-h-full bg-slate-50/70 text-slate-800">
        <div className="border-t-2 border-red-600 bg-white px-5 py-2 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <button className="inline-flex items-center gap-1 rounded border border-slate-200 px-2 py-1 hover:bg-slate-50"><Download className="h-3.5 w-3.5" />{t("تصدير")}</button>
              <button className="inline-flex items-center gap-1 rounded border border-slate-200 px-2 py-1 hover:bg-slate-50"><Printer className="h-3.5 w-3.5" />{t("طباعة")}</button>
            </div>
            <div className="flex items-center gap-2">
              <select className="rounded border border-slate-200 bg-white px-2 py-1 text-xs"><option>{t("SAR")}</option></select>
              <input value={period} onChange={(event) => setPeriod(event.target.value)} type="date" className="rounded border border-slate-200 px-2 py-1 text-xs" />
              <select className="rounded border border-slate-200 bg-white px-2 py-1 text-xs"><option>{t("حتى تاريخ")}</option><option>{t("حسب الفترة")}</option></select>
            </div>
          </div>
        </div>

        <div className="flex min-h-[calc(100vh-150px)]">
          <aside className="w-56 flex-shrink-0 border-e border-slate-200 bg-white p-3">
            <div className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-800"><FileSpreadsheet className="h-4 w-4 text-blue-700" />{t("التقارير")}</div>
            <nav className="space-y-1">
              {reports.map((report) => (
                <button key={report} onClick={() => setActiveReport(report)} className={`flex w-full items-center justify-between rounded px-3 py-2 text-start text-xs transition ${activeReport === report ? "bg-blue-700 text-white" : "text-slate-600 hover:bg-slate-100"}`}>
                  <span>{t(report)}</span><ChevronDown className="h-3.5 w-3.5 -rotate-90 opacity-60" />
                </button>
              ))}
            </nav>
          </aside>

          <section className="min-w-0 flex-1 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs text-slate-400">{t("التقارير")} / {t("المحاسبة والمالية")}</p>
                <h1 className="mt-1 text-lg font-bold text-slate-900">{t(activeReport)}</h1>
              </div>
              <button className="inline-flex items-center gap-2 rounded border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 hover:bg-slate-50"><RefreshCw className="h-3.5 w-3.5" />{t("تحديث")}</button>
            </div>

            {isPdf ? <PdfReports /> : <ReportGrid title={t(activeReport)} rows={rows} isLedger={isLedger} isCash={isCash} />}
          </section>
        </div>
      </main>
    </Layout>
  );
}

function ReportGrid({ title, rows, isLedger, isCash }: { title: string; rows: readonly string[]; isLedger: boolean; isCash: boolean }) {
  const { t, formatNumber } = useI18n();
  return <div className="overflow-hidden rounded border border-slate-200 bg-white shadow-sm">
    <div className="border-b border-slate-100 px-4 py-3 text-center"><h2 className="text-sm font-bold">{title}</h2><p className="mt-1 text-[11px] text-slate-400">{t("الفترة المنتهية في")} 31/08/2026</p></div>
    <div className="overflow-x-auto"><table className="min-w-[1000px] w-full border-collapse text-[11px]">
      <thead className="bg-slate-100 text-slate-600"><tr><th className="sticky end-0 z-10 min-w-60 border-b border-slate-200 bg-slate-100 px-3 py-2 text-start">{isLedger ? t("الحساب") : t("البند")}</th>{months.map(m => <th key={m} className="min-w-24 border-b border-slate-200 px-2 py-2 text-center font-medium">{t(m)}</th>)}</tr></thead>
      <tbody>{rows.map((row, index) => <tr key={row} className={index % 2 ? "bg-slate-50/70" : "bg-white"}><td className="sticky end-0 border-b border-slate-100 bg-inherit px-3 py-2 font-medium text-slate-700">{t(row)}</td>{months.map((month, col) => <td key={month} className={`border-b border-slate-100 px-2 py-2 text-center ${col > 1 ? "text-indigo-600" : "text-slate-500"}`}>{isCash && index > 3 && col > 3 ? `-${value(index, col)}` : value(index, col)}</td>)}</tr>)}</tbody>
      <tfoot className="bg-slate-100 font-bold"><tr><td className="px-3 py-2">{t("الإجمالي")}</td>{months.map((month, index) => <td key={month} className="px-2 py-2 text-center">{formatNumber((index + 1) * 17733.34, { minimumFractionDigits: 2 })}</td>)}</tr></tfoot>
    </table></div>
  </div>;
}

function PdfReports() {
  const { t } = useI18n();
  return <div className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_1fr]">
    <div className="rounded border border-slate-200 bg-white p-4"><div className="flex items-center gap-2 font-bold"><FileText className="h-5 w-5 text-red-500" />{t("تقارير الإدارة (PDF)")}</div><p className="mt-2 text-xs text-slate-500">{t("أنشئ تقارير PDF قابلة للطباعة والمشاركة")}</p><div className="mt-4 space-y-3"><select className="w-full rounded border border-slate-200 p-2 text-xs"><option>{t("اختر التقرير")}</option></select><select className="w-full rounded border border-slate-200 p-2 text-xs"><option>{t("SAR")}</option></select><button className="w-full rounded bg-indigo-600 p-2 text-xs font-semibold text-white">{t("إنشاء التقرير")}</button></div></div>
    <div className="flex min-h-96 flex-col items-center justify-center rounded border border-slate-200 bg-white text-center"><FileText className="h-14 w-14 text-slate-200" /><h2 className="mt-4 font-bold text-slate-700">{t("سيتم عرض التقرير هنا")}</h2><p className="mt-2 max-w-sm text-xs text-slate-400">{t("اختر التقرير والفترة ثم أنشئ التقرير لعرضه أو طباعته")}</p></div>
  </div>;
}
