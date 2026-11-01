import type { Workbook, Worksheet, Borders, Fill, Alignment, PaperSize } from "exceljs";
import { COMPANY_PRINT_LOGO, PRINT_BRAND_CSS, VISION_2030_LOGO } from "@/lib/printBranding";

/*
 * الثيم الموحّد للموارد البشرية (HR-26) كشكل كشف سمارت: ترويسة الشركة ورؤية 2030، رأس جدول أصفر،
 * حدود سوداء وخط عريض، سطر مجموع كل طريقة صرف بلونها، والإجمالي بالأصفر.
 * يُستعمل في Excel كشف الرواتب والأرشيف، وفي طباعة تقارير الموارد البشرية وExcel منها ومصمم التقارير.
 * لا يُستعمل في الفاتورة الضريبية ولا إشعار الدائن ولا التقارير المالية والضريبية.
 */

/** ألوان أقسام طرق الصرف (كطباعة كشف الرواتب)؛ مدد والتحويل البنكي لا توقيع فيهما فيُكتب اسم الطريقة في عمود التوقيع */
export const METHOD_STATEMENT_COLORS: Record<string, { label: string; value: string }> = {
  "نقدي": { label: "#a9d08e", value: "#c6e0b4" },
  "مدد": { label: "#ddebf7", value: "#ddebf7" },
  "تحويل بنكي": { label: "#fff2cc", value: "#fff2cc" },
  "شيك": { label: "#e4dfec", value: "#e4dfec" },
};
export const UNSPECIFIED_STATEMENT_COLORS = { label: "#ededed", value: "#ededed" };
export const NO_SIGNATURE_METHODS = ["مدد", "تحويل بنكي"];
export const STATEMENT_YELLOW = "#ffff00";

/** مقاس الورقة والخط حسب مجموع عروض الأعمدة (كطباعة كشف الرواتب): الجدول لا يتجاوز الصفحة */
export const statementPrintMetrics = (totalWidth: number) => ({
  fontPx: totalWidth <= 220 ? 12.5 : totalWidth <= 300 ? 11 : totalWidth <= 380 ? 9.5 : totalWidth <= 480 ? 8 : 6.5,
  rowHeight: totalWidth <= 220 ? 34 : totalWidth <= 300 ? 28 : totalWidth <= 380 ? 24 : 18,
  cellPadding: totalWidth <= 300 ? "5px 5px" : totalWidth <= 380 ? "4px 3px" : "2px 2px",
  pageSize: totalWidth > 380 ? "A3" : "A4",
});

/** تنسيق الطباعة الصفراء لنوافذ الطباعة المكتوبة نصًا (الترويسة في رأس الجدول فتتكرر في كل صفحة) */
export const statementPrintCss = ({ totalWidth, english, landscape = true }: { totalWidth: number; english: boolean; landscape?: boolean }) => {
  const { fontPx, rowHeight, cellPadding, pageSize } = statementPrintMetrics(totalWidth);
  return `@page{size:${pageSize} ${landscape ? "landscape" : "portrait"};margin:8mm}
*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{margin:0;background:#fff;color:#000;font-family:${english ? "\"Calibri\",\"Segoe UI\",Arial,sans-serif" : "\"Tajawal\",\"Tahoma\",Arial,sans-serif"}}
${PRINT_BRAND_CSS}
.title{font-size:${Math.max(15, fontPx + 6)}px;font-weight:800}
.meta{margin-top:5px;font-size:${Math.max(9, fontPx - 1.5)}px;font-weight:600;color:#333}
table{width:100%;table-layout:fixed;border-collapse:collapse;font-size:${fontPx}px}
thead{display:table-header-group}
th,td{border:1px solid #000;padding:${cellPadding};text-align:center;vertical-align:middle;font-weight:700;overflow-wrap:anywhere;word-break:break-word}
thead tr.cols th{background:${STATEMENT_YELLOW};line-height:1.25}
thead tr.brand-row th{border:0;padding:0 0 6px;background:#fff;font-weight:400}
td{height:${rowHeight}px}
td.blank{background:#fff}
td.empty{padding:24px;color:#555}
tr:not(.in-block){break-inside:avoid;page-break-inside:avoid}
.sum td{font-size:${fontPx + 1.5}px;font-weight:800}
.grand td{background:${STATEMENT_YELLOW}}
.summary{margin-top:10px;border-collapse:collapse;width:auto;min-width:40%;font-size:${fontPx}px}
.summary th{background:${STATEMENT_YELLOW}}
.summary td,.summary th{height:auto;padding:4px 10px}`;
};

// ───────────────────────────── Excel ─────────────────────────────

/** عمود في ورقة الكشف: label مترجم مسبقًا، والعرض بعرض أعمدة Excel (أحرف) */
export type StatementColumn = { key: string; label: string; width: number; money?: boolean; numFmt?: string };

/** قسم من الكشف (طريقة صرف): صفوفه، ثم سطر مجموعه إن وُجد */
export type StatementSection = {
  /** طريقة الصرف (لون سطر المجموع وعمود التوقيع)؛ الفارغ = غير محدد */
  method?: string;
  rows: Array<Record<string, unknown>>;
  subtotal?: { label: string; totals: Record<string, number> };
};

export type StatementSheetSpec = {
  title: string;
  meta: string[];
  columns: StatementColumn[];
  sections: StatementSection[];
  grand?: { label: string; totals: Record<string, number> };
  /** عمود التوقيع في آخر الكشف؛ mergeMethods: طرق يُكتب فيها اسم الطريقة بدل التوقيع (methodText بلغة الواجهة) */
  signature?: { label: string; mergeMethods: string[]; methodText: (method: string) => string };
  /** عمود الصافي الذي يُكتب تحته مجموع كل قسم (كالطباعة)؛ إن لم يُعطَ فآخر عمود مالي */
  netKey?: string;
  /** أسطر ملخص أسفل الجدول (اسم وقيمة) */
  summary?: Array<{ label: string; value: string | number }>;
  /** نص سطر «لا توجد بيانات» حين لا صفوف */
  emptyText?: string;
  /** اتجاه الورقة عند الطباعة من Excel (الافتراضي أفقي) */
  landscape?: boolean;
  rtl: boolean;
};

const argb = (hex: string) => `FF${hex.replace("#", "").toUpperCase()}`;
const solid = (hex: string): Fill => ({ type: "pattern", pattern: "solid", fgColor: { argb: argb(hex) } });
const black = { style: "thin" as const, color: { argb: "FF000000" } };
const boxBorder: Partial<Borders> = { top: black, left: black, bottom: black, right: black };
const MONEY_FORMAT = "#,##0.00";
const SIGNATURE_BLOCK = 8;

/** عرض العمود بالبكسل كما يحسبه Excel تقريبًا (خط Calibri 11) */
const columnPixels = (width: number) => Math.floor(width * 7 + 5);

const EMU_PER_PIXEL = 9525;

/**
 * موضع صورة على بعد px من بداية الورقة كمرساة Excel الأصلية (العمود وإزاحته بالـEMU).
 * لا يُعطى العمود كسرًا: ExcelJS يحوّل الكسر بعرض خاطئ (نحو بكسل لكل حرف) فتتداخل الصور.
 */
const nativeAnchorAt = (widths: number[], px: number, rowOffsetPx: number) => {
  let left = 0;
  for (let index = 0; index < widths.length; index += 1) {
    const width = columnPixels(widths[index]);
    if (px < left + width || index === widths.length - 1) {
      return { nativeCol: index, nativeColOff: Math.max(0, Math.round((px - left) * EMU_PER_PIXEL)), nativeRow: 0, nativeRowOff: Math.round(rowOffsetPx * EMU_PER_PIXEL) };
    }
    left += width;
  }
  return { nativeCol: 0, nativeColOff: 0, nativeRow: 0, nativeRowOff: Math.round(rowOffsetPx * EMU_PER_PIXEL) };
};

/** أبعاد الصورة من بيانات data URI (JPEG أو PNG) لحساب نسبة العرض إلى الارتفاع */
const imageRatio = (dataUri: string, fallback: number) => {
  try {
    const bytes = atob(dataUri.slice(dataUri.indexOf(",") + 1, dataUri.indexOf(",") + 1 + 4000));
    const code = (index: number) => bytes.charCodeAt(index) & 0xff;
    if (bytes.startsWith("\x89PNG")) {
      const width = (code(16) << 24) | (code(17) << 16) | (code(18) << 8) | code(19);
      const height = (code(20) << 24) | (code(21) << 16) | (code(22) << 8) | code(23);
      return width > 0 && height > 0 ? width / height : fallback;
    }
    for (let index = 2; index < bytes.length - 9; index += 1) {
      if (code(index) === 0xff && code(index + 1) >= 0xc0 && code(index + 1) <= 0xc3) {
        const height = (code(index + 5) << 8) | code(index + 6);
        const width = (code(index + 7) << 8) | code(index + 8);
        return width > 0 && height > 0 ? width / height : fallback;
      }
    }
  } catch {
    // صورة غير مقروءة: النسبة الافتراضية
  }
  return fallback;
};

/**
 * يكتب ورقة كشف بشكل الطباعة الصفراء: العنوان والبيانات بين شعار الشركة ورؤية 2030، رأس أصفر يتكرر في كل صفحة مطبوعة،
 * حدود سوداء وخط عريض، سطر مجموع كل طريقة صرف بلونها تحت عمود الصافي، والإجمالي بالأصفر.
 * يُرجع رقم سطر رأس الجدول.
 */
export function writeStatementSheet(workbook: Workbook, sheet: Worksheet, spec: StatementSheetSpec) {
  const readingOrder: Alignment["readingOrder"] = spec.rtl ? "rtl" : "ltr";
  const columns = spec.columns;
  const signature = spec.signature;
  const count = columns.length + (signature ? 1 : 0);
  const widths = [...columns.map((column) => column.width), ...(signature ? [16] : [])];
  widths.forEach((width, index) => { sheet.getColumn(index + 1).width = width; });
  const totalPixels = widths.reduce((sum, width) => sum + columnPixels(width), 0);

  // الترويسة: العنوان والبيانات في الوسط والشعاران على الطرفين؛ الورقة الضيقة يُخصَّص للشعارين سطر فوق العنوان
  const margin = 6;
  const companyRatio = imageRatio(COMPANY_PRINT_LOGO, 1.93);
  const visionRatio = imageRatio(VISION_2030_LOGO, 1.49);
  // الورقة الضيقة جدًا: يُصغَّر الشعاران حتى يتسعا جنبًا إلى جنب دون تداخل
  const fullWidth = 60 * companyRatio + 54 * visionRatio;
  const scale = Math.max(0.35, Math.min(1, (totalPixels - 3 * margin) / fullWidth));
  const companyHeight = Math.round(60 * scale);
  const visionHeight = Math.round(54 * scale);
  const companyWidth = Math.round(companyHeight * companyRatio);
  const visionWidth = Math.round(visionHeight * visionRatio);
  const logoBand = totalPixels < companyWidth + visionWidth + 420;
  const firstRow = logoBand ? 2 : 1;
  if (logoBand) sheet.getRow(1).height = Math.max(30, Math.round(companyHeight * 0.75) + 8);
  const titleRow = firstRow;
  const metaRow = firstRow + 1;
  const headerRow = firstRow + 2;
  sheet.mergeCells(titleRow, 1, titleRow, count);
  sheet.mergeCells(metaRow, 1, metaRow, count);
  const titleCell = sheet.getCell(titleRow, 1);
  titleCell.value = spec.title;
  titleCell.font = { bold: true, size: 16 };
  titleCell.alignment = { horizontal: "center", vertical: "middle", wrapText: true, readingOrder };
  const metaCell = sheet.getCell(metaRow, 1);
  metaCell.value = spec.meta.filter(Boolean).join("  |  ");
  metaCell.font = { bold: true, size: 10, color: { argb: "FF333333" } };
  metaCell.alignment = { horizontal: "center", vertical: "middle", wrapText: true, readingOrder };
  sheet.getRow(titleRow).height = logoBand ? 26 : 34;
  sheet.getRow(metaRow).height = logoBand ? 18 : 30;
  try {
    const companyId = workbook.addImage({ base64: COMPANY_PRINT_LOGO, extension: "jpeg" });
    const visionId = workbook.addImage({ base64: VISION_2030_LOGO, extension: "png" });
    // الصور مثبتة بالأعمدة: العمود الأول في بداية الورقة (يمين العربية)، كالطباعة: شعار الشركة في البداية والرؤية في النهاية
    type ImageAnchor = { col: number; row: number };
    const companyAnchor = nativeAnchorAt(widths, margin, 3) as unknown as ImageAnchor;
    const visionAnchor = nativeAnchorAt(widths, Math.max(companyWidth + 2 * margin, totalPixels - visionWidth - margin), 6) as unknown as ImageAnchor;
    sheet.addImage(companyId, { tl: companyAnchor, ext: { width: companyWidth, height: companyHeight }, editAs: "oneCell" });
    sheet.addImage(visionId, { tl: visionAnchor, ext: { width: visionWidth, height: visionHeight }, editAs: "oneCell" });
  } catch {
    // تعذرت إضافة الشعارين: يبقى الكشف بلا صور
  }

  // رأس الجدول الأصفر
  const header = sheet.getRow(headerRow);
  [...columns.map((column) => column.label), ...(signature ? [signature.label] : [])].forEach((label, index) => {
    const cell = header.getCell(index + 1);
    cell.value = label;
    cell.fill = solid(STATEMENT_YELLOW);
    cell.font = { bold: true, size: 10 };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true, readingOrder };
    cell.border = boxBorder;
  });
  header.height = 32;

  const styleCell = (rowNumber: number, columnNumber: number, options: { money?: boolean; numFmt?: string; fill?: string; size?: number } = {}) => {
    const cell = sheet.getCell(rowNumber, columnNumber);
    cell.border = boxBorder;
    cell.font = { bold: true, size: options.size ?? 10 };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true, readingOrder };
    if (options.numFmt) cell.numFmt = options.numFmt;
    else if (options.money) cell.numFmt = MONEY_FORMAT;
    if (options.fill) cell.fill = solid(options.fill);
    return cell;
  };

  const netKey = spec.netKey && columns.some((column) => column.key === spec.netKey)
    ? spec.netKey
    : [...columns].reverse().find((column) => column.money)?.key ?? "";
  const netIndex = columns.findIndex((column) => column.key === netKey);
  let rowNumber = headerRow;

  spec.sections.forEach((section) => {
    const method = section.method ?? "";
    const colors = METHOD_STATEMENT_COLORS[method] ?? UNSPECIFIED_STATEMENT_COLORS;
    const mergedSignature = !!signature && !!method && signature.mergeMethods.includes(method);
    const firstDataRow = rowNumber + 1;
    section.rows.forEach((row) => {
      rowNumber += 1;
      columns.forEach((column, index) => {
        const value = row[column.key];
        const cell = styleCell(rowNumber, index + 1, { money: column.money, numFmt: column.numFmt });
        cell.value = column.money && value !== "" && value !== null && value !== undefined && !Number.isNaN(Number(value)) ? Number(value) : (value as string | number | null | undefined) ?? "";
      });
      if (signature) styleCell(rowNumber, count);
      sheet.getRow(rowNumber).height = 22;
    });
    // التوقيع: في مدد والتحويل البنكي اسم الطريقة على كتل من 8 صفوف (كالطباعة) فيظهر في كل صفحة مطبوعة
    if (signature && mergedSignature && section.rows.length) {
      for (let blockStart = firstDataRow; blockStart <= rowNumber; blockStart += SIGNATURE_BLOCK) {
        const blockEnd = Math.min(rowNumber, blockStart + SIGNATURE_BLOCK - 1);
        if (blockEnd > blockStart) sheet.mergeCells(blockStart, count, blockEnd, count);
        const cell = styleCell(blockStart, count, { fill: colors.label, size: 11 });
        cell.value = signature.methodText(method);
      }
    }
    if (!section.subtotal) return;
    rowNumber += 1;
    const sums = section.subtotal.totals;
    if (netIndex < 0) {
      sheet.mergeCells(rowNumber, 1, rowNumber, columns.length);
      styleCell(rowNumber, 1, { fill: colors.label, size: 11 }).value = section.subtotal.label;
    } else {
      // كالطباعة: اسم المجموع في العمودين قبل الصافي بلون الطريقة، ومجموع الصافي تحته، وباقي الخلايا فارغة
      const labelSpan = Math.min(2, netIndex);
      for (let index = 0; index < columns.length; index += 1) styleCell(rowNumber, index + 1, { size: 11 });
      if (labelSpan > 0) {
        const from = netIndex - labelSpan + 1;
        if (labelSpan > 1) sheet.mergeCells(rowNumber, from, rowNumber, netIndex);
        styleCell(rowNumber, from, { fill: colors.label, size: 11 }).value = section.subtotal.label;
      }
      // الصافي أول عمود (لا خلية لاسم المجموع): الاسم قبل المبلغ في تنسيق الخلية، والقيمة تبقى رقمًا
      const netCell = styleCell(rowNumber, netIndex + 1, {
        numFmt: labelSpan > 0 ? MONEY_FORMAT : (() => {
          const label = section.subtotal.label.replace(/["\\]/g, "");
          return `"${label}: "${MONEY_FORMAT};"${label}: "-${MONEY_FORMAT}`;
        })(),
        fill: colors.value,
        size: 11,
      });
      netCell.value = Number(sums[netKey] ?? 0);
    }
    if (signature) styleCell(rowNumber, count);
    sheet.getRow(rowNumber).height = 24;
  });

  const lastDataRow = rowNumber;
  const dataRows = spec.sections.reduce((sum, section) => sum + section.rows.length, 0);
  if (!dataRows && spec.emptyText) {
    rowNumber += 1;
    sheet.mergeCells(rowNumber, 1, rowNumber, count);
    styleCell(rowNumber, 1).value = spec.emptyText;
    sheet.getRow(rowNumber).height = 28;
  }

  if (spec.grand && dataRows) {
    rowNumber += 1;
    const firstMoney = columns.findIndex((column) => column.money);
    const span = firstMoney === 0 ? 0 : firstMoney < 0 ? columns.length : Math.max(1, firstMoney);
    for (let index = 0; index < count; index += 1) styleCell(rowNumber, index + 1, { fill: STATEMENT_YELLOW, size: 11 });
    if (span > 0) {
      if (span > 1) sheet.mergeCells(rowNumber, 1, rowNumber, span);
      sheet.getCell(rowNumber, 1).value = spec.grand.label;
    }
    columns.forEach((column, index) => {
      if (index < span || !column.money) return;
      const cell = sheet.getCell(rowNumber, index + 1);
      cell.value = Number(spec.grand?.totals[column.key] ?? 0);
      cell.numFmt = MONEY_FORMAT;
    });
    sheet.getRow(rowNumber).height = 26;
  }

  if (spec.summary?.length) {
    rowNumber += 1;
    spec.summary.forEach((item) => {
      rowNumber += 1;
      const labelSpan = Math.max(1, Math.min(2, count - 1));
      if (labelSpan > 1) sheet.mergeCells(rowNumber, 1, rowNumber, labelSpan);
      styleCell(rowNumber, 1, { fill: STATEMENT_YELLOW }).value = item.label;
      const valueCell = styleCell(rowNumber, labelSpan + 1, { money: typeof item.value === "number" && !Number.isInteger(item.value) });
      valueCell.value = item.value;
    });
  }

  // الفلتر في Excel للكشف غير المقسّم فقط: الفرز مع سطور مجاميع الأقسام يخلطها بالموظفين
  if (dataRows && spec.sections.length === 1 && !spec.sections[0].subtotal) {
    sheet.autoFilter = { from: { row: headerRow, column: 1 }, to: { row: lastDataRow, column: count } };
  }

  sheet.views = [{ rightToLeft: spec.rtl, state: "frozen", ySplit: headerRow, xSplit: 0 }];
  const totalChars = widths.reduce((sum, width) => sum + width, 0);
  sheet.pageSetup = {
    orientation: spec.landscape === false ? "portrait" : "landscape",
    // A3 للكشف العريض، وإلا A4 (كالطباعة)
    paperSize: (totalChars > 380 ? 8 : 9) as PaperSize,
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    horizontalCentered: true,
    printTitlesRow: `1:${headerRow}`,
    margins: { left: 0.3, right: 0.3, top: 0.35, bottom: 0.35, header: 0.2, footer: 0.2 },
  };
  return headerRow;
}

/** تنزيل ملف Excel من المتصفح */
export async function downloadWorkbook(workbook: Workbook, fileName: string) {
  const output = await workbook.xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([output], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName.endsWith(".xlsx") ? fileName : `${fileName}.xlsx`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
