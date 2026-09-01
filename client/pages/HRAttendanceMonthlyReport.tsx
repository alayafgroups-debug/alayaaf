import { useEffect, useMemo, useState } from "react";
import Layout from "@/components/Layout";
import { RefreshCw, Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { exportReportExcel, printReport, type ReportColumn } from "@/lib/reportExport";
import { useI18n } from "@/i18n";

type AttendanceDay = { status: string; notes: string };
type MonthlyAttendance = {
  empId: string;
  empName: string;
  departmentId: string;
  sectionId: string;
  department: string;
  section: string;
  attendance: Record<number, AttendanceDay>;
};
type OrganizationOption = { id: string; name: string; departmentId?: string };

const ALL = "الكل";
const EMPTY_DAY: AttendanceDay = { status: "لا يوجد تسجيل", notes: "" };

export function AttendanceMonthlyReportContent({ embedded = false }: { embedded?: boolean }) {
  const { t, direction, locale, formatNumber } = useI18n();
  const now = new Date();
  const [data, setData] = useState<MonthlyAttendance[]>([]);
  const [departments, setDepartments] = useState<OrganizationOption[]>([]);
  const [sections, setSections] = useState<OrganizationOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [departmentFilter, setDepartmentFilter] = useState(ALL);
  const [sectionFilter, setSectionFilter] = useState(ALL);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const safeYear = Number.isFinite(year) && year > 0 ? year : now.getFullYear();
  const safeMonth = Number.isFinite(month) && month >= 1 && month <= 12 ? month : now.getMonth() + 1;
  const daysInMonth = new Date(safeYear, safeMonth, 0).getDate();
  const days = useMemo(() => Array.from({ length: daysInMonth }, (_, index) => index + 1), [daysInMonth]);
  const localeCode = locale === "ar" ? "ar-SA" : "en-US";
  const monthName = (targetMonth: number) => new Date(safeYear, targetMonth - 1).toLocaleString(localeCode, { month: "long" });

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      setLoading(true);
      try {
        const startDate = `${safeYear}-${String(safeMonth).padStart(2, "0")}-01`;
        const endDate = `${safeYear}-${String(safeMonth).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;
        const [employeeResult, attendanceResult, departmentResult, sectionResult] = await Promise.all([
          supabase.from("employees").select("id, emp_id, name, department_id, section_id").in("status", ["نشط", "فعال", "active"]).order("name"),
          supabase.from("attendance").select("emp_id, date, status, notes").gte("date", startDate).lte("date", endDate),
          supabase.from("departments").select("id, name, name_en").eq("status", "فعال").order("name"),
          supabase.from("org_sections").select("id, name, name_en, department_id").eq("status", "فعال").order("name"),
        ]);

        const firstError = employeeResult.error ?? attendanceResult.error ?? departmentResult.error ?? sectionResult.error;
        if (firstError) throw firstError;
        if (cancelled) return;

        const localizedName = (row: { name?: unknown; name_en?: unknown }) => {
          const englishName = String(row.name_en ?? "").trim();
          return locale === "en" && englishName ? englishName : String(row.name ?? "");
        };
        const departmentOptions = (departmentResult.data ?? []).map((row) => ({ id: String(row.id), name: localizedName(row) }));
        const sectionOptions = (sectionResult.data ?? []).map((row) => ({ id: String(row.id), name: localizedName(row), departmentId: String(row.department_id ?? "") }));
        const departmentNames = new Map(departmentOptions.map((item) => [item.id, item.name]));
        const sectionNames = new Map(sectionOptions.map((item) => [item.id, item.name]));
        const attendanceByEmployee = new Map<string, Record<number, AttendanceDay>>();

        (attendanceResult.data ?? []).forEach((record) => {
          const employeeId = String(record.emp_id ?? "");
          const day = Number(String(record.date ?? "").slice(8, 10));
          if (!employeeId || !Number.isInteger(day) || day < 1 || day > daysInMonth) return;
          const employeeDays = attendanceByEmployee.get(employeeId) ?? {};
          employeeDays[day] = { status: String(record.status ?? "لا يوجد تسجيل"), notes: String(record.notes ?? "") };
          attendanceByEmployee.set(employeeId, employeeDays);
        });

        const rows = (employeeResult.data ?? []).map((employee) => {
          const empId = String(employee.emp_id ?? employee.id ?? "-");
          const departmentId = String(employee.department_id ?? "");
          const sectionId = String(employee.section_id ?? "");
          const savedDays = attendanceByEmployee.get(empId) ?? {};
          const attendance: Record<number, AttendanceDay> = {};

          days.forEach((day) => {
            const weekday = new Date(safeYear, safeMonth - 1, day).getDay();
            attendance[day] = weekday === 5 || weekday === 6
              ? { status: "عطلة نهاية أسبوع", notes: "" }
              : savedDays[day] ?? { ...EMPTY_DAY };
          });

          return {
            empId,
            empName: String(employee.name ?? "-"),
            departmentId,
            sectionId,
            department: departmentNames.get(departmentId) || t("غير مرتبط"),
            section: sectionNames.get(sectionId) || t("غير مرتبط"),
            attendance,
          };
        });

        setDepartments(departmentOptions);
        setSections(sectionOptions);
        setData(rows.sort((a, b) => a.empName.localeCompare(b.empName, localeCode)));
      } catch (error) {
        if (!cancelled) {
          setData([]);
          toast.error(error instanceof Error ? error.message : t("خطأ في تحميل البيانات"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadData();
    return () => { cancelled = true; };
  }, [safeYear, safeMonth, daysInMonth, days, locale, reloadKey, t]);

  const visibleSections = useMemo(
    () => sections.filter((section) => departmentFilter === ALL || section.departmentId === departmentFilter),
    [sections, departmentFilter],
  );

  const visibleData = useMemo(() => {
    const query = employeeSearch.trim().toLowerCase();
    return data.filter((employee) => {
      if (departmentFilter !== ALL && employee.departmentId !== departmentFilter) return false;
      if (sectionFilter !== ALL && employee.sectionId !== sectionFilter) return false;
      return !query || employee.empName.toLowerCase().includes(query) || employee.empId.toLowerCase().includes(query);
    });
  }, [data, departmentFilter, sectionFilter, employeeSearch]);

  const getAttendanceDay = (employee: MonthlyAttendance, day: number): AttendanceDay => employee.attendance?.[day] ?? EMPTY_DAY;
  const countStatus = (statuses: string[]) => visibleData.reduce(
    (total, employee) => total + days.filter((day) => statuses.includes(getAttendanceDay(employee, day).status)).length,
    0,
  );
  const reportColumns: ReportColumn[] = [
    { key: "empId", label: t("رقم الموظف"), width: 15 },
    { key: "empName", label: t("اسم الموظف"), width: 24 },
    { key: "department", label: t("الإدارة"), width: 18 },
    { key: "section", label: t("القسم"), width: 18 },
    ...days.map((day) => ({ key: `day${day}`, label: formatNumber(day), width: 8 })),
  ];
  const reportRows = visibleData.map((employee) => ({
    empId: employee.empId,
    empName: employee.empName,
    department: employee.department,
    section: employee.section,
    ...Object.fromEntries(days.map((day) => [`day${day}`, t(getAttendanceDay(employee, day).status)])),
  }));
  const monthLabel = new Date(safeYear, safeMonth - 1).toLocaleString(localeCode, { month: "long", year: "numeric" });
  const reportSummary = [
    { label: t("عدد الموظفين"), value: formatNumber(visibleData.length) },
    { label: t("إجمالي الحضور"), value: formatNumber(countStatus(["حاضر"])) },
    { label: t("إجمالي الغياب"), value: formatNumber(countStatus(["غياب"])) },
  ];
  const reportOptions = { title: t("الحضور والغياب للموظفين"), subtitle: monthLabel, columns: reportColumns, rows: reportRows, fileName: `attendance-monthly-${safeYear}-${safeMonth}`, landscape: true, summary: reportSummary };
  const statusClass = (status: string) => ({
    "حاضر": "bg-green-100 text-green-700",
    "غياب": "bg-red-100 text-red-700",
    "إجازة": "bg-blue-100 text-blue-700",
    "مأمورية": "bg-purple-100 text-purple-700",
    "متأخر": "bg-yellow-100 text-yellow-700",
    "عطلة نهاية أسبوع": "bg-gray-100 text-gray-700",
    "لا يوجد تسجيل": "bg-white text-gray-300",
  }[status] || "bg-gray-100 text-gray-700");
  const isWeekend = (day: number) => [5, 6].includes(new Date(safeYear, safeMonth - 1, day).getDay());
  const side = direction === "rtl" ? "right" : "left";
  const align = direction === "rtl" ? "text-right" : "text-left";

  const content = (
    <>
      <div className={embedded ? "space-y-5" : "mx-auto max-w-[1800px] space-y-6 p-6"} dir={direction}>
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-[#004e89]">{t("الحضور والغياب للموظفين")}</h1>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" onClick={() => setReloadKey((value) => value + 1)} title={t("تحديث")}><RefreshCw className="h-4 w-4" /></Button>
            <Button variant="outline" size="icon" onClick={() => printReport(reportOptions)} disabled={!reportRows.length} title={t("طباعة / PDF")}><Printer className="h-4 w-4" /></Button>
            <Button variant="outline" size="icon" onClick={() => exportReportExcel(reportOptions)} disabled={!reportRows.length} title={t("تحميل Excel")}><Download className="h-4 w-4" /></Button>
          </div>
        </div>

        <div className="space-y-4 rounded-xl border bg-white p-6 shadow-sm">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <label className="space-y-1"><span className="block text-sm font-medium text-gray-700">{t("السنة")}</span><Input type="number" min={2000} max={2100} value={year} onChange={(event) => setYear(Number(event.target.value))} className={align} /></label>
            <label className="space-y-1"><span className="block text-sm font-medium text-gray-700">{t("الشهر")}</span><select value={month} onChange={(event) => setMonth(Number(event.target.value))} className={`h-10 w-full rounded-md border px-3 ${align}`}>{Array.from({ length: 12 }, (_, index) => index + 1).map((value) => <option key={value} value={value}>{monthName(value)}</option>)}</select></label>
            <label className="space-y-1"><span className="block text-sm font-medium text-gray-700">{t("الإدارة")}</span><select value={departmentFilter} onChange={(event) => { setDepartmentFilter(event.target.value); setSectionFilter(ALL); }} className={`h-10 w-full rounded-md border px-3 ${align}`}><option value={ALL}>{t(ALL)}</option>{departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select></label>
            <label className="space-y-1"><span className="block text-sm font-medium text-gray-700">{t("القسم")}</span><select value={sectionFilter} onChange={(event) => setSectionFilter(event.target.value)} className={`h-10 w-full rounded-md border px-3 ${align}`}><option value={ALL}>{t(ALL)}</option>{visibleSections.map((section) => <option key={section.id} value={section.id}>{section.name}</option>)}</select></label>
            <label className="space-y-1"><span className="block text-sm font-medium text-gray-700">{t("البحث عن موظف")}</span><Input value={employeeSearch} onChange={(event) => setEmployeeSearch(event.target.value)} placeholder={t("ابحث بالاسم أو الرقم الوظيفي")} className={align} /></label>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
          {loading ? <div className="p-8 text-center text-gray-400">{t("جاري التحميل...")}</div> : !visibleData.length ? <div className="p-8 text-center text-gray-400">{t("لا توجد بيانات")}</div> : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <thead><tr className="sticky top-0 z-10 bg-blue-700 font-bold text-white"><th className={`sticky ${side}-0 z-20 min-w-[170px] bg-blue-700 px-2 py-2 ${align}`}>{t("الموظف")}</th><th className={`min-w-[120px] px-2 py-2 ${align}`}>{t("الإدارة")}</th>{days.map((day) => <th key={day} className={`min-w-[40px] px-1 py-2 text-center ${isWeekend(day) ? "bg-blue-600" : ""}`}>{formatNumber(day)}</th>)}</tr></thead>
                <tbody>{visibleData.map((employee, index) => <tr key={employee.empId} className={`${index % 2 === 0 ? "bg-white" : "bg-gray-50"} border-b hover:bg-blue-50`}><td className={`sticky ${side}-0 z-10 bg-inherit px-2 py-1.5 font-medium text-gray-800 ${align}`}>{employee.empName}<br /><span className="text-gray-500">{employee.empId}</span></td><td className={`px-2 py-1.5 ${align}`}>{employee.department}</td>{days.map((day) => { const attendanceDay = getAttendanceDay(employee, day); return <td key={day} title={attendanceDay.notes || t(attendanceDay.status)} className={`border-b border-gray-200 px-0.5 py-1.5 text-center font-medium ${isWeekend(day) ? "bg-gray-50" : statusClass(attendanceDay.status)}`}>{t(attendanceDay.status)}</td>; })}</tr>)}</tbody>
              </table>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { label: "إجمالي الحاضرين", value: countStatus(["حاضر"]), className: "border-green-200 bg-green-50 text-green-700" },
            { label: "إجمالي الغائبين", value: countStatus(["غياب"]), className: "border-red-200 bg-red-50 text-red-700" },
            { label: "إجمالي المتأخرين", value: countStatus(["متأخر"]), className: "border-yellow-200 bg-yellow-50 text-yellow-700" },
            { label: "إجمالي الإجازات", value: countStatus(["إجازة", "مأمورية"]), className: "border-blue-200 bg-blue-50 text-blue-700" },
          ].map((summary) => <div key={summary.label} className={`rounded-lg border p-4 ${summary.className}`}><div className="text-sm font-medium">{t(summary.label)}</div><div className="text-2xl font-bold">{formatNumber(summary.value)}</div></div>)}
        </div>
      </div>
      <style>{`@media print { body { margin: 0; } table { font-size: 10px; } th, td { padding: 4px !important; } }`}</style>
    </>
  );

  return embedded ? content : <Layout>{content}</Layout>;
}

export default function HRAttendanceMonthlyReport() {
  return <AttendanceMonthlyReportContent />;
}
