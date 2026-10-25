import { Fragment, useEffect, useRef, useState } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabaseClient";
import { useI18n } from "@/i18n";
import { ArrowRight, Columns3, Download, Printer, Send, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ExcelJS from "exceljs";
import { toast } from "@/hooks/use-toast";
import { readUserSession } from "@/lib/authSession";
import { preparePayrollResend, resendPreparationOf, submitPayrollApprovalRequest, type PayrollResendPreparation } from "@/lib/payrollApproval";
import { payrollApprovalErrorText } from "@/lib/hrErrors";
import { computePayroll, savePayrollRows, type PayrollComputation } from "@/lib/payrollCalc";
import PayrollApprovalDialog from "@/components/hr/PayrollApprovalDialog";
import PayrollFreshnessNotice from "@/components/hr/PayrollFreshnessNotice";
import { freshnessErrorText, savedPayrollFreshness, type PayrollFreshness } from "@/lib/payrollFreshness";
import { isMissingColumnError } from "@/lib/advances";
import { UNSPECIFIED_PAYMENT_METHOD, paymentMethodOf, paymentMethodRank } from "@/lib/salaryPaymentMethods";

type ReportConfig = {
  period: string;
  employeeIds: string[];
  /** الموظفون المحدد إيقاف رواتبهم في صفحة كشف الرواتب (تُعرض محددة في بطاقة الإعدادات) */
  stoppedEmployeeIds?: string[];
  filters: { branch: string; department: string; section: string; location: string };
};

type PayrollRow = Record<string, string | number> & { id: string };
type PayrollColumn = { key: string; label: string; group: string; width: number; money?: boolean; defaultVisible?: boolean };

const columns: PayrollColumn[] = [
  { key: "index", label: "معرف", group: "بيانات الموظف", width: 8 },
  { key: "name", label: "الاسم", group: "بيانات الموظف", width: 22 },
  { key: "empId", label: "الرقم الوظيفي", group: "بيانات الموظف", width: 14 },
  { key: "paymentMethod", label: "طريقة صرف الراتب", group: "معلومات عن البنك", width: 16 },
  { key: "bankName", label: "اسم البنك", group: "معلومات عن البنك", width: 18 },
  { key: "bankBranch", label: "اسم الفرع", group: "معلومات عن البنك", width: 16 },
  { key: "accountName", label: "اسم الحساب", group: "معلومات عن البنك", width: 20 },
  { key: "accountNumber", label: "رقم الحساب", group: "معلومات عن البنك", width: 22 },
  { key: "jobTitle", label: "المسمى الوظيفي", group: "بيانات العمل", width: 24 },
  { key: "workTime", label: "وقت العمل", group: "بيانات العمل", width: 14 },
  { key: "workDays", label: "أيام العمل", group: "بيانات العمل", width: 11 },
  { key: "presentDays", label: "أيام الحضور", group: "بيانات العمل", width: 11 },
  { key: "absenceDays", label: "مجموع أيام الغياب", group: "بيانات العمل", width: 15 },
  { key: "unrecordedDays", label: "أيام بلا تسجيل (لم تُخصم)", group: "بيانات العمل", width: 15, defaultVisible: false },
  { key: "notEmployedDays", label: "أيام قبل التعيين (الأساسي والبدلات بنسبة أيام الخدمة)", group: "بيانات العمل", width: 18, defaultVisible: false },
  { key: "overtimeHours", label: "الساعات الإضافية", group: "بيانات العمل", width: 16 },
  { key: "basicSalary", label: "الراتب الأساسي", group: "الاستحقاقات", width: 16, money: true },
  { key: "privileges", label: "امتيازات", group: "الاستحقاقات", width: 13, money: true },
  { key: "overtime", label: "الساعات الإضافية", group: "الاستحقاقات", width: 16, money: true },
  { key: "allowances", label: "البدلات", group: "الاستحقاقات", width: 14, money: true },
  { key: "incentives", label: "الحوافز", group: "الاستحقاقات", width: 13, money: true },
  { key: "otherEarnings", label: "أخرى", group: "الاستحقاقات", width: 12, money: true },
  { key: "totalEarnings", label: "إجمالي الاستحقاقات", group: "الاستحقاقات", width: 18, money: true },
  { key: "absenceDeduction", label: "غياب", group: "الاقتطاعات", width: 13, money: true },
  { key: "unpaidLeaveDeduction", label: "إجازات بدون راتب أو بأجر ناقص", group: "الاقتطاعات", width: 16, money: true },
  { key: "socialInsurance", label: "التأمينات الاجتماعية", group: "الاقتطاعات", width: 18, money: true },
  { key: "fixedDeductions", label: "اقتطاعات", group: "الاقتطاعات", width: 14, money: true },
  { key: "penalties", label: "الجزاءات", group: "الاقتطاعات", width: 14, money: true },
  { key: "allowanceDeductions", label: "بدلات مخصومة", group: "الاقتطاعات", width: 14, money: true },
  { key: "loans", label: "السلف", group: "الاقتطاعات", width: 13, money: true },
  { key: "salaryAdvance", label: "مقدم الراتب", group: "الاقتطاعات", width: 14, money: true },
  { key: "totalDeductions", label: "إجمالي الاقتطاعات", group: "الاقتطاعات", width: 18, money: true },
  { key: "netSalary", label: "الصافي المستحق (عملة النظام)", group: "صافي الراتب", width: 21, money: true },
  { key: "netSalaryCurrency", label: "الصافي المستحق (عملة الراتب الأساسي)", group: "صافي الراتب", width: 24 },
  { key: "payable", label: "مستحق الصرف (عملة النظام)", group: "صافي الراتب", width: 21, money: true },
  { key: "payableCurrency", label: "مستحق الصرف (عملة الراتب الأساسي)", group: "صافي الراتب", width: 24 },
];

const money = (value: number) => Math.round(value * 100) / 100;

const REPORT_EMPLOYEE_COLUMNS = "id, emp_id, name, job_title, work_time, work_schedule, bank_name, bank_branch, bank_account, iban, branch_id, department_id, section_id, attendance_location_id";
// طريقة صرف الراتب (HR-17) إن أُضيف عمودها؛ وإلا يُحمَّل الكشف بدونها ولا يُقسَّم
const loadReportEmployees = async (ids: string[]) => {
  const withMethod = await supabase.from("employees").select(`${REPORT_EMPLOYEE_COLUMNS}, salary_payment_method`).in("id", ids);
  if (withMethod.error && isMissingColumnError(withMethod.error)) return supabase.from("employees").select(REPORT_EMPLOYEE_COLUMNS).in("id", ids);
  return withMethod;
};
export default function HRPayrollFullReport() {
  const { t, direction, locale, formatNumber } = useI18n();
  const navigate = useNavigate();
  const [config] = useState<ReportConfig | null>(() => {
    try { return JSON.parse(sessionStorage.getItem("payroll_full_report") ?? "null") as ReportConfig | null; } catch { return null; }
  });
  const [rows, setRows] = useState<PayrollRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvalSubmitting, setApprovalSubmitting] = useState(false);
  const [approvalOpen, setApprovalOpen] = useState(false);
  const [computation, setComputation] = useState<PayrollComputation | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [reloadKey, setReloadKey] = useState(0);
  const [showColumns, setShowColumns] = useState(false);
  // تقسيم الكشف حسب طريقة صرف الراتب كسمارت (نقدي، مدد، تحويل بنكي، شيك) بمجموع لكل قسم
  const [groupByMethod, setGroupByMethod] = useState(true);
  const [visible, setVisible] = useState<Record<string, boolean>>(() => Object.fromEntries(columns.map((column) => [column.key, column.defaultVisible !== false])));
  const [filterNames, setFilterNames] = useState({ branch: "الكل", department: "الكل", section: "الكل", location: "الكل" });
  // مطابقة الرواتب المحفوظة (طلب الاعتماد) مع الحساب الآن: غياب أو جزاء أُدخل بعد الإرسال
  const [freshness, setFreshness] = useState<PayrollFreshness | null>(null);
  const [freshnessChecking, setFreshnessChecking] = useState(false);
  const [freshnessError, setFreshnessError] = useState("");
  const freshnessSeq = useRef(0);

  useEffect(() => {
    const load = async () => {
      // تحقق جديد لكل تحميل: يُمسح تنبيه التحميل السابق، ونتيجة تحقق أقدم لا تُعرض
      const seq = ++freshnessSeq.current;
      setFreshness(null);
      setFreshnessError("");
      setFreshnessChecking(false);
      if (!config?.period || !config.employeeIds.length) { setLoading(false); return; }
      setLoading(true);
      // الأرقام من الحساب الموحد (نفس كشف الرواتب وحساب الدوام)؛ بيانات البنك والوظيفة من ملف الموظف
      let result: PayrollComputation;
      try {
        result = await computePayroll(config.employeeIds, config.period);
      } catch (error) {
        toast({ title: t("تعذر تحميل كشف الرواتب"), description: t(payrollApprovalErrorText(error)), variant: "destructive" });
        setLoading(false);
        return;
      }
      // «*» للهيكل والمسميات: الاسم الإنجليزي (name_en) يُقرأ إن وُجد العمود، فيُعرض ويُصدَّر في الواجهة الإنجليزية
      const [employeeResult, branchResult, departmentResult, sectionResult, locationResult, jobResult] = await Promise.all([
        loadReportEmployees(config.employeeIds),
        supabase.from("branches").select("*"),
        supabase.from("departments").select("*"),
        supabase.from("org_sections").select("*"),
        supabase.from("hr_work_locations").select("*"),
        supabase.from("hr_jobs").select("*"),
      ]);
      if (employeeResult.error) { toast({ title: t("تعذر تحميل كشف الرواتب"), description: t(payrollApprovalErrorText(employeeResult.error)), variant: "destructive" }); setLoading(false); return; }
      setComputation(result);
      setWarnings([...result.loadErrors.map((error) => `${error} — ${t("الكشف تقديري ولا يمكن إرساله")}`), ...result.warnings]);
      // الاسم بلغة الواجهة: name_en في الإنجليزية إن وُجد، وإلا ترجمة القاموس، وإلا الاسم كما هو
      const localName = (item: Record<string, unknown>) => {
        const arabic = String(item.name ?? "").trim();
        const english = String(item.name_en ?? "").trim();
        return locale === "en" ? english || t(arabic) : arabic;
      };
      const nameMap = (data: any[] | null) => new Map((data ?? []).map((item) => [String(item.id), localName(item)]));
      // اسم عربي ← اسمه بلغة الواجهة (الفلاتر والمسمى الوظيفي محفوظة بالاسم العربي)
      const byName = (data: any[] | null) => new Map((data ?? []).map((item) => [String(item.name ?? "").trim(), localName(item)]));
      const branches = nameMap(branchResult.data); const departments = nameMap(departmentResult.data); const sections = nameMap(sectionResult.data); const locations = nameMap(locationResult.data);
      const departmentNames = byName(departmentResult.data); const sectionNames = byName(sectionResult.data); const locationNames = byName(locationResult.data); const jobNames = byName(jobResult.data);
      const localized = (map: Map<string, string>, value: string) => map.get(value.trim()) || t(value);
      setFilterNames({
        branch: config.filters.branch === "الكل" ? t("الكل") : branches.get(config.filters.branch) || t(config.filters.branch),
        department: config.filters.department === "الكل" ? t("الكل") : localized(departmentNames, config.filters.department),
        section: config.filters.section === "الكل" ? t("الكل") : localized(sectionNames, config.filters.section),
        location: config.filters.location === "الكل" ? t("الكل") : localized(locationNames, config.filters.location),
      });
      const prepared = (employeeResult.data ?? []).filter((employee) => result.lines.has(String(employee.id))).map((employee, index) => {
        const line = result.lines.get(String(employee.id))!;
        const netSalary = line.net;
        return {
          id: String(employee.id), index: index + 1, name: String(employee.name ?? "-"), empId: String(employee.emp_id ?? "-"),
          paymentMethodKey: paymentMethodOf((employee as Record<string, unknown>).salary_payment_method), paymentMethod: t(paymentMethodOf((employee as Record<string, unknown>).salary_payment_method) || UNSPECIFIED_PAYMENT_METHOD),
          bankName: String(employee.bank_name ?? t("لا يوجد")), bankBranch: String(employee.bank_branch ?? t("لا يوجد")), accountName: String(employee.name ?? t("لا يوجد")), accountNumber: String(employee.iban ?? employee.bank_account ?? t("لا يوجد")),
          jobTitle: employee.job_title ? localized(jobNames, String(employee.job_title)) : "-", workTime: employee.work_schedule || employee.work_time ? t(String(employee.work_schedule || employee.work_time)) : t("كامل"),
          workDays: line.workDays, presentDays: line.presentDays, absenceDays: line.absentDays, unrecordedDays: line.unrecordedDays, notEmployedDays: line.notEmployedDays,
          overtimeHours: `${String(Math.floor(line.overtimeHours)).padStart(2, "0")}:${String(Math.round((line.overtimeHours % 1) * 60)).padStart(2, "0")}:00`,
          basicSalary: line.basic, privileges: 0, overtime: line.overtime, allowances: line.allowances, incentives: 0, otherEarnings: 0, totalEarnings: line.grossEarnings,
          absenceDeduction: line.absenceDeduction, unpaidLeaveDeduction: line.unpaidLeaveDeduction, socialInsurance: line.socialInsurance, fixedDeductions: line.fixedDeductions, penalties: line.penalties, allowanceDeductions: line.allowanceDeductions, loans: line.loans, salaryAdvance: 0, totalDeductions: line.totalDeductions,
          netSalary, netSalaryCurrency: `${formatNumber(netSalary, { minimumFractionDigits: 2 })} SAR`, payable: netSalary, payableCurrency: `${formatNumber(netSalary, { minimumFractionDigits: 2 })} SAR`,
          branch: branches.get(String(employee.branch_id ?? "")) ?? "", department: departments.get(String(employee.department_id ?? "")) ?? "", section: sections.get(String(employee.section_id ?? "")) ?? "", location: locations.get(String(employee.attendance_location_id ?? "")) ?? "",
        };
      });
      setRows(prepared);
      setLoading(false);
      // الحساب التقديري (مدخلات تعذر تحميلها) لا يُقارن
      if (result.loadErrors.length || seq !== freshnessSeq.current) return;
      setFreshnessChecking(true);
      try {
        const checked = await savedPayrollFreshness(result);
        if (seq === freshnessSeq.current) setFreshness(checked);
      } catch (error) {
        if (seq === freshnessSeq.current) setFreshnessError(t(freshnessErrorText(error) ?? payrollApprovalErrorText(error)));
      } finally {
        if (seq === freshnessSeq.current) setFreshnessChecking(false);
      }
    };
    void load();
  }, [config, t, locale, reloadKey]);

  const visibleColumns = columns.filter((column) => visible[column.key]);
  const groups = visibleColumns.reduce<Array<{ name: string; count: number }>>((result, column) => { const last = result[result.length - 1]; if (last?.name === column.group) last.count += 1; else result.push({ name: column.group, count: 1 }); return result; }, []);
  const sumOf = (list: PayrollRow[]) => Object.fromEntries(columns.filter((column) => column.money).map((column) => [column.key, list.reduce((sum, row) => sum + Number(row[column.key] ?? 0), 0)]));
  const totals = sumOf(rows);
  // الأقسام بترتيب سمارت؛ بلا طريقة صرف محددة لأحد لا يُقسَّم الكشف
  const grouped = groupByMethod && rows.some((row) => String(row.paymentMethodKey ?? "") !== "");
  // داخل كل قسم بالرقم الوظيفي، والترقيم (المعرف) متسلسل بترتيب العرض بعد التقسيم
  const byEmpId = (a: PayrollRow, b: PayrollRow) => String(a.empId).localeCompare(String(b.empId), "en", { numeric: true });
  let serial = 0;
  const sections = (grouped
    ? [...new Set(rows.map((row) => String(row.paymentMethodKey ?? "")))]
      .sort((a, b) => paymentMethodRank(a) - paymentMethodRank(b))
      .map((key) => {
        const sectionRows = rows.filter((row) => String(row.paymentMethodKey ?? "") === key);
        return { key: key || "unspecified", subtotalLabel: key ? `${t("إجمالي")} ${t(key)}` : t("إجمالي غير المحددة طريقتهم"), rows: sectionRows, totals: sumOf(sectionRows) };
      })
    : [{ key: "all", subtotalLabel: "", rows, totals }])
    .map((section) => ({ ...section, rows: [...section.rows].sort(byEmpId).map((row) => ({ ...row, index: ++serial })) }));
  // أعمدة اسم المجموع: ما قبل أول عمود مالي (إن كان أول عمود ظاهر ماليًا فلا خلية اسم، فلا يُغطّى مبلغه)
  const firstMoneyIndex = visibleColumns.findIndex((column) => column.money);
  const labelSpan = firstMoneyIndex === 0 ? 0 : Math.max(1, firstMoneyIndex);
  // الشهر الميلادي باسمه بلغة الواجهة (ar-SA وحده يعطي الشهر الهجري)
  const monthLabel = config?.period ? new Intl.DateTimeFormat(locale === "ar" ? "ar-SA-u-ca-gregory-nu-latn" : "en-US", { month: "long", timeZone: "UTC" }).format(new Date(`${config.period}-01T00:00:00Z`)) : "-";
  const yearLabel = config?.period?.slice(0, 4) ?? "-";
  const formatCell = (column: PayrollColumn, value: string | number) => column.money ? formatNumber(Number(value), { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : String(value ?? "");

  const openApproval = () => {
    if (!config?.period || rows.length === 0 || !computation) {
      toast({ title: t("لا يوجد موظفون"), description: t("لا توجد بيانات رواتب جاهزة للإرسال"), variant: "destructive" });
      return;
    }
    setApprovalOpen(true);
  };

  const sendPayrollApproval = async (stopped: Set<string>, reason: string) => {
    if (!config?.period || rows.length === 0) return;
    setApprovalSubmitting(true);
    // بعد حذف طلبي السابق: أي فشل لاحق يترك رواتب الشهر بلا طلب، فيُطلب إعادة الإرسال مع تسمية من كانوا فيه
    let preparation: PayrollResendPreparation | null = null;
    try {
      // يُعاد الحساب لحظة الإرسال حتى يدخل أي غياب أو جزاء سُجّل بعد فتح التقرير
      // من لم يبدأ خدمته في الشهر يُمرَّر أيضًا حتى يُصفَّر صفه القديم إن وُجد
      const ids = [...rows.map((row) => String(row.id)), ...[...(computation?.notStarted.keys() ?? [])].filter((id) => !rows.some((row) => String(row.id) === id))];
      const fresh = await computePayroll(ids, config.period);
      if (fresh.loadErrors.length) throw new Error(`PAYROLL_INPUTS_INCOMPLETE: ${fresh.loadErrors.join(" | ")}`);
      const codeOf = (id: string) => fresh.employees.get(id)?.empId.trim() ?? "";
      const stoppedIds = ids.filter((id) => stopped.has(id)).map(codeOf).filter(Boolean);
      const activeIds = ids.filter((id) => !stopped.has(id)).map(codeOf).filter(Boolean);
      // من تعيينه بعد نهاية الشهر: لا سطر له، لكن صفه المفتوح القديم (إن وُجد) يُصفَّر ويدخل الطلب
      const notStartedCodes = ids.map((id) => fresh.notStarted.get(id) ?? "").filter(Boolean);
      // طلبي المعلق المتداخل يُحذف قبل تغيير الأرقام، ولا يُعاد الحساب على موظف في طلب معلق لمستخدم آخر
      preparation = await preparePayrollResend(config.period, [...activeIds, ...stoppedIds, ...notStartedCodes]);
      const saved = await savePayrollRows(fresh, ids, stopped);
      const session = readUserSession();
      const senderName = session?.name?.trim() || t("مسؤول الموارد البشرية");
      const sent = await submitPayrollApprovalRequest({
        period: config.period,
        senderName,
        senderUserId: session?.id ?? "",
        senderEmpId: session?.empId ?? "",
        activeIds: [...activeIds, ...saved.zeroed.filter((code) => !activeIds.includes(code))],
        stoppedIds,
        carriedIds: preparation.carried,
        stopReason: reason,
        previousStopReason: preparation.previousStopReason,
        computedOn: fresh.computedOn,
      });
      setApprovalOpen(false);
      // يُعاد تحميل التقرير بالأرقام التي حُفظت وأُرسلت
      setReloadKey((key) => key + 1);
      toast({
        title: t("تم إرسال طلب الاعتماد"),
        description: `${t("تم إرسال كشف رواتب")} ${formatNumber(sent.active)} ${t("موظف للإدارة")}، ${t("وأُوقف راتب")} ${formatNumber(sent.stopped)} ${t("موظف")}${sent.skipped ? ` — ${formatNumber(sent.skipped)} ${t("معتمد أو مرحّل مسبقًا لم يُعَد إرساله")}` : ""}${sent.carried ? ` — ${formatNumber(sent.carried)} ${t("من طلبك المعلق السابق ضُمّوا للطلب الجديد")}` : ""}`,
      });
    } catch (error) {
      const failureHint = (cause: unknown) => {
        const done = resendPreparationOf(preparation, cause);
        if (!done || done.deleted === 0) return "";
        const list = done.carried.length ? ` ${t("ومعهم من طلبك السابق")}: ${done.carried.slice(0, 15).join("، ")}${done.carried.length > 15 ? " …" : ""}` : "";
        return ` — ${t("حُذف طلبك المعلق السابق؛ أعد الإرسال لإكمال الطلب")}${list}`;
      };
      toast({
        title: t("تعذر إرسال طلب الاعتماد"),
        description: `${t(payrollApprovalErrorText(error))}${failureHint(error)}`,
        variant: "destructive",
      });
    } finally {
      setApprovalSubmitting(false);
    }
  };

  const exportExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Idarat Al Ayaf Management System";
    // بلغة الواجهة واتجاهها: الإنجليزية من اليسار إلى اليمين، والأرقام أرقامًا (أرقام إنجليزية في Excel)
    const rtl = direction === "rtl";
    const readingOrder = rtl ? "rtl" : "ltr";
    const sheet = workbook.addWorksheet(t("كشف الرواتب").slice(0, 31), { views: [{ rightToLeft: rtl, state: "frozen", ySplit: 5 }] });
    sheet.pageSetup = { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 };
    const count = Math.max(1, visibleColumns.length);
    sheet.mergeCells(1, 1, 1, count); sheet.getCell(1, 1).value = t("شركة إدارة العياف للمقاولات");
    sheet.mergeCells(2, 1, 2, count); sheet.getCell(2, 1).value = `${t("كشف الرواتب")} — ${monthLabel} ${yearLabel}`;
    sheet.mergeCells(3, 1, 3, count); sheet.getCell(3, 1).value = `${t("الإدارة")}: ${filterNames.department} | ${t("القسم")}: ${filterNames.section} | ${t("الفرع")}: ${filterNames.branch} | ${t("مكان العمل")}: ${filterNames.location}`;
    [1, 2, 3].forEach((row) => { sheet.getRow(row).alignment = { horizontal: "center", vertical: "middle", readingOrder }; sheet.getRow(row).font = { bold: true, size: row === 1 ? 18 : 12, color: { argb: row === 1 ? "FFFFFFFF" : "FF17324D" } }; });
    sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF075F94" } }; sheet.getRow(1).height = 30;
    let start = 1; groups.forEach((group) => { sheet.mergeCells(4, start, 4, start + group.count - 1); const cell = sheet.getCell(4, start); cell.value = t(group.name); start += group.count; });
    visibleColumns.forEach((column, index) => { const cell = sheet.getCell(5, index + 1); cell.value = t(column.label); sheet.getColumn(index + 1).width = column.width; });
    [4, 5].forEach((rowNumber) => sheet.getRow(rowNumber).eachCell((cell) => { cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowNumber === 4 ? "FF075F94" : "FF0B6FA4" } }; cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 }; cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true, readingOrder }; cell.border = { top: { style: "thin", color: { argb: "FFFFFFFF" } }, left: { style: "thin", color: { argb: "FFFFFFFF" } }, bottom: { style: "thin", color: { argb: "FFFFFFFF" } }, right: { style: "thin", color: { argb: "FFFFFFFF" } } }; }));
    // عمودا «بعملة الراتب الأساسي» نصّان منسّقان في الصفحة؛ في Excel أرقام بصيغة SAR
    const currencyKeys: Record<string, string> = { netSalaryCurrency: "netSalary", payableCurrency: "payable" };
    const addDataRow = (row: PayrollRow) => { const excelRow = sheet.addRow(visibleColumns.map((column) => (currencyKeys[column.key] ? Number(row[currencyKeys[column.key]] ?? 0) : row[column.key]))); excelRow.eachCell((cell, index) => { const column = visibleColumns[index - 1]; cell.alignment = { horizontal: column.money || currencyKeys[column.key] ? "right" : "center", vertical: "middle", wrapText: true, readingOrder }; cell.border = { top: { style: "hair", color: { argb: "FFD8E1E8" } }, left: { style: "hair", color: { argb: "FFD8E1E8" } }, bottom: { style: "hair", color: { argb: "FFD8E1E8" } }, right: { style: "hair", color: { argb: "FFD8E1E8" } } }; if (column.money) cell.numFmt = "#,##0.00"; if (currencyKeys[column.key]) cell.numFmt = '#,##0.00 "SAR"'; }); };
    // كل قسم (طريقة صرف) صفوفه ثم مجموعه، كسمارت؛ اسم المجموع في عمود الاسم (أو أول عمود غير مالي إن أُخفي)
    const labelKey = visibleColumns.some((column) => column.key === "name") ? "name" : visibleColumns.find((column) => !column.money && !currencyKeys[column.key])?.key;
    sections.forEach((section) => {
      section.rows.forEach(addDataRow);
      if (!grouped) return;
      const subtotalRow = sheet.addRow(visibleColumns.map((column) => column.key === labelKey ? section.subtotalLabel : column.money ? section.totals[column.key] : ""));
      subtotalRow.font = { bold: true };
      subtotalRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF4D6" } };
      subtotalRow.eachCell((cell, index) => { cell.alignment = { horizontal: "center", vertical: "middle", readingOrder }; if (visibleColumns[index - 1].money) cell.numFmt = "#,##0.00"; });
    });
    const totalRow = sheet.addRow(visibleColumns.map((column) => column.key === labelKey ? t("الإجماليات") : column.money ? totals[column.key] : ""));
    totalRow.font = { bold: true }; totalRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8F2F8" } }; totalRow.eachCell((cell, index) => { if (visibleColumns[index - 1].money) cell.numFmt = "#,##0.00"; cell.border = { top: { style: "medium", color: { argb: "FF075F94" } } }; });
    // الفرز في Excel يخلط سطور مجاميع الأقسام بالموظفين، فلا فلتر مع التقسيم
    if (!grouped) sheet.autoFilter = { from: { row: 5, column: 1 }, to: { row: 5 + rows.length, column: visibleColumns.length } };
    const output = await workbook.xlsx.writeBuffer();
    const url = URL.createObjectURL(new Blob([output], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = `Payroll_Report_${config?.period ?? ""}.xlsx`; anchor.click(); URL.revokeObjectURL(url);
  };

  if (!config) return <Layout><div className="rounded-xl border bg-white p-10 text-center"><p>{t("لا توجد بيانات تقرير محفوظة")}</p><Button className="mt-4" onClick={() => navigate("/hr/payroll/statement")}>{t("العودة لكشف الرواتب")}</Button></div></Layout>;

  return <Layout><div dir={direction} className="space-y-4 pb-8">
    {/* الطباعة: الجدول كله في عرض الصفحة (لا تمرير ولا قص للأعمدة الأولى)، بخط صغير يلتف داخل الخلايا */}
    <style>{`@media print { body * { visibility: hidden !important; } #payroll-full-report, #payroll-full-report * { visibility: visible !important; } #payroll-full-report { position:absolute; inset:0; width:100%; overflow:visible !important; border:0; box-shadow:none; } #payroll-full-report .payroll-table-wrap { overflow:visible !important; } #payroll-full-report table { width:100% !important; min-width:0 !important; table-layout:fixed; font-size:6.5px; } #payroll-full-report th, #payroll-full-report td { padding:2px 1px !important; max-width:none !important; white-space:normal !important; word-break:break-word; } .payroll-no-print { display:none !important; } @page { size:A3 landscape; margin:6mm; } }`}</style>
    <div className="payroll-no-print flex flex-wrap items-center justify-between gap-3">
      <Button variant="outline" onClick={() => navigate("/hr/payroll/statement")}><ArrowRight className="h-4 w-4" />{t("رجوع")}</Button>
      <div className="flex flex-wrap gap-2"><Button onClick={openApproval} disabled={loading || approvalSubmitting || rows.length === 0} className="bg-emerald-700 text-white hover:bg-emerald-800"><Send className="h-4 w-4" />{approvalSubmitting ? t("جارٍ الإرسال...") : t("إرسال كشف اعتماد الرواتب للإدارة")}</Button><label className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700"><input type="checkbox" checked={groupByMethod} onChange={(event) => setGroupByMethod(event.target.checked)} />{t("تقسيم حسب طريقة الصرف")}</label><Button variant="outline" onClick={() => setShowColumns(true)}><Columns3 className="h-4 w-4" />{t("إظهار/إخفاء الأعمدة")}</Button><Button variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4" />{t("طباعة / PDF")}</Button><Button onClick={() => void exportExcel()} className="bg-[#075f94] hover:bg-[#064f7b]"><Download className="h-4 w-4" />Excel</Button></div>
    </div>
    {(warnings.length > 0 || computation) && <div className="payroll-no-print space-y-1 text-xs">
      {computation && <p className="text-slate-500">{computation.policy.absenceBasis === "basic" ? t("قيمة يوم الغياب = الراتب الأساسي") : t("قيمة يوم الغياب = الراتب الأساسي + البدلات")} ÷ {computation.policy.dayDivisor === "actual" ? t("أيام الشهر الفعلية") : "30"} — {computation.policy.countUnrecordedAsAbsent ? t("أيام العمل بلا تسجيل حضور تُحتسب غيابًا (الراتب المكتسب حسب الحضور)") : t("يُخصم الغياب المسجّل في الحضور فقط")}</p>}
      {warnings.length > 0 && <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800">{warnings.map((warning) => t(warning)).join(" | ")}</p>}
    </div>}
    <PayrollFreshnessNotice mode="sender" checking={freshnessChecking} error={freshnessError} freshness={freshness} onResend={openApproval} resendDisabled={loading || approvalSubmitting || rows.length === 0} />
    <section id="payroll-full-report" className="overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm">
      <header className="border-b-2 border-[#075f94] p-5">
        <h1 className="text-center text-xl font-bold text-slate-900">{t("شركة إدارة العياف للمقاولات")}</h1><h2 className="mt-1 text-center text-lg font-bold text-[#075f94]">{t("كشف الرواتب")}</h2>
        <div className="mt-4 grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-5"><span>{t("شهر")}: <b>{monthLabel}</b></span><span>{t("السنة")}: <b>{yearLabel}</b></span><span>{t("الإدارة")}: <b>{filterNames.department}</b></span><span>{t("القسم")}: <b>{filterNames.section}</b></span><span>{t("الفرع")}: <b>{filterNames.branch}</b></span><span className="lg:col-span-2">{t("مكان العمل")}: <b>{filterNames.location}</b></span><span>{t("عدد الموظفين")}: <b>{formatNumber(rows.length)}</b></span></div>
      </header>
      <div className="payroll-table-wrap overflow-x-auto"><table className="min-w-max border-collapse text-[10px]"><thead><tr className="bg-[#075f94] text-white">{groups.map((group) => <th key={group.name} colSpan={group.count} className="border border-white/30 px-2 py-2 text-center font-bold">{t(group.name)}</th>)}</tr><tr className="bg-[#0b6fa4] text-white">{visibleColumns.map((column) => <th key={column.key} className="max-w-32 whitespace-normal border border-white/30 px-2 py-2 text-center font-semibold">{t(column.label)}</th>)}</tr></thead><tbody>{loading ? <tr><td colSpan={visibleColumns.length} className="py-16 text-center text-slate-400">{t("جاري التحميل...")}</td></tr> : sections.map((section) => <Fragment key={section.key}>{section.rows.map((row) => <tr key={row.id} className="odd:bg-white even:bg-slate-50">{visibleColumns.map((column) => <td key={column.key} className={`border border-slate-200 px-2 py-2 text-center ${column.money && Number(row[column.key]) > 0 ? "font-medium" : ""}`}>{formatCell(column, row[column.key])}</td>)}</tr>)}{grouped && <tr className="bg-amber-50 font-bold">{labelSpan > 0 && <td colSpan={labelSpan} className="border border-slate-300 px-2 py-2 text-center">{section.subtotalLabel}</td>}{visibleColumns.slice(labelSpan).map((column) => <td key={column.key} className="border border-slate-300 px-2 py-2 text-center">{column.money ? formatNumber(Number(section.totals[column.key] ?? 0), { minimumFractionDigits: 2 }) : ""}</td>)}</tr>}</Fragment>)}</tbody>{!loading && rows.length > 0 && <tfoot><tr className="bg-sky-50 font-bold">{labelSpan > 0 && <td colSpan={labelSpan} className="border border-slate-300 px-2 py-3 text-center">{t("الإجماليات")}</td>}{visibleColumns.slice(labelSpan).map((column) => <td key={column.key} className="border border-slate-300 px-2 py-3 text-center">{column.money ? formatNumber(Number(totals[column.key] ?? 0), { minimumFractionDigits: 2 }) : ""}</td>)}</tr></tfoot>}</table></div>
    </section>
    {showColumns && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowColumns(false)}><div className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-xl bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}><div className="flex items-center justify-between border-b p-5"><h2 className="text-xl font-bold">{t("إظهار/إخفاء الأعمدة")}</h2><button onClick={() => setShowColumns(false)}><X className="h-5 w-5" /></button></div><div className="grid gap-3 p-6 sm:grid-cols-2 lg:grid-cols-3">{columns.map((column) => <label key={column.key} className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border p-3 text-sm"><span>{t(column.label)}</span><input type="checkbox" checked={visible[column.key]} onChange={(event) => setVisible((current) => ({ ...current, [column.key]: event.target.checked }))} className="h-5 w-5 accent-[#075f94]" /></label>)}</div><div className="flex justify-end border-t p-4"><Button onClick={() => setShowColumns(false)} className="bg-[#075f94]">{t("تطبيق")}</Button></div></div></div>}
    <PayrollApprovalDialog
      open={approvalOpen}
      period={config.period}
      employees={rows.map((row) => ({ id: String(row.id), empId: String(row.empId), name: String(row.name), department: String(row.section || row.department || ""), absentDays: Number(row.absenceDays ?? 0), net: Number(row.netSalary ?? 0) }))}
      initialStopped={new Set(config.stoppedEmployeeIds ?? [])}
      submitting={approvalSubmitting}
      blockingErrors={computation?.loadErrors ?? []}
      onCancel={() => setApprovalOpen(false)}
      onSubmit={(stopped, reason) => void sendPayrollApproval(stopped, reason)}
    />
  </div></Layout>;
}
