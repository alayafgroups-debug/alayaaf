import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { ArrowRight, Download, Eye, RefreshCw, Search, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";

type Employee = {
  id: string;
  empId: string;
  name: string;
  branch: string;
  administration: string;
  department: string;
  workLocation: string;
  workSchedule: string;
  workTime: string;
  dailyHours: number;
};

type Attendance = {
  id: string;
  empId: string;
  date: string;
  checkIn: string;
  checkOut: string;
  status: string;
};

type ScheduleSummary = {
  key: string;
  workType: string;
  schedule: string;
  employees: Employee[];
  startTime: string;
  endTime: string;
  hours: string;
};

type DetailRow = {
  id: string;
  employee: Employee;
  date: string;
  checkIn: string;
  checkOut: string;
};

const getMonthRange = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
  return { from: `${year}-${month}-01`, to: `${year}-${month}-${String(lastDay).padStart(2, "0")}` };
};

const timeToMinutes = (time: string) => {
  const [hours, minutes] = time.split(":").map(Number);
  return Number.isFinite(hours) && Number.isFinite(minutes) ? hours * 60 + minutes : null;
};

const formatHours = (start: string, end: string, fallback: number) => {
  const startMinutes = timeToMinutes(start);
  const endMinutes = timeToMinutes(end);
  if (startMinutes === null || endMinutes === null) return fallback ? `${fallback} ساعات` : "-";
  let difference = endMinutes - startMinutes;
  if (difference < 0) difference += 24 * 60;
  const hours = Math.floor(difference / 60);
  const minutes = difference % 60;
  return minutes ? `${hours} س ${minutes} د` : `${hours} ساعات`;
};

const SelectField = ({ label, value, onChange, options }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) => (
  <div className="space-y-1.5">
    <label className="block text-xs font-medium text-slate-700">{label}</label>
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
    >
      <option value="الكل">الكل</option>
      {options.map((option) => <option key={option} value={option}>{option}</option>)}
    </select>
  </div>
);

export default function HRAttendanceReport() {
  const initialRange = getMonthRange();
  const [dateFrom, setDateFrom] = useState(initialRange.from);
  const [dateTo, setDateTo] = useState(initialRange.to);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [branch, setBranch] = useState("الكل");
  const [administration, setAdministration] = useState("الكل");
  const [department, setDepartment] = useState("الكل");
  const [workLocation, setWorkLocation] = useState("الكل");
  const [workTime, setWorkTime] = useState("الكل");
  const [attendanceType, setAttendanceType] = useState("الكل");
  const [selectedSchedule, setSelectedSchedule] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [{ data: employeeRows, error: employeesError }, { data: attendanceRows, error: attendanceError }] = await Promise.all([
        supabase
          .from("employees")
          .select("id, emp_id, name, branch, division, department, work_location, work_schedule, work_time, daily_hours")
          .in("status", ["نشط", "فعال", "active"])
          .order("name"),
        supabase
          .from("attendance")
          .select("id, emp_id, date, check_in, check_out, status")
          .gte("date", dateFrom)
          .lte("date", dateTo)
          .order("date"),
      ]);

      if (employeesError) throw employeesError;
      if (attendanceError) throw attendanceError;

      setEmployees((employeeRows ?? []).map((row: any) => ({
        id: String(row.id),
        empId: String(row.emp_id ?? row.id),
        name: String(row.name ?? "-"),
        branch: String(row.branch ?? "غير محدد"),
        administration: String(row.division ?? "غير محدد"),
        department: String(row.department ?? "غير محدد"),
        workLocation: String(row.work_location ?? "غير محدد"),
        workSchedule: String(row.work_schedule ?? "بدون جدول عمل"),
        workTime: String(row.work_time ?? "دوام كامل"),
        dailyHours: Number(row.daily_hours ?? 0),
      })));
      setAttendance((attendanceRows ?? []).map((row: any) => ({
        id: String(row.id),
        empId: String(row.emp_id ?? ""),
        date: String(row.date ?? ""),
        checkIn: String(row.check_in ?? ""),
        checkOut: String(row.check_out ?? ""),
        status: String(row.status ?? ""),
      })));
    } catch (error) {
      console.error("Error loading attendance report:", error);
      toast.error("تعذر تحميل تقرير الحضور والانصراف");
      setEmployees([]);
      setAttendance([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [dateFrom, dateTo]);

  const uniqueValues = (field: keyof Employee): string[] =>
    ([...new Set(employees.map((employee) => String(employee[field])).filter(Boolean))] as string[]).sort();

  const filteredEmployees = employees.filter((employee) => {
    if (branch !== "الكل" && employee.branch !== branch) return false;
    if (administration !== "الكل" && employee.administration !== administration) return false;
    if (department !== "الكل" && employee.department !== department) return false;
    if (workLocation !== "الكل" && employee.workLocation !== workLocation) return false;
    if (workTime !== "الكل" && employee.workTime !== workTime) return false;
    return true;
  });

  const filteredEmployeeIds = new Set(filteredEmployees.map((employee) => employee.empId));
  const filteredAttendance = attendance.filter((record) => {
    if (!filteredEmployeeIds.has(record.empId)) return false;
    if (attendanceType === "حضور فقط" && !record.checkIn) return false;
    if (attendanceType === "انصراف فقط" && !record.checkOut) return false;
    if (attendanceType === "حضور وانصراف مكتمل" && (!record.checkIn || !record.checkOut)) return false;
    return true;
  });

  const summaries = filteredEmployees.reduce<Record<string, ScheduleSummary>>((groups, employee) => {
    const key = `${employee.workSchedule}__${employee.workTime}`;
    if (!groups[key]) {
      groups[key] = {
        key,
        workType: employee.workTime,
        schedule: employee.workSchedule,
        employees: [],
        startTime: "",
        endTime: "",
        hours: "-",
      };
    }
    groups[key].employees.push(employee);
    return groups;
  }, {});

  const summaryRows = (Object.values(summaries) as ScheduleSummary[]).map((summary) => {
    const ids = new Set(summary.employees.map((employee) => employee.empId));
    const records = filteredAttendance.filter((record) => ids.has(record.empId));
    const starts = records.map((record) => record.checkIn).filter(Boolean).sort();
    const ends = records.map((record) => record.checkOut).filter(Boolean).sort();
    const startTime = starts[0] ?? "";
    const endTime = ends[ends.length - 1] ?? "";
    return {
      ...summary,
      startTime,
      endTime,
      hours: formatHours(startTime, endTime, summary.employees[0]?.dailyHours ?? 0),
    };
  }).filter((summary) =>
    !search || summary.schedule.includes(search) || summary.workType.includes(search)
  );

  const selectedSummary: ScheduleSummary | undefined = summaryRows.find((summary) => summary.key === selectedSchedule)
    ?? (Object.values(summaries) as ScheduleSummary[]).find((summary) => summary.key === selectedSchedule);

  const detailRows: DetailRow[] = selectedSummary
    ? selectedSummary.employees.flatMap((employee) => {
        const records = filteredAttendance.filter((record) => record.empId === employee.empId);
        return records.map((record) => ({
          id: record.id,
          employee,
          date: record.date,
          checkIn: record.checkIn,
          checkOut: record.checkOut,
        }));
      }).filter((row) =>
        !search || row.employee.name.includes(search) || row.employee.empId.includes(search)
      )
    : [];

  const exportCsv = () => {
    const rows = selectedSchedule
      ? [
          ["اسم الموظف", "رقم الموظف", "التاريخ", "وقت الحضور الفعلي", "وقت الانصراف الفعلي", "وقت العمل", "جدول العمل", "الإدارة", "القسم"],
          ...detailRows.map((row) => [row.employee.name, row.employee.empId, row.date, row.checkIn || "-", row.checkOut || "-", row.employee.workTime, row.employee.workSchedule, row.employee.administration, row.employee.department]),
        ]
      : [
          ["نوع العمل", "جدول العمل", "عدد الموظفين", "وقت البداية", "وقت النهاية", "الساعات"],
          ...summaryRows.map((row) => [row.workType, row.schedule, String(row.employees.length), row.startTime || "-", row.endTime || "-", row.hours]),
        ];
    const csv = `\uFEFF${rows.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")).join("\n")}`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = selectedSchedule ? `attendance_details_${dateFrom}_${dateTo}.csv` : `attendance_schedules_${dateFrom}_${dateTo}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const filterPanel = (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
      <div className="space-y-1.5">
        <label className="block text-xs font-medium text-slate-700">من تاريخ</label>
        <Input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
      </div>
      <div className="space-y-1.5">
        <label className="block text-xs font-medium text-slate-700">إلى تاريخ</label>
        <Input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
      </div>
      <SelectField label="الفرع" value={branch} onChange={setBranch} options={uniqueValues("branch")} />
      <SelectField label="الإدارة" value={administration} onChange={setAdministration} options={uniqueValues("administration")} />
      <SelectField label="القسم" value={department} onChange={setDepartment} options={uniqueValues("department")} />
      <SelectField label="مكان العمل" value={workLocation} onChange={setWorkLocation} options={uniqueValues("workLocation")} />
      <SelectField label="وقت العمل" value={workTime} onChange={setWorkTime} options={uniqueValues("workTime")} />
      <SelectField
        label={selectedSchedule ? "نوع التحضير" : "نوع البصمة"}
        value={attendanceType}
        onChange={setAttendanceType}
        options={["حضور فقط", "انصراف فقط", "حضور وانصراف مكتمل"]}
      />
    </div>
  );

  return (
    <Layout>
      <div className="mx-auto max-w-[1600px] space-y-5 p-4 md:p-6" dir="rtl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {selectedSchedule && (
              <Button variant="outline" size="icon" onClick={() => { setSelectedSchedule(null); setSearch(""); }} title="العودة للتقارير">
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
            <div>
              <h1 className="text-xl font-bold text-slate-900 md:text-2xl">
                {selectedSchedule ? "التحضير الجماعي للموظفين" : "تقرير الحضور والانصراف"}
              </h1>
              <p className="mt-1 text-xs text-slate-500">
                {selectedSchedule ? `${selectedSummary?.workType ?? ""} — ${selectedSummary?.schedule ?? ""}` : "ملخص جداول العمل وبيانات الحضور المسجلة"}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={loadData} title="تحديث"><RefreshCw className="h-4 w-4" /></Button>
            <Button variant="outline" size="icon" onClick={exportCsv} title="تحميل"><Download className="h-4 w-4" /></Button>
          </div>
        </div>

        {selectedSchedule && (
          <div className="rounded-md border border-slate-200 bg-slate-100 px-4 py-3 text-center text-sm text-slate-700">
            وردية <span className="font-semibold">{selectedSummary?.workType}</span>
            {selectedSummary?.startTime && <>، وقت البداية <span className="font-semibold">{selectedSummary.startTime}</span></>}
            {selectedSummary?.endTime && <>، وقت النهاية <span className="font-semibold">{selectedSummary.endTime}</span></>}
          </div>
        )}

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          {filterPanel}
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {selectedSchedule && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t-4 border-t-sky-600 px-5 py-4">
              <div className="flex items-center gap-2 font-bold text-slate-800"><Users className="h-5 w-5 text-sky-700" />التحضير الجماعي للموظفين</div>
              <Button onClick={loadData} className="bg-sky-700 hover:bg-sky-800"><Users className="ml-2 h-4 w-4" />تحديث التحضير</Button>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
            <div className="relative w-full sm:w-72">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input placeholder="بحث..." value={search} onChange={(event) => setSearch(event.target.value)} className="pr-9" />
            </div>
            <span className="text-xs text-slate-500">
              {selectedSchedule ? `${detailRows.length} سجل حضور` : `${summaryRows.length} جدول عمل`}
            </span>
          </div>

          <div className="overflow-x-auto">
            {selectedSchedule ? (
              <table className="w-full min-w-[1100px] text-right text-sm">
                <thead className="bg-[#075f94] text-white">
                  <tr>
                    <th className="px-4 py-3 font-medium">اسم الموظف</th>
                    <th className="px-4 py-3 font-medium">التاريخ</th>
                    <th className="px-4 py-3 text-center font-medium">وقت الحضور الفعلي</th>
                    <th className="px-4 py-3 text-center font-medium">وقت الانصراف الفعلي</th>
                    <th className="px-4 py-3 font-medium">وقت العمل</th>
                    <th className="px-4 py-3 font-medium">جدول العمل</th>
                    <th className="px-4 py-3 font-medium">الإدارة</th>
                    <th className="px-4 py-3 font-medium">القسم</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr><td colSpan={8} className="py-10 text-center text-slate-400">جاري تحميل البيانات...</td></tr>
                  ) : detailRows.length === 0 ? (
                    <tr><td colSpan={8} className="py-10 text-center text-slate-400">لا توجد سجلات حضور ضمن الفترة المحددة</td></tr>
                  ) : detailRows.map((row, index) => (
                    <tr key={row.id} className={index % 2 ? "bg-slate-50/70" : "bg-white"}>
                      <td className="px-4 py-3"><div className="font-semibold text-slate-800">{row.employee.name}</div><div className="text-xs text-slate-400">{row.employee.empId}</div></td>
                      <td className="px-4 py-3 whitespace-nowrap">{row.date}</td>
                      <td className="px-4 py-3 text-center font-mono">{row.checkIn || "-"}</td>
                      <td className="px-4 py-3 text-center font-mono">{row.checkOut || "-"}</td>
                      <td className="px-4 py-3">{row.employee.workTime}</td>
                      <td className="px-4 py-3">{row.employee.workSchedule}</td>
                      <td className="px-4 py-3">{row.employee.administration}</td>
                      <td className="px-4 py-3">{row.employee.department}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="w-full min-w-[900px] text-right text-sm">
                <thead className="bg-[#075f94] text-white">
                  <tr>
                    <th className="px-4 py-3 font-medium">نوع العمل</th>
                    <th className="px-4 py-3 font-medium">جدول العمل</th>
                    <th className="px-4 py-3 text-center font-medium">عدد الموظفين</th>
                    <th className="px-4 py-3 text-center font-medium">وقت البداية</th>
                    <th className="px-4 py-3 text-center font-medium">وقت النهاية</th>
                    <th className="px-4 py-3 text-center font-medium">الساعات</th>
                    <th className="px-4 py-3 text-center font-medium">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr><td colSpan={7} className="py-10 text-center text-slate-400">جاري تحميل البيانات...</td></tr>
                  ) : summaryRows.length === 0 ? (
                    <tr><td colSpan={7} className="py-10 text-center text-slate-400">لا توجد جداول عمل مطابقة</td></tr>
                  ) : summaryRows.map((row, index) => (
                    <tr key={row.key} className={`${index % 2 ? "bg-slate-50/70" : "bg-white"} hover:bg-sky-50`}>
                      <td className="px-4 py-3 font-medium text-slate-800">{row.workType}</td>
                      <td className="px-4 py-3">{row.schedule}</td>
                      <td className="px-4 py-3 text-center">{row.employees.length}</td>
                      <td className="px-4 py-3 text-center font-mono">{row.startTime || "-"}</td>
                      <td className="px-4 py-3 text-center font-mono">{row.endTime || "-"}</td>
                      <td className="px-4 py-3 text-center">{row.hours}</td>
                      <td className="px-4 py-3 text-center">
                        <Button size="sm" onClick={() => { setSelectedSchedule(row.key); setSearch(""); }} className="h-8 bg-sky-700 px-4 hover:bg-sky-800">
                          <Eye className="ml-1.5 h-4 w-4" />عرض
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
