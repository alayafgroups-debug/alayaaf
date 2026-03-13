import { useState } from "react";
import Layout from "@/components/Layout";
import { Search, Download, Printer, UserPlus, RefreshCw, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const MOCK_OTHER_BALANCES = [
  { id: "904", name: "MD TUHIN", type: "إجازة وضع", annualBalance: "70.00", remainingBalance: "70.00", joinDate: "2023-01-14", contractDate: "2026-01-14" },
];

export default function HRLeavesOtherBalance() {
  return (
    <Layout>
      <div className="p-6 max-w-[1600px] mx-auto space-y-6" dir="rtl">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          
          <div className="bg-[#004e89] text-white p-3 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 w-full md:w-auto">
              <h2 className="text-lg font-bold whitespace-nowrap hidden sm:block">أرصدة الاجازات الأخرى</h2>
              
              <div className="flex gap-2 text-black w-full sm:w-auto flex-wrap">
                <select className="h-8 rounded px-2 text-sm bg-white border-none outline-none min-w-[100px]">
                  <option>وقت العمل</option>
                </select>
                <select className="h-8 rounded px-2 text-sm bg-white border-none outline-none min-w-[100px]">
                  <option>الفرع</option>
                </select>
                <select className="h-8 rounded px-2 text-sm bg-white border-none outline-none min-w-[100px]">
                  <option>الكل</option>
                </select>
                <select className="h-8 rounded px-2 text-sm bg-white border-none outline-none min-w-[100px]">
                  <option>الكل</option>
                </select>
                <select className="h-8 rounded px-2 text-sm bg-white border-none outline-none min-w-[120px]">
                  <option>مكان العمل</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
              <h2 className="text-lg font-bold sm:hidden">أرصدة الاجازات الأخرى</h2>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <button className="p-1.5 hover:bg-white/10 rounded transition-colors text-white" title="تحديث الأرصدة">
                    <UserPlus className="h-4 w-4" />
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
                  <th className="py-3 px-2 font-medium">
                    نوع الإجازة <select className="h-6 w-full mt-1 border border-gray-200 rounded text-xs"><option></option></select>
                  </th>
                  <th className="py-3 px-2 font-medium">الرصيد السنوي</th>
                  <th className="py-3 px-2 font-medium">الرصيد المتبقي</th>
                  <th className="py-3 px-2 font-medium">تاريخ التعيين</th>
                  <th className="py-3 px-2 font-medium">تاريخ تجديد التعاقد السنوي</th>
                  <th className="py-3 px-2 font-medium">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {MOCK_OTHER_BALANCES.map((balance) => (
                  <tr key={balance.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-3 px-2">{balance.id}</td>
                    <td className="py-3 px-2 font-medium text-gray-900 text-right">{balance.name}</td>
                    <td className="py-3 px-2">{balance.type}</td>
                    <td className="py-3 px-2">{balance.annualBalance}</td>
                    <td className="py-3 px-2">{balance.remainingBalance}</td>
                    <td className="py-3 px-2">{balance.joinDate}</td>
                    <td className="py-3 px-2">{balance.contractDate}</td>
                    <td className="py-3 px-2">
                      <div className="flex flex-col items-center gap-2">
                        <button className="text-gray-400 hover:text-[#004e89]">
                          <RefreshCw className="h-4 w-4" />
                        </button>
                        <button className="text-teal-400 hover:text-teal-600">
                          <RefreshCw className="h-4 w-4" />
                        </button>
                      </div>
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
