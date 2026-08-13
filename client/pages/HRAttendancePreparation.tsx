import { useEffect, useMemo, useRef, useState } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabaseClient";
import { canManagePerm, readUserSession } from "@/lib/authSession";
import { CheckCheck, Clock3, Loader2, Search, Users } from "lucide-react";
import { toast } from "sonner";

type Employee = {
  id: string;
  empId: string;
  name: string;
  department: string;
  branch: string;
  workLocation: string;
  workSchedule: string;
};

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
  const session = readUserSession();
  const canPrepare = canManagePerm(
    session?.permissions ?? {},
    "hr.attendance.individual-group",
    "hr.attendance",
    "module.hr"
  );
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const prepareInFlight = useRef(false);
  const [search, setSearch] = useState("");
  const [branch, setBranch] = useState("الكل");
  const [department, setDepartment] = useState("الكل");
  const [workLocation, setWorkLocation] = useState("الكل");
  const [scheduleId, setScheduleId] = useState("");
  const [fromDate, setFromDate] = useState(today());
  const [toDate, setToDate] = useState(today());
  const [status, setStatus] = useState("حاضر");
  const [checkIn, setCheckIn] = useState(currentTime());
  const [checkOut, setCheckOut] = useState("");
  const [notes, setNotes] = useState("");
  const [savingRecordCount, setSavingRecordCount] = useState(0);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [employeeResult, scheduleResult] = await Promise.all([
        supabase
          .from("employees")
          .select("id, emp_id, name, department, branch, work_location, work_schedule")
          .in("status", ["نشط", "فعال", "active"])
          .order("name"),
        supabase.from("attendance_schedules").select("id, name, hours").eq("status", "فعال").order("name"),
      ]);
      if (employeeResult.error || scheduleResult.error) {
        toast.error("تعذر تحميل بيانات الموظفين وجداول العمل");
      }
      setEmployees((employeeResult.data ?? []).map((row: any) => ({
        id: String(row.id),
        empId: String(row.emp_id ?? row.id),
        name: String(row.name ?? "-"),
        department: String(row.department ?? "غير محدد"),
        branch: String(row.branch ?? "غير محدد"),
        workLocation: String(row.work_location ?? "غير محدد"),
        workSchedule: String(row.work_schedule ?? "بدون جدول عمل"),
      })));
      setSchedules((scheduleResult.data ?? []).map((row: any) => ({
        id: String(row.id), name: String(row.name), hours: String(row.hours ?? ""),
      })));
      setLoading(false);
    };
    void load();
  }, []);

  const options = (field: "branch" | "department" | "workLocation") =>
    [...new Set(employees.map((employee) => employee[field]))].sort();

  const filtered = useMemo(() => employees.filter((employee) => {
    const query = search.trim().toLowerCase();
    if (query && !employee.name.toLowerCase().includes(query) && !employee.empId.toLowerCase().includes(query)) return false;
    if (branch !== "الكل" && employee.branch !== branch) return false;
    if (department !== "الكل" && employee.department !== department) return false;
    if (workLocation !== "الكل" && employee.workLocation !== workLocation) return false;
    if (scheduleId) {
      const schedule = schedules.find((item) => item.id === scheduleId);
      if (schedule && employee.workSchedule !== schedule.name) return false;
    }
    return true;
  }), [employees, search, branch, department, workLocation, scheduleId, schedules]);

  const selectedDates = useMemo(
    () => getInclusiveDates(fromDate, toDate),
    [fromDate, toDate],
  );
  const totalRecords = selected.size * selectedDates.length;

  const allVisibleSelected = filtered.length > 0 && filtered.every((employee) => selected.has(employee.id));
  const toggleAll = () => {
    setSelected((current) => {
      const next = new Set(current);
      if (allVisibleSelected) filtered.forEach((employee) => next.delete(employee.id));
      else filtered.forEach((employee) => next.add(employee.id));
      return next;
    });
  };

  const toggleEmployee = (id: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handlePrepare = async () => {
    if (prepareInFlight.current) return;
    if (!canPrepare) return toast.error("ليس لديك صلاحية تسجيل حضور الموظفين");
    const chosen = employees.filter((employee) => selected.has(employee.id));
    if (chosen.length === 0) return toast.error("اختر موظفًا واحدًا على الأقل");
    if (!fromDate || !toDate) return toast.error("حدد تاريخ البداية وتاريخ النهاية");
    if (fromDate > toDate) return toast.error("تاريخ البداية يجب أن يكون قبل أو مساويًا لتاريخ النهاية");
    if (status === "حاضر" && !checkIn) return toast.error("حدد وقت الحضور");

    const dates = getInclusiveDates(fromDate, toDate);
    const payload = dates.flatMap((attendanceDate) =>
      chosen.map((employee) => ({
        emp_id: employee.empId,
        emp_name: employee.name,
        department: employee.department,
        date: attendanceDate,
        check_in: status === "غائب" ? null : checkIn || null,
        check_out: status === "غائب" ? null : checkOut || null,
        status,
        late_minutes: 0,
        notes: notes.trim() || (chosen.length > 1 ? "تحضير جماعي من الإدارة" : "تحضير فردي من الإدارة"),
        entry_source: "manager_manual",
        prepared_by: session?.name || session?.email || "الإدارة",
        schedule_id: scheduleId || null,
        updated_at: new Date().toISOString(),
      })),
    );

    prepareInFlight.current = true;
    setSaving(true);
    setSavingRecordCount(payload.length);
    try {
      const { error } = await supabase
        .from("attendance")
        .upsert(payload, { onConflict: "emp_id,date" });
      if (error) {
        toast.error(`تعذر حفظ التحضير: ${error.message}`);
        return;
      }

      toast.success(
        `تم تسجيل ${payload.length} سجل حضور لـ ${chosen.length} ${chosen.length === 1 ? "موظف" : "موظفين"} خلال ${dates.length} ${dates.length === 1 ? "يوم" : "أيام"}`,
      );
      setSelected(new Set());
      setNotes("");
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : "حدث خطأ غير متوقع أثناء حفظ التحضير");
    } finally {
      prepareInFlight.current = false;
      setSaving(false);
      setSavingRecordCount(0);
    }
  };

  return (
    <Layout>
      <div className="mx-auto max-w-[1500px] space-y-5" dir="rtl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">التحضير الفردي والجماعي</h1>
            <p className="mt-1 text-sm text-slate-500">تسجيل حضور موظف واحد أو مجموعة موظفين وربطه مباشرة بتقارير الحضور</p>
          </div>
          <div className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-800">
            المحددون: {selected.size}
          </div>
        </div>

        <section className="rounded-xl border bg-white shadow-sm">
          <div className="border-b bg-slate-50 px-5 py-3 font-bold text-slate-800">بيانات التحضير</div>
          <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="من تاريخ*">
              <Input type="date" value={fromDate} max={toDate || undefined} onChange={(e) => setFromDate(e.target.value)} />
            </Field>
            <Field label="إلى تاريخ*">
              <Input type="date" value={toDate} min={fromDate || undefined} onChange={(e) => setToDate(e.target.value)} />
            </Field>
            <Field label="حالة الدوام*">
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-10 w-full rounded-md border bg-white px-3 text-sm">
                <option value="حاضر">حاضر</option><option value="غائب">غائب</option><option value="إجازة">إجازة</option><option value="عمل عن بعد">عمل عن بعد</option>
              </select>
            </Field>
            <Field label="وقت الحضور"><Input type="time" value={checkIn} disabled={status === "غائب"} onChange={(e) => setCheckIn(e.target.value)} /></Field>
            <Field label="وقت الانصراف"><Input type="time" value={checkOut} disabled={status === "غائب"} onChange={(e) => setCheckOut(e.target.value)} /></Field>
            <Field label="جدول العمل">
              <select value={scheduleId} onChange={(e) => setScheduleId(e.target.value)} className="h-10 w-full rounded-md border bg-white px-3 text-sm">
                <option value="">كل جداول العمل</option>
                {schedules.map((item) => <option key={item.id} value={item.id}>{item.name}{item.hours ? ` — ${item.hours}` : ""}</option>)}
              </select>
            </Field>
            <div className="sm:col-span-2"><Field label="ملاحظات"><Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="اختياري" /></Field></div>
            <div className="flex items-center rounded-lg border border-sky-200 bg-sky-50 px-4 py-2 text-sm text-sky-800 sm:col-span-2 lg:col-span-4">
              سيتم إنشاء أو تحديث <strong className="mx-1">{totalRecords}</strong> سجل: {selected.size} موظف × {selectedDates.length} يوم
            </div>
          </div>
        </section>

        <section className="rounded-xl border bg-white shadow-sm">
          <div className="grid gap-3 border-b p-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث بالاسم أو الرقم" className="pr-9" />
            </div>
            <Filter value={branch} onChange={setBranch} values={options("branch")} label="كل الفروع" />
            <Filter value={department} onChange={setDepartment} values={options("department")} label="كل الأقسام" />
            <Filter value={workLocation} onChange={setWorkLocation} values={options("workLocation")} label="كل مواقع العمل" />
            <Button onClick={handlePrepare} disabled={saving || selected.size === 0 || !canPrepare} className="bg-[#0069a8] hover:bg-[#005486]">
              {saving ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : selected.size > 1 ? <Users className="ml-2 h-4 w-4" /> : <CheckCheck className="ml-2 h-4 w-4" />}
              {saving ? `جاري حفظ ${savingRecordCount} سجل...` : selected.size > 1 ? `تحضير جماعي (${selectedDates.length} يوم)` : `تحضير فردي (${selectedDates.length} يوم)`}
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-right text-sm">
              <thead className="bg-[#0069a8] text-white">
                <tr>
                  <th className="w-14 px-4 py-3"><Checkbox checked={allVisibleSelected} onCheckedChange={toggleAll} className="border-white data-[state=checked]:bg-white data-[state=checked]:text-[#0069a8]" /></th>
                  <th className="px-4 py-3">رقم الموظف</th><th className="px-4 py-3">اسم الموظف</th><th className="px-4 py-3">القسم</th><th className="px-4 py-3">الفرع</th><th className="px-4 py-3">موقع العمل</th><th className="px-4 py-3">جدول العمل</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr><td colSpan={7} className="py-12 text-center text-slate-500"><Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />جاري تحميل الموظفين...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={7} className="py-12 text-center text-slate-500">لا يوجد موظفون مطابقون</td></tr>
                ) : filtered.map((employee) => (
                  <tr key={employee.id} onClick={() => toggleEmployee(employee.id)} className={`cursor-pointer hover:bg-sky-50 ${selected.has(employee.id) ? "bg-sky-50" : ""}`}>
                    <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}><Checkbox checked={selected.has(employee.id)} onCheckedChange={() => toggleEmployee(employee.id)} /></td>
                    <td className="px-4 py-3 font-mono text-sky-700">{employee.empId}</td><td className="px-4 py-3 font-semibold">{employee.name}</td><td className="px-4 py-3">{employee.department}</td><td className="px-4 py-3">{employee.branch}</td><td className="px-4 py-3">{employee.workLocation}</td><td className="px-4 py-3"><span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5 text-slate-400" />{employee.workSchedule}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </Layout>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block space-y-1.5"><span className="text-xs font-medium text-slate-700">{label}</span>{children}</label>;
}

function Filter({ value, onChange, values, label }: { value: string; onChange: (value: string) => void; values: string[]; label: string }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="h-10 rounded-md border bg-white px-3 text-sm">
      <option value="الكل">{label}</option>{values.map((item) => <option key={item} value={item}>{item}</option>)}
    </select>
  );
}
