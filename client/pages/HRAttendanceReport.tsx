import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { Search, RefreshCw, Download, Trash2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";

type AttendanceRecord = {
  id: string;
  empId: string;
  empName: string;
  checkIn: string;
  checkOut: string;
  department: string;
  notes: string;
  date: string;
  status: string;
  lateMinutes: number;
};

export default function HRAttendanceReport() {
  const [data, setData] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Filter states
  const [dateFrom, setDateFrom] = useState(() => {
    const now = new Date();
    return now.toISOString().split("T")[0];
  });
  const [dateTo, setDateTo] = useState(() => {
    const now = new Date();
    return now.toISOString().split("T")[0];
  });
  const [departmentFilter, setDepartmentFilter] = useState("الكل");
  const [departments, setDepartments] = useState<string[]>([]);

  const loadDepartments = async () => {
    try {
      const { data: emps } = await supabase
        .from("employees")
        .select("department")
        .eq("status", "نشط");

      if (emps) {
        const depts = [...new Set(emps.map((e: any) => e.department).filter(Boolean))];
        setDepartments(depts as string[]);
      }
    } catch (err) {
      console.error("Error loading departments:", err);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      // Get attendance records with employee info
      let query = supabase
        .from("attendance")
        .select("*")
        .gte("date", dateFrom)
        .lte("date", dateTo);

      const { data: attRecords } = await query;

      if (!attRecords || attRecords.length === 0) {
        setData([]);
        setLoading(false);
        return;
      }

      // Build result from attendance table
      let result: AttendanceRecord[] = attRecords.map((r: any) => ({
        id: String(r.id ?? ""),
        empId: String(r.emp_id ?? ""),
        empName: String(r.emp_name ?? ""),
        checkIn: String(r.check_in ?? "-"),
        checkOut: String(r.check_out ?? "-"),
        department: String(r.department ?? ""),
        notes: String(r.notes ?? "-"),
        date: String(r.date ?? ""),
        status: String(r.status ?? ""),
        lateMinutes: Number(r.late_minutes ?? 0),
      }));

      // Apply filters
      if (departmentFilter !== "الكل") {
        result = result.filter((r) => r.department === departmentFilter);
      }

      if (search) {
        result = result.filter(
          (r) =>
            r.empName.includes(search) ||
            r.empId.includes(search) ||
            r.department.includes(search)
        );
      }

      setData(result);
    } catch (err) {
      console.error("Error loading attendance report:", err);
      toast.error("خطأ في تحميل البيانات");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDepartments();
  }, []);

  useEffect(() => {
    loadData();
  }, [dateFrom, dateTo, departmentFilter]);

  const handleDelete = async (id: string) => {
    if (!confirm("هل متأكد من حذف هذا السجل؟")) return;

    try {
      const { error } = await supabase.from("attendance").delete().eq("id", id);
      if (error) throw error;
      toast.success("تم الحذف بنجاح");
      loadData();
    } catch (err) {
      toast.error("خطأ في الحذف");
    }
  };

  const handleExport = () => {
    const csv = [
      ["رقم الموظف", "اسم الموظف", "الإدارة", "وقت الدخول", "وقت الخروج", "الحالة", "ملاحظات"],
      ...data.map((r) => [
        r.empId,
        r.empName,
        r.department,
        r.checkIn,
        r.checkOut,
        r.status,
        r.notes,
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance_report_${dateFrom}_to_${dateTo}.csv`;
    a.click();
  };

  return (
    <Layout>
      <div className="p-6 max-w-[1600px] mx-auto space-y-6" dir="rtl">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[#004e89]">تقرير الحضور والانصراف</h1>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" onClick={loadData} title="تحديث">
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleExport} title="تحميل">
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">من التاريخ</label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="text-right"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">إلى التاريخ</label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="text-right"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">الإدارة</label>
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="w-full px-3 py-2 border rounded-md text-right"
              >
                <option value="الكل">الكل</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="بحث برقم أو اسم الموظف..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-9"
            />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="p-4 border-b flex justify-between items-center">
            <span className="text-sm text-gray-600 font-medium">
              إجمالي السجلات: <span className="text-blue-600 font-bold">{data.length}</span>
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-blue-700 text-white">
                <tr>
                  <th className="py-3 px-4 text-center">الإجراءات</th>
                  <th className="py-3 px-4 text-right">ملاحظات</th>
                  <th className="py-3 px-4 text-center">عدد الحضور</th>
                  <th className="py-3 px-4 text-center">وقت الخروج</th>
                  <th className="py-3 px-4 text-center">وقت الدخول</th>
                  <th className="py-3 px-4 text-right">الإدارة</th>
                  <th className="py-3 px-4 text-right">اسم الموظف</th>
                  <th className="py-3 px-4 text-right">رقم الموظف</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-gray-400">
                      جاري التحميل...
                    </td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-gray-400">
                      لا توجد بيانات
                    </td>
                  </tr>
                ) : (
                  data.map((record, idx) => (
                    <tr
                      key={record.id}
                      className={`${
                        idx % 2 === 0 ? "bg-white" : "bg-gray-50"
                      } hover:bg-blue-50`}
                    >
                      <td className="py-3 px-4 text-center flex items-center justify-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          title="عرض"
                          className="h-8 w-8 p-0"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(record.id)}
                          title="حذف"
                          className="h-8 w-8 p-0 text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                      <td className="py-3 px-4 text-right text-xs text-gray-600">
                        {record.notes}
                      </td>
                      <td className="py-3 px-4 text-center font-medium text-blue-600">
                        {record.lateMinutes}
                      </td>
                      <td className="py-3 px-4 text-center font-mono">
                        {record.checkOut}
                      </td>
                      <td className="py-3 px-4 text-center font-mono">
                        {record.checkIn}
                      </td>
                      <td className="py-3 px-4 text-right text-sm">
                        {record.department}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-800">
                            {record.empName}
                          </span>
                          <Avatar className="h-6 w-6">
                            <AvatarImage
                              src={`https://api.dicebear.com/7.x/initials/svg?seed=${record.empName}&backgroundColor=004e89`}
                            />
                            <AvatarFallback>{record.empName[0]}</AvatarFallback>
                          </Avatar>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-blue-600">
                        {record.empId}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}
