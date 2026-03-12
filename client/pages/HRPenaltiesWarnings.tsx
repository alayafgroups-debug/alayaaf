import { useState } from "react";
import Layout from "@/components/Layout";
import { Printer, FileText, Download, Plus } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";

export default function HRPenaltiesWarnings() {
  return (
    <Layout>
      <div className="p-6 max-w-[1600px] mx-auto space-y-6" dir="rtl">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          
          <div className="bg-[#004e89] text-white p-3 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 w-full md:w-auto">
              <h2 className="text-lg font-bold whitespace-nowrap hidden sm:block">الإنذارات</h2>
              
              <div className="flex gap-2 text-black w-full sm:w-auto">
                <select className="h-8 rounded px-2 text-sm bg-white border-none outline-none flex-1 sm:w-[120px]">
                  <option>الكل</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
              <h2 className="text-lg font-bold sm:hidden">الإنذارات</h2>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <button className="p-1.5 hover:bg-white/10 rounded transition-colors text-white" title="إضافة">
                    <Plus className="h-5 w-5" />
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
                  <th className="py-3 px-2 font-medium w-12"><Checkbox /></th>
                  <th className="py-3 px-2 font-medium">التاريخ</th>
                  <th className="py-3 px-2 font-medium min-w-[150px]">إسم الموظف</th>
                  <th className="py-3 px-2 font-medium">المرسل</th>
                  <th className="py-3 px-2 font-medium min-w-[150px]">الموضوع</th>
                  <th className="py-3 px-2 font-medium min-w-[150px]">نص المساءلة</th>
                  <th className="py-3 px-2 font-medium">
                    <div className="flex items-center justify-center gap-1">
                      الحالة <select className="h-6 w-4 opacity-0 absolute"><option></option></select>
                    </div>
                  </th>
                  <th className="py-3 px-2 font-medium">تاريخ الإضافة</th>
                  <th className="py-3 px-2 font-medium">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                <tr>
                  <td colSpan={9} className="py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <FileText className="h-10 w-10 text-gray-300" />
                      <p>لا توجد بيانات في الجدول</p>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <div className="bg-gray-50 p-4 border-t border-gray-100 flex items-center justify-between text-sm">
            <span className="text-gray-500">يعرض 0 إلى 0 من أصل 0 سجل</span>
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
