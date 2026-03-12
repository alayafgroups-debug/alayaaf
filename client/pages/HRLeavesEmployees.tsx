import { useState } from "react";
import Layout from "@/components/Layout";
import { Search, FileText, Printer, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const MOCK_LEAVES = [
  { id: 1099, date: "16:41:20 2026-01-19", employee: "MD AZAD", type: "إجازة سنوية", duration: 53, start: "2026-02-01", end: "2026-03-25", status: "مقبول", replacement: "MD BIPUL MIA", phone: "0576236517", address: "بنجلاديش", reason: "إجازة سنوية" },
];

export default function HRLeavesEmployees() {
  const [search, setSearch] = useState("");

  return (
    <Layout>
      <div className="p-6 max-w-[1600px] mx-auto space-y-6" dir="rtl">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          
          <div className="bg-[#004e89] text-white p-3 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 w-full md:w-auto">
              <h2 className="text-lg font-bold whitespace-nowrap hidden sm:block">طلبات الإجازات</h2>
              <div className="flex gap-2 text-black w-full sm:w-auto">
                <select className="h-8 rounded px-2 text-sm bg-white border-none outline-none flex-1 sm:w-[120px]">
                  <option>الكل</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
              <h2 className="text-lg font-bold sm:hidden">طلبات الإجازات</h2>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <button className="p-1.5 hover:bg-white/10 rounded transition-colors text-white" title="سجل">
                    <FileText className="h-4 w-4" />
                  </button>
                  <button className="p-1.5 hover:bg-white/10 rounded transition-colors text-white" title="طباعة">
                    <Printer className="h-4 w-4" />
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
            <table className="w-full text-sm text-center whitespace-nowrap">
              <thead className="bg-gray-50 text-gray-700 border-b border-gray-200">
                <tr>
                  <th className="py-3 px-2 font-medium">رقم الطلب</th>
                  <th className="py-3 px-2 font-medium">تاريخ الطلب</th>
                  <th className="py-3 px-2 font-medium min-w-[150px]">
                    الموظف <Input placeholder="" className="h-6 mt-1" />
                  </th>
                  <th className="py-3 px-2 font-medium">
                    نوع الإجازة <select className="h-6 w-full mt-1 border border-gray-200 rounded text-xs"><option></option></select>
                  </th>
                  <th className="py-3 px-2 font-medium">المدة</th>
                  <th className="py-3 px-2 font-medium">تاريخ البداية</th>
                  <th className="py-3 px-2 font-medium">تاريخ النهاية</th>
                  <th className="py-3 px-2 font-medium">
                    الحالة <select className="h-6 w-full mt-1 border border-gray-200 rounded text-xs"><option></option></select>
                  </th>
                  <th className="py-3 px-2 font-medium min-w-[150px]">
                    الموظف البديل <Input placeholder="" className="h-6 mt-1" />
                  </th>
                  <th className="py-3 px-2 font-medium min-w-[100px]">رقم الهاتف</th>
                  <th className="py-3 px-2 font-medium min-w-[150px]">عنوان الموظف أثناء الإجازة</th>
                  <th className="py-3 px-2 font-medium min-w-[150px]">السبب</th>
                  <th className="py-3 px-2 font-medium">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {MOCK_LEAVES.map((leave) => (
                  <tr key={leave.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-3 px-2">{leave.id}</td>
                    <td className="py-3 px-2">{leave.date}</td>
                    <td className="py-3 px-2 font-medium text-gray-900">{leave.employee}</td>
                    <td className="py-3 px-2">{leave.type}</td>
                    <td className="py-3 px-2">{leave.duration}</td>
                    <td className="py-3 px-2">{leave.start}</td>
                    <td className="py-3 px-2">{leave.end}</td>
                    <td className="py-3 px-2">
                      <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-medium">
                        {leave.status}
                      </span>
                    </td>
                    <td className="py-3 px-2">{leave.replacement}</td>
                    <td className="py-3 px-2">{leave.phone}</td>
                    <td className="py-3 px-2">{leave.address}</td>
                    <td className="py-3 px-2 text-gray-500">{leave.reason}</td>
                    <td className="py-3 px-2">
                      <button className="text-gray-400 hover:text-[#004e89]">
                        <Eye className="h-5 w-5 mx-auto" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="bg-gray-50 p-4 border-t border-gray-100 flex items-center justify-between text-sm">
            <span className="text-gray-500">يعرض 1 إلى 1 من أصل 1 سجل</span>
            <div className="flex gap-1 opacity-50 pointer-events-none">
              <Button variant="outline" size="sm" className="h-8 px-3">السابق</Button>
              <Button variant="outline" size="sm" className="h-8 px-3">التالي</Button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
