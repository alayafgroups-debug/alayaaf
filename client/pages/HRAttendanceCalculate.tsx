import { useEffect, useMemo, useState } from "react";
import Layout from "@/components/Layout";
import { Download, Printer, RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabaseClient";
import { exportReportExcel, type ReportColumn } from "@/lib/reportExport";
import { useI18n } from "@/i18n";
import { COMPANY_PROFILE } from "@/lib/companyProfile";
import AttendanceWorkspaceNav from "@/components/hr/AttendanceWorkspaceNav";

const ALL = "all";
type ReportMode = "employees" | "departments";
type StatusFilter = "all" | "present" | "absent" | "late" | "leave";
type AttendanceAction = "punch" | "bulk" | "overtime" | "permission" | "clear-punches" | "delete-bulk";
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
  employmentType: string;
  photoUrl: string;
  dailyHours: number;
};
type AttendanceRecord = { empId: string; date: string; status: string; checkIn: string; checkOut: string; lateMinutes: number; notes: string };
type OvertimeRecord = { employeeId: string; date: string; hours: number };
type PermissionRecord = { empId: string; date: string; hours: number };
type DailyAttendanceDetail = Employee & { rowId: string; date: string; statusLabel: string; checkIn: string; checkOut: string; worked: string; required: string; late: string; permission: string; deficit: string; overtime: string; notes: string };
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
const timeToSeconds = (value: string) => {
  if (!value) return null;
  const [hours, minutes, seconds = "0"] = value.split(":");
  const total = Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds);
  return Number.isFinite(total) ? total : null;
};
const durationBetween = (start: string, end: string) => {
  const startSeconds = timeToSeconds(start);
  const endSeconds = timeToSeconds(end);
  if (startSeconds === null || endSeconds === null) return 0;
  return endSeconds >= startSeconds ? endSeconds - startSeconds : 86400 - startSeconds + endSeconds;
};
const formatDuration = (seconds: number) => {
  const safeSeconds = Math.max(0, Math.round(seconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainingSeconds = safeSeconds % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
};
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
  const { t, locale, direction, formatNumber } = useI18n();
  const initialRange = monthRange();
  const [dateFrom, setDateFrom] = useState(initialRange.from);
  const [dateTo, setDateTo] = useState(initialRange.to);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [overtimeRecords, setOvertimeRecords] = useState<OvertimeRecord[]>([]);
  const [permissionRecords, setPermissionRecords] = useState<PermissionRecord[]>([]);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [sections, setSections] = useState<SectionOption[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [jobTitles, setJobTitles] = useState<string[]>([]);
  const [workSchedules, setWorkSchedules] = useState<string[]>([]);
  const [workLocations, setWorkLocations] = useState<string[]>([]);
  const [branch, setBranch] = useState(ALL);
  const [departmentId, setDepartmentId] = useState(ALL);
  const [sectionId, setSectionId] = useState(ALL);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [employeePickerSearch, setEmployeePickerSearch] = useState("");
  const [jobTitle, setJobTitle] = useState(ALL);
  const [workSchedule, setWorkSchedule] = useState(ALL);
  const [workLocation, setWorkLocation] = useState(ALL);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [mode, setMode] = useState<ReportMode>("employees");
  const [showUnrecordedDays, setShowUnrecordedDays] = useState(true);
  const [showNotes, setShowNotes] = useState(true);
  const [attendanceAction, setAttendanceAction] = useState<AttendanceAction | null>(null);
  const [actionDate, setActionDate] = useState(initialRange.from);
  const [actionCheckIn, setActionCheckIn] = useState("08:00");
  const [actionCheckOut, setActionCheckOut] = useState("17:00");
  const [actionHours, setActionHours] = useState("1");
  const [actionReason, setActionReason] = useState("");
  const [actionSaving, setActionSaving] = useState(false);
  const [actionMessage, setActionMessage] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = async () => {
    if (!dateFrom || !dateTo || dateFrom > dateTo) { setError(t("تاريخ البداية يجب أن يسبق تاريخ النهاية")); return; }
    setLoading(true); setError("");
    const [employeeResult, attendanceResult, overtimeResult, permissionResult, departmentResult, sectionResult, branchResult, jobResult, scheduleResult, locationResult] = await Promise.all([
      supabase.from("employees").select("id, emp_id, name, branch_id, branch, department_id, section_id, directorate, department, job_title, work_schedule, work_location, employment_type, photo_url, daily_hours").in("status", ["نشط", "فعال", "active"]).order("name"),
      supabase.from("attendance").select("emp_id, date, status, check_in, check_out, late_minutes, notes").gte("date", dateFrom).lte("date", dateTo).order("date"),
      supabase.from("overtime_records").select("employee_id, date, hours").gte("date", dateFrom).lte("date", dateTo).in("status", ["معتمدة", "معتمد", "approved"]),
      supabase.from("hr_requests").select("emp_id, start_date, details").eq("request_type", "استئذان").gte("start_date", dateFrom).lte("start_date", dateTo).in("status", ["معتمدة", "معتمد", "approved"]),
      supabase.from("departments").select("id, name, name_en, branch_id").eq("status", "فعال").order("name"),
      supabase.from("org_sections").select("id, name, name_en, department_id").eq("status", "فعال").order("name"),
      supabase.from("branches").select("id, name, name_en").eq("status", "فعال").order("name"),
      supabase.from("hr_jobs").select("id, name, name_en").eq("status", "فعال").order("name"),
      supabase.from("attendance_schedules").select("id, name").eq("status", "فعال").order("name"),
      supabase.from("hr_work_locations").select("id, name, name_en").eq("status", "فعال").order("name"),
    ]);
    const firstError = employeeResult.error ?? attendanceResult.error ?? overtimeResult.error ?? permissionResult.error ?? departmentResult.error ?? sectionResult.error ?? branchResult.error ?? jobResult.error ?? scheduleResult.error ?? locationResult.error;
    if (firstError) { setError(firstError.message); setLoading(false); return; }
    const localizedName = (row: { name: unknown; name_en?: unknown }) => {
      const arabicName = String(row.name ?? "");
      const englishName = String(row.name_en ?? "").trim();
      return locale === "en" ? englishName || t(arabicName) : arabicName;
    };
    const branchRows: BranchOption[] = (branchResult.data ?? []).map((row) => ({ id: String(row.id), name: localizedName(row) }));
    const branchById = new Map(branchRows.map((item) => [item.id, item.name]));
    const departmentRows: DepartmentOption[] = (departmentResult.data ?? []).map((row) => ({ id: String(row.id), name: localizedName(row), branchId: String(row.branch_id ?? "") }));
    const departmentById = new Map(departmentRows.map((item) => [item.id, item.name]));
    const sectionRows: SectionOption[] = (sectionResult.data ?? []).map((row) => ({ id: String(row.id), name: localizedName(row), departmentId: String(row.department_id ?? "") }));
    const sectionById = new Map(sectionRows.map((item) => [item.id, item.name]));
    const jobByName = new Map((jobResult.data ?? []).map((row) => [String(row.name ?? ""), localizedName(row)]));
    const scheduleByName = new Map((scheduleResult.data ?? []).map((row) => [String(row.name ?? ""), t(String(row.name ?? ""))]));
    const locationByName = new Map((locationResult.data ?? []).map((row) => [String(row.name ?? ""), localizedName(row)]));
    const loadedEmployees: Employee[] = (employeeResult.data ?? []).map((row) => ({
      id: String(row.id), empId: String(row.emp_id ?? row.id), name: String(row.name ?? "-"), branchId: String(row.branch_id ?? ""), branch: branchById.get(String(row.branch_id ?? "")) || t("غير مرتبط"),
      departmentId: String(row.department_id ?? ""), department: departmentById.get(String(row.department_id ?? "")) || t("غير مرتبط"),
      sectionId: String(row.section_id ?? ""), section: sectionById.get(String(row.section_id ?? "")) || t("غير مرتبط"),
      jobTitle: jobByName.get(String(row.job_title ?? "")) || t(String(row.job_title ?? "")), workSchedule: scheduleByName.get(String(row.work_schedule ?? "")) || t(String(row.work_schedule ?? "")), workLocation: locationByName.get(String(row.work_location ?? "")) || t(String(row.work_location ?? "")), employmentType: t(String(row.employment_type ?? "دوام كامل")), photoUrl: String(row.photo_url ?? ""), dailyHours: Number(row.daily_hours ?? 8),
    }));
    setDepartments(departmentRows);
    setSections(sectionRows);
    setEmployees(loadedEmployees);
    setAttendance((attendanceResult.data ?? []).map((row) => ({ empId: String(row.emp_id ?? ""), date: String(row.date ?? ""), status: String(row.status ?? ""), checkIn: String(row.check_in ?? ""), checkOut: String(row.check_out ?? ""), lateMinutes: Number(row.late_minutes ?? 0), notes: String(row.notes ?? "") })));
    setOvertimeRecords((overtimeResult.data ?? []).map((row) => ({ employeeId: String(row.employee_id ?? ""), date: String(row.date ?? ""), hours: Number(row.hours ?? 0) })));
    setPermissionRecords((permissionResult.data ?? []).map((row) => { const details = row.details && typeof row.details === "object" ? row.details as Record<string, unknown> : {}; return { empId: String(row.emp_id ?? ""), date: String(row.start_date ?? ""), hours: Number(details.hours ?? 0) }; }));
    setBranches(branchRows);
    setJobTitles(unique([...(jobResult.data ?? []).map((row) => localizedName(row)), ...loadedEmployees.map((item) => item.jobTitle)]));
    setWorkSchedules(unique([...(scheduleResult.data ?? []).map((row) => t(String(row.name ?? ""))), ...loadedEmployees.map((item) => item.workSchedule)]));
    setWorkLocations(unique([...(locationResult.data ?? []).map((row) => localizedName(row)), ...loadedEmployees.map((item) => item.workLocation)]));
    setLoading(false);
  };

  useEffect(() => { void loadData(); }, [dateFrom, dateTo, locale]);
  useEffect(() => { setPage(1); }, [branch, departmentId, sectionId, selectedEmployeeIds, jobTitle, workSchedule, workLocation, statusFilter, mode, search, pageSize]);

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
    return selectedEmployeeIds.includes(employee.id) && (branch === ALL || employee.branchId === branch) && departmentMatches && sectionMatches && (jobTitle === ALL || employee.jobTitle === jobTitle) && (workSchedule === ALL || employee.workSchedule === workSchedule) && (workLocation === ALL || employee.workLocation === workLocation) && (statusFilter === "all" || employee[statusFilter] > 0) && (!keyword || [employee.name, employee.empId, employee.department, employee.section, employee.jobTitle, employee.branch].some((value) => value.toLowerCase().includes(keyword)));
  });
  const detailedRows = useMemo<DailyAttendanceDetail[]>(() => {
    const recordsByEmployeeAndDate = new Map(attendance.map((record) => [`${record.empId}:${record.date}`, record]));
    const overtimeByEmployeeAndDate = new Map<string, number>();
    overtimeRecords.forEach((record) => { const key = `${record.employeeId}:${record.date}`; overtimeByEmployeeAndDate.set(key, (overtimeByEmployeeAndDate.get(key) ?? 0) + record.hours * 3600); });
    const permissionByEmployeeAndDate = new Map<string, number>();
    permissionRecords.forEach((record) => { const key = `${record.empId}:${record.date}`; permissionByEmployeeAndDate.set(key, (permissionByEmployeeAndDate.get(key) ?? 0) + record.hours * 3600); });
    const rows: DailyAttendanceDetail[] = [];
    employeeSummaries.filter((employee) => selectedEmployeeIds.includes(employee.id)).forEach((employee) => {
      const requiredSeconds = Math.max(0, employee.dailyHours) * 3600;
      for (let offset = 0; offset < dayCount(dateFrom, dateTo); offset += 1) {
        const currentDate = new Date(`${dateFrom}T00:00:00`);
        currentDate.setDate(currentDate.getDate() + offset);
        const date = currentDate.toISOString().slice(0, 10);
        const record = recordsByEmployeeAndDate.get(`${employee.empId}:${date}`);
        const workedSeconds = record ? durationBetween(record.checkIn, record.checkOut) : 0;
        const manualOvertimeSeconds = overtimeByEmployeeAndDate.get(`${employee.id}:${date}`) ?? 0;
        const permissionSeconds = permissionByEmployeeAndDate.get(`${employee.empId}:${date}`) ?? 0;
        const category = classifyStatus(record);
        rows.push({
          ...employee,
          rowId: `${employee.id}:${date}`,
          date,
          statusLabel: category === "present" ? t("حاضر") : category === "late" ? t("متأخر") : category === "leave" ? t("إجازة") : t("غائب"),
          checkIn: record?.checkIn || "—",
          checkOut: record?.checkOut || "—",
          worked: formatDuration(workedSeconds),
          required: formatDuration(category === "leave" ? 0 : requiredSeconds),
          late: formatDuration((record?.lateMinutes ?? 0) * 60),
          permission: formatDuration(permissionSeconds),
          deficit: formatDuration(category === "leave" ? 0 : Math.max(requiredSeconds - workedSeconds - permissionSeconds, 0)),
          overtime: formatDuration(Math.max(workedSeconds - requiredSeconds, 0) + manualOvertimeSeconds),
          notes: record?.notes || "",
        });
      }
    });
    return rows;
  }, [attendance, dateFrom, dateTo, employeeSummaries, overtimeRecords, permissionRecords, selectedEmployeeIds, t]);

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

  const visibleDetailedRows = detailedRows.filter((row) => showUnrecordedDays || row.checkIn !== "—" || row.checkOut !== "—" || row.statusLabel === t("إجازة"));
  const allRows = mode === "employees" ? filteredEmployees : departmentSummaries;
  const totalPages = Math.max(1, Math.ceil(allRows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedRows = allRows.slice((safePage - 1) * pageSize, safePage * pageSize);
  const columns: ReportColumn[] = mode === "employees"
    ? [{ key: "name", label: t("اسم الموظف") }, { key: "empId", label: t("رقم الموظف") }, { key: "date", label: t("التاريخ") }, { key: "statusLabel", label: t("الحالة") }, { key: "checkIn", label: t("دخول") }, { key: "checkOut", label: t("خروج") }, { key: "worked", label: t("ساعات الحضور") }, { key: "required", label: t("الساعات المستحقة") }, { key: "late", label: t("ساعات التأخير") }, { key: "permission", label: t("ساعات الاستئذان") }, { key: "deficit", label: t("ساعات النقص") }, { key: "overtime", label: t("الساعات الإضافية") }, ...(showNotes ? [{ key: "notes", label: t("ملاحظات") }] : [])]
    : [{ key: "department", label: t("الإدارة") }, { key: "employees", label: t("عدد الموظفين") }, { key: "present", label: t("حاضر") }, { key: "absent", label: t("غائب") }, { key: "late", label: t("متأخر") }, { key: "leave", label: t("إجازة") }, { key: "attendanceRate", label: t("نسبة الحضور") }];
  const reportRows = mode === "employees" ? visibleDetailedRows : departmentSummaries.map((row) => ({ ...row, attendanceRate: `${row.attendanceRate.toFixed(1)}%` }));
  const reportTitle = t(mode === "employees" ? "تقرير حساب دوام الموظفين" : "تقرير ملخص الأقسام");
  const reportOptions = { title: reportTitle, subtitle: `${dateFrom} — ${dateTo}`, columns, rows: reportRows, fileName: `${mode}-attendance-${dateFrom}-${dateTo}`, landscape: true, summary: [{ label: t("عدد السجلات"), value: reportRows.length }] };
  const departmentOptions = departments.filter((item) => branch === ALL || item.branchId === branch).map((item) => ({ value: item.id, label: item.name }));
  const sectionOptions = sections.filter((item) => departmentId === ALL || item.departmentId === departmentId).map((item) => ({ value: item.id, label: item.name }));
  const selectableEmployees = employees.filter((employee) => {
    const keyword = employeePickerSearch.trim().toLowerCase();
    return (branch === ALL || employee.branchId === branch)
      && (departmentId === ALL || employee.departmentId === departmentId)
      && (sectionId === ALL || employee.sectionId === sectionId)
      && (jobTitle === ALL || employee.jobTitle === jobTitle)
      && (workSchedule === ALL || employee.workSchedule === workSchedule)
      && (workLocation === ALL || employee.workLocation === workLocation)
      && (!keyword || [employee.name, employee.empId, employee.department, employee.section, employee.jobTitle].some((value) => value.toLowerCase().includes(keyword)));
  });
  const allSelectableSelected = selectableEmployees.length > 0 && selectableEmployees.every((employee) => selectedEmployeeIds.includes(employee.id));
  const toggleEmployee = (id: string) => setSelectedEmployeeIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const toggleAllSelectable = () => setSelectedEmployeeIds((current) => {
    const selectableIds = selectableEmployees.map((employee) => employee.id);
    return allSelectableSelected ? current.filter((id) => !selectableIds.includes(id)) : [...new Set([...current, ...selectableIds])];
  });
  const actionEmployees = employees.filter((employee) => selectedEmployeeIds.includes(employee.id));
  const saveAttendanceAction = async () => {
    if (!attendanceAction || actionEmployees.length === 0) return;
    setActionSaving(true);
    setActionMessage("");
    try {
      if (attendanceAction === "punch") {
        const payload = actionEmployees.map((employee) => ({ emp_id: employee.empId, emp_name: employee.name, department: employee.department, date: actionDate, check_in: actionCheckIn || null, check_out: actionCheckOut || null, status: "حاضر", late_minutes: 0, notes: actionReason || "إضافة دخول وخروج من حساب الدوام", entry_source: "manager_manual", prepared_by: "الإدارة", updated_at: new Date().toISOString() }));
        const { error: saveError } = await supabase.from("attendance").upsert(payload, { onConflict: "emp_id,date" });
        if (saveError) throw saveError;
      } else if (attendanceAction === "bulk") {
        const payload = actionEmployees.flatMap((employee) => Array.from({ length: dayCount(dateFrom, dateTo) }, (_, offset) => {
          const date = new Date(`${dateFrom}T00:00:00`); date.setDate(date.getDate() + offset);
          return { emp_id: employee.empId, emp_name: employee.name, department: employee.department, date: date.toISOString().slice(0, 10), check_in: actionCheckIn || null, check_out: actionCheckOut || null, status: "حاضر", late_minutes: 0, notes: actionReason || "تحضير متعدد من حساب الدوام", entry_source: "manager_manual", prepared_by: "الإدارة", updated_at: new Date().toISOString() };
        }));
        const { error: saveError } = await supabase.from("attendance").upsert(payload, { onConflict: "emp_id,date" });
        if (saveError) throw saveError;
      } else if (attendanceAction === "overtime") {
        const hours = Number(actionHours);
        if (!Number.isFinite(hours) || hours <= 0) throw new Error(t("أدخل عدد ساعات صحيح"));
        const { error: saveError } = await supabase.from("overtime_records").insert(actionEmployees.map((employee) => ({ employee_id: employee.id, emp_name: employee.name, date: actionDate, hours, rate: 1.5, amount: 0, status: "معتمدة" })));
        if (saveError) throw saveError;
      } else if (attendanceAction === "permission") {
        const hours = Number(actionHours);
        if (!Number.isFinite(hours) || hours <= 0) throw new Error(t("أدخل عدد ساعات صحيح"));
        const { error: saveError } = await supabase.from("hr_requests").insert(actionEmployees.map((employee) => ({ emp_id: employee.empId, emp_name: employee.name, request_type: "استئذان", start_date: actionDate, end_date: actionDate, status: "معتمد", details: { hours, reason: actionReason, source: "attendance_calculation" } })));
        if (saveError) throw saveError;
      } else if (attendanceAction === "clear-punches") {
        const { error: saveError } = await supabase.from("attendance").update({ check_in: null, check_out: null, status: "غائب", notes: actionReason || "حذف الدخول والخروج من حساب الدوام", updated_at: new Date().toISOString() }).in("emp_id", actionEmployees.map((employee) => employee.empId)).eq("date", actionDate);
        if (saveError) throw saveError;
      } else {
        const { error: saveError } = await supabase.from("attendance").delete().in("emp_id", actionEmployees.map((employee) => employee.empId)).gte("date", dateFrom).lte("date", dateTo).eq("entry_source", "manager_manual");
        if (saveError) throw saveError;
      }
      setActionMessage(t("تم تنفيذ العملية بنجاح"));
      setAttendanceAction(null);
      await loadData();
    } catch (actionError) {
      setActionMessage(actionError instanceof Error ? actionError.message : t("تعذر تنفيذ العملية"));
    } finally {
      setActionSaving(false);
    }
  };
  const selectedEmployeesForDetail = employeeSummaries.filter((employee) => selectedEmployeeIds.includes(employee.id));
  const comprehensiveRows = selectedEmployeesForDetail.map((employee) => {
    const employeeAttendance = attendance.filter((record) => record.empId === employee.empId);
    const presentDays = employeeAttendance.filter((record) => ["present", "late"].includes(classifyStatus(record))).length;
    const absentDays = employeeAttendance.filter((record) => classifyStatus(record) === "absent").length;
    const workedSeconds = employeeAttendance.reduce((sum, record) => sum + durationBetween(record.checkIn, record.checkOut), 0);
    const lateSeconds = employeeAttendance.reduce((sum, record) => sum + record.lateMinutes * 60, 0);
    const permissionSeconds = permissionRecords.filter((record) => record.empId === employee.empId).reduce((sum, record) => sum + record.hours * 3600, 0);
    const manualOvertimeSeconds = overtimeRecords.filter((record) => record.employeeId === employee.id).reduce((sum, record) => sum + record.hours * 3600, 0);
    const expectedWorkDays = Array.from({ length: dayCount(dateFrom, dateTo) }, (_, offset) => {
      const date = new Date(`${dateFrom}T00:00:00`);
      date.setDate(date.getDate() + offset);
      return date.getDay();
    }).filter((day) => day !== 5 && day !== 6).length;
    const requiredSeconds = expectedWorkDays * Math.max(0, employee.dailyHours) * 3600;
    const calculatedOvertimeSeconds = employeeAttendance.reduce((sum, record) => sum + Math.max(durationBetween(record.checkIn, record.checkOut) - employee.dailyHours * 3600, 0), 0);
    return {
      empId: employee.empId,
      name: employee.name,
      workTime: employee.employmentType || t("دوام كامل"),
      periodDays: expectedWorkDays,
      presentDays,
      absentDays,
      overtime: formatDuration(manualOvertimeSeconds + calculatedOvertimeSeconds),
      required: formatDuration(requiredSeconds),
      worked: formatDuration(workedSeconds),
      late: formatDuration(lateSeconds),
      permission: formatDuration(permissionSeconds),
      deficit: formatDuration(Math.max(requiredSeconds - workedSeconds - permissionSeconds, 0)),
      workSchedule: employee.workSchedule || t("غير محدد"),
    };
  });
  const comprehensiveColumns: ReportColumn[] = [
    { key: "empId", label: t("الرقم الوظيفي"), width: 14 },
    { key: "name", label: t("اسم الموظف"), width: 24 },
    { key: "workTime", label: t("وقت العمل"), width: 15 },
    { key: "periodDays", label: t("أيام العمل في الفترة"), width: 15 },
    { key: "presentDays", label: t("مجموع أيام الحضور"), width: 16 },
    { key: "absentDays", label: t("مجموع أيام الغياب"), width: 16 },
    { key: "overtime", label: t("إجمالي الساعات الإضافية"), width: 18 },
    { key: "required", label: t("إجمالي الساعات المستحقة في الفترة"), width: 21 },
    { key: "worked", label: t("إجمالي ساعات العمل"), width: 18 },
    { key: "late", label: t("إجمالي ساعات التأخير"), width: 18 },
    { key: "permission", label: t("إجمالي ساعات الاستئذان"), width: 18 },
    { key: "deficit", label: t("إجمالي ساعات النقص"), width: 18 },
    { key: "workSchedule", label: t("جدول العمل"), width: 18 },
  ];
  const comprehensiveReportOptions = { title: t("النتائج (تقرير شامل)"), subtitle: `${dateFrom} — ${dateTo}`, columns: comprehensiveColumns, rows: comprehensiveRows, fileName: `comprehensive-attendance-${dateFrom}-${dateTo}`, landscape: true, summary: [{ label: t("عدد الموظفين"), value: comprehensiveRows.length }] };
  const printCurrentReport = () => window.print();
  const showDepartmentSummary = () => false;

  return <Layout><main dir={direction} className="space-y-4">
    <AttendanceWorkspaceNav />
    <style>{`
      .attendance-print-only { display: none; }
      @media print {
        @page { size: A3 landscape; margin: 8mm; }
        body * { visibility: hidden !important; }
        #attendance-print-area, #attendance-print-area * { visibility: visible !important; }
        #attendance-print-area { position: absolute; inset: 0; width: 100%; background: white; }
        .attendance-no-print { display: none !important; }
        .attendance-print-only { display: block !important; }
        .attendance-print-page { break-after: page; box-shadow: none !important; border: 0 !important; }
        .attendance-print-page:last-child { break-after: auto; }
        .attendance-detail-table { font-size: 9px !important; }
        .attendance-detail-table th, .attendance-detail-table td { padding: 5px !important; }
      }
    `}</style>
    <header className="attendance-no-print flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-bold text-[#004e89]">{t("حساب الدوام")}</h1><p className="mt-1 text-sm text-slate-500">{t("تقرير حضور الموظفين المرتبط بالفروع والإدارات والأقسام المحفوظة")}</p></div><div className="flex gap-2"><Button variant="outline" size="icon" onClick={() => void loadData()} title={t("تحديث")}><RefreshCw className="h-4 w-4" /></Button><Button variant="outline" size="icon" onClick={printCurrentReport} disabled={!reportRows.length} title={t("طباعة / PDF")}><Printer className="h-4 w-4" /></Button><Button variant="outline" size="icon" onClick={() => exportReportExcel(mode === "departments" ? comprehensiveReportOptions : reportOptions)} disabled={mode === "departments" ? !comprehensiveRows.length : !reportRows.length} title={t("تحميل Excel")}><Download className="h-4 w-4" /></Button></div></header>
    <section className="attendance-no-print rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <label className="space-y-1 text-xs font-medium text-slate-600"><span className="block">{t("من تاريخ")}</span><Input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} /></label>
      <label className="space-y-1 text-xs font-medium text-slate-600"><span className="block">{t("إلى تاريخ")}</span><Input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} /></label>
      <FilterSelect label={t("الفرع")} value={branch} onChange={(value) => { setBranch(value); setDepartmentId(ALL); setSectionId(ALL); setSelectedEmployeeIds([]); }} options={branches.map((item) => ({ value: item.id, label: item.name }))} allLabel={t("الكل")} />
      <FilterSelect label={t("الإدارة")} value={departmentId} onChange={(value) => { setDepartmentId(value); setSectionId(ALL); setSelectedEmployeeIds([]); }} options={departmentOptions} allLabel={t("الكل")} />
      <FilterSelect label={t("القسم")} value={sectionId} onChange={(value) => { setSectionId(value); setSelectedEmployeeIds([]); }} options={sectionOptions} allLabel={t("الكل")} />
      <FilterSelect label={t("المسمى الوظيفي")} value={jobTitle} onChange={setJobTitle} options={jobTitles.map((name) => ({ value: name, label: name }))} allLabel={t("الكل")} />
      <FilterSelect label={t("جدول العمل")} value={workSchedule} onChange={setWorkSchedule} options={workSchedules.map((name) => ({ value: name, label: name }))} allLabel={t("الكل")} />
      <FilterSelect label={t("مكان العمل")} value={workLocation} onChange={setWorkLocation} options={workLocations.map((name) => ({ value: name, label: name }))} allLabel={t("الكل")} />
      <FilterSelect label={t("حالة الدوام")} value={statusFilter} onChange={(value) => setStatusFilter(value as StatusFilter)} options={[{ value: "present", label: t("حاضر") }, { value: "absent", label: t("غائب") }, { value: "late", label: t("متأخر") }, { value: "leave", label: t("إجازة") }]} allLabel={t("الكل")} />
      <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-4">
        <Button
          type="button"
          onClick={() => setMode("employees")}
          aria-pressed={mode === "employees"}
          className={mode === "employees" ? "bg-[#075f94] text-white hover:bg-[#064f7b]" : "border border-[#075f94] bg-white text-[#075f94] hover:bg-blue-50"}
        >
          {t("اختيار الموظفين (تفصيلي)")}
        </Button>
        <Button
          type="button"
          onClick={() => setMode("departments")}
          aria-pressed={mode === "departments"}
          className={mode === "departments" ? "bg-[#075f94] text-white hover:bg-[#064f7b]" : "border border-[#075f94] bg-white text-[#075f94] hover:bg-blue-50"}
        >
          {t("تقرير شامل (ملخص)")}
        </Button>
      </div>
    </div></section>
    <section className="attendance-no-print overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
        <div>
          <h2 className="font-bold text-slate-800">{t("الموظفون")}</h2>
          <p className="mt-1 text-xs text-slate-500">{t("حدد موظفًا واحدًا أو عدة موظفين لإنشاء التقرير")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-[#075f94]">{t("المحدد")}: {formatNumber(selectedEmployeeIds.length)}</span>
          <div className="relative w-64 max-w-full"><Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/><Input value={employeePickerSearch} onChange={(event) => setEmployeePickerSearch(event.target.value)} placeholder={t("بحث عن موظف...")} className="pr-9" /></div>
        </div>
      </div>
      <div className="max-h-80 overflow-auto">
        <table className="min-w-full text-xs">
          <thead className="sticky top-0 z-10 bg-[#075f94] text-white"><tr><th className="w-12 px-3 py-3"><input type="checkbox" checked={allSelectableSelected} onChange={toggleAllSelectable} aria-label={t("تحديد الكل")} className="h-4 w-4 accent-blue-600" /></th><th className="px-3 py-3">{t("الصورة")}</th><th className="px-3 py-3 text-right">{t("الاسم")}</th><th className="px-3 py-3 text-right">{t("المسمى الوظيفي")}</th><th className="px-3 py-3 text-right">{t("الإدارة")}</th><th className="px-3 py-3 text-right">{t("القسم")}</th><th className="px-3 py-3 text-right">{t("جدول العمل")}</th><th className="px-3 py-3 text-right">{t("مكان العمل")}</th></tr></thead>
          <tbody>{loading ? <tr><td colSpan={8} className="py-10 text-center text-slate-400">{t("جاري التحميل...")}</td></tr> : selectableEmployees.length === 0 ? <tr><td colSpan={8} className="py-10 text-center text-slate-400">{t("لا يوجد موظفون مرتبطون بالفلاتر المحددة")}</td></tr> : selectableEmployees.map((employee) => {
            const selected = selectedEmployeeIds.includes(employee.id);
            return <tr key={employee.id} onClick={() => toggleEmployee(employee.id)} className={`cursor-pointer border-b transition-colors ${selected ? "bg-blue-50" : "hover:bg-slate-50"}`}><td className="px-3 py-3 text-center"><input type="checkbox" checked={selected} onChange={() => toggleEmployee(employee.id)} onClick={(event) => event.stopPropagation()} aria-label={`${t("تحديد")} ${employee.name}`} className="h-4 w-4 accent-blue-600" /></td><td className="px-3 py-2"><div className="mx-auto flex h-10 w-10 items-center justify-center overflow-hidden rounded-md bg-slate-100 text-sm font-bold text-slate-500">{employee.photoUrl ? <img src={employee.photoUrl} alt={employee.name} className="h-full w-full object-cover" /> : employee.name.trim().charAt(0)}</div></td><td className="px-3 py-3 font-semibold text-slate-800"><div>{employee.name}</div><div className="mt-0.5 font-normal text-slate-400">{employee.empId}</div></td><td className="px-3 py-3">{employee.jobTitle || "—"}</td><td className="px-3 py-3">{employee.department || "—"}</td><td className="px-3 py-3">{employee.section || "—"}</td><td className="px-3 py-3">{employee.workSchedule || "—"}</td><td className="px-3 py-3">{employee.workLocation || "—"}</td></tr>;
          })}</tbody>
        </table>
      </div>
    </section>
    {selectedEmployeeIds.length === 0 && !loading && <div className="attendance-no-print rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{t("حدد موظفًا واحدًا على الأقل لعرض التقرير وطباعته")}</div>}
    {mode === "employees" && selectedEmployeeIds.length > 0 && <section className="attendance-no-print rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" onClick={() => setAttendanceAction("punch")} className="bg-[#075f94] text-white hover:bg-[#064f7b]">{t("أضف دخول/خروج")}</Button>
        <Button type="button" variant="outline" size="sm" onClick={() => setAttendanceAction("bulk")}>{t("إضافة تحضير متعدد")}</Button>
        <Button type="button" variant="outline" size="sm" onClick={() => setAttendanceAction("overtime")}>{t("أضف ساعات إضافية")}</Button>
        <Button type="button" variant="outline" size="sm" onClick={() => setAttendanceAction("permission")}>{t("أضف ساعات استئذان")}</Button>
        <Button type="button" variant="outline" size="sm" onClick={() => setAttendanceAction("clear-punches")} className="border-red-200 text-red-700 hover:bg-red-50">{t("حذف دخول/خروج")}</Button>
        <Button type="button" variant="outline" size="sm" onClick={() => setAttendanceAction("delete-bulk")} className="border-red-200 text-red-700 hover:bg-red-50">{t("حذف تحضير متعدد")}</Button>
      </div>
      {attendanceAction && <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50/50 p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {attendanceAction !== "bulk" && <label className="space-y-1 text-xs font-medium text-slate-600"><span className="block">{t("التاريخ")}</span><Input type="date" min={dateFrom} max={dateTo} value={actionDate} onChange={(event) => setActionDate(event.target.value)} /></label>}
          {(attendanceAction === "punch" || attendanceAction === "bulk") && <><label className="space-y-1 text-xs font-medium text-slate-600"><span className="block">{t("وقت الدخول")}</span><Input type="time" value={actionCheckIn} onChange={(event) => setActionCheckIn(event.target.value)} /></label><label className="space-y-1 text-xs font-medium text-slate-600"><span className="block">{t("وقت الخروج")}</span><Input type="time" value={actionCheckOut} onChange={(event) => setActionCheckOut(event.target.value)} /></label></>}
          {(attendanceAction === "overtime" || attendanceAction === "permission") && <label className="space-y-1 text-xs font-medium text-slate-600"><span className="block">{t("عدد الساعات")}</span><Input type="number" min="0.25" step="0.25" value={actionHours} onChange={(event) => setActionHours(event.target.value)} /></label>}
          {attendanceAction !== "delete-bulk" && <label className="space-y-1 text-xs font-medium text-slate-600"><span className="block">{t("السبب / الملاحظات")}</span><Input value={actionReason} onChange={(event) => setActionReason(event.target.value)} /></label>}
        </div>
        <p className="mt-3 text-xs text-slate-600">{attendanceAction === "bulk" || attendanceAction === "delete-bulk" ? `${t("سيتم التطبيق على الموظفين المحددين خلال الفترة")}: ${dateFrom} — ${dateTo}` : `${t("سيتم التطبيق على الموظفين المحددين")}: ${formatNumber(actionEmployees.length)}`}</p>
        {(attendanceAction === "clear-punches" || attendanceAction === "delete-bulk") && <p className="mt-2 text-xs font-semibold text-red-700">{attendanceAction === "delete-bulk" ? t("سيتم حذف سجلات التحضير الإداري فقط ولن تُحذف بصمات الموظفين الجغرافية") : t("سيتم مسح وقت الدخول والخروج مع إبقاء سجل اليوم")}</p>}
        <div className="mt-4 flex gap-2"><Button type="button" size="sm" onClick={() => void saveAttendanceAction()} disabled={actionSaving}>{actionSaving ? t("جاري الحفظ...") : t("تأكيد العملية")}</Button><Button type="button" variant="outline" size="sm" onClick={() => setAttendanceAction(null)} disabled={actionSaving}>{t("إلغاء")}</Button></div>
      </div>}
      {actionMessage && <p className="mt-3 text-sm text-slate-700">{actionMessage}</p>}
    </section>}
    {error && <div className="attendance-no-print rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
    {mode === "employees" && selectedEmployeesForDetail.length > 0 && <div id="attendance-print-area" className="space-y-4">
      {selectedEmployeesForDetail.map((employee) => {
        const rows = visibleDetailedRows.filter((row) => row.id === employee.id);
        const totalWorked = rows.reduce((sum, row) => sum + (timeToSeconds(row.worked) ?? 0), 0);
        const totalRequired = rows.reduce((sum, row) => sum + (timeToSeconds(row.required) ?? 0), 0);
        const totalLate = rows.reduce((sum, row) => sum + (timeToSeconds(row.late) ?? 0), 0);
        const totalPermission = rows.reduce((sum, row) => sum + (timeToSeconds(row.permission) ?? 0), 0);
        const totalDeficit = rows.reduce((sum, row) => sum + (timeToSeconds(row.deficit) ?? 0), 0);
        const totalOvertime = rows.reduce((sum, row) => sum + (timeToSeconds(row.overtime) ?? 0), 0);
        const presentDays = rows.filter((row) => row.statusLabel === t("حاضر") || row.statusLabel === t("متأخر")).length;
        const absentDays = rows.filter((row) => row.statusLabel === t("غائب")).length;
        const leaveDays = rows.filter((row) => row.statusLabel === t("إجازة")).length;
        return <article key={employee.id} className="attendance-print-page overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="attendance-no-print flex flex-wrap items-center justify-between gap-3 border-b bg-white px-5 py-3">
            <div className="flex flex-wrap items-center gap-5 text-sm">
              <label className="flex cursor-pointer items-center gap-2"><input type="checkbox" checked={showUnrecordedDays} onChange={(event) => setShowUnrecordedDays(event.target.checked)} className="h-4 w-4 accent-[#075f94]" />{t("إظهار الأيام بدون تسجيل")}</label>
              <label className="flex cursor-pointer items-center gap-2"><input type="checkbox" checked={showNotes} onChange={(event) => setShowNotes(event.target.checked)} className="h-4 w-4 accent-[#075f94]" />{t("إظهار الملاحظات")}</label>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => void loadData()}><RefreshCw className="ms-1 h-4 w-4" />{t("إعادة احتساب التقرير")}</Button>
              <Button type="button" variant="outline" size="sm" onClick={() => exportReportExcel(reportOptions)} disabled={!reportRows.length}><Download className="ms-1 h-4 w-4" />{t("تحميل Excel")}</Button>
              <Button type="button" size="sm" onClick={() => window.print()} disabled={!reportRows.length} className="bg-[#075f94] text-white hover:bg-[#064f7b]"><Printer className="ms-1 h-4 w-4" />{t("طباعة / حفظ PDF")}</Button>
            </div>
          </div>
          <div className="attendance-print-only border-b-2 border-[#075f94] px-6 py-4 text-center">
            <h1 className="text-2xl font-bold text-[#075f94]">{t("شركة إدارة العياف للمقاولات")}</h1>
            <p className="mt-1 text-sm font-semibold text-slate-600">{t("تقرير حساب الدوام التفصيلي")}</p>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4 border-b bg-slate-50 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-lg border bg-white text-xl font-bold text-slate-500">{employee.photoUrl ? <img src={employee.photoUrl} alt={employee.name} className="h-full w-full object-cover" /> : employee.name.trim().charAt(0)}</div>
              <div><h2 className="text-lg font-bold text-slate-900">{employee.name}</h2><p className="text-sm text-slate-500">{employee.jobTitle || t("غير محدد")}</p></div>
            </div>
            <div className="attendance-no-print flex flex-wrap gap-2 text-xs"><span className="rounded-md bg-emerald-50 px-3 py-2 text-emerald-700">{t("حاضر")}: {formatNumber(presentDays)}</span><span className="rounded-md bg-red-50 px-3 py-2 text-red-700">{t("غائب")}: {formatNumber(absentDays)}</span><span className="rounded-md bg-sky-50 px-3 py-2 text-sky-700">{t("إجازة")}: {formatNumber(leaveDays)}</span></div>
          </div>
          <div className="grid gap-px border-b bg-slate-200 sm:grid-cols-2 lg:grid-cols-4">
            {[{ label: t("الرقم الوظيفي"), value: employee.empId }, { label: t("الإدارة"), value: employee.department || "—" }, { label: t("القسم"), value: employee.section || "—" }, { label: t("الفرع"), value: employee.branch || "—" }, { label: t("مكان العمل"), value: employee.workLocation || "—" }, { label: t("جدول العمل"), value: employee.workSchedule || "—" }, { label: t("من تاريخ"), value: dateFrom }, { label: t("إلى تاريخ"), value: dateTo }].map((item) => <div key={item.label} className="bg-white px-4 py-3"><span className="block text-xs text-slate-500">{item.label}</span><strong className="mt-1 block text-sm text-slate-800">{item.value}</strong></div>)}
          </div>
          <div className="attendance-no-print flex flex-wrap gap-4 border-b px-5 py-3 text-xs"><span className="text-emerald-700">● {t("حاضر")}</span><span className="text-amber-600">● {t("متأخر")}</span><span className="text-red-600">● {t("غائب")}</span><span className="text-sky-600">● {t("إجازة")}</span></div>
          <div className="overflow-x-auto"><table className="attendance-detail-table min-w-full text-xs"><thead className="bg-[#075f94] text-white"><tr><th className="px-3 py-3">{t("التاريخ")}</th><th className="px-3 py-3">{t("الحالة")}</th><th className="px-3 py-3">{t("دخول")}</th><th className="px-3 py-3">{t("خروج")}</th><th className="px-3 py-3">{t("ساعات الحضور")}</th><th className="px-3 py-3">{t("الساعات المستحقة")}</th><th className="px-3 py-3">{t("ساعات التأخير")}</th><th className="px-3 py-3">{t("ساعات الاستئذان")}</th><th className="px-3 py-3">{t("ساعات النقص")}</th><th className="px-3 py-3">{t("الساعات الإضافية")}</th>{showNotes && <th className="px-3 py-3">{t("ملاحظات")}</th>}</tr></thead><tbody>{rows.map((row) => <tr key={row.rowId} className="border-b odd:bg-white even:bg-slate-50"><td className="whitespace-nowrap px-3 py-2 text-center">{row.date}</td><td className="px-3 py-2 text-center"><span className={`rounded px-2 py-1 font-semibold ${row.statusLabel === t("حاضر") ? "bg-emerald-50 text-emerald-700" : row.statusLabel === t("متأخر") ? "bg-amber-50 text-amber-700" : row.statusLabel === t("إجازة") ? "bg-sky-50 text-sky-700" : "bg-red-50 text-red-700"}`}>{row.statusLabel}</span></td><td className="px-3 py-2 text-center text-emerald-700">{row.checkIn}</td><td className="px-3 py-2 text-center text-red-600">{row.checkOut}</td><td className="px-3 py-2 text-center font-semibold">{row.worked}</td><td className="px-3 py-2 text-center">{row.required}</td><td className="px-3 py-2 text-center text-amber-700">{row.late}</td><td className="px-3 py-2 text-center text-cyan-700">{row.permission}</td><td className="px-3 py-2 text-center text-red-700">{row.deficit}</td><td className="px-3 py-2 text-center text-blue-700">{row.overtime}</td>{showNotes && <td className="max-w-40 px-3 py-2">{row.notes || "—"}</td>}</tr>)}</tbody></table></div>
          <div className="grid gap-px bg-slate-200 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">{[{ label: t("إجمالي ساعات الحضور"), value: formatDuration(totalWorked) }, { label: t("إجمالي الساعات المستحقة"), value: formatDuration(totalRequired) }, { label: t("إجمالي ساعات التأخير"), value: formatDuration(totalLate) }, { label: t("إجمالي ساعات الاستئذان"), value: formatDuration(totalPermission) }, { label: t("إجمالي ساعات النقص"), value: formatDuration(totalDeficit) }, { label: t("إجمالي الساعات الإضافية"), value: formatDuration(totalOvertime) }, { label: t("أيام الحضور"), value: formatNumber(presentDays) }, { label: t("أيام الغياب"), value: formatNumber(absentDays) }, { label: t("أيام الإجازات"), value: formatNumber(leaveDays) }, { label: t("أيام الفترة"), value: formatNumber(rows.length) }, { label: t("نسبة الحضور"), value: `${formatNumber(employee.attendanceRate, { maximumFractionDigits: 1 })}%` }].map((item) => <div key={item.label} className="bg-white px-3 py-3 text-center"><span className="block text-xs text-slate-500">{item.label}</span><strong className="mt-1 block text-sm text-[#075f94]">{item.value}</strong></div>)}</div>
          <div className="attendance-print-only px-5 py-3 text-left text-[10px] text-slate-400">{t("تاريخ إصدار التقرير")}: {new Date().toLocaleDateString("ar-SA")}</div>
        </article>;
      })}
    </div>}
    {mode === "departments" && selectedEmployeeIds.length > 0 && <section id="attendance-print-area" className="overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm">
      <div className="attendance-no-print flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
        <h2 className="text-lg font-bold text-slate-900">{t("النتائج (تقرير شامل)")}</h2>
        <div className="flex gap-2"><Button type="button" variant="outline" size="sm" onClick={() => exportReportExcel(comprehensiveReportOptions)} disabled={!comprehensiveRows.length}><Download className="ms-1 h-4 w-4" />{t("تصدير إلى ملف Excel")}</Button><Button type="button" variant="outline" size="sm" onClick={() => window.print()} disabled={!comprehensiveRows.length}><Printer className="ms-1 h-4 w-4" />{t("طباعة")}</Button></div>
      </div>
      <div className="border-b border-slate-400 px-5 py-5">
        <div className="flex items-start justify-between gap-6">
          <img src={COMPANY_PROFILE.logoUrl} alt={t("شعار الشركة")} className="h-20 w-28 object-contain" />
          <div className="grid flex-1 gap-x-8 gap-y-2 text-xs sm:grid-cols-2 lg:grid-cols-4">
            <span>{t("من تاريخ")}: <b>{dateFrom}</b></span><span>{t("إلى تاريخ")}: <b>{dateTo}</b></span>
            <span>{t("الإدارة")}: <b>{departmentId === ALL ? t("الكل") : departments.find((item) => item.id === departmentId)?.name || t("الكل")}</b></span>
            <span>{t("القسم")}: <b>{sectionId === ALL ? t("الكل") : sections.find((item) => item.id === sectionId)?.name || t("الكل")}</b></span>
            <span>{t("الفرع")}: <b>{branch === ALL ? t("الكل") : branches.find((item) => item.id === branch)?.name || t("الكل")}</b></span>
            <span>{t("مكان العمل")}: <b>{workLocation === ALL ? t("الكل") : workLocation}</b></span>
            <span>{t("عدد الموظفين")}: <b>{formatNumber(comprehensiveRows.length)}</b></span>
          </div>
        </div>
      </div>
      <div className="overflow-x-auto"><table className="min-w-[1700px] border-collapse text-[11px]"><thead className="bg-[#075f94] text-white"><tr>{comprehensiveColumns.map((column) => <th key={column.key} className="border border-white/30 px-3 py-3 text-center font-bold whitespace-normal">{column.label}</th>)}</tr></thead><tbody>{comprehensiveRows.map((row) => <tr key={String(row.empId)} className="border-b odd:bg-white even:bg-slate-50">{comprehensiveColumns.map((column) => <td key={column.key} className="border border-slate-200 px-3 py-3 text-center">{String(row[column.key as keyof typeof row] ?? "")}</td>)}</tr>)}</tbody></table></div>
    </section>}
    {showDepartmentSummary() && <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4"><div className="flex flex-wrap gap-4 text-xs"><span className="text-emerald-700">● {t("حاضر")}</span><span className="text-red-600">● {t("غائب")}</span><span className="text-amber-600">● {t("متأخر")}</span><span className="text-sky-600">● {t("إجازة")}</span></div><div className="flex items-center gap-3"><label className="flex items-center gap-2 text-xs text-slate-500">{t("عرض")}<select value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))} className="rounded border px-2 py-1"><option value={10}>10</option><option value={25}>25</option><option value={50}>50</option></select></label><div className="relative w-64"><Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("بحث...")} className="pr-9" /></div></div></div>
      <div className="overflow-x-auto"><table className="min-w-full text-xs"><thead className="bg-[#075f94] text-white"><tr>{columns.map((column) => <th key={column.key} className="whitespace-nowrap px-3 py-3 text-center font-semibold">{column.label}</th>)}</tr></thead><tbody>{loading ? <tr><td colSpan={columns.length} className="py-16 text-center text-slate-400">{t("جاري التحميل...")}</td></tr> : !pagedRows.length ? <tr><td colSpan={columns.length} className="py-16 text-center text-slate-400">{t("لا توجد بيانات")}</td></tr> : mode === "employees" ? (pagedRows as EmployeeSummary[]).map((row) => <tr key={row.id} className="border-b hover:bg-slate-50"><td className="px-3 py-3 text-center">{row.empId}</td><td className="px-3 py-3 font-semibold">{row.name}</td><td className="px-3 py-3">{row.department || "—"}</td><td className="px-3 py-3">{row.section || "—"}</td><td className="px-3 py-3">{row.jobTitle || "—"}</td><td className="px-3 py-3">{row.branch || "—"}</td><td className="px-3 py-3">{row.workSchedule || "—"}</td><td className="px-3 py-3">{row.workLocation || "—"}</td><td className="px-3 py-3 text-center text-emerald-700">{formatNumber(row.present)}</td><td className="px-3 py-3 text-center text-red-600">{formatNumber(row.absent)}</td><td className="px-3 py-3 text-center text-amber-600">{formatNumber(row.late)}</td><td className="px-3 py-3 text-center text-sky-600">{formatNumber(row.leave)}</td><td className="px-3 py-3 text-center font-bold">{formatNumber(row.attendanceRate, { maximumFractionDigits: 1 })}%</td></tr>) : (pagedRows as DepartmentSummary[]).map((row) => <tr key={row.id} className="border-b hover:bg-slate-50"><td className="px-3 py-3 font-semibold">{row.department}</td><td className="px-3 py-3 text-center">{formatNumber(row.employees)}</td><td className="px-3 py-3 text-center text-emerald-700">{formatNumber(row.present)}</td><td className="px-3 py-3 text-center text-red-600">{formatNumber(row.absent)}</td><td className="px-3 py-3 text-center text-amber-600">{formatNumber(row.late)}</td><td className="px-3 py-3 text-center text-sky-600">{formatNumber(row.leave)}</td><td className="px-3 py-3 text-center font-bold">{formatNumber(row.attendanceRate, { maximumFractionDigits: 1 })}%</td></tr>)}</tbody></table></div>
      <footer className="flex items-center justify-between border-t px-4 py-3 text-xs text-slate-500"><span>{formatNumber(allRows.length)} {t("من السجلات")}</span><div className="flex items-center gap-2"><Button variant="outline" size="sm" disabled={safePage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>{t("السابق")}</Button><span>{formatNumber(safePage)} / {formatNumber(totalPages)}</span><Button variant="outline" size="sm" disabled={safePage >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>{t("التالي")}</Button></div></footer>
    </section>}
  </main></Layout>;
}
