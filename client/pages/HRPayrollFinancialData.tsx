import { useState } from "react";
import Layout from "@/components/Layout";
import { Search, FileText, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const MOCK_EMPLOYEES = [
  { 
    id: 1, 
    name: "SHA ALOM MIYA", 
    job: "عامل تنظيف مكاتب والمنشآت", 
    dept: "إدارة الموارد البشرية", 
    section: "فندق منى كونكورد", 
    time: "كامل" 
  },
];

export default function HRPayrollFinancialData() {
  const [search, setSearch] = useState("");

  return (
    <Layout>
      <div className="p-6 max-w-[1600px] mx-auto space-y-6" dir="rtl">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          
          {/* Blue Header Bar */}
          <div className="bg-[#004e89] text-white p-3 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <h2 className="text-lg font-bold whitespace-nowrap hidden sm:block">البيانات المالية للموظفين</h2>
              
              <div className="flex flex-1 sm:flex-none gap-2 text-black">
                <select className="h-8 rounded px-2 text-sm bg-white border-none outline-none w-full sm:w-[120px]">
                  <option>الفرع</option>
                </select>
                <select className="h-8 rounded px-2 text-sm bg-white border-none outline-none w-full sm:w-[150px]">
                  <option>مكان العمل</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
              <h2 className="text-lg font-bold sm:hidden">البيانات المالية للموظفين</h2>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <button className="p-1.5 hover:bg-white/10 rounded transition-colors text-white" title="تصدير">
                    <Download className="h-4 w-4" />
                  </button>
                  <button className="p-1.5 hover:bg-white/10 rounded transition-colors text-white" title="سجل">
                    <FileText className="h-4 w-4" />
                  </button>
                </div>
                <div className="text-black">
                  <select className="h-8 w-16 rounded px-2 text-sm bg-white border-none outline-none font-medium">
                    <option>10</option>
                    <option>25</option>
                    <option>50</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right whitespace-nowrap">
              <thead className="bg-gray-50 text-gray-700 border-b border-gray-200">
                <tr>
                  <th className="py-3 px-4 font-medium text-center w-16">الصورة</th>
                  <th className="py-3 px-4 font-medium min-w-[200px]">الاسم</th>
                  <th className="py-3 px-4 font-medium">المسمى الوظيفي</th>
                  <th className="py-3 px-4 font-medium">الإدارة</th>
                  <th className="py-3 px-4 font-medium min-w-[150px]">
                    <div className="flex items-center gap-2">
                      <span>القسم</span>
                      <select className="h-6 w-5 opacity-0 absolute pointer-events-none">
                        <option>الكل</option>
                      </select>
                    </div>
                  </th>
                  <th className="py-3 px-4 font-medium">
                    <div className="flex items-center gap-2">
                      <span>وقت العمل</span>
                      <select className="h-6 w-5 opacity-0 absolute pointer-events-none">
                        <option>الكل</option>
                      </select>
                    </div>
                  </th>
                  <th className="py-3 px-4 font-medium text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {MOCK_EMPLOYEES.map((emp) => (
                  <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 flex justify-center">
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
                    <td className="py-3 px-4 text-center">
                      <button className="text-gray-400 hover:text-[#004e89] transition-colors" title="التفاصيل المالية">
                        <FileText className="h-5 w-5 mx-auto" />
                      </button>
                    </td>
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
