import { useEffect, useMemo, useRef, useState } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabaseClient";
import { canManagePerm, readUserSession } from "@/lib/authSession";
import { CheckCheck, Clock3, Loader2, MapPin, Navigation, Search, Users, X } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/i18n";
import AttendanceWorkspaceNav from "@/components/hr/AttendanceWorkspaceNav";

type Employee = { id: string; empId: string; name: string; branchId: string; branch: string; departmentId: string; department: string; sectionId: string; section: string; workLocationId: string; workLocation: string; workSchedule: string; attendanceLocationId: string };
type AttendanceLocation = { id: string; name: string; address: string; latitude: number | null; longitude: number | null; radius: number; isDefault: boolean };
type Schedule = { id: string; name: string; hours: string };

const today = () => new Date().toLocaleDateString("en-CA");
const currentTime = () => new Date().toTimeString().slice(0, 5);

function getInclusiveDates(fromDate: string, toDate: string) {
  if (!fromDate || !toDate || fromDate > toDate) return [];
  const dates: string[] = [];
  const current = new Date(`${fromDate}T00:00:00Z`);
  const end = new Date(`${toDate}T00:00:00Z`);
  while (current <= end) {
    dates.push(current.toISOString().slice(0, 10));
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return dates;
}

export default function HRAttendancePreparation() {
  const { t, direction, locale, formatNumber } = useI18n();
  const session = readUserSession();
  const canPrepare = canManagePerm(session?.permissions ?? {}, "hr.attendance.individual-group", "hr.attendance", "module.hr");
  const canManageLocations = Boolean(session && (["مدير النظام", "مدير عام", "المدير العام"].includes(session.role) || session.permissions["hr.attendance.location.manage"] === true || session.permissions["hr.attendance.location.manage"] === "manage"));
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [attendanceLocations, setAttendanceLocations] = useState<AttendanceLocation[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const prepareInFlight = useRef(false);
  const [search, setSearch] = useState("");
  const [branch, setBranch] = useState("الكل");
  const [department, setDepartment] = useState("الكل");
  const [section, setSection] = useState("الكل");
  const [workLocation, setWorkLocation] = useState("الكل");
  const [scheduleId, setScheduleId] = useState("");
  const [fromDate, setFromDate] = useState(today());
  const [toDate, setToDate] = useState(today());
  const [status, setStatus] = useState("حاضر");
  const [checkIn, setCheckIn] = useState(currentTime());
  const [checkOut, setCheckOut] = useState("");
  const [notes, setNotes] = useState("");
  const [savingRecordCount, setSavingRecordCount] = useState(0);
  const [showLocationManager, setShowLocationManager] = useState(false);
  const [locationSaving, setLocationSaving] = useState(false);
  const [mainLocationName, setMainLocationName] = useState("مقر الشركة الرئيسي");
  const [mainLocationAddress, setMainLocationAddress] = useState("");
  const [mainLatitude, setMainLatitude] = useState("");
  const [mainLongitude, setMainLongitude] = useState("");
  const [assignedLocationId, setAssignedLocationId] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [employeeResult, scheduleResult, locationResult, branchResult, departmentResult, sectionResult] = await Promise.all([
        supabase.from("employees").select("id, emp_id, name, branch_id, department_id, section_id, work_schedule, attendance_location_id").in("status", ["نشط", "فعال", "active"]).order("name"),
        supabase.from("attendance_schedules").select("id, name, hours").eq("status", "فعال").order("name"),
        supabase.from("hr_work_locations").select("id, name, name_en, address, latitude, longitude, attendance_radius_m, is_company_default").eq("status", "فعال").order("name"),
        supabase.from("branches").select("id, name, name_en").order("name"),
        supabase.from("departments").select("id, name, name_en").eq("status", "فعال").order("name"),
        supabase.from("org_sections").select("id, name, name_en, department_id").eq("status", "فعال").order("name"),
      ]);
      if (employeeResult.error || scheduleResult.error || locationResult.error || branchResult.error || departmentResult.error || sectionResult.error) toast.error(t("تعذر تحميل بيانات الموظفين وجداول العمل"));
      const localizedName = (row: any) => locale === "en" && String(row.name_en ?? "").trim() ? String(row.name_en) : String(row.name ?? "");
      const branches = new Map((branchResult.data ?? []).map((row: any) => [String(row.id), localizedName(row)]));
      const departments = new Map((departmentResult.data ?? []).map((row: any) => [String(row.id), localizedName(row)]));
      const sections = new Map((sectionResult.data ?? []).map((row: any) => [String(row.id), localizedName(row)]));
      const locationNames = new Map((locationResult.data ?? []).map((row: any) => [String(row.id), localizedName(row)]));
      setEmployees((employeeResult.data ?? []).map((row: any) => {
        const branchId = String(row.branch_id ?? "");
        const departmentId = String(row.department_id ?? "");
        const sectionId = String(row.section_id ?? "");
        const workLocationId = String(row.attendance_location_id ?? "");
        return { id: String(row.id), empId: String(row.emp_id ?? row.id), name: String(row.name ?? "-"), branchId, branch: branches.get(branchId) || t("غير مرتبط"), departmentId, department: departments.get(departmentId) || t("غير مرتبط"), sectionId, section: sections.get(sectionId) || t("غير مرتبط"), workLocationId, workLocation: locationNames.get(workLocationId) || t("غير مرتبط"), workSchedule: String(row.work_schedule ?? t("بدون جدول عمل")), attendanceLocationId: workLocationId };
      }));
      setSchedules((scheduleResult.data ?? []).map((row: any) => ({ id: String(row.id), name: String(row.name), hours: String(row.hours ?? "") })));
      const mappedLocations = (locationResult.data ?? []).map((row: any) => ({ id: String(row.id), name: localizedName(row), address: String(row.address ?? ""), latitude: row.latitude == null ? null : Number(row.latitude), longitude: row.longitude == null ? null : Number(row.longitude), radius: Number(row.attendance_radius_m ?? 10), isDefault: Boolean(row.is_company_default) }));
      setAttendanceLocations(mappedLocations);
      const mainLocation = mappedLocations.find((location) => location.isDefault);
      if (mainLocation) { setMainLocationName(mainLocation.name); setMainLocationAddress(mainLocation.address); setMainLatitude(mainLocation.latitude == null ? "" : String(mainLocation.latitude)); setMainLongitude(mainLocation.longitude == null ? "" : String(mainLocation.longitude)); }
      setLoading(false);
    };
    void load();
  }, [t, locale]);

  const captureCurrentLocation = () => {
    if (!navigator.geolocation) { toast.error(t("هذا الجهاز لا يدعم تحديد الموقع")); return; }
    setLocationSaving(true);
    navigator.geolocation.getCurrentPosition((position) => { setMainLatitude(position.coords.latitude.toFixed(7)); setMainLongitude(position.coords.longitude.toFixed(7)); setLocationSaving(false); toast.success(t("تم التقاط الموقع الحالي")); }, () => { setLocationSaving(false); toast.error(t("يرجى السماح بالوصول إلى الموقع")); }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
  };

  const saveMainAttendanceLocation = async () => {
    const latitude = Number(mainLatitude);
    const longitude = Number(mainLongitude);
    if (!mainLocationName.trim() || !Number.isFinite(latitude) || !Number.isFinite(longitude)) { toast.error(t("أدخل اسم الموقع وإحداثيات صحيحة")); return; }
    setLocationSaving(true);
    try {
      const { data, error } = await supabase.rpc("set_company_attendance_location", { p_name: mainLocationName.trim(), p_address: mainLocationAddress.trim(), p_latitude: latitude, p_longitude: longitude });
      if (error) throw error;
      const mainLocation: AttendanceLocation = { id: String(data), name: mainLocationName.trim(), address: mainLocationAddress.trim(), latitude, longitude, radius: 10, isDefault: true };
      setAttendanceLocations((current) => [mainLocation, ...current.filter((location) => !location.isDefault && location.id !== mainLocation.id)]);
      toast.success(t("تم حفظ موقع الشركة الرئيسي وتطبيقه افتراضياً على جميع الموظفين"));
    } catch (saveError) { toast.error(saveError instanceof Error ? saveError.message : t("تعذر حفظ موقع الشركة")); } finally { setLocationSaving(false); }
  };

  const assignAttendanceLocation = async () => {
    const employeeIds = [...selected];
    if (employeeIds.length === 0) { toast.error(t("حدد موظفاً واحداً أو مجموعة موظفين أولاً")); return; }
    setLocationSaving(true);
    try {
      const { data, error } = await supabase.rpc("assign_employee_attendance_location", { p_employee_ids: employeeIds, p_location_id: assignedLocationId || null });
      if (error) throw error;
      setEmployees((current) => current.map((employee) => selected.has(employee.id) ? { ...employee, attendanceLocationId: assignedLocationId } : employee));
      toast.success(assignedLocationId ? `${t("تم تعيين الموقع المخصص لـ")} ${formatNumber(Number(data ?? employeeIds.length))} ${t("موظف")}` : `${t("تمت إعادة")} ${formatNumber(Number(data ?? employeeIds.length))} ${t("موظف")} ${t("إلى موقع الشركة الرئيسي")}`);
    } catch (assignError) { toast.error(assignError instanceof Error ? assignError.message : t("تعذر تعيين موقع الحضور")); } finally { setLocationSaving(false); }
  };

  const options = (idField: "branchId" | "departmentId" | "sectionId" | "workLocationId", nameField: "branch" | "department" | "section" | "workLocation") => Array.from(new Map(employees.filter((employee) => employee[idField]).map((employee) => [employee[idField], employee[nameField]])).entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  const filtered = useMemo(() => employees.filter((employee) => {
    const query = search.trim().toLowerCase();
    if (query && !employee.name.toLowerCase().includes(query) && !employee.empId.toLowerCase().includes(query)) return false;
    if (branch !== "الكل" && employee.branchId !== branch) return false;
    if (department !== "الكل" && employee.departmentId !== department) return false;
    if (section !== "الكل" && employee.sectionId !== section) return false;
    if (workLocation !== "الكل" && employee.workLocationId !== workLocation) return false;
    const schedule = schedules.find((item) => item.id === scheduleId);
    return !schedule || employee.workSchedule === schedule.name;
  }), [employees, search, branch, department, section, workLocation, scheduleId, schedules]);
  const selectedDates = useMemo(() => getInclusiveDates(fromDate, toDate), [fromDate, toDate]);
  const totalRecords = selected.size * selectedDates.length;
  const allVisibleSelected = filtered.length > 0 && filtered.every((employee) => selected.has(employee.id));
  const toggleAll = () => setSelected((current) => { const next = new Set(current); if (allVisibleSelected) filtered.forEach((employee) => next.delete(employee.id)); else filtered.forEach((employee) => next.add(employee.id)); return next; });
  const toggleEmployee = (id: string) => setSelected((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; });

  const handlePrepare = async () => {
    if (prepareInFlight.current) return;
    if (!canPrepare) return toast.error(t("ليس لديك صلاحية تسجيل حضور الموظفين"));
    const chosen = employees.filter((employee) => selected.has(employee.id));
    if (chosen.length === 0) return toast.error(t("اختر موظفًا واحدًا على الأقل"));
    if (!fromDate || !toDate) return toast.error(t("حدد تاريخ البداية وتاريخ النهاية"));
    if (fromDate > toDate) return toast.error(t("تاريخ البداية يجب أن يكون قبل أو مساويًا لتاريخ النهاية"));
    if (status === "حاضر" && !checkIn) return toast.error(t("حدد وقت الحضور"));
    const dates = getInclusiveDates(fromDate, toDate);
    const payload = dates.flatMap((attendanceDate) => chosen.map((employee) => ({ emp_id: employee.empId, emp_name: employee.name, department: employee.section || employee.department, date: attendanceDate, check_in: status === "غائب" ? null : checkIn || null, check_out: status === "غائب" ? null : checkOut || null, status, late_minutes: 0, notes: notes.trim() || (chosen.length > 1 ? "تحضير جماعي من الإدارة" : "تحضير فردي من الإدارة"), entry_source: "manager_manual", prepared_by: session?.name || session?.email || "الإدارة", schedule_id: scheduleId || null, updated_at: new Date().toISOString() })));
    prepareInFlight.current = true;
    setSaving(true);
    setSavingRecordCount(payload.length);
    try {
      const { error } = await supabase.from("attendance").upsert(payload, { onConflict: "emp_id,date" });
      if (error) { toast.error(`${t("تعذر حفظ التحضير")}: ${error.message}`); return; }
      toast.success(`${t("تم تسجيل")} ${formatNumber(payload.length)} ${t("سجل حضور")} ${t("لـ")} ${formatNumber(chosen.length)} ${t("موظف")} ${t("خلال")} ${formatNumber(dates.length)} ${t("يوم")}`);
      setSelected(new Set()); setNotes("");
    } catch (saveError) { toast.error(saveError instanceof Error ? saveError.message : t("حدث خطأ غير متوقع أثناء حفظ التحضير")); } finally { prepareInFlight.current = false; setSaving(false); setSavingRecordCount(0); }
  };

  return <Layout><div className="mx-auto max-w-[1800px] space-y-5" dir={direction}>
    <AttendanceWorkspaceNav />
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-bold text-slate-900">{t("التحضير الفردي والجماعي")}</h1><p className="mt-1 text-sm text-slate-500">{t("تسجيل حضور موظف واحد أو مجموعة موظفين وربطه مباشرة بتقارير الحضور")}</p></div><div className="flex items-center gap-2">{canManageLocations && <Button type="button" variant="outline" onClick={() => setShowLocationManager((current) => !current)} className="gap-2 border-violet-200 text-violet-700 hover:bg-violet-50"><MapPin className="h-4 w-4" />{t("موقع الحضور")}</Button>}<div className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-800">{t("المحددون")}: {formatNumber(selected.size)}</div></div></div>
    {showLocationManager && canManageLocations && <section className="rounded-xl border border-violet-200 bg-white shadow-sm"><div className="flex items-center justify-between border-b bg-violet-50 px-5 py-3"><div><h2 className="font-bold text-violet-900">{t("إدارة موقع الحضور")}</h2><p className="text-xs text-violet-700">{t("النطاق الثابت لتسجيل حضور الموظف هو 10 أمتار.")}</p></div><button type="button" onClick={() => setShowLocationManager(false)} title={t("إغلاق")} aria-label={t("إغلاق")} className="rounded-lg p-2 text-violet-700 hover:bg-violet-100"><X className="h-4 w-4" /></button></div><div className="grid gap-5 p-5 lg:grid-cols-2"><div className="space-y-3 rounded-lg border p-4"><h3 className="font-semibold text-slate-900">{t("موقع الشركة الرئيسي")}</h3><Input value={mainLocationName} onChange={(event) => setMainLocationName(event.target.value)} placeholder={t("اسم الموقع")} /><Input value={mainLocationAddress} onChange={(event) => setMainLocationAddress(event.target.value)} placeholder={t("عنوان الشركة")} /><div className="grid grid-cols-2 gap-2"><Input type="number" step="any" value={mainLatitude} onChange={(event) => setMainLatitude(event.target.value)} placeholder={t("خط العرض")} /><Input type="number" step="any" value={mainLongitude} onChange={(event) => setMainLongitude(event.target.value)} placeholder={t("خط الطول")} /></div><div className="flex flex-wrap gap-2"><Button type="button" variant="outline" onClick={captureCurrentLocation} disabled={locationSaving} className="gap-2"><Navigation className="h-4 w-4" />{t("استخدام موقعي الحالي")}</Button><Button type="button" onClick={saveMainAttendanceLocation} disabled={locationSaving} className="gap-2 bg-violet-600 hover:bg-violet-700">{locationSaving && <Loader2 className="h-4 w-4 animate-spin" />}{t("حفظ الموقع الرئيسي")}</Button></div></div><div className="space-y-3 rounded-lg border p-4"><h3 className="font-semibold text-slate-900">{t("تعيين موقع لموظفين محددين")}</h3><p className="text-sm text-slate-500">{t("حدد الموظفين من الجدول، ثم اختر موقع الحضور الخاص بهم.")}</p><select value={assignedLocationId} onChange={(event) => setAssignedLocationId(event.target.value)} aria-label={t("موقع الحضور")} className="h-10 w-full rounded-md border bg-white px-3 text-sm"><option value="">{t("موقع الشركة الرئيسي (الافتراضي)")}</option>{attendanceLocations.filter((location) => !location.isDefault && location.latitude != null && location.longitude != null).map((location) => <option key={location.id} value={location.id}>{location.name} — {t("نطاق")} {formatNumber(location.radius)} {t("م")}</option>)}</select><Button type="button" onClick={assignAttendanceLocation} disabled={locationSaving || selected.size === 0} className="gap-2 bg-violet-600 hover:bg-violet-700">{locationSaving && <Loader2 className="h-4 w-4 animate-spin" />}{t("تطبيق الموقع على")} {formatNumber(selected.size)} {t("موظف")}</Button><p className="text-xs text-slate-500">{t("يمكن إضافة المواقع الأخرى وإحداثياتها من صفحة مواقع العمل.")}</p></div></div></section>}
    <section className="rounded-xl border bg-white shadow-sm"><div className="border-b bg-slate-50 px-5 py-3 font-bold text-slate-800">{t("بيانات التحضير")}</div><div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4"><Field label={t("من تاريخ*")}><Input type="date" value={fromDate} max={toDate || undefined} onChange={(e) => setFromDate(e.target.value)} /></Field><Field label={t("إلى تاريخ*")}><Input type="date" value={toDate} min={fromDate || undefined} onChange={(e) => setToDate(e.target.value)} /></Field><Field label={t("حالة الدوام*")}><select value={status} onChange={(e) => setStatus(e.target.value)} className="h-10 w-full rounded-md border bg-white px-3 text-sm"><option value="حاضر">{t("حاضر")}</option><option value="غائب">{t("غائب")}</option><option value="إجازة">{t("إجازة")}</option><option value="عمل عن بعد">{t("عمل عن بعد")}</option></select></Field><Field label={t("وقت الحضور")}><Input type="time" value={checkIn} disabled={status === "غائب"} onChange={(e) => setCheckIn(e.target.value)} /></Field><Field label={t("وقت الانصراف")}><Input type="time" value={checkOut} disabled={status === "غائب"} onChange={(e) => setCheckOut(e.target.value)} /></Field><Field label={t("جدول العمل")}><select value={scheduleId} onChange={(e) => setScheduleId(e.target.value)} className="h-10 w-full rounded-md border bg-white px-3 text-sm"><option value="">{t("كل جداول العمل")}</option>{schedules.map((item) => <option key={item.id} value={item.id}>{item.name}{item.hours ? ` — ${item.hours}` : ""}</option>)}</select></Field><div className="sm:col-span-2"><Field label={t("ملاحظات")}><Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t("اختياري")} /></Field></div><div className="flex items-center rounded-lg border border-sky-200 bg-sky-50 px-4 py-2 text-sm text-sky-800 sm:col-span-2 lg:col-span-4">{t("سيتم إنشاء أو تحديث")} <strong className="mx-1">{formatNumber(totalRecords)}</strong> {t("سجل")}: {formatNumber(selected.size)} {t("موظف")} × {formatNumber(selectedDates.length)} {t("يوم")}</div></div></section>
    <section className="rounded-xl border bg-white shadow-sm"><div className="grid gap-3 border-b p-4 sm:grid-cols-2 lg:grid-cols-5"><div className="relative"><Search className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 ${direction === "rtl" ? "right-3" : "left-3"}`} /><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("بحث بالاسم أو الرقم")} className={direction === "rtl" ? "pr-9" : "pl-9"} /></div><OrganizationFilter value={branch} onChange={(value) => { setBranch(value); setDepartment("الكل"); setSection("الكل"); }} options={options("branchId", "branch")} label={t("كل الفروع")} /><OrganizationFilter value={department} onChange={(value) => { setDepartment(value); setSection("الكل"); }} options={options("departmentId", "department").filter((item) => branch === "الكل" || employees.some((employee) => employee.departmentId === item.id && employee.branchId === branch))} label={t("كل الإدارات")} /><OrganizationFilter value={section} onChange={setSection} options={options("sectionId", "section").filter((item) => department === "الكل" || employees.some((employee) => employee.sectionId === item.id && employee.departmentId === department))} label={t("كل الأقسام")} /><OrganizationFilter value={workLocation} onChange={setWorkLocation} options={options("workLocationId", "workLocation")} label={t("كل مواقع العمل")} /><Button onClick={handlePrepare} disabled={saving || selected.size === 0 || !canPrepare} className="bg-[#0069a8] hover:bg-[#005486]">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : selected.size > 1 ? <Users className="h-4 w-4" /> : <CheckCheck className="h-4 w-4" />} {saving ? `${t("جاري حفظ")} ${formatNumber(savingRecordCount)} ${t("سجل")}...` : selected.size > 1 ? `${t("تحضير جماعي")} (${formatNumber(selectedDates.length)} ${t("يوم")})` : `${t("تحضير فردي")} (${formatNumber(selectedDates.length)} ${t("يوم")})`}</Button></div><div className="overflow-x-auto"><table className="w-full min-w-[850px] text-sm"><thead className="bg-[#0069a8] text-white"><tr><th className="w-14 px-4 py-3"><Checkbox checked={allVisibleSelected} onCheckedChange={toggleAll} aria-label={t("تحديد الكل")} className="border-white data-[state=checked]:bg-white data-[state=checked]:text-[#0069a8]" /></th><th className="px-4 py-3">{t("رقم الموظف")}</th><th className="px-4 py-3">{t("اسم الموظف")}</th><th className="px-4 py-3">{t("القسم")}</th><th className="px-4 py-3">{t("الفرع")}</th><th className="px-4 py-3">{t("موقع العمل")}</th><th className="px-4 py-3">{t("جدول العمل")}</th></tr></thead><tbody className="divide-y">{loading ? <tr><td colSpan={7} className="py-12 text-center text-slate-500"><Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />{t("جاري تحميل الموظفين...")}</td></tr> : filtered.length === 0 ? <tr><td colSpan={7} className="py-12 text-center text-slate-500">{t("لا يوجد موظفون مطابقون")}</td></tr> : filtered.map((employee) => <tr key={employee.id} onClick={() => toggleEmployee(employee.id)} className={`cursor-pointer hover:bg-sky-50 ${selected.has(employee.id) ? "bg-sky-50" : ""}`}><td className="px-4 py-3" onClick={(event) => event.stopPropagation()}><Checkbox checked={selected.has(employee.id)} onCheckedChange={() => toggleEmployee(employee.id)} aria-label={`${t("تحديد")} ${employee.name}`} /></td><td className="px-4 py-3 font-mono text-sky-700">{employee.empId}</td><td className="px-4 py-3 font-semibold">{employee.name}</td><td className="px-4 py-3">{t(employee.department)}</td><td className="px-4 py-3">{t(employee.branch)}</td><td className="px-4 py-3">{t(employee.workLocation)}</td><td className="px-4 py-3"><span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5 text-slate-400" />{t(employee.workSchedule)}</span></td></tr>)}</tbody></table></div></section>
  </div></Layout>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block space-y-1.5"><span className="text-xs font-medium text-slate-700">{label}</span>{children}</label>; }
function OrganizationFilter({ value, onChange, options, label }: { value: string; onChange: (value: string) => void; options: Array<{ id: string; name: string }>; label: string }) { return <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label} className="h-10 rounded-md border bg-white px-3 text-sm"><option value="الكل">{label}</option>{options.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>; }
