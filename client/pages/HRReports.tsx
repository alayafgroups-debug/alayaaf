import { useEffect, useMemo, useState } from "react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import Layout from "@/components/Layout";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Users,
  Clock3,
  Receipt,
  Wallet,
  FileX,
  Filter,
  FileText,
  FileSpreadsheet,
  Search,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "@/hooks/use-toast";

type EmployeeRow = {
  id: string;
  empId: string;
  name: string;
  department: string;
  status: string;
};

type AttendanceRow = {
  id: string;
  empId: string;
  empName: string;
  department: string;
  date: string;
  status: string;
};

type PayrollRow = {
  id: string;
  empId: string;
  empName: string;
  department: string;
  month: string;
  netSalary: number;
  status: string;
};

type AdvanceRow = {
  id: string;
  empId: string;
  empName: string;
  amount: number;
  remainingAmount: number;
  status: string;
  requestDate: string;
};

type SettlementRow = {
  id: string;
  empId: string;
  empName: string;
  amount: number;
  status: string;
  settlementDate: string;
};

type ReportType = "employees" | "attendance" | "payroll" | "advances" | "settlements";

const mapEmployee = (row: Record<string, unknown>): EmployeeRow => ({
  id: String(row.id ?? ""),
  empId: String(row.emp_id ?? ""),
  name: String(row.name ?? ""),
  department: String(row.department ?? ""),
  status: String(row.status ?? "نشط"),
});

const mapAttendance = (row: Record<string, unknown>): AttendanceRow => ({
  id: String(row.id ?? ""),
  empId: String(row.emp_id ?? ""),
  empName: String(row.emp_name ?? ""),
  department: String(row.department ?? ""),
  date: String(row.date ?? ""),
  status: String(row.status ?? "حاضر"),
});

const mapPayroll = (row: Record<string, unknown>): PayrollRow => ({
  id: String(row.id ?? ""),
  empId: String(row.emp_id ?? ""),
  empName: String(row.emp_name ?? ""),
  department: String(row.department ?? ""),
  month: String(row.month ?? ""),
  netSalary: Number(row.net_salary ?? 0),
  status: String(row.status ?? "معلق"),
});

const mapAdvance = (row: Record<string, unknown>): AdvanceRow => ({
  id: String(row.id ?? ""),
  empId: String(row.emp_id ?? ""),
  empName: String(row.emp_name ?? ""),
  amount: Number(row.amount ?? 0),
  remainingAmount: Number(row.remaining_amount ?? row.amount ?? 0),
  status: String(row.status ?? "معلقة"),
  requestDate: String(row.request_date ?? ""),
});

const mapSettlement = (row: Record<string, unknown>): SettlementRow => ({
  id: String(row.id ?? ""),
  empId: String(row.emp_id ?? ""),
  empName: String(row.emp_name ?? ""),
  amount: Number(row.amount ?? row.net_amount ?? row.total_amount ?? 0),
  status: String(row.status ?? "معلقة"),
  settlementDate: String(row.settlement_date ?? row.date ?? ""),
});

function escapeCsv(value: string | number) {
  const raw = String(value ?? "");
  if (raw.includes(",") || raw.includes("\n") || raw.includes('"')) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

export default function HRReports() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [activeReport, setActiveReport] = useState<ReportType>("employees");

  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [payroll, setPayroll] = useState<PayrollRow[]>([]);
  const [advances, setAdvances] = useState<AdvanceRow[]>([]);
  const [settlements, setSettlements] = useState<SettlementRow[]>([]);

  const [periodMonth, setPeriodMonth] = useState(new Date().toISOString().slice(0, 7));
  const [employeeFilter, setEmployeeFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [empRes, attendanceRes, payrollRes, advancesRes, settlementsRes] = await Promise.all([
        supabase.from("employees").select("id, emp_id, name, department, status").order("name", { ascending: true }),
        supabase.from("attendance").select("id, emp_id, emp_name, department, date, status").order("date", { ascending: false }),
        supabase.from("payroll").select("id, emp_id, emp_name, department, month, net_salary, status").order("month", { ascending: false }),
        supabase.from("hr_advances").select("id, emp_id, emp_name, amount, remaining_amount, status, request_date").order("created_at", { ascending: false }),
        supabase.from("hr_settlements").select("*").order("created_at", { ascending: false }),
      ]);

      setEmployees(!empRes.error && empRes.data ? empRes.data.map((r) => mapEmployee(r as Record<string, unknown>)) : []);
      setAttendance(!attendanceRes.error && attendanceRes.data ? attendanceRes.data.map((r) => mapAttendance(r as Record<string, unknown>)) : []);
      setPayroll(!payrollRes.error && payrollRes.data ? payrollRes.data.map((r) => mapPayroll(r as Record<string, unknown>)) : []);
      setAdvances(!advancesRes.error && advancesRes.data ? advancesRes.data.map((r) => mapAdvance(r as Record<string, unknown>)) : []);
      setSettlements(!settlementsRes.error && settlementsRes.data ? settlementsRes.data.map((r) => mapSettlement(r as Record<string, unknown>)) : []);
    } catch {
      setEmployees([]);
      setAttendance([]);
      setPayroll([]);
      setAdvances([]);
      setSettlements([]);
    } finally {
      setLoading(false);
    }
  }

  const departmentOptions = useMemo(() => {
    return Array.from(new Set(employees.map((e) => e.department).filter(Boolean)));
  }, [employees]);

  const employeeOptions = useMemo(() => {
    return employees.map((e) => ({ value: e.empId, label: `${e.name} (${e.empId || "بدون رقم"})` }));
  }, [employees]);

  const reportStats = useMemo(() => {
    const attendanceInPeriod = attendance.filter((r) => !periodMonth || r.date.startsWith(periodMonth));
    const payrollInPeriod = payroll.filter((r) => !periodMonth || r.month === periodMonth);
    const advancesOpen = advances.filter((r) => r.status !== "مكتملة");

    return {
      employees: employees.length,
      attendance: attendanceInPeriod.length,
      payroll: payrollInPeriod.length,
      advances: advancesOpen.length,
      settlements: settlements.length,
    };
  }, [employees, attendance, payroll, advances, settlements, periodMonth]);

  const filteredRows = useMemo(() => {
    const searchText = search.trim();

    if (activeReport === "employees") {
      return employees.filter((row) => {
        if (employeeFilter && row.empId !== employeeFilter) return false;
        if (departmentFilter && row.department !== departmentFilter) return false;
        if (statusFilter && row.status !== statusFilter) return false;
        if (searchText && !`${row.empId} ${row.name}`.includes(searchText)) return false;
        return true;
      });
    }

    if (activeReport === "attendance") {
      return attendance.filter((row) => {
        if (periodMonth && !row.date.startsWith(periodMonth)) return false;
        if (employeeFilter && row.empId !== employeeFilter) return false;
        if (departmentFilter && row.department !== departmentFilter) return false;
        if (statusFilter && row.status !== statusFilter) return false;
        if (searchText && !`${row.empId} ${row.empName}`.includes(searchText)) return false;
        return true;
      });
    }

    if (activeReport === "payroll") {
      return payroll.filter((row) => {
        if (periodMonth && row.month !== periodMonth) return false;
        if (employeeFilter && row.empId !== employeeFilter) return false;
        if (departmentFilter && row.department !== departmentFilter) return false;
        if (statusFilter && row.status !== statusFilter) return false;
        if (searchText && !`${row.empId} ${row.empName}`.includes(searchText)) return false;
        return true;
      });
    }

    if (activeReport === "advances") {
      return advances.filter((row) => {
        if (periodMonth && row.requestDate && !row.requestDate.startsWith(periodMonth)) return false;
        if (employeeFilter && row.empId !== employeeFilter) return false;
        if (statusFilter && row.status !== statusFilter) return false;
        if (searchText && !`${row.empId} ${row.empName}`.includes(searchText)) return false;
        return true;
      });
    }

    return settlements.filter((row) => {
      if (periodMonth && row.settlementDate && !row.settlementDate.startsWith(periodMonth)) return false;
      if (employeeFilter && row.empId !== employeeFilter) return false;
      if (statusFilter && row.status !== statusFilter) return false;
      if (searchText && !`${row.empId} ${row.empName}`.includes(searchText)) return false;
      return true;
    });
  }, [activeReport, employees, attendance, payroll, advances, settlements, periodMonth, employeeFilter, departmentFilter, statusFilter, search]);

  const netPayrollTotal = useMemo(() => {
    if (activeReport !== "payroll") return 0;
    return (filteredRows as PayrollRow[]).reduce((sum, row) => sum + row.netSalary, 0);
  }, [activeReport, filteredRows]);

  function resetFilters() {
    setEmployeeFilter("");
    setDepartmentFilter("");
    setStatusFilter("");
    setSearch("");
  }

  function exportCurrentReportCsv() {
    if (filteredRows.length === 0) {
      toast({ title: "لا توجد بيانات", description: "لا يوجد شيء للتصدير", variant: "destructive" });
      return;
    }

    let headers: string[] = [];
    let rows: (string | number)[][] = [];
    let fileName = "hr-report";

    if (activeReport === "employees") {
      headers = ["رقم الموظف", "الاسم", "القسم", "الحالة"];
      rows = (filteredRows as EmployeeRow[]).map((r) => [r.empId, r.name, r.department, r.status]);
      fileName = "employees-report";
    } else if (activeReport === "attendance") {
      headers = ["رقم الموظف", "الاسم", "القسم", "التاريخ", "الحالة"];
      rows = (filteredRows as AttendanceRow[]).map((r) => [r.empId, r.empName, r.department, r.date, r.status]);
      fileName = "attendance-report";
    } else if (activeReport === "payroll") {
      headers = ["رقم الموظف", "الاسم", "القسم", "الفترة", "صافي الراتب", "الحالة"];
      rows = (filteredRows as PayrollRow[]).map((r) => [r.empId, r.empName, r.department, r.month, r.netSalary, r.status]);
      fileName = "payroll-report";
    } else if (activeReport === "advances") {
      headers = ["رقم الموظف", "الاسم", "المبلغ", "المتبقي", "تاريخ الطلب", "الحالة"];
      rows = (filteredRows as AdvanceRow[]).map((r) => [r.empId, r.empName, r.amount, r.remainingAmount, r.requestDate, r.status]);
      fileName = "advances-report";
    } else {
      headers = ["رقم الموظف", "الاسم", "المبلغ", "تاريخ التصفية", "الحالة"];
      rows = (filteredRows as SettlementRow[]).map((r) => [r.empId, r.empName, r.amount, r.settlementDate, r.status]);
      fileName = "settlements-report";
    }

    const csvLines = [headers.map((h) => escapeCsv(h)).join(","), ...rows.map((row) => row.map((c) => escapeCsv(c)).join(","))];
    const csv = csvLines.join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileName}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({ title: "تم التصدير", description: "تم تصدير التقرير بصيغة قابلة للفتح في Excel" });
  }

  function printCurrentReport() {
    window.print();
  }

  return (
    <Layout>
      <div dir="rtl" className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-800">تقارير إدارة الموارد البشرية</h1>
            <p className="text-sm text-gray-500 mt-1">استخراج تقارير مباشرة من البيانات الفعلية</p>
          </div>
          <button
            onClick={() => navigate("/hr/dashboard")}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm hover:bg-gray-50"
          >
            <ArrowRight className="h-4 w-4" />
            رجوع
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <ReportCard
            title="تقرير الموظفين"
            subtitle="عرض بيانات الموظفين"
            count={reportStats.employees}
            color="bg-blue-600"
            active={activeReport === "employees"}
            onClick={() => setActiveReport("employees")}
            icon={<Users className="h-4 w-4" />}
          />
          <ReportCard
            title="تقرير خطة الدوام"
            subtitle="متابعة الحضور الشهري"
            count={reportStats.attendance}
            color="bg-green-600"
            active={activeReport === "attendance"}
            onClick={() => setActiveReport("attendance")}
            icon={<Clock3 className="h-4 w-4" />}
          />
          <ReportCard
            title="تقرير مسير الرواتب"
            subtitle="تفاصيل الرواتب الشهرية"
            count={reportStats.payroll}
            color="bg-cyan-500"
            active={activeReport === "payroll"}
            onClick={() => setActiveReport("payroll")}
            icon={<Receipt className="h-4 w-4" />}
          />
          <ReportCard
            title="تقرير السلف"
            subtitle="كشف السلف النشطة"
            count={reportStats.advances}
            color="bg-yellow-500"
            active={activeReport === "advances"}
            onClick={() => setActiveReport("advances")}
            icon={<Wallet className="h-4 w-4" />}
          />
          <ReportCard
            title="تقرير تصفية المستحقات"
            subtitle="مستحقات نهاية الخدمة"
            count={reportStats.settlements}
            color="bg-red-600"
            active={activeReport === "settlements"}
            onClick={() => setActiveReport("settlements")}
            icon={<FileX className="h-4 w-4" />}
          />
        </div>

        <section className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="bg-slate-600 text-white px-4 py-2 rounded-t-xl font-semibold text-sm">
            خصائص متقدمة لتقارير الموارد البشرية
          </div>

          <div className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="rounded-lg border border-gray-200 p-3">
                <label className="text-xs text-gray-500">التصفية حسب الفترة</label>
                <input
                  type="month"
                  value={periodMonth}
                  onChange={(e) => setPeriodMonth(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-2 py-2 text-sm"
                />
              </div>

              <div className="rounded-lg border border-gray-200 p-3">
                <label className="text-xs text-gray-500">التصفية حسب الموظف</label>
                <select
                  value={employeeFilter}
                  onChange={(e) => setEmployeeFilter(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-2 py-2 text-sm bg-white"
                >
                  <option value="">كل الموظفين</option>
                  {employeeOptions.map((emp) => (
                    <option key={emp.value} value={emp.value}>
                      {emp.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-lg border border-gray-200 p-3">
                <label className="text-xs text-gray-500">التصفية حسب القسم</label>
                <select
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-2 py-2 text-sm bg-white"
                  disabled={activeReport === "advances" || activeReport === "settlements"}
                >
                  <option value="">كل الأقسام</option>
                  {departmentOptions.map((dep) => (
                    <option key={dep} value={dep}>
                      {dep}
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-lg border border-gray-200 p-3">
                <label className="text-xs text-gray-500">التصفية حسب الحالة</label>
                <input
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  placeholder="مثال: نشط / مدفوع / معلق"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-2 py-2 text-sm"
                />
              </div>

              <div className="rounded-lg border border-gray-200 p-3">
                <label className="text-xs text-gray-500">بحث سريع</label>
                <div className="relative mt-1">
                  <Search className="absolute right-2 top-2.5 h-4 w-4 text-gray-400" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="اسم أو رقم موظف"
                    className="w-full rounded-lg border border-gray-300 pr-8 pl-2 py-2 text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={resetFilters}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm hover:bg-gray-200"
              >
                <Filter className="h-4 w-4" />
                إعادة ضبط الفلاتر
              </button>

              <button
                onClick={printCurrentReport}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-red-600 text-white text-sm hover:bg-red-700"
              >
                <FileText className="h-4 w-4" />
                التصدير PDF
              </button>

              <button
                onClick={exportCurrentReportCsv}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-green-600 text-white text-sm hover:bg-green-700"
              >
                <FileSpreadsheet className="h-4 w-4" />
                التصدير Excel
              </button>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
            <p className="font-semibold text-gray-700">تفاصيل التقرير</p>
            {activeReport === "payroll" ? (
              <p className="text-sm text-gray-600">إجمالي صافي الرواتب: {netPayrollTotal.toLocaleString("ar-SA")} ريال</p>
            ) : (
              <p className="text-sm text-gray-600">عدد السجلات: {filteredRows.length}</p>
            )}
          </div>

          <div className="overflow-auto">
            {loading ? (
              <div className="p-8 text-center text-gray-500">جاري تحميل البيانات...</div>
            ) : filteredRows.length === 0 ? (
              <div className="p-8 text-center text-gray-500">لا توجد نتائج مطابقة للفلترة الحالية</div>
            ) : activeReport === "employees" ? (
              <EmployeesTable rows={filteredRows as EmployeeRow[]} />
            ) : activeReport === "attendance" ? (
              <AttendanceTable rows={filteredRows as AttendanceRow[]} />
            ) : activeReport === "payroll" ? (
              <PayrollTable rows={filteredRows as PayrollRow[]} />
            ) : activeReport === "advances" ? (
              <AdvancesTable rows={filteredRows as AdvanceRow[]} />
            ) : (
              <SettlementsTable rows={filteredRows as SettlementRow[]} />
            )}
          </div>
        </section>
      </div>
    </Layout>
  );
}

function ReportCard({
  title,
  subtitle,
  count,
  color,
  active,
  onClick,
  icon,
}: {
  title: string;
  subtitle: string;
  count: number;
  color: string;
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`text-right rounded-lg border transition overflow-hidden ${active ? "ring-2 ring-offset-1 ring-slate-400 border-slate-300" : "border-gray-200 hover:border-gray-300"}`}
    >
      <div className={`${color} text-white px-3 py-2 flex items-center justify-between text-sm font-semibold`}>
        <span>{title}</span>
        <span>{icon}</span>
      </div>
      <div className="bg-white p-3">
        <p className="text-xs text-gray-500">{subtitle}</p>
        <p className="mt-2 text-lg font-bold text-gray-800">{count}</p>
      </div>
    </button>
  );
}

function EmployeesTable({ rows }: { rows: EmployeeRow[] }) {
  return (
    <table className="w-full min-w-[720px] text-sm">
      <thead className="bg-blue-50 text-blue-700">
        <tr>
          <th className="text-right px-3 py-2">رقم الموظف</th>
          <th className="text-right px-3 py-2">الاسم</th>
          <th className="text-right px-3 py-2">القسم</th>
          <th className="text-right px-3 py-2">الحالة</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id} className="border-t border-gray-100">
            <td className="px-3 py-2">{row.empId || "-"}</td>
            <td className="px-3 py-2">{row.name || "-"}</td>
            <td className="px-3 py-2">{row.department || "-"}</td>
            <td className="px-3 py-2">{row.status || "-"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function AttendanceTable({ rows }: { rows: AttendanceRow[] }) {
  return (
    <table className="w-full min-w-[820px] text-sm">
      <thead className="bg-green-50 text-green-700">
        <tr>
          <th className="text-right px-3 py-2">رقم الموظف</th>
          <th className="text-right px-3 py-2">الاسم</th>
          <th className="text-right px-3 py-2">القسم</th>
          <th className="text-right px-3 py-2">التاريخ</th>
          <th className="text-right px-3 py-2">الحالة</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id} className="border-t border-gray-100">
            <td className="px-3 py-2">{row.empId || "-"}</td>
            <td className="px-3 py-2">{row.empName || "-"}</td>
            <td className="px-3 py-2">{row.department || "-"}</td>
            <td className="px-3 py-2">{row.date || "-"}</td>
            <td className="px-3 py-2">{row.status || "-"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function PayrollTable({ rows }: { rows: PayrollRow[] }) {
  return (
    <table className="w-full min-w-[860px] text-sm">
      <thead className="bg-cyan-50 text-cyan-700">
        <tr>
          <th className="text-right px-3 py-2">رقم الموظف</th>
          <th className="text-right px-3 py-2">الاسم</th>
          <th className="text-right px-3 py-2">القسم</th>
          <th className="text-right px-3 py-2">الفترة</th>
          <th className="text-right px-3 py-2">صافي الراتب</th>
          <th className="text-right px-3 py-2">الحالة</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id} className="border-t border-gray-100">
            <td className="px-3 py-2">{row.empId || "-"}</td>
            <td className="px-3 py-2">{row.empName || "-"}</td>
            <td className="px-3 py-2">{row.department || "-"}</td>
            <td className="px-3 py-2">{row.month || "-"}</td>
            <td className="px-3 py-2">{row.netSalary.toLocaleString("ar-SA")}</td>
            <td className="px-3 py-2">{row.status || "-"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function AdvancesTable({ rows }: { rows: AdvanceRow[] }) {
  return (
    <table className="w-full min-w-[860px] text-sm">
      <thead className="bg-yellow-50 text-yellow-700">
        <tr>
          <th className="text-right px-3 py-2">رقم الموظف</th>
          <th className="text-right px-3 py-2">الاسم</th>
          <th className="text-right px-3 py-2">المبلغ</th>
          <th className="text-right px-3 py-2">المتبقي</th>
          <th className="text-right px-3 py-2">تاريخ الطلب</th>
          <th className="text-right px-3 py-2">الحالة</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id} className="border-t border-gray-100">
            <td className="px-3 py-2">{row.empId || "-"}</td>
            <td className="px-3 py-2">{row.empName || "-"}</td>
            <td className="px-3 py-2">{row.amount.toLocaleString("ar-SA")}</td>
            <td className="px-3 py-2">{row.remainingAmount.toLocaleString("ar-SA")}</td>
            <td className="px-3 py-2">{row.requestDate || "-"}</td>
            <td className="px-3 py-2">{row.status || "-"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function SettlementsTable({ rows }: { rows: SettlementRow[] }) {
  return (
    <table className="w-full min-w-[820px] text-sm">
      <thead className="bg-red-50 text-red-700">
        <tr>
          <th className="text-right px-3 py-2">رقم الموظف</th>
          <th className="text-right px-3 py-2">الاسم</th>
          <th className="text-right px-3 py-2">المبلغ</th>
          <th className="text-right px-3 py-2">تاريخ التصفية</th>
          <th className="text-right px-3 py-2">الحالة</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id} className="border-t border-gray-100">
            <td className="px-3 py-2">{row.empId || "-"}</td>
            <td className="px-3 py-2">{row.empName || "-"}</td>
            <td className="px-3 py-2">{row.amount.toLocaleString("ar-SA")}</td>
            <td className="px-3 py-2">{row.settlementDate || "-"}</td>
            <td className="px-3 py-2">{row.status || "-"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
