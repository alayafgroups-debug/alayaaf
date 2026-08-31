import { useEffect, useMemo, useState } from "react";
import Layout from "@/components/Layout";
import { ArrowRight, Download, Printer, Search, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "@/hooks/use-toast";
import { exportReportExcel, printReport, ReportColumn } from "@/lib/reportExport";
import { useI18n } from "@/i18n";
import { readUserSession } from "@/lib/authSession";

type EmpLite = {
  id: string;
  empId: string;
  name: string;
  jobTitle: string;
  departmentId: string;
  department: string;
  sectionId: string;
  section: string;
  branchId: string;
  branch: string;
  workLocationId: string;
  workLocation: string;
  employeeType: string;
  status: string;
  nationality: string;
  baseSalary: number;
};

type PayrollCalc = {
  workDays: number;
  presentDays: number;
  absentDays: number;
  basic: number;
  allowances: number;
  overtime: number;
  socialInsurance: number;
  deductions: number;
  net: number;
};

// عدد أيام العمل في الشهر باستثناء الجمعة والسبت
function workingDaysInMonth(period: string): number {
  const [year, month] = period.split("-").map(Number);
  const days = new Date(year, month, 0).getDate();
  let count = 0;
  for (let d = 1; d <= days; d++) {
    const weekday = new Date(year, month - 1, d).getDay();
    if (weekday !== 5 && weekday !== 6) count++;
  }
  return count;
}

const monthNames: Record<string, string> = {
  "01": "يناير",
  "02": "فبراير",
  "03": "مارس",
  "04": "أبريل",
  "05": "مايو",
  "06": "يونيو",
  "07": "يوليو",
  "08": "أغسطس",
  "09": "سبتمبر",
  "10": "أكتوبر",
  "11": "نوفمبر",
  "12": "ديسمبر",
};

const SOCIAL_INSURANCE_RATE = 0.0975;
const isSaudiNationality = (nationality: string) => [
  "سعودي", "سعودية", "السعودية", "المملكة العربية السعودية", "saudi", "saudi arabia", "saudi arabian",
].includes(nationality.trim().toLowerCase());
const roundMoney = (value: number) => Math.round(value * 100) / 100;

const current = new Date();
const defaultYear = String(current.getFullYear());
const defaultMonth = String(current.getMonth() + 1).padStart(2, "0");

export default function HRPayrollStatement() {
  const { t, locale, direction, formatNumber, formatDate } = useI18n();
  const [search, setSearch] = useState("");
  const [employees, setEmployees] = useState<EmpLite[]>([]);
  const [organizationBranches, setOrganizationBranches] = useState<{ id: string; name: string }[]>([]);
  const [organizationDepartments, setOrganizationDepartments] = useState<{ id: string; name: string; branchId: string }[]>([]);
  const [organizationSections, setOrganizationSections] = useState<{ id: string; name: string; departmentId: string }[]>([]);
  const [organizationLocations, setOrganizationLocations] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState(false);

  const [yearFilter, setYearFilter] = useState(defaultYear);
  const [monthFilter, setMonthFilter] = useState(defaultMonth);
  const [branchFilter, setBranchFilter] = useState("الكل");
  const [departmentFilter, setDepartmentFilter] = useState("الكل");
  const [locationFilter, setLocationFilter] = useState("الكل");
  const [typeFilter, setTypeFilter] = useState("الكل");
  const [statusFilter, setStatusFilter] = useState("نشط");

  const [pageMode, setPageMode] = useState<"setup" | "report">("setup");
  const [approvalOpen, setApprovalOpen] = useState(false);
  const [approvalStep, setApprovalStep] = useState<1 | 2>(1);
  const [approvalScope, setApprovalScope] = useState<"all" | "partial">("all");
  const [approvalSubmitting, setApprovalSubmitting] = useState(false);

  const [approvalDepartment, setApprovalDepartment] = useState("الكل");
  const [approvalSection, setApprovalSection] = useState("الكل");
  const [approvalBranch, setApprovalBranch] = useState("الكل");
  const [approvalLocation, setApprovalLocation] = useState("الكل");
  const [approvalStopKeyword, setApprovalStopKeyword] = useState("");
  const [stoppedEmployeeIds, setStoppedEmployeeIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [employeeResult, departmentResult, sectionResult, branchResult, locationResult, jobResult] = await Promise.all([
          supabase.from("employees").select("id, emp_id, name, job_title, department_id, section_id, branch_id, attendance_location_id, employment_type, status, nationality, base_salary").order("name"),
          supabase.from("departments").select("id, name, name_en, branch_id").eq("status", "فعال"),
          supabase.from("org_sections").select("id, name, name_en, department_id").eq("status", "فعال"),
          supabase.from("branches").select("id, name, name_en").eq("status", "فعال"),
          supabase.from("hr_work_locations").select("id, name, name_en").eq("status", "فعال"),
          supabase.from("hr_jobs").select("name, name_en").eq("status", "فعال"),
        ]);
        const firstError = employeeResult.error ?? departmentResult.error ?? sectionResult.error ?? branchResult.error ?? locationResult.error ?? jobResult.error;
        if (firstError) {
          toast({ title: t("تعذر تحميل الموظفين"), description: firstError.message });
          return;
        }

        const localizedName = (row: { name?: unknown; name_en?: unknown }) => locale === "en" && String(row.name_en ?? "").trim() ? String(row.name_en) : String(row.name ?? "");
        const departmentOptions = (departmentResult.data ?? []).map((row) => ({ id: String(row.id), name: localizedName(row), branchId: String(row.branch_id ?? "") }));
        const sectionOptions = (sectionResult.data ?? []).map((row) => ({ id: String(row.id), name: localizedName(row), departmentId: String(row.department_id ?? "") }));
        const branchOptions = (branchResult.data ?? []).map((row) => ({ id: String(row.id), name: localizedName(row) }));
        const locationOptions = (locationResult.data ?? []).map((row) => ({ id: String(row.id), name: localizedName(row) }));
        const departmentById = new Map(departmentOptions.map((row) => [row.id, row.name]));
        const sectionById = new Map(sectionOptions.map((row) => [row.id, row.name]));
        const branchById = new Map(branchOptions.map((row) => [row.id, row.name]));
        const locationById = new Map(locationOptions.map((row) => [row.id, row.name]));
        setOrganizationDepartments(departmentOptions);
        setOrganizationSections(sectionOptions);
        setOrganizationBranches(branchOptions);
        setOrganizationLocations(locationOptions);
        const jobByName = new Map((jobResult.data ?? []).map((row) => [String(row.name), localizedName(row)]));
        setEmployees(
          (employeeResult.data ?? []).map((r) => ({
            id: String(r.id ?? ""),
            empId: String(r.emp_id ?? r.id ?? ""),
            name: String(r.name ?? ""),
            jobTitle: jobByName.get(String(r.job_title ?? "")) || t("غير مرتبط"),
            departmentId: String(r.department_id ?? ""),
            department: departmentById.get(String(r.department_id ?? "")) || t("غير مرتبط"),
            sectionId: String(r.section_id ?? ""),
            section: sectionById.get(String(r.section_id ?? "")) || t("غير مرتبط"),
            branchId: String(r.branch_id ?? ""),
            branch: branchById.get(String(r.branch_id ?? "")) || t("غير مرتبط"),
            workLocationId: String(r.attendance_location_id ?? ""),
            workLocation: locationById.get(String(r.attendance_location_id ?? "")) || t("غير مرتبط"),
            employeeType: String(r.employment_type ?? "أساسي"),
            status: String(r.status ?? "نشط"),
            nationality: String(r.nationality ?? ""),
            baseSalary: Number(r.base_salary ?? 0),
          }))
        );
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [locale]);

  const options = useMemo(() => {
    const uniq = (list: string[]) => ["الكل", ...Array.from(new Set(list.filter(Boolean)))];

    return {
      years: Array.from({ length: 6 }, (_, idx) => String(Number(defaultYear) - 2 + idx)),
      months: Object.entries(monthNames).map(([value, label]) => ({ value, label: t(label) })),
      branches: uniq(employees.map((e) => e.branch)),
      departments: uniq(employees.map((e) => e.department)),
      locations: uniq(employees.map((e) => e.workLocation)),
      types: uniq(employees.map((e) => e.employeeType)),
      statuses: ["الكل", "نشط", "موقوف", "غير فعال"],
    };
  }, [employees, t]);

  const period = `${yearFilter}-${monthFilter}`;

  const filtered = useMemo(() => {
    return employees.filter((e) => {
      const keyword = search.trim();

      if (keyword && !e.name.includes(keyword) && !e.department.includes(keyword) && !e.branch.includes(keyword)) {
        return false;
      }

      if (branchFilter !== "الكل" && e.branch !== branchFilter) return false;
      if (departmentFilter !== "الكل" && e.department !== departmentFilter) return false;
      if (locationFilter !== "الكل" && e.workLocation !== locationFilter) return false;
      if (typeFilter !== "الكل" && e.employeeType !== typeFilter) return false;
      if (statusFilter !== "الكل") {
        const isActiveFilter = statusFilter === "نشط";
        const isActiveEmployee = e.status === "نشط" || e.status === "فعال";
        if (isActiveFilter ? !isActiveEmployee : e.status !== statusFilter) return false;
      }

      return true;
    });
  }, [employees, search, branchFilter, departmentFilter, locationFilter, typeFilter, statusFilter]);

  useEffect(() => {
    setSelected(new Set());
  }, [search, branchFilter, departmentFilter, locationFilter, typeFilter, statusFilter]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (filtered.length === 0) return;
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((e) => e.id)));
  };

  const selectedEmployees = useMemo(() => filtered.filter((e) => selected.has(e.id)), [filtered, selected]);

  const [calc, setCalc] = useState<Record<string, PayrollCalc>>({});

  // حساب الراتب فعلياً من الحضور والجزاءات والعمل الإضافي
  const computePayroll = async (targetEmployees: EmpLite[]): Promise<Record<string, PayrollCalc>> => {
    const [year, month] = period.split("-").map(Number);
    const startDate = `${period}-01`;
    const endDate = `${period}-${String(new Date(year, month, 0).getDate()).padStart(2, "0")}`;
    const workDays = workingDaysInMonth(period);

    const empIds = targetEmployees.map((e) => e.empId).filter(Boolean);
    const empUuids = targetEmployees.map((e) => e.id).filter(Boolean);

    const [attRes, penRes, otRes] = await Promise.all([
      supabase.from("attendance").select("emp_id, status, late_minutes, date").gte("date", startDate).lte("date", endDate).in("emp_id", empIds.length ? empIds : ["__none__"]),
      supabase.from("penalties").select("employee_id, amount, date").gte("date", startDate).lte("date", endDate).in("employee_id", empUuids.length ? empUuids : ["__none__"]),
      supabase.from("overtime_records").select("employee_id, amount, date, status").gte("date", startDate).lte("date", endDate).in("employee_id", empUuids.length ? empUuids : ["__none__"]),
    ]);

    const attByEmp: Record<string, { present: number; absent: number }> = {};
    (attRes.data ?? []).forEach((r: any) => {
      const key = String(r.emp_id);
      if (!attByEmp[key]) attByEmp[key] = { present: 0, absent: 0 };
      if (String(r.status).includes("غائب")) attByEmp[key].absent++;
      else attByEmp[key].present++;
    });

    const penByEmp: Record<string, number> = {};
    (penRes.data ?? []).forEach((r: any) => {
      const key = String(r.employee_id);
      penByEmp[key] = (penByEmp[key] ?? 0) + Number(r.amount ?? 0);
    });

    const otByEmp: Record<string, number> = {};
    (otRes.data ?? []).forEach((r: any) => {
      if (String(r.status ?? "").includes("مرفوض")) return;
      const key = String(r.employee_id);
      otByEmp[key] = (otByEmp[key] ?? 0) + Number(r.amount ?? 0);
    });

    const result: Record<string, PayrollCalc> = {};
    targetEmployees.forEach((e) => {
      const att = attByEmp[e.empId] ?? { present: 0, absent: 0 };
      const dailyRate = e.baseSalary / 30;
      const absenceDeduction = att.absent * dailyRate;
      const penalties = penByEmp[e.id] ?? 0;
      const overtime = otByEmp[e.id] ?? 0;
      const otherDeductions = roundMoney(absenceDeduction + penalties);
      const socialInsurance = isSaudiNationality(e.nationality)
        ? roundMoney(e.baseSalary * SOCIAL_INSURANCE_RATE)
        : 0;
      const deductions = roundMoney(otherDeductions + socialInsurance);
      const net = roundMoney(e.baseSalary + overtime - deductions);
      result[e.id] = {
        workDays,
        presentDays: att.present,
        absentDays: att.absent,
        basic: e.baseSalary,
        allowances: 0,
        overtime,
        socialInsurance,
        deductions,
        net,
      };
    });
    return result;
  };

  const createPayrollRecords = async (targetEmployees: EmpLite[]) => {
    const { data: existing } = await supabase
      .from("payroll")
      .select("emp_id")
      .eq("month", period);

    const existingIds = new Set((existing || []).map((r) => String(r.emp_id)));
    const computed = await computePayroll(targetEmployees);

    const payload = targetEmployees
      .filter((e) => !existingIds.has(e.empId))
      .map((e) => {
        const c = computed[e.id];
        return {
          emp_id: e.empId,
          emp_name: e.name,
          department: e.department,
          month: period,
          basic_salary: c.basic,
          allowances: c.allowances + c.overtime,
          social_insurance_deduction: c.socialInsurance,
          social_insurance_rate: c.socialInsurance > 0 ? SOCIAL_INSURANCE_RATE : 0,
          nationality_snapshot: e.nationality,
          deductions: c.deductions,
          net_salary: c.net,
          status: "معلق",
          notes: `أيام العمل ${c.workDays} - حضور ${c.presentDays} - غياب ${c.absentDays}`,
        };
      });

    if (payload.length === 0) {
      toast({ title: t("موجود مسبقاً"), description: t("تم إنشاء مسير هؤلاء الموظفين مسبقاً") });
      return false;
    }

    const { error } = await supabase.from("payroll").insert(payload);
    if (error) {
      toast({ title: t("خطأ"), description: error.message, variant: "destructive" });
      return false;
    }

    toast({ title: t("تم الإنشاء"), description: `${t("تم إنشاء")} ${formatNumber(payload.length)} ${t("سجل رواتب")}` });
    return true;
  };

  const handleGenerate = async () => {
    const ids = Array.from(selected);
    if (ids.length === 0) {
      toast({ title: t("تنبيه"), description: t("اختر موظفاً واحداً على الأقل"), variant: "destructive" });
      return;
    }

    setGenerating(true);
    try {
      const emps = filtered.filter((e) => ids.includes(e.id));
      const done = await createPayrollRecords(emps);
      if (done) setSelected(new Set());
    } catch {
      toast({ title: t("خطأ"), variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const handleFullReport = async () => {
    if (selectedEmployees.length === 0) {
      toast({ title: t("تنبيه"), description: t("اختر الموظفين أولاً لعرض التقرير الكامل"), variant: "destructive" });
      return;
    }
    const computed = await computePayroll(selectedEmployees);
    setCalc(computed);
    setPageMode("report");
  };

  const payrollColumns: ReportColumn[] = [
    { key: "empId", label: t("رقم الموظف"), width: 15 }, { key: "name", label: t("الموظف"), width: 25 },
    { key: "department", label: t("القسم"), width: 20 }, { key: "branch", label: t("الفرع"), width: 18 },
    { key: "workDays", label: t("أيام العمل"), width: 14 }, { key: "basic", label: t("الراتب الأساسي"), width: 16 },
    { key: "allowances", label: t("البدلات"), width: 14 }, { key: "overtime", label: t("الإضافي"), width: 14 },
    { key: "socialInsurance", label: t("التأمينات الاجتماعية 9.75%"), width: 20 },
    { key: "deductions", label: t("إجمالي الاستقطاعات"), width: 18 }, { key: "net", label: t("صافي الراتب"), width: 16 },
  ];
  const payrollRows = selectedEmployees.map((employee) => {
    const computed = calc[employee.id];
    return { empId: employee.empId, name: employee.name, department: employee.section || t("غير متوفر"), branch: employee.branch || t("غير متوفر"), workDays: computed ? `${formatNumber(computed.presentDays)}/${formatNumber(computed.workDays)}` : t("غير متوفر"), basic: formatNumber(computed?.basic ?? employee.baseSalary, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), allowances: formatNumber(computed?.allowances ?? 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), overtime: formatNumber(computed?.overtime ?? 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), socialInsurance: formatNumber(computed?.socialInsurance ?? 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), deductions: formatNumber(computed?.deductions ?? 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), net: formatNumber(computed?.net ?? employee.baseSalary, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) };
  });
  const payrollTotal = selectedEmployees.reduce((total, employee) => total + (calc[employee.id]?.net ?? employee.baseSalary), 0);
  const payrollSubtitle = `${t("كشف الرواتب")} ${formatDate(`${period}-01`, { month: "long", year: "numeric" })}`;
  const printPayroll = () => printReport({ title: t("كشف الرواتب"), subtitle: payrollSubtitle, columns: payrollColumns, rows: payrollRows, fileName: `payroll-${period}`, landscape: true, summary: [{ label: t("عدد الموظفين"), value: formatNumber(payrollRows.length) }, { label: t("إجمالي صافي الرواتب"), value: `${formatNumber(payrollTotal, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${t("ر.س")}` }] });
  const exportPayroll = () => exportReportExcel({ title: t("كشف الرواتب"), subtitle: payrollSubtitle, columns: payrollColumns, rows: payrollRows, fileName: `كشف-الرواتب-${period}`, summary: [{ label: t("إجمالي صافي الرواتب"), value: formatNumber(payrollTotal, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }] });

  const handleOpenApproval = () => {
    setApprovalScope("all");
    setApprovalStep(1);
    setApprovalDepartment("الكل");
    setApprovalSection("الكل");
    setApprovalBranch("الكل");
    setApprovalLocation("الكل");
    setApprovalStopKeyword("");
    setStoppedEmployeeIds(new Set());
    setApprovalOpen(true);
  };

  const getApprovalEmployees = () => {
    if (approvalScope === "all") return selectedEmployees;

    return selectedEmployees.filter((e) => {
      if (approvalDepartment !== "الكل" && e.departmentId !== approvalDepartment) return false;
      if (approvalSection !== "الكل" && e.sectionId !== approvalSection) return false;
      if (approvalBranch !== "الكل" && e.branchId !== approvalBranch) return false;
      if (approvalLocation !== "الكل" && e.workLocationId !== approvalLocation) return false;
      return true;
    });
  };

  const stopSuggestions = useMemo(() => {
    const keyword = approvalStopKeyword.trim();
    if (!keyword) return [];

    return getApprovalEmployees()
      .filter((e) => !stoppedEmployeeIds.has(e.id) && e.name.includes(keyword))
      .slice(0, 6);
  }, [approvalStopKeyword, selectedEmployees, approvalScope, approvalDepartment, approvalSection, approvalBranch, approvalLocation, stoppedEmployeeIds]);

  const addStoppedEmployee = (employee: EmpLite) => {
    setStoppedEmployeeIds((prev) => new Set(prev).add(employee.id));
    setApprovalStopKeyword("");
  };

  const removeStoppedEmployee = (employeeId: string) => {
    setStoppedEmployeeIds((prev) => {
      const next = new Set(prev);
      next.delete(employeeId);
      return next;
    });
  };

  const handleSendApproval = async () => {
    const target = getApprovalEmployees();
    if (target.length === 0) {
      toast({ title: t("لا يوجد موظفون"), description: t("لا يوجد موظفون مطابقون للاختيار الحالي"), variant: "destructive" });
      return;
    }

    setApprovalSubmitting(true);
    try {
      const { data: existing, error: existingError } = await supabase
        .from("payroll")
        .select("emp_id")
        .eq("month", period);
      if (existingError) throw existingError;

      const existingIds = new Set((existing || []).map((row) => String(row.emp_id)));
      const computed = await computePayroll(target);
      const missingPayload = target
        .filter((employee) => !existingIds.has(employee.empId))
        .map((employee) => {
          const c = computed[employee.id];
          return {
            emp_id: employee.empId,
            emp_name: employee.name,
            department: employee.section,
            month: period,
            basic_salary: c.basic,
            allowances: c.allowances + c.overtime,
            social_insurance_deduction: c.socialInsurance,
            social_insurance_rate: c.socialInsurance > 0 ? SOCIAL_INSURANCE_RATE : 0,
            nationality_snapshot: employee.nationality,
            deductions: c.deductions,
            net_salary: c.net,
            status: stoppedEmployeeIds.has(employee.id) ? "موقوف" : "معلق",
            notes: `أيام العمل ${c.workDays} - حضور ${c.presentDays} - غياب ${c.absentDays}`,
          };
        });

      if (missingPayload.length > 0) {
        const { error } = await supabase.from("payroll").insert(missingPayload);
        if (error) throw error;
      }

      const stoppedIds = target.filter((employee) => stoppedEmployeeIds.has(employee.id)).map((employee) => employee.empId);
      const activeIds = target.filter((employee) => !stoppedEmployeeIds.has(employee.id)).map((employee) => employee.empId);

      if (stoppedIds.length > 0) {
        const { error } = await supabase.from("payroll").update({ status: "موقوف" }).eq("month", period).in("emp_id", stoppedIds);
        if (error) throw error;
      }

      if (activeIds.length > 0) {
        const { error } = await supabase.from("payroll").update({ status: "معلق" }).eq("month", period).in("emp_id", activeIds);
        if (error) throw error;
      }

      const session = readUserSession();
      const senderName = session?.name?.trim() || t("مسؤول الموارد البشرية");
      const requestDetails = {
        workflow: "payroll_approval",
        sender_department: "قسم الموارد البشرية",
        sender_name: senderName,
        sender_user_id: session?.id ?? "",
        sender_emp_id: session?.empId ?? "",
        payroll_period: period,
        employee_ids: target.map((employee) => employee.empId),
        active_employee_ids: activeIds,
        stopped_employee_ids: stoppedIds,
        employee_count: target.length,
        active_employee_count: activeIds.length,
        stopped_employee_count: stoppedIds.length,
      };
      const { data: existingRequest, error: requestLookupError } = await supabase
        .from("hr_requests")
        .select("id")
        .eq("request_type", "اعتماد رواتب الموظفين")
        .contains("details", { workflow: "payroll_approval", payroll_period: period })
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (requestLookupError) throw requestLookupError;

      if (existingRequest) {
        const { error: requestError } = await supabase
          .from("hr_requests")
          .update({
            emp_id: `PAYROLL-${period}`,
            emp_name: `قسم الموارد البشرية — ${senderName}`,
            start_date: `${period}-01`,
            end_date: `${period}-${String(new Date(Number(period.slice(0, 4)), Number(period.slice(5, 7)), 0).getDate()).padStart(2, "0")}`,
            status: "معلق",
            admin_note: null,
            details: requestDetails,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingRequest.id);
        if (requestError) throw requestError;
      } else {
        const { error: requestError } = await supabase.from("hr_requests").insert({
          emp_id: `PAYROLL-${period}`,
          emp_name: `قسم الموارد البشرية — ${senderName}`,
          request_type: "اعتماد رواتب الموظفين",
          start_date: `${period}-01`,
          end_date: `${period}-${String(new Date(Number(period.slice(0, 4)), Number(period.slice(5, 7)), 0).getDate()).padStart(2, "0")}`,
          status: "معلق",
          details: requestDetails,
        });
        if (requestError) throw requestError;
      }

      toast({
        title: t("تم إرسال طلب الاعتماد"),
        description: `${t("تم تجهيز")} ${formatNumber(activeIds.length)} ${t("موظف")} ${t("وإيقاف راتب")} ${formatNumber(stoppedIds.length)} ${t("موظف")}`,
      });
      setApprovalOpen(false);
      setSelected(new Set());
      setPageMode("setup");
    } catch (error) {
      toast({ title: t("تعذر تطبيق كشف الرواتب"), description: error instanceof Error ? error.message : t("حدث خطأ غير متوقع"), variant: "destructive" });
    } finally {
      setApprovalSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="p-6 max-w-[1600px] mx-auto space-y-6" dir={direction}>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-800">{t("حساب الراتب")}</h2>
          </div>

          <div className="p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FilterSelect t={t} label="السنة" value={yearFilter} onChange={setYearFilter} options={options.years} />
              <FilterSelect t={t} label="شهر" value={monthFilter} onChange={setMonthFilter} options={options.months.map((m) => ({ value: m.value, label: m.label }))} />
              <FilterSelect t={t} label="الفئة" value={typeFilter} onChange={setTypeFilter} options={options.types} />

              <FilterSelect t={t} label="مكان العمل" value={locationFilter} onChange={setLocationFilter} options={options.locations} />
              <FilterSelect t={t} label="الإدارة" value={departmentFilter} onChange={setDepartmentFilter} options={options.departments} />
              <FilterSelect t={t} label="القسم/الفرع" value={branchFilter} onChange={setBranchFilter} options={options.branches} />

              <FilterSelect t={t} label="إيقاف/تفعيل الموظفين" value={statusFilter} onChange={setStatusFilter} options={options.statuses} />
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">{t("نوع الموظفين")}</label>
                <div className="h-10 border border-gray-300 rounded-md px-3 flex items-center bg-gray-50 text-sm text-gray-700">
                  {t(typeFilter)}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">{t("بحث الموظفين")}</label>
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder={t("بحث بالاسم / القسم / الفرع")}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-3 pr-9 h-10"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
              <Button variant="outline" onClick={handleFullReport}>{t("تقرير كامل")}</Button>
              <Button onClick={handleGenerate} disabled={generating || selected.size === 0} className="bg-[#004e89] hover:bg-[#003d6d] text-white">
                {generating ? t("جاري المعالجة...") : t("اختيار الموظفين (تفصيلي)")}
              </Button>
            </div>
          </div>
        </div>

        {pageMode === "setup" ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center gap-4">
              <h2 className="text-lg font-bold text-gray-800">{t("الموظفون")} ({formatNumber(filtered.length)})</h2>
              <div className="text-sm text-gray-600">{t("فترة المسير")}: {period}</div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-right">
                <thead className="bg-[#004e89] text-white">
                  <tr>
                    <th className="py-3 px-4 w-12 text-center">
                      <Checkbox
                        checked={selected.size === filtered.length && filtered.length > 0}
                        onCheckedChange={selectAll}
                        className="border-white/50 data-[state=checked]:bg-white data-[state=checked]:text-[#004e89]"
                      />
                    </th>
                    <th className="py-3 px-4 font-medium">{t("الصورة")}</th>
                    <th className="py-3 px-4 font-medium">{t("الاسم")}</th>
                    <th className="py-3 px-4 font-medium">{t("المسمى الوظيفي")}</th>
                    <th className="py-3 px-4 font-medium">{t("الإدارة")}</th>
                    <th className="py-3 px-4 font-medium">{t("القسم/الفرع")}</th>
                    <th className="py-3 px-4 font-medium">{t("مكان العمل")}</th>
                    <th className="py-3 px-4 font-medium">{t("نوع الموظف")}</th>
                    <th className="py-3 px-4 font-medium">{t("الحالة")}</th>
                    <th className="py-3 px-4 font-medium">{t("الراتب الأساسي")}</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr><td colSpan={10} className="py-8 text-center text-gray-400">{t("جاري التحميل...")}</td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={10} className="py-8 text-center text-gray-500">{t("لا يوجد موظفون مطابقون للفلاتر")}</td></tr>
                  ) : (
                    filtered.map((emp) => (
                      <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4 text-center">
                          <Checkbox checked={selected.has(emp.id)} onCheckedChange={() => toggleSelect(emp.id)} />
                        </td>
                        <td className="py-3 px-4">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-[#004e89] text-white text-xs">{emp.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                        </td>
                        <td className="py-3 px-4 font-medium text-gray-900">{emp.name}</td>
                        <td className="py-3 px-4">{emp.jobTitle || t("غير متوفر")}</td>
                        <td className="py-3 px-4">{emp.department || t("غير متوفر")}</td>
                        <td className="py-3 px-4">{emp.branch || t("غير متوفر")}</td>
                        <td className="py-3 px-4">{emp.workLocation || t("غير متوفر")}</td>
                        <td className="py-3 px-4">{emp.employeeType || t("غير متوفر")}</td>
                        <td className="py-3 px-4">{emp.status ? t(emp.status) : t("غير متوفر")}</td>
                        <td className="py-3 px-4 font-semibold text-emerald-700">{formatNumber(emp.baseSalary, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {t("ر.س")}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center gap-4">
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => setPageMode("setup")}>
                  <><ArrowRight className="h-4 w-4" /> {t("رجوع")}</>
                </Button>
                <h2 className="text-lg font-bold text-gray-800">{t("النتائج (تقرير شامل)")}</h2>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" onClick={printPayroll} disabled={payrollRows.length === 0}><><Printer className="h-4 w-4" /> {t("طباعة / PDF")}</></Button>
                <Button variant="outline" onClick={exportPayroll} disabled={payrollRows.length === 0}><><Download className="h-4 w-4" /> {t("Excel")}</></Button>
                <Button onClick={handleOpenApproval} className="bg-[#004e89] hover:bg-[#003d6d] text-white">
                  <><Send className="h-4 w-4" /> {t("إرسال طلب اعتماد رواتب الموظفين")}</>
                </Button>
              </div>
            </div>

            <div className="p-4 border-b border-gray-100 text-sm text-gray-700">
              {t("الشهر")}: {t(monthNames[monthFilter])} | {t("السنة")}: {yearFilter} | {t("عدد الموظفين المختارين")}: {formatNumber(selectedEmployees.length)}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right min-w-[1300px]">
                <thead className="bg-[#0a5a92] text-white">
                  <tr>
                    <th className="py-2 px-2">#</th>
                    <th className="py-2 px-2">{t("الموظف")}</th>
                    <th className="py-2 px-2">{t("القسم")}</th>
                    <th className="py-2 px-2">{t("الفرع")}</th>
                    <th className="py-2 px-2">{t("أيام العمل")}</th>
                    <th className="py-2 px-2">{t("الراتب الأساسي")}</th>
                    <th className="py-2 px-2">{t("البدلات")}</th>
                    <th className="py-2 px-2">{t("إضافي")}</th>
                    <th className="py-2 px-2">{t("عمولات")}</th>
                    <th className="py-2 px-2">{t("التأمينات الاجتماعية 9.75%")}</th>
                    <th className="py-2 px-2">{t("إجمالي الاستقطاعات")}</th>
                    <th className="py-2 px-2">{t("صافي الراتب")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {selectedEmployees.map((emp, idx) => {
                    const c = calc[emp.id];
                    return (
                    <tr key={emp.id} className="hover:bg-gray-50">
                      <td className="py-2 px-2">{formatNumber(idx + 1)}</td>
                      <td className="py-2 px-2 font-medium">{emp.name}</td>
                      <td className="py-2 px-2">{emp.section || t("غير متوفر")}</td>
                      <td className="py-2 px-2">{emp.branch || t("غير متوفر")}</td>
                      <td className="py-2 px-2">{c ? `${formatNumber(c.presentDays)}/${formatNumber(c.workDays)}` : t("غير متوفر")}</td>
                      <td className="py-2 px-2">{formatNumber(c?.basic ?? emp.baseSalary, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="py-2 px-2">{formatNumber(c?.allowances ?? 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="py-2 px-2">{formatNumber(c?.overtime ?? 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="py-2 px-2">{formatNumber(0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="py-2 px-2 text-orange-600">{formatNumber(c?.socialInsurance ?? 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="py-2 px-2 text-red-600">{formatNumber(c?.deductions ?? 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="py-2 px-2 font-semibold text-emerald-700">{formatNumber(c?.net ?? emp.baseSalary, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {approvalOpen && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" dir={direction}>
            <div className="w-full max-w-3xl bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <button onClick={() => setApprovalOpen(false)} className="text-gray-500 hover:text-gray-800">
                  <X className="h-5 w-5" />
                </button>
                <h3 className="text-2xl font-bold text-gray-800">{t("إرسال طلب اعتماد رواتب الموظفين")}</h3>
              </div>

              <div className="p-5 space-y-4">
                <div className="space-y-2">
                  <label className="text-2xl font-semibold text-gray-800">{t("كشف الرواتب")}</label>
                  <select
                    value={approvalScope}
                    onChange={(e) => setApprovalScope(e.target.value as "all" | "partial")}
                    className="w-full h-12 border border-gray-300 rounded-md px-3 text-lg"
                  >
                    <option value="all">{t("لجميع الموظفين")}</option>
                    <option value="partial">{t("لجزء من الموظفين")}</option>
                  </select>
                </div>

                {approvalStep === 2 && approvalScope === "partial" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                    <div className="space-y-2">
                      <label className="text-lg font-semibold text-gray-700">{t("اختر الفرع")}</label>
                      <select value={approvalBranch} onChange={(e) => { setApprovalBranch(e.target.value); setApprovalDepartment("الكل"); setApprovalSection("الكل"); }} className="w-full h-12 border border-gray-300 rounded-md px-3">
                        <option value="الكل">{t("الكل")}</option>
                        {organizationBranches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-lg font-semibold text-gray-700">{t("اختر الإدارة")}</label>
                      <select value={approvalDepartment} onChange={(e) => { setApprovalDepartment(e.target.value); setApprovalSection("الكل"); }} className="w-full h-12 border border-gray-300 rounded-md px-3">
                        <option value="الكل">{t("الكل")}</option>
                        {organizationDepartments.filter((department) => approvalBranch === "الكل" || department.branchId === approvalBranch).map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-lg font-semibold text-gray-700">{t("اختر القسم")}</label>
                      <select value={approvalSection} onChange={(e) => setApprovalSection(e.target.value)} className="w-full h-12 border border-gray-300 rounded-md px-3">
                        <option value="الكل">{t("الكل")}</option>
                        {organizationSections.filter((section) => approvalDepartment === "الكل" || section.departmentId === approvalDepartment).map((section) => <option key={section.id} value={section.id}>{section.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-lg font-semibold text-gray-700">{t("اختر موقع العمل")}</label>
                      <select value={approvalLocation} onChange={(e) => setApprovalLocation(e.target.value)} className="w-full h-12 border border-gray-300 rounded-md px-3">
                        <option value="الكل">{t("الكل")}</option>
                        {organizationLocations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-lg font-semibold text-gray-700">{t("إيقاف رواتب الموظفين")}</label>
                      <div className="relative">
                        <Input
                          value={approvalStopKeyword}
                          onChange={(e) => setApprovalStopKeyword(e.target.value)}
                          placeholder={t("ابدأ بكتابة اسم الموظف")}
                          className="h-12"
                        />
                        {stopSuggestions.length > 0 && (
                          <div className="absolute z-20 top-full mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg overflow-hidden">
                            {stopSuggestions.map((employee) => (
                              <button
                                key={employee.id}
                                type="button"
                                onClick={() => addStoppedEmployee(employee)}
                                className="w-full px-4 py-3 text-right hover:bg-gray-50 border-b border-gray-100 last:border-0"
                              >
                                <span className="block font-medium text-gray-900">{employee.name}</span>
                                <span className="block text-xs text-gray-500">{employee.department || employee.jobTitle || t("موظف")}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      {stoppedEmployeeIds.size > 0 && (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {getApprovalEmployees()
                            .filter((employee) => stoppedEmployeeIds.has(employee.id))
                            .map((employee) => (
                              <div key={employee.id} className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1.5 text-sm text-red-700 border border-red-200">
                                <span>{employee.name}</span>
                                <button type="button" onClick={() => removeStoppedEmployee(employee.id)} aria-label={`${t("إلغاء إيقاف راتب")} ${employee.name}`}>
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ))}
                        </div>
                      )}
                      <p className="text-xs text-gray-500">{t("سيتم حفظ حالة «موقوف» فعلياً في كشف رواتب الفترة المحددة عند الإرسال.")}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="px-5 py-4 border-t border-gray-100 flex justify-start gap-3">
                {approvalScope === "partial" && approvalStep === 1 ? (
                  <Button onClick={() => setApprovalStep(2)} className="bg-[#004e89] hover:bg-[#003d6d] text-white">{t("التالي")}</Button>
                ) : (
                  <Button onClick={handleSendApproval} disabled={approvalSubmitting} className="bg-[#004e89] hover:bg-[#003d6d] text-white">
                    {approvalSubmitting ? t("جاري الإرسال...") : t("إرسال")}
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

function FilterSelect({
  t,
  label,
  value,
  onChange,
  options,
}: {
  t: (value: string) => string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[] | Array<{ value: string; label: string }>;
}) {
  const normalized = options.map((op) =>
    typeof op === "string" ? { value: op, label: t(op) } : op
  );

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700">{t(label)}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-10 border border-gray-300 rounded-md px-3 bg-white text-sm focus:ring-2 focus:ring-[#004e89] outline-none"
      >
        {normalized.map((op) => (
          <option key={op.value} value={op.value}>{op.label}</option>
        ))}
      </select>
    </div>
  );
}
