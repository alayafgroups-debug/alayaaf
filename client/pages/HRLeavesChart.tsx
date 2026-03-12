import { useState } from "react";
import Layout from "@/components/Layout";
import { Printer, FileText, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

const MOCK_CHART = [
  { id: "0001", name: "عبدالمجيد شودري", months: ["-", "-", "-", "-", "-", "-", "-", "-", "-", "-", "-", "-"] },
];

export default function HRLeavesChart() {
  const [search, setSearch] = useState("");

  return (
    <Layout>
      <div className="p-6 max-w-[1600px] mx-auto space-y-6" dir="rtl">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          
          <div className="bg-[#004e89] text-white p-3 flex flex-col xl:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-wrap">
              <h2 className="text-lg font-bold whitespace-nowrap">مخطط الإجازات</h2>
              
              <div className="flex gap-2 text-black flex-wrap">
                <select className="h-8 rounded px-2 text-sm bg-white border-none outline-none min-w-[100px]">
                  <option>2026</option>
                  <option>2025</option>
                </select>
                <select className="h-8 rounded px-2 text-sm bg-white border-none outline-none min-w-[100px]">
                  <option>الفرع</option>
                </select>
                <select className="h-8 rounded px-2 text-sm bg-white border-none outline-none min-w-[120px]">
                  <option>الإدارة</option>
                </select>
                <select className="h-8 rounded px-2 text-sm bg-white border-none outline-none min-w-[120px]">
                  <option>القسم</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <button className="p-1.5 hover:bg-white/10 rounded transition-colors text-white" title="إرسال إيميل">
                  <Send className="h-4 w-4" />
                </button>
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
                </select>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-center whitespace-nowrap">
              <thead className="bg-gray-50 text-gray-700 border-b border-gray-200">
                <tr>
                  <th className="py-3 px-2 font-medium min-w-[100px]">
                    الرقم الوظيفي <Input placeholder="" className="h-6 mt-1" />
                  </th>
                  <th className="py-3 px-2 font-medium min-w-[200px]">
                    الاسم <Input placeholder="" className="h-6 mt-1" />
                  </th>
                  <th className="py-3 px-2 font-medium">يناير</th>
                  <th className="py-3 px-2 font-medium">فبراير</th>
                  <th className="py-3 px-2 font-medium">مارس</th>
                  <th className="py-3 px-2 font-medium">أبريل</th>
                  <th className="py-3 px-2 font-medium">مايو</th>
                  <th className="py-3 px-2 font-medium">يونيو</th>
                  <th className="py-3 px-2 font-medium">يوليو</th>
                  <th className="py-3 px-2 font-medium">أغسطس</th>
                  <th className="py-3 px-2 font-medium">سبتمبر</th>
                  <th className="py-3 px-2 font-medium">أكتوبر</th>
                  <th className="py-3 px-2 font-medium">نوفمبر</th>
                  <th className="py-3 px-2 font-medium">ديسمبر</th>
                  <th className="py-3 px-2 font-medium">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {MOCK_CHART.map((emp) => (
                  <tr key={emp.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-3 px-2">{emp.id}</td>
                    <td className="py-3 px-2 font-medium text-gray-900 text-right">{emp.name}</td>
                    {emp.months.map((m, i) => (
                      <td key={i} className="py-3 px-2">{m}</td>
                    ))}
                    <td className="py-3 px-2">
                      <button className="text-gray-400 hover:text-[#004e89]">
                        <span className="font-bold text-lg leading-none">...</span>
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
