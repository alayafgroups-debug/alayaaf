import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { Search, RefreshCw, Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/lib/supabaseClient";

type AttendanceDay = { day: number; status: "present" | "absent" | "future" };
type EmpRow = { id: string; name: string; attendance: AttendanceDay[] };

export default function HRAttendanceCalculate() {
  const [data, setData] = useState<EmpRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: emps, error: employeesError } = await supabase
        .from("employees")
        .select("id, emp_id, name")
        .in("status", ["نشط", "فعال", "active"])
        .order("name");
      if (employeesError) throw employeesError;
      if (!emps) { setLoading(false); return; }

      const [year, mon] = month.split("-").map(Number);
      const daysInMonth = new Date(year, mon, 0).getDate();

      const startDate = `${year}-${String(mon).padStart(2, "0")}-01`;
      const endDate = `${year}-${String(mon).padStart(2, "0")}-${daysInMonth}`;

      const { data: attRecords, error: attendanceError } = await supabase.from("attendance").select("emp_id, date, status")
        .gte("date", startDate).lte("date", endDate);
      if (attendanceError) throw attendanceError;

      const attMap: Record<string, Record<number, string>> = {};
      (attRecords ?? []).forEach((r: any) => {
        const key = String(r.emp_id ?? "");
        if (!key) return;
        if (!attMap[key]) attMap[key] = {};
        const d = new Date(r.date).getDate();
        attMap[key][d] = r.status;
      });

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      setData(emps.map((e: any) => {
        const empKey = String(e.emp_id ?? e.id ?? "");
        const empAtt = attMap[empKey] ?? {};
        const attendance: AttendanceDay[] = Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const date = new Date(year, mon - 1, day);
          date.setHours(0, 0, 0, 0);

          const st = empAtt[day];
          if (st === "حاضر" || st === "present") return { day, status: "present" as const };
          if (st === "غائب" || st === "absent") return { day, status: "absent" as const };

          if (date > today) return { day, status: "future" as const };
          return { day, status: "absent" as const };
        });
        return { id: e.id, name: e.name ?? "", attendance };
      }));
    } catch (error) {
      console.error("Error loading attendance calculation:", error);
      setData([]);
    } finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, [month]);

  const days = data.length > 0 ? data[0].attendance.map((a) => a.day) : Array.from({ length: 31 }, (_, i) => i + 1);
  const filtered = data.filter((e) => !search || e.name.includes(search));

  return (
    <Layout>
      <div className="p-6 max-w-[1600px] mx-auto space-y-6" dir="rtl">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[#004e89]">حساب الدوام</h1>
          <div className="flex items-center gap-3">
            <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-44 text-right" />
            <Button variant="outline" size="icon" onClick={loadData} title="تحديث"><RefreshCw className="h-4 w-4" /></Button>
            <Button variant="outline" size="icon" title="طباعة"><Printer className="h-4 w-4" /></Button>
            <Button variant="outline" size="icon" title="تحميل"><Download className="h-4 w-4" /></Button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="p-4 border-b flex justify-between items-center">
            <div className="relative w-72">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="بحث..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-9" />
            </div>
            <span className="text-sm text-gray-500">{filtered.length} موظف</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-center">
              <thead className="bg-blue-700 text-white font-bold">
                <tr>
                  <th className="py-2 px-3 text-right whitespace-nowrap min-w-[180px] sticky right-0 bg-blue-700 z-10">الموظف</th>
                  {days.map((day) => (
                    <th key={day} className="py-2 px-0.5 min-w-[32px] font-bold">{day}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={days.length + 1} className="text-center py-8 text-gray-400">جاري التحميل...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={days.length + 1} className="text-center py-8 text-gray-400">لا توجد بيانات</td></tr>
                ) : filtered.map((emp, idx) => (
                  <tr key={emp.id} className={`${idx % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-blue-50`}>
                    <td className="py-1.5 px-3 text-right sticky right-0 bg-inherit z-10 flex items-center justify-end gap-2 border-l border-gray-200">
                      <span className="font-medium text-gray-800 text-xs">{emp.name}</span>
                      <Avatar className="h-6 w-6 flex-shrink-0">
                        <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${emp.name}&backgroundColor=004e89`} />
                        <AvatarFallback className="text-xs">{emp.name[0]}</AvatarFallback>
                      </Avatar>
                    </td>
                    {emp.attendance.map((record) => (
                      <td key={record.day} className="py-1.5 px-0.5 border-gray-200 border-b text-lg font-bold bg-white">
                        {record.status === "present" && <div className="flex justify-center text-green-600">✓</div>}
                        {record.status === "absent" && <div className="flex justify-center text-red-500">✕</div>}
                        {record.status === "future" && <div className="flex justify-center text-gray-400">○</div>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}
