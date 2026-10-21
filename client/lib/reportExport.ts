import * as XLSX from "xlsx";
import { COMPANY_PROFILE } from "@/lib/companyProfile";
import { currentLocale, translateText } from "@/i18n";

/*
 * التصدير والطباعة بلغة الواجهة المستعملة (HR-15): في الإنجليزية العناوين والأعمدة والنصوص الثابتة بالإنجليزية،
 * واتجاه من اليسار إلى اليمين، وأرقام إنجليزية، وتاريخ ميلادي. النصوص العربية الثابتة تُترجم من قاموس الواجهة
 * (translateText) حتى لو نسيت الصفحة المستدعية ترجمتها؛ وما لا ترجمة له (أسماء الموظفين والأقسام) يبقى كما أُدخل.
 * في العربية يبقى الناتج كما كان تمامًا.
 */

export type ReportCell = string | number | null | undefined;

export type ReportColumn = {
  key: string;
  label: string;
  width?: number;
};

export type ReportBrand = {
  /** السطر العلوي في ترويسة التقرير المطبوع (اسم الجهة المصدرة). */
  label: string;
  /** النص نفسه بالإنجليزية (يُستعمل في الواجهة الإنجليزية) */
  labelEn?: string;
  /** شارة قصيرة داخل المربع الملون في الترويسة. */
  mark?: string;
};

/** ترويسة التقارير المالية والضريبية: اسم المنشأة ورقمها الضريبي بدل ترويسة الموارد البشرية. */
export const COMPANY_REPORT_BRAND: ReportBrand = {
  label: `${COMPANY_PROFILE.companyNameAr} — الرقم الضريبي ${COMPANY_PROFILE.vatNumber}`,
  labelEn: `${COMPANY_PROFILE.companyNameEn} — VAT No. ${COMPANY_PROFILE.vatNumber}`,
  mark: "ERP",
};

/** الترويسة الافتراضية كما كانت (تستخدمها تقارير الموارد البشرية دون تغيير). */
const DEFAULT_BRAND = { label: "نظام إدارة الموارد البشرية", mark: "HR" };

type ReportExportOptions = {
  title: string;
  subtitle?: string;
  columns: ReportColumn[];
  rows: Record<string, ReportCell>[];
  fileName: string;
  summary?: Array<{ label: string; value: ReportCell }>;
  landscape?: boolean;
  brand?: ReportBrand;
};

/** أرقام إنجليزية في النص: ٠-٩ و۰-۹، والفاصلة العشرية العربية ٫ وفاصل الآلاف ٬ */
export const latinDigits = (value: string) => value
  .replace(/[\u0660-\u0669]/g, (digit) => String(digit.charCodeAt(0) - 0x0660))
  .replace(/[\u06F0-\u06F9]/g, (digit) => String(digit.charCodeAt(0) - 0x06F0))
  .replace(/\u066B/g, ".")
  .replace(/\u066C/g, ",");

/** النص الثابت بلغة الواجهة: في الإنجليزية مترجمًا بأرقام إنجليزية، وفي العربية كما هو */
const localize = (value: string) => (currentLocale() === "en" ? latinDigits(translateText(value)) : value);

/** قيمة الخلية: النص يُترجم إن كان له ترجمة (حالات ثابتة مثل «معتمد»)، والأرقام والقيم الأخرى كما هي */
const localizeCell = (value: ReportCell): ReportCell => (typeof value === "string" ? localize(value) : value);

/** تاريخ الإصدار: في الإنجليزية ميلادي بأرقام إنجليزية، وفي العربية كما كان */
const issueDate = () => (currentLocale() === "en" ? new Intl.DateTimeFormat("en-GB", { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()) : new Date().toLocaleDateString("ar-SA"));

const brandText = (brand: ReportBrand | undefined, fallback: string) => {
  if (!brand?.label) return localize(fallback);
  return currentLocale() === "en" && brand.labelEn ? brand.labelEn : localize(brand.label);
};

const text = (value: ReportCell) => value === null || value === undefined || value === "" ? "-" : String(value);

export const escapeReportHtml = (value: ReportCell) => text(value)
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#039;");

export function printReport({ title: rawTitle, subtitle, columns, rows, summary = [], landscape = false, brand }: ReportExportOptions) {
  const english = currentLocale() === "en";
  const title = localize(rawTitle);
  const brandLabel = brandText(brand, DEFAULT_BRAND.label);
  const brandMark = brand ? brand.mark || "" : DEFAULT_BRAND.mark;
  const printWindow = window.open("", "_blank");
  if (!printWindow) return false;

  const tableRows = rows.length
    ? rows.map((row, index) => `<tr><td class="index">${index + 1}</td>${columns.map((column) => `<td>${escapeReportHtml(localizeCell(row[column.key]))}</td>`).join("")}</tr>`).join("")
    : `<tr><td colspan="${columns.length + 1}" class="empty">${escapeReportHtml(localize("لا توجد بيانات في التقرير"))}</td></tr>`;
  const summaryHtml = summary.length
    ? `<div class="summary">${summary.map((item) => `<div><span>${escapeReportHtml(localize(item.label))}</span><strong>${escapeReportHtml(localizeCell(item.value))}</strong></div>`).join("")}</div>`
    : "";

  printWindow.document.write(`<!doctype html>
<html dir="${english ? "ltr" : "rtl"}" lang="${english ? "en" : "ar"}"><head><meta charset="utf-8"><title>${escapeReportHtml(title)}</title>
<style>
@page{size:A4 ${landscape ? "landscape" : "portrait"};margin:10mm}*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}body{margin:0;background:#e8eef4;color:#10233d;font-family:${english ? "\"Segoe UI\",Arial,sans-serif" : "\"Tajawal\",\"Tahoma\",Arial,sans-serif"}}.report{max-width:${landscape ? "277mm" : "190mm"};min-height:180mm;margin:14px auto;background:#fff;padding:12mm;border-radius:18px;box-shadow:0 15px 45px #0f27441f}.header{display:flex;align-items:center;justify-content:space-between;padding:0 0 14px;border-bottom:4px solid #0f766e}.eyebrow{color:#0f766e;font-size:11px;font-weight:800;letter-spacing:.8px}.header h1{margin:4px 0 3px;font-size:25px;color:#10233d}.header p{margin:0;color:#64748b;font-size:11px}.mark{width:58px;height:58px;border-radius:18px;background:linear-gradient(135deg,#075985,#0f766e);display:grid;place-items:center;color:#fff;font-size:18px;font-weight:900;box-shadow:0 8px 18px #0f766e40}.meta{display:flex;justify-content:space-between;gap:12px;margin:13px 0;color:#64748b;font-size:10px}.table-wrap{border:1px solid #dbe5ee;border-radius:12px;overflow:hidden}table{width:100%;border-collapse:collapse;font-size:${landscape ? "9px" : "10px"};table-layout:auto}thead{display:table-header-group}th{background:linear-gradient(135deg,#075985,#0f766e);color:#fff;font-weight:700;padding:8px 6px;text-align:center;border-left:1px solid #ffffff24}td{padding:7px 6px;text-align:center;border-bottom:1px solid #e7edf3;border-left:1px solid #edf2f7;vertical-align:middle;word-break:break-word}tbody tr:nth-child(even){background:#f6fafb}tbody tr:nth-child(odd){background:#fff}.index{width:30px;color:#64748b}.empty{padding:28px;color:#64748b}.summary{display:grid;grid-template-columns:repeat(${Math.min(Math.max(summary.length, 1), 4)},1fr);gap:8px;margin-top:12px}.summary div{border:1px solid #cfe4df;background:linear-gradient(135deg,#f0fdfa,#eff6ff);padding:10px;border-radius:10px}.summary span{display:block;color:#64748b;font-size:9px;margin-bottom:4px}.summary strong{font-size:14px;color:#0f766e}.footer{display:flex;justify-content:space-between;margin-top:16px;padding-top:9px;border-top:1px solid #e2e8f0;color:#94a3b8;font-size:9px}tr{page-break-inside:avoid}@media print{body{background:#fff}.report{max-width:none;margin:0;padding:0;box-shadow:none;border-radius:0}.no-print{display:none}}
</style></head><body><main class="report"><header class="header"><div><div class="eyebrow">${escapeReportHtml(brandLabel)}</div><h1>${escapeReportHtml(title)}</h1><p>${escapeReportHtml(localize(subtitle || "تقرير رسمي صادر من النظام"))}</p></div><div class="mark">${escapeReportHtml(brandMark)}</div></header><div class="meta"><span>${escapeReportHtml(localize("عدد السجلات"))}: ${rows.length}</span><span>${escapeReportHtml(localize("تاريخ الإصدار"))}: ${issueDate()}</span></div><div class="table-wrap"><table><thead><tr><th>#</th>${columns.map((column) => `<th>${escapeReportHtml(localize(column.label))}</th>`).join("")}</tr></thead><tbody>${tableRows}</tbody></table></div>${summaryHtml}<footer class="footer"><span>${escapeReportHtml(title)}</span><span>${escapeReportHtml(localize("وثيقة تم إنشاؤها إلكترونياً"))}</span></footer></main><script>window.onload=()=>setTimeout(()=>window.print(),250)</script></body></html>`);
  printWindow.document.close();
  return true;
}

export function exportReportExcel({ title, subtitle, columns, rows, fileName, summary = [], brand }: ReportExportOptions) {
  const english = currentLocale() === "en";
  const labels = columns.map((column) => localize(column.label));
  const subtitleText = subtitle ? localize(subtitle) : `${localize("تاريخ الإصدار")}: ${issueDate()}`;
  const headingRows: ReportCell[][] = [
    [localize(title)],
    [brand?.label ? `${brandText(brand, "")} — ${subtitleText}` : subtitleText],
    [],
    [english ? "#" : "م", ...labels],
    ...rows.map((row, index) => [index + 1, ...columns.map((column) => localizeCell(row[column.key] ?? "-"))]),
  ];

  if (summary.length) {
    headingRows.push([], [localize("الملخص")], ...summary.map((item) => [localize(item.label), localizeCell(item.value)]));
  }

  const worksheet = XLSX.utils.aoa_to_sheet(headingRows);
  worksheet["!rtl"] = !english;
  worksheet["!cols"] = [{ wch: 6 }, ...labels.map((label, index) => ({ wch: columns[index].width ?? Math.max(14, label.length + 4) }))];
  worksheet["!freeze"] = { xSplit: 0, ySplit: 4 };
  worksheet["!autofilter"] = rows.length ? { ref: XLSX.utils.encode_range({ r: 3, c: 0 }, { r: 3 + rows.length, c: columns.length }) } : undefined;
  worksheet["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: columns.length } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: columns.length } },
  ];

  const workbook = XLSX.utils.book_new();
  workbook.Workbook = { Views: [{ RTL: !english }] };
  XLSX.utils.book_append_sheet(workbook, worksheet, localize("التقرير").slice(0, 31));
  // اسم الملف بلغة الواجهة (إن كان نصًا ثابتًا له ترجمة)، بلا رموز لا يقبلها نظام الملفات
  XLSX.writeFile(workbook, `${english ? localize(fileName).replace(/[\\/:*?"<>|]+/g, "-") : fileName}.xlsx`, { compression: true });
}
