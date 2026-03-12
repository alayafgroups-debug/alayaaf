import { useState } from "react";
import Layout from "@/components/Layout";
import { Search, Filter, RefreshCw, MoreHorizontal, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const MOCK_EMPLOYEES = [
  { id: 1, name: "SHA ALOM MIYA" },
  { id: 2, name: "ABDUL HAI" },
  { id: 3, name: "MD SHAMIM AHMED" },
  { id: 4, name: "Sumaiya kumar Miah" },
  { id: 5, name: "محمود البجاوي" },
  { id: 6, name: "زيان حسين" },
  { id: 7, name: "أحمد المهداوي" },
  { id: 8, name: "رضوان حسين" },
  { id: 9, name: "عياض الدين عمر الدين" },
  { id: 10, name: "رشا فارس شيتال السبيعي العنزي" },
];

// Helper to generate mock attendance (present, absent, weekend)
const generateMockAttendance = () => {
  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  return days.map(day => {
    // Weekends on 6, 7, 13, 14, 20, 21, 27, 28
    const isWeekend = day % 7 === 6 || day % 7 === 0;
    if (isWeekend) return { day, status: "weekend" };
    // Random present/absent
    const isPresent = Math.random() > 0.4;
    return { day, status: isPresent ? "present" : "absent" };
  });
};

export default function HRAttendanceCalculate() {
  const [activeTab, setActiveTab] = useState("attendance");
  const [search, setSearch] = useState("");
  
  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  const attendanceData = MOCK_EMPLOYEES.map(emp => ({
    ...emp,
    attendance: generateMockAttendance(),
  }));

  return (
    <Layout>
      <div className="p-6 max-w-[1600px] mx-auto space-y-6" dir="rtl">
        {/* Header Title */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[#004e89]">حساب الدوام</h1>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Tabs & Controls */}
          <div className="p-4 border-b border-gray-100">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" className="h-9 w-9 text-gray-500">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="h-9 w-9 text-gray-500">
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="h-9 w-9 text-gray-500">
                  <Filter className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto">
                <button
                  onClick={() => setActiveTab("report")}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    activeTab === "report"
                      ? "bg-[#004e89] text-white rounded-lg"
                      : "text-gray-500 hover:text-[#004e89]"
                  }`}
                >
                  تقرير حساب دوام الموظفين
                </button>
                <button
                  onClick={() => setActiveTab("attendance")}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    activeTab === "attendance"
                      ? "bg-[#004e89] text-white rounded-lg"
                      : "text-gray-500 hover:text-[#004e89]"
                  }`}
                >
                  الحضور والانصراف للموظفين
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between mt-6">
              <div className="relative w-72">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="بحث"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-3 pr-9 h-10"
                />
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span>عرض</span>
                <select className="border-gray-200 rounded-md text-sm p-1.5 focus:ring-[#004e89] focus:border-[#004e89]">
                  <option>10</option>
                  <option>25</option>
                  <option>50</option>
                </select>
                <span>من السجلات</span>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-center">
              <thead className="bg-[#004e89] text-white">
                <tr>
                  <th className="py-3 px-4 text-right whitespace-nowrap min-w-[200px] sticky right-0 bg-[#004e89] z-10">
                    الموظف
                  </th>
                  {days.map(day => (
                    <th key={day} className="py-3 px-1 min-w-[36px]">
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {attendanceData.map((emp) => (
                  <tr key={emp.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-2 px-4 text-right sticky right-0 bg-white group-hover:bg-gray-50/50 z-10 flex items-center justify-end gap-3 border-l border-gray-100">
                      <span className="font-medium text-gray-700">{emp.name}</span>
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${emp.name}&backgroundColor=004e89`} />
                        <AvatarFallback>{emp.name[0]}</AvatarFallback>
                      </Avatar>
                    </td>
                    {emp.attendance.map((record) => (
                      <td 
                        key={record.day} 
                        className={`py-2 px-1 ${record.status === "weekend" ? "bg-green-50/50" : ""}`}
                      >
                        {record.status === "present" && (
                          <div className="flex justify-center">
                            <CheckCircle2 className="h-5 w-5 text-teal-500/80" />
                          </div>
                        )}
                        {record.status === "absent" && (
                          <div className="flex justify-center">
                            <XCircle className="h-5 w-5 text-red-400/80" />
                          </div>
                        )}
                        {record.status === "weekend" && (
                          <div className="flex justify-center">
                            <div className="h-2 w-2 rounded-full bg-green-200" />
                          </div>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer Pagination */}
          <div className="bg-gray-50 p-4 border-t border-gray-100 flex items-center justify-between text-sm">
            <span className="text-gray-500">إظهار 1 إلى 10 من أصل 128 مدخل</span>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" className="h-8 px-3 text-gray-500 bg-white">
                السابق
              </Button>
              <Button variant="default" size="sm" className="h-8 w-8 p-0 bg-[#004e89] hover:bg-[#003865]">
                1
              </Button>
              <Button variant="outline" size="sm" className="h-8 w-8 p-0 bg-white">
                2
              </Button>
              <Button variant="outline" size="sm" className="h-8 w-8 p-0 bg-white">
                3
              </Button>
              <Button variant="outline" size="sm" className="h-8 w-8 p-0 bg-white">
                4
              </Button>
              <Button variant="outline" size="sm" className="h-8 w-8 p-0 bg-white">
                5
              </Button>
              <Button variant="outline" size="sm" className="h-8 px-3 text-gray-500 bg-white">
                التالي
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
