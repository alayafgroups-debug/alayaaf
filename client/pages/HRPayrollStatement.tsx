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

type EmpLite = {
  id: string;
  empId: string;
  name: string;
  jobTitle: string;
  department: string;
  branch: string;
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
  const [search, setSearch] = useState("");
  const [employees, setEmployees] = useState<EmpLite[]>([]);
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
  const [approvalBranch, setApprovalBranch] = useState("الكل");
  const [approvalLocation, setApprovalLocation] = useState("الكل");
  const [approvalStopKeyword, setApprovalStopKeyword] = useState("");
  const [stoppedEmployeeIds, setStoppedEmployeeIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("employees")
          .select("id, emp_id, name, job_title, department, branch, work_location, employment_type, status, nationality, base_salary")
        .order("name");

        if (error) {
          toast({ title: "تعذر تحميل الموظفين", description: error.message });
          return;
        }

        if (data) {
          setEmployees(
            data.map((r) => ({
              id: String(r.id ?? ""),
              empId: String(r.emp_id ?? r.id ?? ""),
              name: String(r.name ?? ""),
              jobTitle: String(r.job_title ?? ""),
              department: String(r.department ?? ""),
              branch: String(r.branch ?? ""),
              workLocation: String(r.work_location ?? r.branch ?? ""),
              employeeType: String(r.employment_type ?? "أساسي"),
              status: String(r.status ?? "نشط"),
              nationality: String(r.nationality ?? ""),
              baseSalary: Number(r.base_salary ?? 0),
            }))
          );
        }
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const options = useMemo(() => {
    const uniq = (list: string[]) => ["الكل", ...Array.from(new Set(list.filter(Boolean)))];

    return {
      years: Array.from({ length: 6 }, (_, idx) => String(Number(defaultYear) - 2 + idx)),
      months: Object.entries(monthNames).map(([value, label]) => ({ value, label })),
      branches: uniq(employees.map((e) => e.branch)),
      departments: uniq(employees.map((e) => e.department)),
      locations: uniq(employees.map((e) => e.workLocation)),
      types: uniq(employees.map((e) => e.employeeType)),
      statuses: ["الكل", "نشط", "موقوف", "غير فعال"],
    };
  }, [employees]);

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
      toast({ title: "موجود مسبقاً", description: "تم إنشاء مسير هؤلاء الموظفين مسبقاً" });
      return false;
    }

    const { error } = await supabase.from("payroll").insert(payload);
    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
      return false;
    }

    toast({ title: "تم الإنشاء", description: `تم إنشاء ${payload.length} سجل رواتب` });
    return true;
  };

  const handleGenerate = async () => {
    const ids = Array.from(selected);
    if (ids.length === 0) {
      toast({ title: "تنبيه", description: "اختر موظفاً واحداً على الأقل", variant: "destructive" });
      return;
    }

    setGenerating(true);
    try {
      const emps = filtered.filter((e) => ids.includes(e.id));
      const done = await createPayrollRecords(emps);
      if (done) setSelected(new Set());
    } catch {
      toast({ title: "خطأ", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const handleFullReport = async () => {
    if (selectedEmployees.length === 0) {
      toast({ title: "تنبيه", description: "اختر الموظفين أولاً لعرض التقرير الكامل", variant: "destructive" });
      return;
    }
    const computed = await computePayroll(selectedEmployees);
    setCalc(computed);
    setPageMode("report");
  };

  const payrollColumns: ReportColumn[] = [
    { key: "empId", label: "رقم الموظف", width: 15 }, { key: "name", label: "الموظف", width: 25 },
    { key: "department", label: "القسم", width: 20 }, { key: "branch", label: "الفرع", width: 18 },
    { key: "workDays", label: "أيام العمل", width: 14 }, { key: "basic", label: "الراتب الأساسي", width: 16 },
    { key: "allowances", label: "البدلات", width: 14 }, { key: "overtime", label: "الإضافي", width: 14 },
    { key: "socialInsurance", label: "التأمينات الاجتماعية 9.75%", width: 20 },
    { key: "deductions", label: "إجمالي الاستقطاعات", width: 18 }, { key: "net", label: "صافي الراتب", width: 16 },
  ];
  const payrollRows = selectedEmployees.map((employee) => {
    const computed = calc[employee.id];
    return { empId: employee.empId, name: employee.name, department: employee.department || "-", branch: employee.branch || "-", workDays: computed ? `${computed.presentDays}/${computed.workDays}` : "-", basic: (computed?.basic ?? employee.baseSalary).toFixed(2), allowances: (computed?.allowances ?? 0).toFixed(2), overtime: (computed?.overtime ?? 0).toFixed(2), socialInsurance: (computed?.socialInsurance ?? 0).toFixed(2), deductions: (computed?.deductions ?? 0).toFixed(2), net: (computed?.net ?? employee.baseSalary).toFixed(2) };
  });
  const payrollTotal = selectedEmployees.reduce((total, employee) => total + (calc[employee.id]?.net ?? employee.baseSalary), 0);
  const payrollSubtitle = `كشف رواتب ${monthNames[monthFilter]} ${yearFilter}`;
  const printPayroll = () => printReport({ title: "كشف الرواتب", subtitle: payrollSubtitle, columns: payrollColumns, rows: payrollRows, fileName: `payroll-${period}`, landscape: true, summary: [{ label: "عدد الموظفين", value: payrollRows.length }, { label: "إجمالي صافي الرواتب", value: `${payrollTotal.toFixed(2)} ر.س` }] });
  const exportPayroll = () => exportReportExcel({ title: "كشف الرواتب", subtitle: payrollSubtitle, columns: payrollColumns, rows: payrollRows, fileName: `كشف-الرواتب-${period}`, summary: [{ label: "إجمالي صافي الرواتب", value: payrollTotal.toFixed(2) }] });

  const handleOpenApproval = () => {
    setApprovalScope("all");
    setApprovalStep(1);
    setApprovalDepartment("الكل");
    setApprovalBranch("الكل");
    setApprovalLocation("الكل");
    setApprovalStopKeyword("");
    setStoppedEmployeeIds(new Set());
    setApprovalOpen(true);
  };

  const getApprovalEmployees = () => {
    if (approvalScope === "all") return selectedEmployees;

    return selectedEmployees.filter((e) => {
      if (approvalDepartment !== "الكل" && e.department !== approvalDepartment) return false;
      if (approvalBranch !== "الكل" && e.branch !== approvalBranch) return false;
      if (approvalLocation !== "الكل" && e.workLocation !== approvalLocation) return false;
      return true;
    });
  };

  const stopSuggestions = useMemo(() => {
    const keyword = approvalStopKeyword.trim();
    if (!keyword) return [];

    return getApprovalEmployees()
      .filter((e) => !stoppedEmployeeIds.has(e.id) && e.name.includes(keyword))
      .slice(0, 6);
  }, [approvalStopKeyword, selectedEmployees, approvalScope, approvalDepartment, approvalBranch, approvalLocation, stoppedEmployeeIds]);

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
      toast({ title: "لا يوجد موظفون", description: "لا يوجد موظفون مطابقون للاختيار الحالي", variant: "destructive" });
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
            department: employee.department,
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

      toast({
        title: "تم إرسال طلب الاعتماد",
        description: `تم تجهيز ${activeIds.length} موظف وإيقاف راتب ${stoppedIds.length} موظف`,
      });
      setApprovalOpen(false);
      setSelected(new Set());
      setPageMode("setup");
    } catch (error) {
      toast({ title: "تعذر تطبيق كشف الرواتب", description: error instanceof Error ? error.message : "حدث خطأ غير متوقع", variant: "destructive" });
    } finally {
      setApprovalSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="p-6 max-w-[1600px] mx-auto space-y-6" dir="rtl">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-800">حساب الراتب</h2>
          </div>

          <div className="p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FilterSelect label="السنة" value={yearFilter} onChange={setYearFilter} options={options.years} />
              <FilterSelect label="شهر" value={monthFilter} onChange={setMonthFilter} options={options.months.map((m) => ({ value: m.value, label: m.label }))} />
              <FilterSelect label="الفئة" value={typeFilter} onChange={setTypeFilter} options={options.types} />

              <FilterSelect label="مكان العمل" value={locationFilter} onChange={setLocationFilter} options={options.locations} />
              <FilterSelect label="الإدارة" value={departmentFilter} onChange={setDepartmentFilter} options={options.departments} />
              <FilterSelect label="القسم/الفرع" value={branchFilter} onChange={setBranchFilter} options={options.branches} />

              <FilterSelect label="إيقاف/تفعيل الموظفين" value={statusFilter} onChange={setStatusFilter} options={options.statuses} />
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">نوع الموظفين</label>
                <div className="h-10 border border-gray-300 rounded-md px-3 flex items-center bg-gray-50 text-sm text-gray-700">
                  {typeFilter}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">بحث الموظفين</label>
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="بحث بالاسم / القسم / الفرع"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-3 pr-9 h-10"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
              <Button variant="outline" onClick={handleFullReport}>تقرير كامل</Button>
              <Button onClick={handleGenerate} disabled={generating || selected.size === 0} className="bg-[#004e89] hover:bg-[#003d6d] text-white">
                {generating ? "جاري المعالجة..." : "اختيار الموظفين (تفصيلي)"}
              </Button>
            </div>
          </div>
        </div>

        {pageMode === "setup" ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center gap-4">
              <h2 className="text-lg font-bold text-gray-800">الموظفون ({filtered.length})</h2>
              <div className="text-sm text-gray-600">فترة المسير: {period}</div>
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
                    <th className="py-3 px-4 font-medium">الصورة</th>
                    <th className="py-3 px-4 font-medium">الاسم</th>
                    <th className="py-3 px-4 font-medium">المسمى الوظيفي</th>
                    <th className="py-3 px-4 font-medium">الإدارة</th>
                    <th className="py-3 px-4 font-medium">القسم/الفرع</th>
                    <th className="py-3 px-4 font-medium">مكان العمل</th>
                    <th className="py-3 px-4 font-medium">نوع الموظف</th>
                    <th className="py-3 px-4 font-medium">الحالة</th>
                    <th className="py-3 px-4 font-medium">الراتب الأساسي</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr><td colSpan={10} className="py-8 text-center text-gray-400">جاري التحميل...</td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={10} className="py-8 text-center text-gray-500">لا يوجد موظفون مطابقون للفلاتر</td></tr>
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
                        <td className="py-3 px-4">{emp.jobTitle || "—"}</td>
                        <td className="py-3 px-4">{emp.department || "—"}</td>
                        <td className="py-3 px-4">{emp.branch || "—"}</td>
                        <td className="py-3 px-4">{emp.workLocation || "—"}</td>
                        <td className="py-3 px-4">{emp.employeeType || "—"}</td>
                        <td className="py-3 px-4">{emp.status || "—"}</td>
                        <td className="py-3 px-4 font-semibold text-emerald-700">{emp.baseSalary.toLocaleString()} ر.س</td>
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
                  <ArrowRight className="h-4 w-4" /> رجوع
                </Button>
                <h2 className="text-lg font-bold text-gray-800">النتائج (تقرير شامل)</h2>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" onClick={printPayroll} disabled={payrollRows.length === 0}><Printer className="h-4 w-4" /> طباعة / PDF</Button>
                <Button variant="outline" onClick={exportPayroll} disabled={payrollRows.length === 0}><Download className="h-4 w-4" /> Excel</Button>
                <Button onClick={handleOpenApproval} className="bg-[#004e89] hover:bg-[#003d6d] text-white">
                  <Send className="h-4 w-4" /> إرسال طلب اعتماد رواتب الموظفين
                </Button>
              </div>
            </div>

            <div className="p-4 border-b border-gray-100 text-sm text-gray-700">
              الشهر: {monthNames[monthFilter]} | السنة: {yearFilter} | عدد الموظفين المختارين: {selectedEmployees.length}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right min-w-[1300px]">
                <thead className="bg-[#0a5a92] text-white">
                  <tr>
                    <th className="py-2 px-2">#</th>
                    <th className="py-2 px-2">الموظف</th>
                    <th className="py-2 px-2">القسم</th>
                    <th className="py-2 px-2">الفرع</th>
                    <th className="py-2 px-2">أيام العمل</th>
                    <th className="py-2 px-2">الراتب الأساسي</th>
                    <th className="py-2 px-2">البدلات</th>
                    <th className="py-2 px-2">إضافي</th>
                    <th className="py-2 px-2">عمولات</th>
                    <th className="py-2 px-2">التأمينات الاجتماعية 9.75%</th>
                    <th className="py-2 px-2">إجمالي الاستقطاعات</th>
                    <th className="py-2 px-2">صافي الراتب</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {selectedEmployees.map((emp, idx) => {
                    const c = calc[emp.id];
                    return (
                    <tr key={emp.id} className="hover:bg-gray-50">
                      <td className="py-2 px-2">{idx + 1}</td>
                      <td className="py-2 px-2 font-medium">{emp.name}</td>
                      <td className="py-2 px-2">{emp.department || "-"}</td>
                      <td className="py-2 px-2">{emp.branch || "-"}</td>
                      <td className="py-2 px-2">{c ? `${c.presentDays}/${c.workDays}` : "-"}</td>
                      <td className="py-2 px-2">{(c?.basic ?? emp.baseSalary).toFixed(2)}</td>
                      <td className="py-2 px-2">{(c?.allowances ?? 0).toFixed(2)}</td>
                      <td className="py-2 px-2">{(c?.overtime ?? 0).toFixed(2)}</td>
                      <td className="py-2 px-2">0.00</td>
                      <td className="py-2 px-2 text-orange-600">{(c?.socialInsurance ?? 0).toFixed(2)}</td>
                      <td className="py-2 px-2 text-red-600">{(c?.deductions ?? 0).toFixed(2)}</td>
                      <td className="py-2 px-2 font-semibold text-emerald-700">{(c?.net ?? emp.baseSalary).toFixed(2)}</td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {approvalOpen && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" dir="rtl">
            <div className="w-full max-w-3xl bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <button onClick={() => setApprovalOpen(false)} className="text-gray-500 hover:text-gray-800">
                  <X className="h-5 w-5" />
                </button>
                <h3 className="text-2xl font-bold text-gray-800">إرسال طلب اعتماد رواتب الموظفين</h3>
              </div>

              <div className="p-5 space-y-4">
                <div className="space-y-2">
                  <label className="text-2xl font-semibold text-gray-800">كشف الرواتب</label>
                  <select
                    value={approvalScope}
                    onChange={(e) => setApprovalScope(e.target.value as "all" | "partial")}
                    className="w-full h-12 border border-gray-300 rounded-md px-3 text-lg"
                  >
                    <option value="all">لجميع الموظفين</option>
                    <option value="partial">لجزء من الموظفين</option>
                  </select>
                </div>

                {approvalStep === 2 && approvalScope === "partial" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                    <div className="space-y-2">
                      <label className="text-lg font-semibold text-gray-700">اختر الإدارة</label>
                      <select value={approvalDepartment} onChange={(e) => setApprovalDepartment(e.target.value)} className="w-full h-12 border border-gray-300 rounded-md px-3">
                        <option>الكل</option>
                        {options.departments.filter((d) => d !== "الكل").map((d) => <option key={d}>{d}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-lg font-semibold text-gray-700">اختر الفرع</label>
                      <select value={approvalBranch} onChange={(e) => setApprovalBranch(e.target.value)} className="w-full h-12 border border-gray-300 rounded-md px-3">
                        <option>الكل</option>
                        {options.branches.filter((b) => b !== "الكل").map((b) => <option key={b}>{b}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-lg font-semibold text-gray-700">اختر موقع العمل</label>
                      <select value={approvalLocation} onChange={(e) => setApprovalLocation(e.target.value)} className="w-full h-12 border border-gray-300 rounded-md px-3">
                        <option>الكل</option>
                        {options.locations.filter((l) => l !== "الكل").map((l) => <option key={l}>{l}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-lg font-semibold text-gray-700">إيقاف رواتب الموظفين</label>
                      <div className="relative">
                        <Input
                          value={approvalStopKeyword}
                          onChange={(e) => setApprovalStopKeyword(e.target.value)}
                          placeholder="ابدأ بكتابة اسم الموظف"
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
                                <span className="block text-xs text-gray-500">{employee.department || employee.jobTitle || "موظف"}</span>
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
                                <button type="button" onClick={() => removeStoppedEmployee(employee.id)} aria-label={`إلغاء إيقاف راتب ${employee.name}`}>
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ))}
                        </div>
                      )}
                      <p className="text-xs text-gray-500">سيتم حفظ حالة «موقوف» فعلياً في كشف رواتب الفترة المحددة عند الإرسال.</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="px-5 py-4 border-t border-gray-100 flex justify-start gap-3">
                {approvalScope === "partial" && approvalStep === 1 ? (
                  <Button onClick={() => setApprovalStep(2)} className="bg-[#004e89] hover:bg-[#003d6d] text-white">التالي</Button>
                ) : (
                  <Button onClick={handleSendApproval} disabled={approvalSubmitting} className="bg-[#004e89] hover:bg-[#003d6d] text-white">
                    {approvalSubmitting ? "جاري الإرسال..." : "إرسال"}
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
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[] | Array<{ value: string; label: string }>;
}) {
  const normalized = options.map((op) =>
    typeof op === "string" ? { value: op, label: op } : op
  );

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700">{label}</label>
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
