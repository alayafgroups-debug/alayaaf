import { useState } from "react";
import Layout from "@/components/Layout";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";

const MOCK_EMPLOYEES = [
  { id: 1, name: "SHA ALOM MIYA", job: "عامل تنظيف مكاتب والمنشآت", dept: "إدارة الموارد البشرية", section: "فندق منى كونكورد", time: "كامل" },
];

export default function HRPayrollStatement() {
  const [search, setSearch] = useState("");

  return (
    <Layout>
      <div className="p-6 max-w-[1600px] mx-auto space-y-6" dir="rtl">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-800">حساب الراتب</h2>
          </div>
          
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">السنة</label>
                <select className="w-full h-10 border border-gray-300 rounded-md px-3 bg-white text-sm focus:ring-2 focus:ring-[#004e89] focus:border-transparent outline-none">
                  <option>2026 ميلادي</option>
                  <option>2025 ميلادي</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">شهر</label>
                <select className="w-full h-10 border border-gray-300 rounded-md px-3 bg-white text-sm focus:ring-2 focus:ring-[#004e89] focus:border-transparent outline-none">
                  <option>مارس</option>
                  <option>فبراير</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">الفرع</label>
                <select className="w-full h-10 border border-gray-300 rounded-md px-3 bg-white text-sm focus:ring-2 focus:ring-[#004e89] focus:border-transparent outline-none">
                  <option>الكل</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">مكان العمل</label>
                <div className="w-full min-h-10 border border-gray-300 rounded-md p-1.5 bg-white flex items-center">
                  <span className="bg-gray-100 border border-gray-200 text-gray-700 text-xs px-2 py-1 rounded flex items-center gap-1">
                    الكل <button className="hover:text-red-500 ml-1">×</button>
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">الإدارة</label>
                <select className="w-full h-10 border border-gray-300 rounded-md px-3 bg-white text-sm focus:ring-2 focus:ring-[#004e89] focus:border-transparent outline-none">
                  <option>الكل</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">القسم</label>
                <select className="w-full h-10 border border-gray-300 rounded-md px-3 bg-white text-sm focus:ring-2 focus:ring-[#004e89] focus:border-transparent outline-none">
                  <option>الكل</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">إيقاف رواتب الموظفين</label>
                <select className="w-full h-10 border border-gray-300 rounded-md px-3 bg-white text-sm focus:ring-2 focus:ring-[#004e89] focus:border-transparent outline-none">
                  <option></option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">نوع الموظفين</label>
                <select className="w-full h-10 border border-gray-300 rounded-md px-3 bg-white text-sm focus:ring-2 focus:ring-[#004e89] focus:border-transparent outline-none">
                  <option>الكل</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <Button variant="outline" className="text-[#004e89] border-[#004e89] hover:bg-[#004e89] hover:text-white">
                جميع الموظفين (مختصر)
              </Button>
              <Button variant="outline" className="text-[#004e89] border-[#004e89] hover:bg-[#004e89] hover:text-white">
                اختيار الموظفين تفصيلي
              </Button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
            <h2 className="text-lg font-bold text-gray-800">الموظفين</h2>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span>عرض</span>
                <select className="border-gray-200 rounded-md text-sm p-1.5 focus:ring-[#004e89] focus:border-[#004e89]">
                  <option>10</option>
                  <option>25</option>
                  <option>50</option>
                </select>
                <span>من السجلات</span>
              </div>
              <div className="relative w-64">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="بحث"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-3 pr-9 h-10"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead className="bg-[#004e89] text-white">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">
                    <Checkbox className="border-white/50 data-[state=checked]:bg-white data-[state=checked]:text-[#004e89]" />
                  </th>
                  <th className="py-3 px-4 font-medium">الصورة</th>
                  <th className="py-3 px-4 font-medium">الاسم</th>
                  <th className="py-3 px-4 font-medium">المسمى الوظيفي</th>
                  <th className="py-3 px-4 font-medium">الإدارة</th>
                  <th className="py-3 px-4 font-medium">القسم</th>
                  <th className="py-3 px-4 font-medium">وقت العمل</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {MOCK_EMPLOYEES.map((emp) => (
                  <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 text-center">
                      <Checkbox />
                    </td>
                    <td className="py-3 px-4">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${emp.name}&backgroundColor=004e89`} />
                        <AvatarFallback>{emp.name[0]}</AvatarFallback>
                      </Avatar>
                    </td>
                    <td className="py-3 px-4 font-medium text-gray-900">{emp.name}</td>
                    <td className="py-3 px-4">{emp.job}</td>
                    <td className="py-3 px-4">{emp.dept}</td>
                    <td className="py-3 px-4">{emp.section}</td>
                    <td className="py-3 px-4">{emp.time}</td>
                  </tr>
                ))}
                {MOCK_EMPLOYEES.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-gray-500">
                      لا توجد بيانات للعرض
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}
