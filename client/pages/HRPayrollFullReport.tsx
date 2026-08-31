import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabaseClient";
import { useI18n } from "@/i18n";
import { ArrowRight, Columns3, Download, Printer, Send, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ExcelJS from "exceljs";
import { toast } from "@/hooks/use-toast";
import { readUserSession } from "@/lib/authSession";

type ReportConfig = {
  period: string;
  employeeIds: string[];
  filters: { branch: string; department: string; section: string; location: string };
};

type PayrollRow = Record<string, string | number> & { id: string };
type PayrollColumn = { key: string; label: string; group: string; width: number; money?: boolean; defaultVisible?: boolean };

const columns: PayrollColumn[] = [
  { key: "index", label: "معرف", group: "بيانات الموظف", width: 8 },
  { key: "name", label: "الاسم", group: "بيانات الموظف", width: 22 },
  { key: "empId", label: "الرقم الوظيفي", group: "بيانات الموظف", width: 14 },
  { key: "bankName", label: "اسم البنك", group: "معلومات عن البنك", width: 18 },
  { key: "bankBranch", label: "اسم الفرع", group: "معلومات عن البنك", width: 16 },
  { key: "accountName", label: "اسم الحساب", group: "معلومات عن البنك", width: 20 },
  { key: "accountNumber", label: "رقم الحساب", group: "معلومات عن البنك", width: 22 },
  { key: "jobTitle", label: "المسمى الوظيفي", group: "بيانات العمل", width: 24 },
  { key: "workTime", label: "وقت العمل", group: "بيانات العمل", width: 14 },
  { key: "absenceDays", label: "مجموع أيام الغياب", group: "بيانات العمل", width: 15 },
  { key: "overtimeHours", label: "الساعات الإضافية", group: "بيانات العمل", width: 16 },
  { key: "basicSalary", label: "الراتب الأساسي", group: "الاستحقاقات", width: 16, money: true },
  { key: "privileges", label: "امتيازات", group: "الاستحقاقات", width: 13, money: true },
  { key: "overtime", label: "الساعات الإضافية", group: "الاستحقاقات", width: 16, money: true },
  { key: "allowances", label: "البدلات", group: "الاستحقاقات", width: 14, money: true },
  { key: "incentives", label: "الحوافز", group: "الاستحقاقات", width: 13, money: true },
  { key: "otherEarnings", label: "أخرى", group: "الاستحقاقات", width: 12, money: true },
  { key: "totalEarnings", label: "إجمالي الاستحقاقات", group: "الاستحقاقات", width: 18, money: true },
  { key: "absenceDeduction", label: "غياب", group: "الاقتطاعات", width: 13, money: true },
  { key: "socialInsurance", label: "التأمينات الاجتماعية", group: "الاقتطاعات", width: 18, money: true },
  { key: "penalties", label: "اقتطاعات", group: "الاقتطاعات", width: 14, money: true },
  { key: "loans", label: "السلف", group: "الاقتطاعات", width: 13, money: true },
  { key: "salaryAdvance", label: "مقدم الراتب", group: "الاقتطاعات", width: 14, money: true },
  { key: "totalDeductions", label: "إجمالي الاقتطاعات", group: "الاقتطاعات", width: 18, money: true },
  { key: "netSalary", label: "الصافي المستحق (عملة النظام)", group: "صافي الراتب", width: 21, money: true },
  { key: "netSalaryCurrency", label: "الصافي المستحق (عملة الراتب الأساسي)", group: "صافي الراتب", width: 24 },
  { key: "payable", label: "مستحق الصرف (عملة النظام)", group: "صافي الراتب", width: 21, money: true },
  { key: "payableCurrency", label: "مستحق الصرف (عملة الراتب الأساسي)", group: "صافي الراتب", width: 24 },
];

const money = (value: number) => Math.round(value * 100) / 100;
const isSaudi = (value: string) => ["سعودي", "سعودية", "saudi", "saudi arabia"].includes(value.trim().toLowerCase());
const workingDays = (period: string) => {
  const [year, month] = period.split("-").map(Number);
  const days = new Date(year, month, 0).getDate();
  return Array.from({ length: days }, (_, index) => new Date(year, month - 1, index + 1).getDay()).filter((day) => day !== 5 && day !== 6).length;
};

export default function HRPayrollFullReport() {
  const { t, direction, formatNumber, formatDate } = useI18n();
  const navigate = useNavigate();
  const [config] = useState<ReportConfig | null>(() => {
    try { return JSON.parse(sessionStorage.getItem("payroll_full_report") ?? "null") as ReportConfig | null; } catch { return null; }
  });
  const [rows, setRows] = useState<PayrollRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvalSubmitting, setApprovalSubmitting] = useState(false);
  const [showColumns, setShowColumns] = useState(false);
  const [visible, setVisible] = useState<Record<string, boolean>>(() => Object.fromEntries(columns.map((column) => [column.key, column.defaultVisible !== false])));
  const [filterNames, setFilterNames] = useState({ branch: "الكل", department: "الكل", section: "الكل", location: "الكل" });

  useEffect(() => {
    const load = async () => {
      if (!config?.period || !config.employeeIds.length) { setLoading(false); return; }
      setLoading(true);
      const [year, month] = config.period.split("-").map(Number);
      const from = `${config.period}-01`;
      const to = `${config.period}-${String(new Date(year, month, 0).getDate()).padStart(2, "0")}`;
      const [employeeResult, attendanceResult, overtimeResult, penaltyResult, advanceResult, branchResult, departmentResult, sectionResult, locationResult] = await Promise.all([
        supabase.from("employees").select("id, emp_id, name, job_title, work_time, nationality, base_salary, total_salary, allowances, bank_name, bank_branch, bank_account, iban, branch_id, department_id, section_id, attendance_location_id").in("id", config.employeeIds),
        supabase.from("attendance").select("emp_id, status").gte("date", from).lte("date", to),
        supabase.from("overtime_records").select("employee_id, hours, amount, status").gte("date", from).lte("date", to),
        supabase.from("penalties").select("employee_id, amount").gte("date", from).lte("date", to),
        supabase.from("hr_advances").select("employee_id, monthly_installment, remaining_amount, status"),
        supabase.from("branches").select("id, name"),
        supabase.from("departments").select("id, name"),
        supabase.from("org_sections").select("id, name"),
        supabase.from("hr_work_locations").select("id, name"),
      ]);
      const firstError = employeeResult.error ?? attendanceResult.error ?? overtimeResult.error ?? penaltyResult.error ?? advanceResult.error;
      if (firstError) { toast({ title: t("تعذر تحميل كشف الرواتب"), description: firstError.message, variant: "destructive" }); setLoading(false); return; }
      const nameMap = (data: any[] | null) => new Map((data ?? []).map((item) => [String(item.id), String(item.name ?? "")]));
      const branches = nameMap(branchResult.data); const departments = nameMap(departmentResult.data); const sections = nameMap(sectionResult.data); const locations = nameMap(locationResult.data);
      setFilterNames({
        branch: config.filters.branch === "الكل" ? t("الكل") : branches.get(config.filters.branch) || config.filters.branch,
        department: config.filters.department === "الكل" ? t("الكل") : config.filters.department,
        section: config.filters.section === "الكل" ? t("الكل") : config.filters.section,
        location: config.filters.location === "الكل" ? t("الكل") : config.filters.location,
      });
      const attendanceByEmployee = new Map<string, number>();
      (attendanceResult.data ?? []).forEach((record) => { if (String(record.status ?? "").includes("غائب")) attendanceByEmployee.set(String(record.emp_id), (attendanceByEmployee.get(String(record.emp_id)) ?? 0) + 1); });
      const overtimeByEmployee = new Map<string, { hours: number; amount: number }>();
      (overtimeResult.data ?? []).forEach((record) => { if (String(record.status ?? "").includes("مرفوض")) return; const id = String(record.employee_id); const current = overtimeByEmployee.get(id) ?? { hours: 0, amount: 0 }; current.hours += Number(record.hours ?? 0); current.amount += Number(record.amount ?? 0); overtimeByEmployee.set(id, current); });
      const penaltiesByEmployee = new Map<string, number>();
      (penaltyResult.data ?? []).forEach((record) => { const id = String(record.employee_id); penaltiesByEmployee.set(id, (penaltiesByEmployee.get(id) ?? 0) + Number(record.amount ?? 0)); });
      const advancesByEmployee = new Map<string, number>();
      (advanceResult.data ?? []).forEach((record) => { if (["مرفوض", "مسدد"].includes(String(record.status ?? ""))) return; const id = String(record.employee_id); advancesByEmployee.set(id, (advancesByEmployee.get(id) ?? 0) + Number(record.monthly_installment ?? 0)); });
      const prepared = (employeeResult.data ?? []).map((employee, index) => {
        const basic = Number(employee.base_salary ?? employee.total_salary ?? 0);
        const allowanceItems = Array.isArray(employee.allowances) ? employee.allowances : [];
        const allowances = allowanceItems.reduce((sum: number, item: any) => sum + Number(item?.amount ?? item?.value ?? 0), 0);
        const absenceDays = attendanceByEmployee.get(String(employee.emp_id)) ?? 0;
        const absenceDeduction = money((basic / 30) * absenceDays);
        const overtime = overtimeByEmployee.get(String(employee.id)) ?? { hours: 0, amount: 0 };
        const socialInsurance = isSaudi(String(employee.nationality ?? "")) ? money(basic * 0.0975) : 0;
        const penalties = money(penaltiesByEmployee.get(String(employee.id)) ?? 0);
        const loans = money(advancesByEmployee.get(String(employee.id)) ?? 0);
        const totalEarnings = money(basic + allowances + overtime.amount);
        const totalDeductions = money(absenceDeduction + socialInsurance + penalties + loans);
        const netSalary = money(Math.max(0, totalEarnings - totalDeductions));
        return {
          id: String(employee.id), index: index + 1, name: String(employee.name ?? "-"), empId: String(employee.emp_id ?? "-"),
          bankName: String(employee.bank_name ?? t("لا يوجد")), bankBranch: String(employee.bank_branch ?? t("لا يوجد")), accountName: String(employee.name ?? t("لا يوجد")), accountNumber: String(employee.iban ?? employee.bank_account ?? t("لا يوجد")),
          jobTitle: String(employee.job_title ?? "-"), workTime: String(employee.work_time ?? t("كامل")), absenceDays, overtimeHours: `${String(Math.floor(overtime.hours)).padStart(2, "0")}:${String(Math.round((overtime.hours % 1) * 60)).padStart(2, "0")}:00`,
          basicSalary: basic, privileges: 0, overtime: money(overtime.amount), allowances: money(allowances), incentives: 0, otherEarnings: 0, totalEarnings,
          absenceDeduction, socialInsurance, penalties, loans, salaryAdvance: 0, totalDeductions, netSalary, netSalaryCurrency: `${formatNumber(netSalary, { minimumFractionDigits: 2 })} SAR`, payable: netSalary, payableCurrency: `${formatNumber(netSalary, { minimumFractionDigits: 2 })} SAR`,
          branch: branches.get(String(employee.branch_id ?? "")) ?? "", department: departments.get(String(employee.department_id ?? "")) ?? "", section: sections.get(String(employee.section_id ?? "")) ?? "", location: locations.get(String(employee.attendance_location_id ?? "")) ?? "",
        };
      });
      setRows(prepared);
      setLoading(false);
    };
    void load();
  }, [config, t]);

  const visibleColumns = columns.filter((column) => visible[column.key]);
  const groups = visibleColumns.reduce<Array<{ name: string; count: number }>>((result, column) => { const last = result[result.length - 1]; if (last?.name === column.group) last.count += 1; else result.push({ name: column.group, count: 1 }); return result; }, []);
  const totals = Object.fromEntries(columns.filter((column) => column.money).map((column) => [column.key, rows.reduce((sum, row) => sum + Number(row[column.key] ?? 0), 0)]));
  const monthLabel = config?.period ? formatDate(`${config.period}-01`, { month: "long" }) : "-";
  const yearLabel = config?.period?.slice(0, 4) ?? "-";
  const formatCell = (column: PayrollColumn, value: string | number) => column.money ? formatNumber(Number(value), { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : String(value ?? "");

  const sendPayrollApproval = async () => {
    if (!config?.period || rows.length === 0) {
      toast({ title: t("لا يوجد موظفون"), description: t("لا توجد بيانات رواتب جاهزة للإرسال"), variant: "destructive" });
      return;
    }

    setApprovalSubmitting(true);
    try {
      const employeeIds = rows.map((row) => String(row.empId));
      const { data: existingPayroll, error: lookupError } = await supabase
        .from("payroll")
        .select("emp_id")
        .eq("month", config.period);
      if (lookupError) throw lookupError;

      const existingIds = new Set((existingPayroll ?? []).map((row) => String(row.emp_id)));
      const missingPayroll = rows
        .filter((row) => !existingIds.has(String(row.empId)))
        .map((row) => ({
          emp_id: String(row.empId),
          emp_name: String(row.name),
          department: String(row.section || row.department || ""),
          month: config.period,
          basic_salary: Number(row.basicSalary ?? 0),
          allowances: money(Number(row.totalEarnings ?? 0) - Number(row.basicSalary ?? 0)),
          social_insurance_deduction: Number(row.socialInsurance ?? 0),
          social_insurance_rate: Number(row.socialInsurance ?? 0) > 0 ? 0.0975 : 0,
          deductions: Number(row.totalDeductions ?? 0),
          net_salary: Number(row.netSalary ?? 0),
          status: "معلق",
          notes: `أيام الغياب ${Number(row.absenceDays ?? 0)} - ساعات إضافية ${String(row.overtimeHours ?? "00:00:00")}`,
        }));

      if (missingPayroll.length > 0) {
        const { error } = await supabase.from("payroll").insert(missingPayroll);
        if (error) throw error;
      }

      const { error: statusError } = await supabase
        .from("payroll")
        .update({ status: "معلق" })
        .eq("month", config.period)
        .in("emp_id", employeeIds);
      if (statusError) throw statusError;

      const session = readUserSession();
      const senderName = session?.name?.trim() || t("مسؤول الموارد البشرية");
      const requestDetails = {
        workflow: "payroll_approval",
        sender_department: "قسم الموارد البشرية",
        sender_name: senderName,
        sender_user_id: session?.id ?? "",
        sender_emp_id: session?.empId ?? "",
        payroll_period: config.period,
        employee_ids: employeeIds,
        active_employee_ids: employeeIds,
        stopped_employee_ids: [],
        employee_count: employeeIds.length,
        active_employee_count: employeeIds.length,
        stopped_employee_count: 0,
      };
      const { data: existingRequest, error: requestLookupError } = await supabase
        .from("hr_requests")
        .select("id")
        .eq("request_type", "اعتماد رواتب الموظفين")
        .contains("details", { workflow: "payroll_approval", payroll_period: config.period })
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (requestLookupError) throw requestLookupError;

      const [year, month] = config.period.split("-").map(Number);
      const requestPayload = {
        emp_id: `PAYROLL-${config.period}`,
        emp_name: `قسم الموارد البشرية — ${senderName}`,
        start_date: `${config.period}-01`,
        end_date: `${config.period}-${String(new Date(year, month, 0).getDate()).padStart(2, "0")}`,
        status: "معلق",
        admin_note: null,
        details: requestDetails,
        updated_at: new Date().toISOString(),
      };

      if (existingRequest) {
        const { error } = await supabase.from("hr_requests").update(requestPayload).eq("id", existingRequest.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("hr_requests").insert({
          ...requestPayload,
          request_type: "اعتماد رواتب الموظفين",
        });
        if (error) throw error;
      }

      toast({
        title: t("تم إرسال طلب الاعتماد"),
        description: `${t("تم إرسال كشف رواتب")} ${formatNumber(employeeIds.length)} ${t("موظف للإدارة")}`,
      });
    } catch (error) {
      toast({
        title: t("تعذر إرسال طلب الاعتماد"),
        description: error instanceof Error ? error.message : t("حدث خطأ غير متوقع"),
        variant: "destructive",
      });
    } finally {
      setApprovalSubmitting(false);
    }
  };

  const exportExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Idarat Al Ayaf Management System";
    const sheet = workbook.addWorksheet(t("كشف الرواتب"), { views: [{ rightToLeft: true, state: "frozen", ySplit: 5 }] });
    sheet.pageSetup = { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 };
    const count = Math.max(1, visibleColumns.length);
    sheet.mergeCells(1, 1, 1, count); sheet.getCell(1, 1).value = t("شركة إدارة العياف للمقاولات");
    sheet.mergeCells(2, 1, 2, count); sheet.getCell(2, 1).value = `${t("كشف الرواتب")} — ${monthLabel} ${yearLabel}`;
    sheet.mergeCells(3, 1, 3, count); sheet.getCell(3, 1).value = `${t("الإدارة")}: ${filterNames.department} | ${t("القسم")}: ${filterNames.section} | ${t("الفرع")}: ${filterNames.branch} | ${t("مكان العمل")}: ${filterNames.location}`;
    [1, 2, 3].forEach((row) => { sheet.getRow(row).alignment = { horizontal: "center", vertical: "middle", readingOrder: "rtl" }; sheet.getRow(row).font = { bold: true, size: row === 1 ? 18 : 12, color: { argb: row === 1 ? "FFFFFFFF" : "FF17324D" } }; });
    sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF075F94" } }; sheet.getRow(1).height = 30;
    let start = 1; groups.forEach((group) => { sheet.mergeCells(4, start, 4, start + group.count - 1); const cell = sheet.getCell(4, start); cell.value = t(group.name); start += group.count; });
    visibleColumns.forEach((column, index) => { const cell = sheet.getCell(5, index + 1); cell.value = t(column.label); sheet.getColumn(index + 1).width = column.width; });
    [4, 5].forEach((rowNumber) => sheet.getRow(rowNumber).eachCell((cell) => { cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowNumber === 4 ? "FF075F94" : "FF0B6FA4" } }; cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 }; cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true, readingOrder: "rtl" }; cell.border = { top: { style: "thin", color: { argb: "FFFFFFFF" } }, left: { style: "thin", color: { argb: "FFFFFFFF" } }, bottom: { style: "thin", color: { argb: "FFFFFFFF" } }, right: { style: "thin", color: { argb: "FFFFFFFF" } } }; }));
    rows.forEach((row) => { const excelRow = sheet.addRow(visibleColumns.map((column) => row[column.key])); excelRow.eachCell((cell, index) => { const column = visibleColumns[index - 1]; cell.alignment = { horizontal: column.money ? "right" : "center", vertical: "middle", wrapText: true, readingOrder: "rtl" }; cell.border = { top: { style: "hair", color: { argb: "FFD8E1E8" } }, left: { style: "hair", color: { argb: "FFD8E1E8" } }, bottom: { style: "hair", color: { argb: "FFD8E1E8" } }, right: { style: "hair", color: { argb: "FFD8E1E8" } } }; if (column.money) cell.numFmt = "#,##0.00"; }); });
    const totalRow = sheet.addRow(visibleColumns.map((column) => column.key === "name" ? t("الإجماليات") : column.money ? totals[column.key] : ""));
    totalRow.font = { bold: true }; totalRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8F2F8" } }; totalRow.eachCell((cell, index) => { if (visibleColumns[index - 1].money) cell.numFmt = "#,##0.00"; cell.border = { top: { style: "medium", color: { argb: "FF075F94" } } }; });
    sheet.autoFilter = { from: { row: 5, column: 1 }, to: { row: 5 + rows.length, column: visibleColumns.length } };
    const output = await workbook.xlsx.writeBuffer();
    const url = URL.createObjectURL(new Blob([output], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = `Payroll_Report_${config?.period ?? ""}.xlsx`; anchor.click(); URL.revokeObjectURL(url);
  };

  if (!config) return <Layout><div className="rounded-xl border bg-white p-10 text-center"><p>{t("لا توجد بيانات تقرير محفوظة")}</p><Button className="mt-4" onClick={() => navigate("/hr/payroll/statement")}>{t("العودة لكشف الرواتب")}</Button></div></Layout>;

  return <Layout><div dir={direction} className="space-y-4 pb-8">
    <style>{`@media print { body * { visibility: hidden !important; } #payroll-full-report, #payroll-full-report * { visibility: visible !important; } #payroll-full-report { position:absolute; inset:0; width:100%; } .payroll-no-print { display:none !important; } @page { size:A3 landscape; margin:6mm; } }`}</style>
    <div className="payroll-no-print flex flex-wrap items-center justify-between gap-3">
      <Button variant="outline" onClick={() => navigate("/hr/payroll/statement")}><ArrowRight className="h-4 w-4" />{t("رجوع")}</Button>
      <div className="flex flex-wrap gap-2"><Button onClick={() => void sendPayrollApproval()} disabled={loading || approvalSubmitting || rows.length === 0} className="bg-emerald-700 text-white hover:bg-emerald-800"><Send className="h-4 w-4" />{approvalSubmitting ? t("جارٍ الإرسال...") : t("إرسال كشف اعتماد الرواتب للإدارة")}</Button><Button variant="outline" onClick={() => setShowColumns(true)}><Columns3 className="h-4 w-4" />{t("إظهار/إخفاء الأعمدة")}</Button><Button variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4" />{t("طباعة / PDF")}</Button><Button onClick={() => void exportExcel()} className="bg-[#075f94] hover:bg-[#064f7b]"><Download className="h-4 w-4" />Excel</Button></div>
    </div>
    <section id="payroll-full-report" className="overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm">
      <header className="border-b-2 border-[#075f94] p-5">
        <h1 className="text-center text-xl font-bold text-slate-900">{t("شركة إدارة العياف للمقاولات")}</h1><h2 className="mt-1 text-center text-lg font-bold text-[#075f94]">{t("كشف الرواتب")}</h2>
        <div className="mt-4 grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-5"><span>{t("شهر")}: <b>{monthLabel}</b></span><span>{t("السنة")}: <b>{yearLabel}</b></span><span>{t("الإدارة")}: <b>{filterNames.department}</b></span><span>{t("القسم")}: <b>{filterNames.section}</b></span><span>{t("الفرع")}: <b>{filterNames.branch}</b></span><span className="lg:col-span-2">{t("مكان العمل")}: <b>{filterNames.location}</b></span><span>{t("عدد الموظفين")}: <b>{formatNumber(rows.length)}</b></span></div>
      </header>
      <div className="overflow-x-auto"><table className="min-w-max border-collapse text-[10px]"><thead><tr className="bg-[#075f94] text-white">{groups.map((group) => <th key={group.name} colSpan={group.count} className="border border-white/30 px-2 py-2 text-center font-bold">{t(group.name)}</th>)}</tr><tr className="bg-[#0b6fa4] text-white">{visibleColumns.map((column) => <th key={column.key} className="max-w-32 whitespace-normal border border-white/30 px-2 py-2 text-center font-semibold">{t(column.label)}</th>)}</tr></thead><tbody>{loading ? <tr><td colSpan={visibleColumns.length} className="py-16 text-center text-slate-400">{t("جاري التحميل...")}</td></tr> : rows.map((row) => <tr key={row.id} className="odd:bg-white even:bg-slate-50">{visibleColumns.map((column) => <td key={column.key} className={`border border-slate-200 px-2 py-2 text-center ${column.money && Number(row[column.key]) > 0 ? "font-medium" : ""}`}>{formatCell(column, row[column.key])}</td>)}</tr>)}</tbody>{!loading && rows.length > 0 && <tfoot><tr className="bg-sky-50 font-bold"><td colSpan={Math.max(1, visibleColumns.findIndex((column) => column.money))} className="border border-slate-300 px-2 py-3 text-center">{t("الإجماليات")}</td>{visibleColumns.slice(Math.max(1, visibleColumns.findIndex((column) => column.money))).map((column) => <td key={column.key} className="border border-slate-300 px-2 py-3 text-center">{column.money ? formatNumber(Number(totals[column.key] ?? 0), { minimumFractionDigits: 2 }) : ""}</td>)}</tr></tfoot>}</table></div>
    </section>
    {showColumns && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowColumns(false)}><div className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-xl bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}><div className="flex items-center justify-between border-b p-5"><h2 className="text-xl font-bold">{t("إظهار/إخفاء الأعمدة")}</h2><button onClick={() => setShowColumns(false)}><X className="h-5 w-5" /></button></div><div className="grid gap-3 p-6 sm:grid-cols-2 lg:grid-cols-3">{columns.map((column) => <label key={column.key} className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border p-3 text-sm"><span>{t(column.label)}</span><input type="checkbox" checked={visible[column.key]} onChange={(event) => setVisible((current) => ({ ...current, [column.key]: event.target.checked }))} className="h-5 w-5 accent-[#075f94]" /></label>)}</div><div className="flex justify-end border-t p-4"><Button onClick={() => setShowColumns(false)} className="bg-[#075f94]">{t("تطبيق")}</Button></div></div></div>}
  </div></Layout>;
}
