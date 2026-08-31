import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { RefreshCw, Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { exportReportExcel, printReport, ReportColumn } from "@/lib/reportExport";
import { useI18n } from "@/i18n";

type MonthlyAttendance = { empId: string; empName: string; departmentId: string; sectionId: string; department: string; section: string; attendance: Record<number, { status: string; notes: string }> };
type OrganizationOption = { id: string; name: string; departmentId?: string };
const ALL = "الكل";

export function AttendanceMonthlyReportContent({ embedded = false }: { embedded?: boolean }) {
  const { t, direction, locale, formatNumber } = useI18n();
  const [data, setData] = useState<MonthlyAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [departmentFilter, setDepartmentFilter] = useState(ALL);
  const [sectionFilter, setSectionFilter] = useState(ALL);
  const [departments, setDepartments] = useState<OrganizationOption[]>([]);
  const [sections, setSections] = useState<OrganizationOption[]>([]);
  const daysInMonth = new Date(year, month, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, index) => index + 1);
  const localeCode = locale === "ar" ? "ar-SA" : "en-US";
  const monthName = (targetMonth: number) => new Date(year, targetMonth - 1).toLocaleString(localeCode, { month: "long" });

  const loadDepartmentsAndSections = async () => {
    try {
      const [departmentResult, sectionResult] = await Promise.all([
        supabase.from("departments").select("id, name, name_en").eq("status", "فعال").order("name"),
        supabase.from("org_sections").select("id, name, name_en, department_id").eq("status", "فعال").order("name"),
      ]);
      const localizedName = (row: { name?: unknown; name_en?: unknown }) => locale === "en" && String(row.name_en ?? "").trim() ? String(row.name_en) : String(row.name ?? "");
      setDepartments((departmentResult.data ?? []).map((row) => ({ id: String(row.id), name: localizedName(row) })));
      setSections((sectionResult.data ?? []).map((row) => ({ id: String(row.id), name: localizedName(row), departmentId: String(row.department_id ?? "") })));
    } catch (error) { console.error("Error loading departments:", error); }
  };
  const loadData = async () => {
    setLoading(true);
    try {
      const { data: emps } = await supabase.from("employees").select("id, emp_id, name, department_id, section_id").in("status", ["نشط", "فعال"]);
      if (!emps?.length) { setData([]); return; }
      const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
      const endDate = `${year}-${String(month).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;
      const { data: attRecords } = await supabase.from("attendance").select("*").gte("date", startDate).lte("date", endDate);
      const attMap: Record<string, Record<number, { status: string; notes: string }>> = {};
      (attRecords || []).forEach((record: any) => { if (!attMap[record.emp_id]) attMap[record.emp_id] = {}; attMap[record.emp_id][Number(String(record.date).slice(8, 10))] = { status: record.status || "غياب", notes: record.notes || "" }; });
      let result = emps.map((employee: any) => {
        const attendance: MonthlyAttendance["attendance"] = {};
        for (let day = 1; day <= daysInMonth; day++) {
          const weekday = new Date(year, month - 1, day).getDay();
          attendance[day] = weekday === 5 || weekday === 6 ? { status: "عطلة نهاية أسبوع", notes: "" } : attMap[employee.emp_id]?.[day] || { status: "لا يوجد تسجيل", notes: "" };
        }
        const departmentId = String(employee.department_id ?? "");
        const sectionId = String(employee.section_id ?? "");
        return { empId: employee.emp_id || "-", empName: employee.name || "-", departmentId, sectionId, department: departments.find((item) => item.id === departmentId)?.name || t("غير مرتبط"), section: sections.find((item) => item.id === sectionId)?.name || t("غير مرتبط"), attendance };
      });
      if (departmentFilter !== ALL) result = result.filter((row) => row.departmentId === departmentFilter);
      if (sectionFilter !== ALL) result = result.filter((row) => row.sectionId === sectionFilter);
      setData(result.sort((a, b) => a.empName.localeCompare(b.empName, localeCode)));
    } catch (error) { console.error("Error loading monthly report:", error); toast.error(t("خطأ في تحميل البيانات")); } finally { setLoading(false); }
  };
  useEffect(() => { void loadDepartmentsAndSections(); }, [locale]);
  useEffect(() => { if (departments.length || sections.length) void loadData(); }, [year, month, departmentFilter, sectionFilter, departments, sections]);

  const countStatus = (statuses: string[]) => data.reduce((total, employee) => total + days.filter((day) => statuses.includes(employee.attendance[day]?.status)).length, 0);
  const reportColumns: ReportColumn[] = [{ key: "empId", label: t("رقم الموظف"), width: 15 }, { key: "empName", label: t("اسم الموظف"), width: 24 }, { key: "department", label: t("الإدارة"), width: 18 }, { key: "section", label: t("القسم"), width: 18 }, ...days.map((day) => ({ key: `day${day}`, label: formatNumber(day), width: 8 }))];
  const reportRows = data.map((employee) => ({ empId: employee.empId, empName: employee.empName, department: employee.department, section: employee.section, ...Object.fromEntries(days.map((day) => [`day${day}`, t(employee.attendance[day]?.status || "-")])) }));
  const monthLabel = new Date(year, month - 1).toLocaleString(localeCode, { month: "long", year: "numeric" });
  const reportSummary = [{ label: t("عدد الموظفين"), value: formatNumber(data.length) }, { label: t("إجمالي الحضور"), value: formatNumber(countStatus(["حاضر"])) }, { label: t("إجمالي الغياب"), value: formatNumber(countStatus(["غياب"])) }];
  const handlePrint = () => printReport({ title: t("تقرير الحضور الشهري"), subtitle: monthLabel, columns: reportColumns, rows: reportRows, fileName: `attendance-monthly-${year}-${month}`, landscape: true, summary: reportSummary });
  const handleExport = () => exportReportExcel({ title: t("تقرير الحضور الشهري"), subtitle: monthLabel, columns: reportColumns, rows: reportRows, fileName: `attendance-monthly-${year}-${month}`, summary: reportSummary });
  const getStatusColor = (status: string) => ({ "حاضر": "bg-green-100 text-green-700", "غياب": "bg-red-100 text-red-700", "إجازة": "bg-blue-100 text-blue-700", "مأمورية": "bg-purple-100 text-purple-700", "متأخر": "bg-yellow-100 text-yellow-700", "عطلة نهاية أسبوع": "bg-gray-100 text-gray-700", "لا يوجد تسجيل": "bg-white text-gray-300" }[status] || "bg-gray-100 text-gray-700");
  const isWeekend = (day: number) => [5, 6].includes(new Date(year, month - 1, day).getDay());
  const side = direction === "rtl" ? "right" : "left";
  const otherSide = direction === "rtl" ? "left" : "right";
  const align = direction === "rtl" ? "text-right" : "text-left";
  const content = <><div className={embedded ? "space-y-5" : "p-6 max-w-[1800px] mx-auto space-y-6"} dir={direction}>
    <div className="flex items-center justify-between"><h1 className="text-2xl font-bold text-[#004e89]">{t("الحضور والغياب للموظفين")}</h1><div className="flex items-center gap-3"><Button variant="outline" size="icon" onClick={loadData} title={t("تحديث")}><RefreshCw className="h-4 w-4" /></Button><Button variant="outline" size="icon" onClick={handlePrint} disabled={!reportRows.length} title={t("طباعة / PDF")}><Printer className="h-4 w-4" /></Button><Button variant="outline" size="icon" onClick={handleExport} disabled={!reportRows.length} title={t("تحميل Excel")}><Download className="h-4 w-4" /></Button></div></div>
    <div className="bg-white rounded-xl shadow-sm border p-6 space-y-4"><div className="grid grid-cols-2 gap-4 md:grid-cols-4"><div><label className="block text-sm font-medium mb-1 text-gray-700">{t("السنة")}</label><Input type="number" value={year} onChange={(event) => setYear(Number(event.target.value))} className={align} /></div><div><label className="block text-sm font-medium mb-1 text-gray-700">{t("الشهر")}</label><select value={month} onChange={(event) => setMonth(Number(event.target.value))} className={`w-full px-3 py-2 border rounded-md ${align}`}>{Array.from({ length: 12 }, (_, index) => index + 1).map((value) => <option key={value} value={value}>{monthName(value)}</option>)}</select></div><div><label className="block text-sm font-medium mb-1 text-gray-700">{t("الإدارة")}</label><select value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)} className={`w-full px-3 py-2 border rounded-md ${align}`}><option value={ALL}>{t(ALL)}</option>{departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select></div><div><label className="block text-sm font-medium mb-1 text-gray-700">{t("القسم")}</label><select value={sectionFilter} onChange={(event) => setSectionFilter(event.target.value)} className={`w-full px-3 py-2 border rounded-md ${align}`}><option value={ALL}>{t(ALL)}</option>{sections.filter((section) => departmentFilter === ALL || section.departmentId === departmentFilter).map((section) => <option key={section.id} value={section.id}>{section.name}</option>)}</select></div></div></div>
    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">{loading ? <div className="p-8 text-center text-gray-400">{t("جاري التحميل...")}</div> : !data.length ? <div className="p-8 text-center text-gray-400">{t("لا توجد بيانات")}</div> : <div className="overflow-x-auto"><table className="w-full text-xs border-collapse"><thead><tr className="bg-blue-700 text-white font-bold sticky top-0 z-10"><th className={`py-2 px-2 ${align} min-w-[120px] sticky ${side}-0 bg-blue-700 z-20`}>{t("الموظف")}</th><th className={`py-2 px-2 ${align} min-w-[100px] sticky ${side}-[120px] bg-blue-700 z-20`}>{t("الإدارة")}</th>{days.map((day) => <th key={day} className={`py-2 px-1 min-w-[40px] text-center font-bold ${isWeekend(day) ? "bg-blue-600" : ""}`}>{formatNumber(day)}</th>)}</tr></thead><tbody>{data.map((employee, index) => <tr key={employee.empId} className={`${index % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-blue-50 border-b`}><td className={`py-1.5 px-2 ${align} sticky ${side}-0 bg-inherit z-10 font-medium text-gray-800 border-${otherSide} border-gray-200`}>{employee.empName}<br /><span className="text-xs text-gray-500">{employee.empId}</span></td><td className={`py-1.5 px-2 ${align} sticky ${side}-[120px] bg-inherit z-10 text-xs border-${otherSide} border-gray-200`}>{employee.department}</td>{days.map((day) => { const attendance = employee.attendance[day]; return <td key={day} className={`py-1.5 px-0.5 text-center border-b border-gray-200 text-xs font-medium ${isWeekend(day) ? "bg-gray-100" : getStatusColor(attendance.status)}`}><div className="min-h-[40px] flex items-center justify-center p-0.5"><span className="line-clamp-2">{t(attendance.status)}</span></div></td>; })}</tr>)}</tbody></table></div>}</div>
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">{[{ label: "إجمالي الحاضرين", value: countStatus(["حاضر"]), color: "green" }, { label: "إجمالي الغائبين", value: countStatus(["غياب"]), color: "red" }, { label: "إجمالي المتأخرين", value: countStatus(["متأخر"]), color: "yellow" }, { label: "إجمالي الإجازات", value: countStatus(["إجازة", "مأمورية"]), color: "blue" }].map((summary) => <div key={summary.label} className={`bg-${summary.color}-50 border border-${summary.color}-200 rounded-lg p-4`}><div className={`text-sm text-${summary.color}-700 font-medium`}>{t(summary.label)}</div><div className={`text-2xl font-bold text-${summary.color}-600`}>{formatNumber(summary.value)}</div></div>)}</div>
  </div><style>{`@media print { body { margin: 0; } .no-print { display: none; } table { font-size: 10px; } th, td { padding: 4px !important; } }`}</style></>;
  return embedded ? content : <Layout>{content}</Layout>;
}

export default function HRAttendanceMonthlyReport() {
  return <AttendanceMonthlyReportContent />;
}
