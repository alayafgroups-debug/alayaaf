import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { RefreshCw, Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";

type MonthlyAttendance = {
  empId: string;
  empName: string;
  department: string;
  section: string;
  attendance: Record<number, { status: string; notes: string }>;
};

export default function HRAttendanceMonthlyReport() {
  const [data, setData] = useState<MonthlyAttendance[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [departmentFilter, setDepartmentFilter] = useState("الكل");
  const [sectionFilter, setSectionFilter] = useState("الكل");
  const [departments, setDepartments] = useState<string[]>([]);
  const [sections, setSections] = useState<string[]>([]);

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month, 0).getDate();
  };

  const daysInMonth = getDaysInMonth(year, month);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const loadDepartmentsAndSections = async () => {
    try {
      const { data: emps } = await supabase
        .from("employees")
        .select("department, division")
        .eq("status", "نشط");

      if (emps) {
        const depts = [...new Set(emps.map((e: any) => e.department).filter(Boolean))];
        const secs = [...new Set(emps.map((e: any) => e.division).filter(Boolean))];
        setDepartments(depts as string[]);
        setSections(secs as string[]);
      }
    } catch (err) {
      console.error("Error loading departments:", err);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      // Get employees
      let empQuery = supabase
        .from("employees")
        .select("id, emp_id, name, department, division")
        .eq("status", "نشط");

      const { data: emps } = await empQuery;

      if (!emps || emps.length === 0) {
        setData([]);
        setLoading(false);
        return;
      }

      // Get attendance records for the month
      const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
      const endDate = `${year}-${String(month).padStart(2, "0")}-${daysInMonth}`;

      const { data: attRecords } = await supabase
        .from("attendance")
        .select("*")
        .gte("date", startDate)
        .lte("date", endDate);

      // Build attendance map
      const attMap: Record<string, Record<number, any>> = {};
      (attRecords || []).forEach((r: any) => {
        if (!attMap[r.emp_id]) attMap[r.emp_id] = {};
        const date = new Date(r.date);
        const day = date.getDate();
        attMap[r.emp_id][day] = {
          status: r.status || "غياب",
          notes: r.notes || "",
        };
      });

      // Build result
      let result: MonthlyAttendance[] = emps.map((e: any) => {
        const emp: MonthlyAttendance = {
          empId: e.emp_id || "-",
          empName: e.name || "-",
          department: e.department || "-",
          section: e.division || "-",
          attendance: {},
        };

        for (let day = 1; day <= daysInMonth; day++) {
          const date = new Date(year, month - 1, day);
          const isWeekend = date.getDay() === 5 || date.getDay() === 6;

          if (isWeekend) {
            emp.attendance[day] = { status: "عطلة نهاية أسبوع", notes: "" };
          } else if (attMap[e.emp_id]?.[day]) {
            emp.attendance[day] = attMap[e.emp_id][day];
          } else {
            emp.attendance[day] = { status: "غياب", notes: "" };
          }
        }

        return emp;
      });

      // Apply filters
      if (departmentFilter !== "الكل") {
        result = result.filter((r) => r.department === departmentFilter);
      }

      if (sectionFilter !== "الكل") {
        result = result.filter((r) => r.section === sectionFilter);
      }

      setData(result.sort((a, b) => a.empName.localeCompare(b.empName)));
    } catch (err) {
      console.error("Error loading monthly report:", err);
      toast.error("خطأ في تحميل البيانات");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDepartmentsAndSections();
  }, []);

  useEffect(() => {
    loadData();
  }, [year, month, departmentFilter, sectionFilter]);

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    const rows = [
      [
        "رقم الموظف",
        "اسم الموظف",
        "الإدارة",
        ...days.map((d) => String(d)),
      ],
      ...data.map((emp) => [
        emp.empId,
        emp.empName,
        emp.department,
        ...days.map((d) => emp.attendance[d]?.status || "-"),
      ]),
    ];

    const csv = rows.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance_monthly_${year}_${month}.csv`;
    a.click();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "حاضر":
        return "bg-green-100 text-green-700";
      case "غياب":
        return "bg-red-100 text-red-700";
      case "إجازة":
        return "bg-blue-100 text-blue-700";
      case "مأمورية":
        return "bg-purple-100 text-purple-700";
      case "متأخر":
        return "bg-yellow-100 text-yellow-700";
      case "عطلة نهاية أسبوع":
        return "bg-gray-100 text-gray-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const isWeekend = (day: number) => {
    const date = new Date(year, month - 1, day);
    return date.getDay() === 5 || date.getDay() === 6;
  };

  return (
    <Layout>
      <div className="p-6 max-w-[1800px] mx-auto space-y-6" dir="rtl">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[#004e89]">تقرير الحضور الشهري</h1>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" onClick={loadData} title="تحديث">
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handlePrint} title="طباعة">
              <Printer className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleExport} title="تحميل">
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">السنة</label>
              <Input
                type="number"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="text-right"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">الشهر</label>
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="w-full px-3 py-2 border rounded-md text-right"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                  <option key={m} value={m}>
                    {new Date(year, m - 1).toLocaleString("ar-SA", {
                      month: "long",
                    })}
                  </option>
                ))}
              </select>
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
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">القسم</label>
              <select
                value={sectionFilter}
                onChange={(e) => setSectionFilter(e.target.value)}
                className="w-full px-3 py-2 border rounded-md text-right"
              >
                <option value="الكل">الكل</option>
                {sections.map((sect) => (
                  <option key={sect} value={sect}>
                    {sect}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Monthly Table */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-400">جاري التحميل...</div>
          ) : data.length === 0 ? (
            <div className="p-8 text-center text-gray-400">لا توجد بيانات</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-blue-700 text-white font-bold sticky top-0 z-10">
                    <th className="py-2 px-2 text-right min-w-[120px] sticky right-0 bg-blue-700 z-20">
                      الموظف
                    </th>
                    <th className="py-2 px-2 text-right min-w-[100px] sticky right-[120px] bg-blue-700 z-20">
                      الإدارة
                    </th>
                    {days.map((day) => (
                      <th
                        key={day}
                        className={`py-2 px-1 min-w-[40px] text-center font-bold ${
                          isWeekend(day) ? "bg-blue-600" : ""
                        }`}
                      >
                        {day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.map((emp, idx) => (
                    <tr
                      key={emp.empId}
                      className={`${
                        idx % 2 === 0 ? "bg-white" : "bg-gray-50"
                      } hover:bg-blue-50 border-b`}
                    >
                      <td className="py-1.5 px-2 text-right sticky right-0 bg-inherit z-10 font-medium text-gray-800 border-l border-gray-200">
                        {emp.empName}
                        <br />
                        <span className="text-xs text-gray-500">{emp.empId}</span>
                      </td>
                      <td className="py-1.5 px-2 text-right sticky right-[120px] bg-inherit z-10 text-xs border-l border-gray-200">
                        {emp.department}
                      </td>
                      {days.map((day) => {
                        const att = emp.attendance[day];
                        const weekend = isWeekend(day);
                        return (
                          <td
                            key={day}
                            className={`py-1.5 px-0.5 text-center border-b border-gray-200 text-xs font-medium ${
                              weekend ? "bg-gray-100" : getStatusColor(att.status)
                            }`}
                          >
                            <div className="min-h-[40px] flex items-center justify-center p-0.5">
                              <span className="line-clamp-2">{att.status}</span>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="text-sm text-green-700 font-medium">إجمالي الحاضرين</div>
            <div className="text-2xl font-bold text-green-600">
              {data.reduce(
                (acc, emp) =>
                  acc +
                  days.filter((d) => emp.attendance[d]?.status === "حاضر").length,
                0
              )}
            </div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="text-sm text-red-700 font-medium">إجمالي الغائبين</div>
            <div className="text-2xl font-bold text-red-600">
              {data.reduce(
                (acc, emp) =>
                  acc +
                  days.filter((d) => emp.attendance[d]?.status === "غياب").length,
                0
              )}
            </div>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="text-sm text-yellow-700 font-medium">إجمالي المتأخرين</div>
            <div className="text-2xl font-bold text-yellow-600">
              {data.reduce(
                (acc, emp) =>
                  acc +
                  days.filter((d) => emp.attendance[d]?.status === "متأخر").length,
                0
              )}
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="text-sm text-blue-700 font-medium">إجمالي الإجازات</div>
            <div className="text-2xl font-bold text-blue-600">
              {data.reduce(
                (acc, emp) =>
                  acc +
                  days.filter(
                    (d) =>
                      emp.attendance[d]?.status === "إجازة" ||
                      emp.attendance[d]?.status === "مأمورية"
                  ).length,
                0
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body { margin: 0; }
          .no-print { display: none; }
          table { font-size: 10px; }
          th, td { padding: 4px !important; }
        }
      `}</style>
    </Layout>
  );
}
