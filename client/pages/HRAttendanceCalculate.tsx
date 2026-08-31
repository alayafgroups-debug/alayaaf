import { useEffect, useMemo, useState } from "react";
import Layout from "@/components/Layout";
import { Download, Printer, RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabaseClient";
import { exportReportExcel, printReport, type ReportColumn } from "@/lib/reportExport";
import { useI18n } from "@/i18n";

const ALL = "all";
type ReportMode = "employees" | "departments";
type StatusFilter = "all" | "present" | "absent" | "late" | "leave";
type DepartmentOption = { id: string; name: string; branchId: string };
type SectionOption = { id: string; name: string; departmentId: string };
type BranchOption = { id: string; name: string };
type Employee = {
  id: string;
  empId: string;
  name: string;
  branchId: string;
  branch: string;
  departmentId: string;
  department: string;
  sectionId: string;
  section: string;
  jobTitle: string;
  workSchedule: string;
  workLocation: string;
};
type AttendanceRecord = { empId: string; date: string; status: string; checkIn: string; checkOut: string; lateMinutes: number };
type EmployeeSummary = Employee & { present: number; absent: number; late: number; leave: number; recorded: number; attendanceRate: number };
type DepartmentSummary = { id: string; department: string; employees: number; present: number; absent: number; late: number; leave: number; attendanceRate: number };

const monthRange = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const lastDay = String(new Date(year, now.getMonth() + 1, 0).getDate()).padStart(2, "0");
  return { from: `${year}-${month}-01`, to: `${year}-${month}-${lastDay}` };
};
const unique = (values: string[]) => [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, "ar"));
const dayCount = (from: string, to: string) => Math.max(1, Math.floor((new Date(`${to}T00:00:00`).getTime() - new Date(`${from}T00:00:00`).getTime()) / 86400000) + 1);
const classifyStatus = (record: AttendanceRecord | undefined): Exclude<StatusFilter, "all"> => {
  if (!record) return "absent";
  const status = record.status.toLowerCase();
  if (record.lateMinutes > 0 || status.includes("متأخر") || status.includes("late")) return "late";
  if (status.includes("إجاز") || status.includes("مأمورية") || status.includes("leave")) return "leave";
  if (status.includes("حاضر") || status.includes("present") || status.includes("عن بعد")) return "present";
  return "absent";
};

function FilterSelect({ label, value, onChange, options, allLabel }: { label: string; value: string; onChange: (value: string) => void; options: { value: string; label: string }[]; allLabel: string }) {
  return <label className="space-y-1 text-xs font-medium text-slate-600"><span className="block">{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-800"><option value={ALL}>{allLabel}</option>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
}

export default function HRAttendanceCalculate() {
  const { t, direction, formatNumber } = useI18n();
  const initialRange = monthRange();
  const [dateFrom, setDateFrom] = useState(initialRange.from);
  const [dateTo, setDateTo] = useState(initialRange.to);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [sections, setSections] = useState<SectionOption[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [jobTitles, setJobTitles] = useState<string[]>([]);
  const [workSchedules, setWorkSchedules] = useState<string[]>([]);
  const [workLocations, setWorkLocations] = useState<string[]>([]);
  const [branch, setBranch] = useState(ALL);
  const [departmentId, setDepartmentId] = useState(ALL);
  const [sectionId, setSectionId] = useState(ALL);
  const [employeeId, setEmployeeId] = useState(ALL);
  const [jobTitle, setJobTitle] = useState(ALL);
  const [workSchedule, setWorkSchedule] = useState(ALL);
  const [workLocation, setWorkLocation] = useState(ALL);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [mode, setMode] = useState<ReportMode>("employees");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = async () => {
    if (!dateFrom || !dateTo || dateFrom > dateTo) { setError(t("تاريخ البداية يجب أن يسبق تاريخ النهاية")); return; }
    setLoading(true); setError("");
    const [employeeResult, attendanceResult, departmentResult, sectionResult, branchResult, jobResult, scheduleResult, locationResult] = await Promise.all([
      supabase.from("employees").select("id, emp_id, name, branch_id, branch, department_id, section_id, directorate, department, job_title, work_schedule, work_location").in("status", ["نشط", "فعال", "active"]).order("name"),
      supabase.from("attendance").select("emp_id, date, status, check_in, check_out, late_minutes").gte("date", dateFrom).lte("date", dateTo).order("date"),
      supabase.from("departments").select("id, name, branch_id").eq("status", "فعال").order("name"),
      supabase.from("org_sections").select("id, name, department_id").eq("status", "فعال").order("name"),
      supabase.from("branches").select("id, name").eq("status", "فعال").order("name"),
      supabase.from("hr_jobs").select("id, name").eq("status", "فعال").order("name"),
      supabase.from("attendance_schedules").select("id, name").eq("status", "فعال").order("name"),
      supabase.from("hr_work_locations").select("id, name").eq("status", "فعال").order("name"),
    ]);
    const firstError = employeeResult.error ?? attendanceResult.error ?? departmentResult.error ?? sectionResult.error ?? branchResult.error ?? jobResult.error ?? scheduleResult.error ?? locationResult.error;
    if (firstError) { setError(firstError.message); setLoading(false); return; }
    const branchRows: BranchOption[] = (branchResult.data ?? []).map((row) => ({ id: String(row.id), name: String(row.name) }));
    const branchById = new Map(branchRows.map((item) => [item.id, item.name]));
    const departmentRows: DepartmentOption[] = (departmentResult.data ?? []).map((row) => ({ id: String(row.id), name: String(row.name), branchId: String(row.branch_id ?? "") }));
    const departmentById = new Map(departmentRows.map((item) => [item.id, item.name]));
    const sectionRows: SectionOption[] = (sectionResult.data ?? []).map((row) => ({ id: String(row.id), name: String(row.name), departmentId: String(row.department_id ?? "") }));
    const sectionById = new Map(sectionRows.map((item) => [item.id, item.name]));
    const loadedEmployees: Employee[] = (employeeResult.data ?? []).map((row) => ({
      id: String(row.id), empId: String(row.emp_id ?? row.id), name: String(row.name ?? "-"), branchId: String(row.branch_id ?? ""), branch: branchById.get(String(row.branch_id ?? "")) || String(row.branch ?? ""),
      departmentId: String(row.department_id ?? ""), department: departmentById.get(String(row.department_id ?? "")) || String(row.directorate ?? ""),
      sectionId: String(row.section_id ?? ""), section: sectionById.get(String(row.section_id ?? "")) || String(row.department ?? ""),
      jobTitle: String(row.job_title ?? ""), workSchedule: String(row.work_schedule ?? ""), workLocation: String(row.work_location ?? ""),
    }));
    setDepartments(departmentRows);
    setSections(sectionRows);
    setEmployees(loadedEmployees);
    setAttendance((attendanceResult.data ?? []).map((row) => ({ empId: String(row.emp_id ?? ""), date: String(row.date ?? ""), status: String(row.status ?? ""), checkIn: String(row.check_in ?? ""), checkOut: String(row.check_out ?? ""), lateMinutes: Number(row.late_minutes ?? 0) })));
    setBranches(branchRows);
    setJobTitles(unique([...(jobResult.data ?? []).map((row) => String(row.name ?? "")), ...loadedEmployees.map((item) => item.jobTitle)]));
    setWorkSchedules(unique([...(scheduleResult.data ?? []).map((row) => String(row.name ?? "")), ...loadedEmployees.map((item) => item.workSchedule)]));
    setWorkLocations(unique([...(locationResult.data ?? []).map((row) => String(row.name ?? "")), ...loadedEmployees.map((item) => item.workLocation)]));
    setLoading(false);
  };

  useEffect(() => { void loadData(); }, [dateFrom, dateTo]);
  useEffect(() => { setPage(1); }, [branch, departmentId, sectionId, employeeId, jobTitle, workSchedule, workLocation, statusFilter, mode, search, pageSize]);

  const employeeSummaries = useMemo<EmployeeSummary[]>(() => {
    const totalDays = dayCount(dateFrom, dateTo);
    const recordsByEmployee = new Map<string, Map<string, AttendanceRecord>>();
    attendance.forEach((record) => { if (!recordsByEmployee.has(record.empId)) recordsByEmployee.set(record.empId, new Map()); recordsByEmployee.get(record.empId)?.set(record.date, record); });
    return employees.map((employee) => {
      const records = recordsByEmployee.get(employee.empId) ?? new Map();
      const counts = { present: 0, absent: 0, late: 0, leave: 0 };
      for (let offset = 0; offset < totalDays; offset += 1) {
        const date = new Date(`${dateFrom}T00:00:00`); date.setDate(date.getDate() + offset);
        const key = date.toISOString().slice(0, 10);
        if (date > new Date()) continue;
        counts[classifyStatus(records.get(key))] += 1;
      }
      const worked = counts.present + counts.late;
      const expected = worked + counts.absent;
      return { ...employee, ...counts, recorded: records.size, attendanceRate: expected ? (worked / expected) * 100 : 0 };
    });
  }, [attendance, dateFrom, dateTo, employees]);

  const filteredEmployees = employeeSummaries.filter((employee) => {
    const departmentMatches = departmentId === ALL || employee.departmentId === departmentId || (!employee.departmentId && employee.department === departments.find((item) => item.id === departmentId)?.name);
    const sectionMatches = sectionId === ALL || employee.sectionId === sectionId || (!employee.sectionId && employee.section === sections.find((item) => item.id === sectionId)?.name);
    const keyword = search.trim().toLowerCase();
    return (branch === ALL || employee.branchId === branch) && departmentMatches && sectionMatches && (employeeId === ALL || employee.id === employeeId) && (jobTitle === ALL || employee.jobTitle === jobTitle) && (workSchedule === ALL || employee.workSchedule === workSchedule) && (workLocation === ALL || employee.workLocation === workLocation) && (statusFilter === "all" || employee[statusFilter] > 0) && (!keyword || [employee.name, employee.empId, employee.department, employee.section, employee.jobTitle, employee.branch].some((value) => value.toLowerCase().includes(keyword)));
  });
  const departmentSummaries = useMemo<DepartmentSummary[]>(() => {
    const grouped = new Map<string, DepartmentSummary>();
    filteredEmployees.forEach((employee) => {
      const key = employee.departmentId || employee.department || "unassigned";
      const current = grouped.get(key) ?? { id: key, department: employee.department || t("غير محدد"), employees: 0, present: 0, absent: 0, late: 0, leave: 0, attendanceRate: 0 };
      current.employees += 1; current.present += employee.present; current.absent += employee.absent; current.late += employee.late; current.leave += employee.leave;
      grouped.set(key, current);
    });
    return [...grouped.values()].map((item) => ({ ...item, attendanceRate: item.present + item.late + item.absent ? ((item.present + item.late) / (item.present + item.late + item.absent)) * 100 : 0 }));
  }, [filteredEmployees, t]);

  const allRows = mode === "employees" ? filteredEmployees : departmentSummaries;
  const totalPages = Math.max(1, Math.ceil(allRows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedRows = allRows.slice((safePage - 1) * pageSize, safePage * pageSize);
  const columns: ReportColumn[] = mode === "employees"
    ? [{ key: "empId", label: t("رقم الموظف") }, { key: "name", label: t("اسم الموظف") }, { key: "department", label: t("الإدارة") }, { key: "section", label: t("القسم") }, { key: "jobTitle", label: t("المسمى الوظيفي") }, { key: "branch", label: t("الفرع") }, { key: "workSchedule", label: t("جدول العمل") }, { key: "workLocation", label: t("مكان العمل") }, { key: "present", label: t("حاضر") }, { key: "absent", label: t("غائب") }, { key: "late", label: t("متأخر") }, { key: "leave", label: t("إجازة") }, { key: "attendanceRate", label: t("نسبة الحضور") }]
    : [{ key: "department", label: t("الإدارة") }, { key: "employees", label: t("عدد الموظفين") }, { key: "present", label: t("حاضر") }, { key: "absent", label: t("غائب") }, { key: "late", label: t("متأخر") }, { key: "leave", label: t("إجازة") }, { key: "attendanceRate", label: t("نسبة الحضور") }];
  const reportRows = allRows.map((row) => mode === "employees" ? { ...(row as EmployeeSummary), attendanceRate: `${(row as EmployeeSummary).attendanceRate.toFixed(1)}%` } : { ...(row as DepartmentSummary), attendanceRate: `${(row as DepartmentSummary).attendanceRate.toFixed(1)}%` });
  const reportTitle = t(mode === "employees" ? "تقرير حساب دوام الموظفين" : "تقرير ملخص الأقسام");
  const reportOptions = { title: reportTitle, subtitle: `${dateFrom} — ${dateTo}`, columns, rows: reportRows, fileName: `${mode}-attendance-${dateFrom}-${dateTo}`, landscape: true, summary: [{ label: t("عدد السجلات"), value: reportRows.length }] };
  const departmentOptions = departments.filter((item) => branch === ALL || item.branchId === branch).map((item) => ({ value: item.id, label: item.name }));
  const sectionOptions = sections.filter((item) => departmentId === ALL || item.departmentId === departmentId).map((item) => ({ value: item.id, label: item.name }));
  const selectableEmployees = employees.filter((employee) => (branch === ALL || employee.branchId === branch) && (departmentId === ALL || employee.departmentId === departmentId) && (sectionId === ALL || employee.sectionId === sectionId));

  return <Layout><main dir={direction} className="space-y-4">
    <header className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-bold text-[#004e89]">{t("حساب الدوام")}</h1><p className="mt-1 text-sm text-slate-500">{t("تقرير حضور الموظفين المرتبط بالفروع والإدارات والأقسام المحفوظة")}</p></div><div className="flex gap-2"><Button variant="outline" size="icon" onClick={() => void loadData()} title={t("تحديث")}><RefreshCw className="h-4 w-4" /></Button><Button variant="outline" size="icon" onClick={() => printReport(reportOptions)} disabled={!reportRows.length} title={t("طباعة / PDF")}><Printer className="h-4 w-4" /></Button><Button variant="outline" size="icon" onClick={() => exportReportExcel(reportOptions)} disabled={!reportRows.length} title={t("تحميل Excel")}><Download className="h-4 w-4" /></Button></div></header>
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <label className="space-y-1 text-xs font-medium text-slate-600"><span className="block">{t("من تاريخ")}</span><Input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} /></label>
      <label className="space-y-1 text-xs font-medium text-slate-600"><span className="block">{t("إلى تاريخ")}</span><Input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} /></label>
      <FilterSelect label={t("الفرع")} value={branch} onChange={(value) => { setBranch(value); setDepartmentId(ALL); setSectionId(ALL); setEmployeeId(ALL); }} options={branches.map((item) => ({ value: item.id, label: item.name }))} allLabel={t("الكل")} />
      <FilterSelect label={t("الإدارة")} value={departmentId} onChange={(value) => { setDepartmentId(value); setSectionId(ALL); setEmployeeId(ALL); }} options={departmentOptions} allLabel={t("الكل")} />
      <FilterSelect label={t("القسم")} value={sectionId} onChange={(value) => { setSectionId(value); setEmployeeId(ALL); }} options={sectionOptions} allLabel={t("الكل")} />
      <FilterSelect label={t("الموظف")} value={employeeId} onChange={setEmployeeId} options={selectableEmployees.map((employee) => ({ value: employee.id, label: `${employee.name} — ${employee.empId}` }))} allLabel={t("الكل")} />
      <FilterSelect label={t("المسمى الوظيفي")} value={jobTitle} onChange={setJobTitle} options={jobTitles.map((name) => ({ value: name, label: name }))} allLabel={t("الكل")} />
      <FilterSelect label={t("جدول العمل")} value={workSchedule} onChange={setWorkSchedule} options={workSchedules.map((name) => ({ value: name, label: name }))} allLabel={t("الكل")} />
      <FilterSelect label={t("مكان العمل")} value={workLocation} onChange={setWorkLocation} options={workLocations.map((name) => ({ value: name, label: name }))} allLabel={t("الكل")} />
      <FilterSelect label={t("حالة الدوام")} value={statusFilter} onChange={(value) => setStatusFilter(value as StatusFilter)} options={[{ value: "present", label: t("حاضر") }, { value: "absent", label: t("غائب") }, { value: "late", label: t("متأخر") }, { value: "leave", label: t("إجازة") }]} allLabel={t("الكل")} />
      <label className="space-y-1 text-xs font-medium text-slate-600"><span className="block">{t("نوع التقرير")}</span><select value={mode} onChange={(event) => setMode(event.target.value as ReportMode)} className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"><option value="employees">{t("تقرير حساب دوام الموظفين")}</option><option value="departments">{t("تقرير ملخص الأقسام")}</option></select></label>
    </div></section>
    {error && <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4"><div className="flex flex-wrap gap-4 text-xs"><span className="text-emerald-700">● {t("حاضر")}</span><span className="text-red-600">● {t("غائب")}</span><span className="text-amber-600">● {t("متأخر")}</span><span className="text-sky-600">● {t("إجازة")}</span></div><div className="flex items-center gap-3"><label className="flex items-center gap-2 text-xs text-slate-500">{t("عرض")}<select value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))} className="rounded border px-2 py-1"><option value={10}>10</option><option value={25}>25</option><option value={50}>50</option></select></label><div className="relative w-64"><Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("بحث...")} className="pr-9" /></div></div></div>
      <div className="overflow-x-auto"><table className="min-w-full text-xs"><thead className="bg-[#075f94] text-white"><tr>{columns.map((column) => <th key={column.key} className="whitespace-nowrap px-3 py-3 text-center font-semibold">{column.label}</th>)}</tr></thead><tbody>{loading ? <tr><td colSpan={columns.length} className="py-16 text-center text-slate-400">{t("جاري التحميل...")}</td></tr> : !pagedRows.length ? <tr><td colSpan={columns.length} className="py-16 text-center text-slate-400">{t("لا توجد بيانات")}</td></tr> : mode === "employees" ? (pagedRows as EmployeeSummary[]).map((row) => <tr key={row.id} className="border-b hover:bg-slate-50"><td className="px-3 py-3 text-center">{row.empId}</td><td className="px-3 py-3 font-semibold">{row.name}</td><td className="px-3 py-3">{row.department || "—"}</td><td className="px-3 py-3">{row.section || "—"}</td><td className="px-3 py-3">{row.jobTitle || "—"}</td><td className="px-3 py-3">{row.branch || "—"}</td><td className="px-3 py-3">{row.workSchedule || "—"}</td><td className="px-3 py-3">{row.workLocation || "—"}</td><td className="px-3 py-3 text-center text-emerald-700">{formatNumber(row.present)}</td><td className="px-3 py-3 text-center text-red-600">{formatNumber(row.absent)}</td><td className="px-3 py-3 text-center text-amber-600">{formatNumber(row.late)}</td><td className="px-3 py-3 text-center text-sky-600">{formatNumber(row.leave)}</td><td className="px-3 py-3 text-center font-bold">{formatNumber(row.attendanceRate, { maximumFractionDigits: 1 })}%</td></tr>) : (pagedRows as DepartmentSummary[]).map((row) => <tr key={row.id} className="border-b hover:bg-slate-50"><td className="px-3 py-3 font-semibold">{row.department}</td><td className="px-3 py-3 text-center">{formatNumber(row.employees)}</td><td className="px-3 py-3 text-center text-emerald-700">{formatNumber(row.present)}</td><td className="px-3 py-3 text-center text-red-600">{formatNumber(row.absent)}</td><td className="px-3 py-3 text-center text-amber-600">{formatNumber(row.late)}</td><td className="px-3 py-3 text-center text-sky-600">{formatNumber(row.leave)}</td><td className="px-3 py-3 text-center font-bold">{formatNumber(row.attendanceRate, { maximumFractionDigits: 1 })}%</td></tr>)}</tbody></table></div>
      <footer className="flex items-center justify-between border-t px-4 py-3 text-xs text-slate-500"><span>{formatNumber(allRows.length)} {t("من السجلات")}</span><div className="flex items-center gap-2"><Button variant="outline" size="sm" disabled={safePage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>{t("السابق")}</Button><span>{formatNumber(safePage)} / {formatNumber(totalPages)}</span><Button variant="outline" size="sm" disabled={safePage >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>{t("التالي")}</Button></div></footer>
    </section>
  </main></Layout>;
}
