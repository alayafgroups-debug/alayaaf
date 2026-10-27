import ExcelJS from "exceljs";
import { PRINT_BRAND_CSS, printBrandHeaderHtml } from "@/lib/printBranding";
import { UNSPECIFIED_PAYMENT_METHOD, paymentMethodOf, paymentMethodRank } from "@/lib/salaryPaymentMethods";

/**
 * أرشيف الرواتب بتصميم كشف الرواتب (HR-23): Excel وطباعة كصفحة «كشف الرواتب» (نموذج سمارت)،
 * لكل شهر كشف مستقل: ترويسة باسم القسم والشهر، ثم الموظفون مقسّمون حسب طريقة صرف الراتب بمجموع لكل طريقة، ثم الإجمالي.
 * الأرقام من صفوف الرواتب المحفوظة (ما اعتُمد أو أُرسل)، لا يُعاد حسابها. تفصيل الغياب والإضافي والاقتطاعات من ملاحظات الصف
 * التي يكتبها حساب الرواتب (payrollLineNotes)؛ وطريقة الصرف وبيانات البنك من ملف الموظف الحالي.
 */

export type ArchivePayrollRecord = {
  id: string;
  month: string;
  empId: string;
  empName: string;
  department: string;
  basicSalary: number;
  /** عمود allowances في صف الرواتب = البدلات + قيمة الإضافي */
  allowances: number;
  socialInsurance: number;
  deductions: number;
  netSalary: number;
  status: string;
  notes: string;
  /** الغياب + الإجازات غير المدفوعة + البدلات المخصومة */
  expenseReduction: number;
  advanceDeduction: number;
  penaltyDeduction: number;
};

export type ArchiveEmployeeInfo = { paymentMethod: string; bankName: string; account: string };

type Translate = (value: string) => string;
type FormatNumber = (value: number, options?: Intl.NumberFormatOptions) => string;

export type ArchiveStatementContext = {
  t: Translate;
  locale: "ar" | "en";
  direction: "rtl" | "ltr";
  formatNumber: FormatNumber;
  /** اسم القسم المختار بلغة الواجهة، أو فارغ للكل */
  sectionLabel: string;
  /** الحالة المختارة في التصفية، أو فارغ للكل */
  statusLabel: string;
  /** اسم القسم بلغة الواجهة (للسطر حين لا يُختار قسم) */
  sectionName: (value: string) => string;
};

type StatementColumn = { key: string; label: string; group: string; width: number; money?: boolean };

// أعمدة كشف الرواتب المتاحة من صفوف الأرشيف، بترتيب الكشف ومجموعاته وأسمائه
const COLUMNS: StatementColumn[] = [
  { key: "index", label: "معرف", group: "بيانات الموظف", width: 8 },
  { key: "name", label: "الاسم", group: "بيانات الموظف", width: 28 },
  { key: "empId", label: "الرقم الوظيفي", group: "بيانات الموظف", width: 14 },
  { key: "paymentMethod", label: "طريقة صرف الراتب", group: "معلومات عن البنك", width: 16 },
  { key: "bankName", label: "اسم البنك", group: "معلومات عن البنك", width: 18 },
  { key: "accountNumber", label: "رقم الحساب", group: "معلومات عن البنك", width: 26 },
  { key: "workDays", label: "أيام العمل", group: "بيانات العمل", width: 11 },
  { key: "presentDays", label: "أيام الحضور", group: "بيانات العمل", width: 11 },
  { key: "absenceDays", label: "مجموع أيام الغياب", group: "بيانات العمل", width: 15 },
  { key: "basicSalary", label: "الراتب الأساسي", group: "الاستحقاقات", width: 16, money: true },
  { key: "overtime", label: "قيمة الساعات الإضافية", group: "الاستحقاقات", width: 16, money: true },
  { key: "allowances", label: "البدلات", group: "الاستحقاقات", width: 14, money: true },
  { key: "totalEarnings", label: "إجمالي الاستحقاقات", group: "الاستحقاقات", width: 18, money: true },
  { key: "absenceDeduction", label: "غياب", group: "الاقتطاعات", width: 13, money: true },
  { key: "unpaidLeaveDeduction", label: "إجازات بدون راتب أو بأجر ناقص", group: "الاقتطاعات", width: 16, money: true },
  { key: "socialInsurance", label: "التأمينات الاجتماعية", group: "الاقتطاعات", width: 18, money: true },
  { key: "fixedDeductions", label: "اقتطاعات", group: "الاقتطاعات", width: 14, money: true },
  { key: "penalties", label: "الجزاءات", group: "الاقتطاعات", width: 14, money: true },
  { key: "allowanceDeductions", label: "بدلات مخصومة", group: "الاقتطاعات", width: 14, money: true },
  { key: "loans", label: "السلف", group: "الاقتطاعات", width: 13, money: true },
  { key: "totalDeductions", label: "إجمالي الاقتطاعات", group: "الاقتطاعات", width: 18, money: true },
  { key: "netSalary", label: "الصافي المستحق (عملة النظام)", group: "صافي الراتب", width: 21, money: true },
  { key: "payable", label: "مستحق الصرف (عملة النظام)", group: "صافي الراتب", width: 21, money: true },
  { key: "status", label: "الحالة", group: "السجل", width: 12 },
];

// أعمدة الطباعة كنموذج سمارت (كطباعة كشف الرواتب)، والتأمينات إن خُصم منها شيء في الشهر
const PRINT_KEYS = ["name", "absenceDays", "basicSalary", "allowances", "overtime", "totalEarnings", "absenceDeduction", "socialInsurance", "totalDeductions", "loans", "payable"];

const METHOD_PRINT_COLORS: Record<string, { label: string; value: string }> = {
  "نقدي": { label: "#a9d08e", value: "#c6e0b4" },
  "مدد": { label: "#ddebf7", value: "#ddebf7" },
  "تحويل بنكي": { label: "#fff2cc", value: "#fff2cc" },
  "شيك": { label: "#e4dfec", value: "#e4dfec" },
};
const UNSPECIFIED_PRINT_COLORS = { label: "#ededed", value: "#ededed" };
const NO_SIGNATURE_METHODS = ["مدد", "تحويل بنكي"];

const round2 = (value: number) => Math.round((Number(value) || 0) * 100) / 100;
const escapeHtml = (value: unknown) => String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * تفصيل صف الرواتب من ملاحظاته (كما يكتبها payrollLineNotes: أجزاء بينها « - »)؛ ما لا يوجد يبقى undefined.
 * كل رقم يُقرأ بعد اسمه في بداية جزء، وينتهي الجزء بـ « - » أو « — » (ما تضيفه قاعدة البيانات لاحقًا، مثل «رُفع إيقاف الصرف»)
 * أو نهاية النص؛ فاسم اقتطاع فيه « - » لا يُفسد قراءة ما بعده.
 */
export const parsePayrollNotes = (notes: string) => {
  const result: {
    workDays?: number; presentDays?: number; absentDays?: number; absenceDeduction?: number; unpaidLeaveDeduction?: number;
    fixedDeductions?: number; allowanceDeductions?: number; overtime?: number;
  } = {};
  const text = String(notes ?? "");
  const number = "(-?\\d+(?:\\.\\d+)?)";
  const start = "(?:^| - )";
  const end = "(?=$| - | — )";
  const patterns: Array<[keyof typeof result, RegExp]> = [
    ["workDays", new RegExp(`${start}أيام العمل ${number}${end}`)],
    ["presentDays", new RegExp(`${start}حضور ${number}${end}`)],
    ["absentDays", new RegExp(`${start}غياب ${number}${end}`)],
    ["absenceDeduction", new RegExp(`${start}خصم الغياب ${number}${end}`)],
    ["unpaidLeaveDeduction", new RegExp(`${start}إجازة بدون راتب أو بأجر ناقص -?\\d+(?:\\.\\d+)? يوم \\(خصم ${number}\\)${end}`)],
    // الاقتطاعات الشهرية: الرقم بعد الاسم، ثم أسماء البنود بين قوسين (قد تحوي « - »)
    ["fixedDeductions", new RegExp(`${start}اقتطاعات شهرية ${number}(?=$| - | — | \\()`)],
    ["allowanceDeductions", new RegExp(`${start}بدلات مخصومة ${number}${end}`)],
    ["overtime", new RegExp(`${start}إضافي ${number}${end}`)],
  ];
  for (const [key, pattern] of patterns) {
    const match = text.match(pattern);
    if (match) result[key] = Number(match[1]);
  }
  return result;
};

type StatementRow = Record<string, string | number> & { methodKey: string };

const statementRow = (record: ArchivePayrollRecord, employee: ArchiveEmployeeInfo | undefined, t: Translate): StatementRow => {
  const parts = parsePayrollNotes(record.notes);
  const overtime = round2(Math.max(0, Math.min(record.allowances, parts.overtime ?? 0)));
  let absenceDeduction = round2(parts.absenceDeduction ?? 0);
  const unpaidLeaveDeduction = round2(parts.unpaidLeaveDeduction ?? 0);
  const allowanceDeductions = round2(parts.allowanceDeductions ?? 0);
  // صف قديم بلا تفصيل في ملاحظاته: ما خفّض مصروف الرواتب يُعرض في عمود الغياب
  if (absenceDeduction + unpaidLeaveDeduction + allowanceDeductions === 0 && record.expenseReduction > 0) absenceDeduction = round2(record.expenseReduction);
  const methodKey = paymentMethodOf(employee?.paymentMethod);
  return {
    methodKey,
    index: 0,
    name: record.empName,
    empId: record.empId,
    paymentMethod: t(methodKey || UNSPECIFIED_PAYMENT_METHOD),
    bankName: employee?.bankName || t("لا يوجد"),
    accountNumber: employee?.account || t("لا يوجد"),
    workDays: parts.workDays ?? "",
    presentDays: parts.presentDays ?? "",
    absenceDays: parts.absentDays ?? "",
    basicSalary: round2(record.basicSalary),
    overtime,
    allowances: round2(Math.max(0, record.allowances - overtime)),
    totalEarnings: round2(record.basicSalary + record.allowances),
    absenceDeduction,
    unpaidLeaveDeduction,
    socialInsurance: round2(record.socialInsurance),
    fixedDeductions: round2(parts.fixedDeductions ?? 0),
    penalties: round2(record.penaltyDeduction),
    allowanceDeductions,
    loans: round2(record.advanceDeduction),
    totalDeductions: round2(record.deductions),
    netSalary: round2(record.netSalary),
    payable: round2(record.netSalary),
    status: t(record.status),
  };
};

type MonthStatement = {
  period: string;
  monthLabel: string;
  yearLabel: string;
  title: string;
  meta: string[];
  rows: number;
  grouped: boolean;
  sections: Array<{ key: string; subtotalLabel: string; rows: StatementRow[]; totals: Record<string, number> }>;
  totals: Record<string, number>;
};

const moneyKeys = COLUMNS.filter((column) => column.money).map((column) => column.key);
const sumOf = (rows: StatementRow[]) => Object.fromEntries(moneyKeys.map((key) => [key, round2(rows.reduce((sum, row) => sum + Number(row[key] ?? 0), 0))]));

/** كشف لكل شهر في السجلات (الأحدث أولًا)، مقسّم حسب طريقة الصرف كصفحة كشف الرواتب */
export const buildArchiveStatements = (records: ArchivePayrollRecord[], employees: Map<string, ArchiveEmployeeInfo>, context: ArchiveStatementContext): MonthStatement[] => {
  const { t, locale } = context;
  const periods = [...new Set(records.map((record) => record.month))].sort((a, b) => b.localeCompare(a));
  return periods.map((period) => {
    const monthRecords = records.filter((record) => record.month === period);
    const rows = monthRecords.map((record) => statementRow(record, employees.get(record.empId.trim()), t));
    const valid = /^\d{4}-\d{2}$/.test(period);
    const monthLabel = valid
      ? new Intl.DateTimeFormat(locale === "ar" ? "ar-SA-u-ca-gregory-nu-latn" : "en-US", { month: "long", timeZone: "UTC" }).format(new Date(`${period}-01T00:00:00Z`))
      : period || "-";
    const yearLabel = valid ? period.slice(0, 4) : "";
    // اسم القسم: المختار، أو قسم كل الموظفين إن كان واحدًا، وإلا اسم الشركة
    const sectionsInMonth = [...new Set(monthRecords.map((record) => record.department.trim()).filter(Boolean))];
    const scope = context.sectionLabel || (sectionsInMonth.length === 1 ? context.sectionName(sectionsInMonth[0]) : t("شركة إدارة العياف للمقاولات"));
    const title = locale === "en"
      ? `${scope} ${t("كشف رواتب")} – ${monthLabel} ${yearLabel}`.trim()
      : `${t("كشف رواتب")} ${scope} – ${monthLabel} ${yearLabel}`.trim();
    const meta = [
      context.sectionLabel ? `${t("القسم")}: ${context.sectionLabel}` : "",
      context.statusLabel ? `${t("الحالة")}: ${context.statusLabel}` : "",
      `${t("عدد الموظفين")}: ${context.formatNumber(rows.length)}`,
      t("من أرشيف الرواتب"),
    ].filter(Boolean);
    // الأقسام بترتيب سمارت؛ بلا طريقة صرف محددة لأحد لا يُقسَّم الكشف
    const grouped = rows.some((row) => row.methodKey !== "");
    const byEmpId = (a: StatementRow, b: StatementRow) => String(a.empId).localeCompare(String(b.empId), "en", { numeric: true });
    let serial = 0;
    const sections = (grouped
      ? [...new Set(rows.map((row) => row.methodKey))]
        .sort((a, b) => paymentMethodRank(a) - paymentMethodRank(b))
        .map((key) => {
          const sectionRows = rows.filter((row) => row.methodKey === key);
          return { key: key || "unspecified", subtotalLabel: key ? `${t("إجمالي")} ${t(key)}` : t("إجمالي غير المحددة طريقتهم"), rows: sectionRows, totals: sumOf(sectionRows) };
        })
      : [{ key: "all", subtotalLabel: "", rows, totals: sumOf(rows) }])
      .map((section) => ({ ...section, rows: [...section.rows].sort(byEmpId).map((row) => ({ ...row, index: ++serial })) }));
    return { period, monthLabel, yearLabel, title, meta, rows: rows.length, grouped, sections, totals: sumOf(rows) };
  });
};

const columnGroups = (columns: StatementColumn[]) => columns.reduce<Array<{ name: string; count: number }>>((result, column) => {
  const last = result[result.length - 1];
  if (last?.name === column.group) last.count += 1;
  else result.push({ name: column.group, count: 1 });
  return result;
}, []);

/** اسم ملف آمن: حروف (عربية أو إنجليزية) وأرقام فقط، والباقي «_» */
const safeFileName = (value: string) => value.normalize("NFC").replace(/[^\p{L}\p{M}\p{N}_.-]+/gu, "_").replace(/_+/g, "_").replace(/^_+|_+$/g, "").slice(0, 120) || "Payroll_Archive";

/** Excel بتصميم كشف الرواتب: ورقة لكل شهر */
export async function exportArchiveStatementExcel(statements: MonthStatement[], context: ArchiveStatementContext, fileStem: string) {
  const { t, direction } = context;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Idarat Al Ayaf Management System";
  const rtl = direction === "rtl";
  const readingOrder = rtl ? "rtl" : "ltr";
  const columns = COLUMNS;
  const groups = columnGroups(columns);
  const count = columns.length;
  const usedNames = new Set<string>();
  statements.forEach((statement) => {
    let sheetName = (statement.period || t("كشف الرواتب")).replace(/[\\/:*?[\]]/g, "-").slice(0, 31);
    for (let suffix = 2; usedNames.has(sheetName); suffix += 1) sheetName = `${sheetName.slice(0, 27)} (${suffix})`;
    usedNames.add(sheetName);
    const sheet = workbook.addWorksheet(sheetName, { views: [{ rightToLeft: rtl, state: "frozen", ySplit: 5 }] });
    sheet.pageSetup = { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 };
    sheet.mergeCells(1, 1, 1, count); sheet.getCell(1, 1).value = t("شركة إدارة العياف للمقاولات");
    sheet.mergeCells(2, 1, 2, count); sheet.getCell(2, 1).value = statement.title;
    sheet.mergeCells(3, 1, 3, count); sheet.getCell(3, 1).value = [...statement.meta, t("طريقة الصرف وبيانات البنك من ملف الموظف الحالي")].join(" | ");
    [1, 2, 3].forEach((row) => {
      sheet.getRow(row).alignment = { horizontal: "center", vertical: "middle", readingOrder };
      sheet.getRow(row).font = { bold: true, size: row === 1 ? 18 : 12, color: { argb: row === 1 ? "FFFFFFFF" : "FF17324D" } };
    });
    sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF075F94" } };
    sheet.getRow(1).height = 30;
    let start = 1;
    groups.forEach((group) => {
      sheet.mergeCells(4, start, 4, start + group.count - 1);
      sheet.getCell(4, start).value = t(group.name);
      start += group.count;
    });
    columns.forEach((column, index) => {
      sheet.getCell(5, index + 1).value = t(column.label);
      sheet.getColumn(index + 1).width = column.width;
    });
    const thin = { style: "thin" as const, color: { argb: "FFFFFFFF" } };
    [4, 5].forEach((rowNumber) => sheet.getRow(rowNumber).eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowNumber === 4 ? "FF075F94" : "FF0B6FA4" } };
      cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true, readingOrder };
      cell.border = { top: thin, left: thin, bottom: thin, right: thin };
    }));
    const hair = { style: "hair" as const, color: { argb: "FFD8E1E8" } };
    const addDataRow = (row: StatementRow) => {
      const excelRow = sheet.addRow(columns.map((column) => row[column.key]));
      excelRow.eachCell((cell, index) => {
        const column = columns[index - 1];
        cell.alignment = { horizontal: column.money ? "right" : "center", vertical: "middle", wrapText: true, readingOrder };
        cell.border = { top: hair, left: hair, bottom: hair, right: hair };
        if (column.money) cell.numFmt = "#,##0.00";
      });
    };
    statement.sections.forEach((section) => {
      section.rows.forEach(addDataRow);
      if (!statement.grouped) return;
      const subtotalRow = sheet.addRow(columns.map((column) => column.key === "name" ? section.subtotalLabel : column.money ? section.totals[column.key] : ""));
      subtotalRow.font = { bold: true };
      subtotalRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF4D6" } };
      subtotalRow.eachCell((cell, index) => {
        cell.alignment = { horizontal: "center", vertical: "middle", readingOrder };
        if (columns[index - 1].money) cell.numFmt = "#,##0.00";
      });
    });
    const totalRow = sheet.addRow(columns.map((column) => column.key === "name" ? t("الإجماليات") : column.money ? statement.totals[column.key] : ""));
    totalRow.font = { bold: true };
    totalRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8F2F8" } };
    totalRow.eachCell((cell, index) => {
      if (columns[index - 1].money) cell.numFmt = "#,##0.00";
      cell.border = { top: { style: "medium", color: { argb: "FF075F94" } } };
    });
    // الفرز في Excel يخلط سطور مجاميع الأقسام بالموظفين، فلا فلتر مع التقسيم
    if (!statement.grouped) sheet.autoFilter = { from: { row: 5, column: 1 }, to: { row: 5 + statement.rows, column: count } };
  });
  const output = await workbook.xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([output], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${safeFileName(fileStem)}.xlsx`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * الطباعة كطباعة كشف الرواتب (نموذج سمارت): ترويسة الشركة ورؤية 2030 في رأس الجدول فتتكرر في كل صفحة،
 * وبعد كل طريقة صرف سطر مجموع صافيها بلونها، ثم الإجمالي؛ وعمود التوقيع (مدد والتحويل البنكي يُكتب فيهما اسم الطريقة).
 * كل شهر في صفحة جديدة. النافذة تُفتح عند الضغط (قبل تحميل بيانات الموظفين) حتى لا يمنعها المتصفح.
 */
export function printArchiveStatement(statements: MonthStatement[], context: ArchiveStatementContext, printWindow: Window) {
  const { t, locale, direction, formatNumber } = context;
  const esc = escapeHtml;
  const english = locale === "en";
  const amount = (value: unknown) => formatNumber(Number(value ?? 0), { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const cellText = (column: StatementColumn, value: unknown) => (column.money ? amount(value) : String(value ?? ""));
  const SIGNATURE_WIDTH = 16;
  const SIGNATURE_BLOCK = 8;
  const printWidth = (column: StatementColumn) => (column.key === "name" ? Math.max(column.width, 30) : column.width);

  const tables = statements.map((statement, statementIndex) => {
    // التأمينات تُطبع إن خُصم منها شيء في الشهر، والحالة إن اختلفت حالات الرواتب في الشهر
    const statuses = new Set(statement.sections.flatMap((section) => section.rows.map((row) => String(row.status))));
    const cols = [...PRINT_KEYS, ...(statuses.size > 1 ? ["status"] : [])]
      .filter((key) => key !== "socialInsurance" || Number(statement.totals.socialInsurance ?? 0) > 0)
      .map((key) => COLUMNS.find((column) => column.key === key)!)
      .filter(Boolean);
    const count = cols.length;
    const totalWidth = cols.reduce((sum, column) => sum + printWidth(column), 0) + SIGNATURE_WIDTH;
    const colgroup = `<colgroup>${cols.map((column) => `<col style="width:${((printWidth(column) / totalWidth) * 100).toFixed(2)}%">`).join("")}<col style="width:${((SIGNATURE_WIDTH / totalWidth) * 100).toFixed(2)}%"></colgroup>`;
    const netKey = "payable";
    const netIndex = cols.findIndex((column) => column.key === netKey);
    const subtotalRow = (label: string, sums: Record<string, number>, colors: { label: string; value: string }) => {
      const labelSpan = Math.min(2, netIndex);
      const blank = netIndex - labelSpan;
      const after = count - netIndex - 1;
      return `<tr class="sum">${blank > 0 ? `<td colspan="${blank}" class="blank"></td>` : ""}${labelSpan > 0 ? `<td colspan="${labelSpan}" style="background:${colors.label}">${esc(label)}</td>` : ""}<td style="background:${colors.value}">${labelSpan > 0 ? "" : `${esc(label)}: `}${esc(amount(sums[netKey]))}</td>${after > 0 ? `<td colspan="${after}" class="blank"></td>` : ""}<td class="blank"></td></tr>`;
    };
    const firstMoney = cols.findIndex((column) => column.money);
    const grandSpan = firstMoney === 0 ? 0 : Math.max(1, firstMoney);
    const grandRow = `<tr class="sum grand">${grandSpan > 0 ? `<td colspan="${grandSpan}">${esc(t("الإجمالي"))}</td>` : ""}${cols.slice(grandSpan).map((column) => `<td>${column.money ? esc(amount(statement.totals[column.key])) : ""}</td>`).join("")}<td></td></tr>`;
    let body = "";
    statement.sections.forEach((section) => {
      const method = statement.grouped && section.key !== "unspecified" ? section.key : "";
      const colors = METHOD_PRINT_COLORS[method] ?? UNSPECIFIED_PRINT_COLORS;
      const mergedSignature = statement.grouped && NO_SIGNATURE_METHODS.includes(method);
      section.rows.forEach((row, index) => {
        const blockStart = index % SIGNATURE_BLOCK === 0;
        const blockSize = Math.min(SIGNATURE_BLOCK, section.rows.length - index);
        const signature = mergedSignature
          ? (blockStart ? `<td class="merged" rowspan="${blockSize}" style="background:${colors.label}">${esc(t(method))}</td>` : "")
          : "<td></td>";
        body += `<tr${mergedSignature ? ' class="in-block"' : ""}>${cols.map((column) => `<td>${esc(cellText(column, row[column.key]))}</td>`).join("")}${signature}</tr>`;
      });
      if (statement.grouped) body += subtotalRow(section.subtotalLabel, section.totals, colors);
    });
    body += grandRow;
    const header = printBrandHeaderHtml(
      `<div class="title">${esc(statement.title)}</div>${statement.meta.length ? `<div class="meta">${statement.meta.map(esc).join(" &nbsp;|&nbsp; ")}</div>` : ""}`,
      { company: t("شعار الشركة"), vision: t("رؤية المملكة 2030") },
    );
    return `<table class="${statementIndex > 0 ? "next-month" : ""}">${colgroup}<thead><tr class="brand-row"><th colspan="${count + 1}">${header}</th></tr><tr class="cols">${cols.map((column) => `<th>${esc(t(column.label))}</th>`).join("")}<th>${esc(t("التوقيع"))}</th></tr></thead><tbody>${body}</tbody></table>`;
  });

  const fontPx = 11;
  const docTitle = statements.length === 1 ? statements[0].title : t("أرشيف الرواتب");
  // النافذة قد تحوي رسالة «جاري التحميل»: يُستبدل محتواها كاملًا
  printWindow.document.open();
  printWindow.document.write(`<!doctype html>
<html dir="${direction}" lang="${locale}"><head><meta charset="utf-8"><title>${esc(docTitle)}</title>
<style>
@page{size:A4 landscape;margin:8mm}
*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{margin:0;background:#fff;color:#000;font-family:${english ? "\"Calibri\",\"Segoe UI\",Arial,sans-serif" : "\"Tajawal\",\"Tahoma\",Arial,sans-serif"}}
${PRINT_BRAND_CSS}
.title{font-size:${fontPx + 6}px;font-weight:800}
.meta{margin-top:5px;font-size:${fontPx - 1.5}px;font-weight:600;color:#333}
table{width:100%;table-layout:fixed;border-collapse:collapse;font-size:${fontPx}px}
table.next-month{break-before:page;page-break-before:always}
thead{display:table-header-group}
th,td{border:1px solid #000;padding:5px 5px;text-align:center;vertical-align:middle;font-weight:700;overflow-wrap:anywhere;word-break:break-word}
thead tr.cols th{background:#ffff00;line-height:1.25}
thead tr.brand-row th{border:0;padding:0 0 6px;background:#fff;font-weight:400}
td{height:28px}
td.blank{background:#fff}
tr:not(.in-block){break-inside:avoid;page-break-inside:avoid}
.sum td{font-size:${fontPx + 1.5}px;font-weight:800}
.grand td{background:#ffff00}
</style></head><body>
${tables.join("\n")}
<script>window.onload=()=>setTimeout(()=>window.print(),250)</script></body></html>`);
  printWindow.document.close();
}
