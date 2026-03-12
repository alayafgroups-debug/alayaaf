import { useState } from "react";
import Layout from "@/components/Layout";
import { Printer, FileText, Download, Plus, MoreHorizontal } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";

const MOCK_TYPES = [
  { id: 1, nameAr: "الغياب بدون عذر", nameEn: "الغياب بدون عذر", limit: "90 يوم", status: "فعال" },
];

export default function HRPenaltiesTypes() {
  return (
    <Layout>
      <div className="p-6 max-w-[1600px] mx-auto space-y-6" dir="rtl">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          
          <div className="bg-[#004e89] text-white p-3 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 w-full md:w-auto">
              <h2 className="text-lg font-bold whitespace-nowrap hidden sm:block">أنواع المخالفات</h2>
              
              <div className="flex gap-2 text-black w-full sm:w-auto">
                <select className="h-8 rounded px-2 text-sm bg-white border-none outline-none flex-1 sm:w-[150px]">
                  <option>مجموعات المخالفات</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
              <h2 className="text-lg font-bold sm:hidden">أنواع المخالفات</h2>
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
                  <th className="py-3 px-4 font-medium w-12"><Checkbox /></th>
                  <th className="py-3 px-4 font-medium min-w-[200px]">الاسم بالعربية</th>
                  <th className="py-3 px-4 font-medium min-w-[200px]">الاسم بالانجليزية</th>
                  <th className="py-3 px-4 font-medium min-w-[150px]">عدد الأيام المسموحة لتجاوز تكرار المخالفة</th>
                  <th className="py-3 px-4 font-medium">
                    <div className="flex items-center justify-center gap-1">
                      الحالة <select className="h-6 w-4 opacity-0 absolute"><option></option></select>
                    </div>
                  </th>
                  <th className="py-3 px-4 font-medium w-24">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {MOCK_TYPES.map((type) => (
                  <tr key={type.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-3 px-4"><Checkbox /></td>
                    <td className="py-3 px-4">{type.nameAr}</td>
                    <td className="py-3 px-4">{type.nameEn}</td>
                    <td className="py-3 px-4">{type.limit}</td>
                    <td className="py-3 px-4">
                      <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-xs">
                        {type.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <button className="text-gray-400 hover:text-[#004e89]">
                        <MoreHorizontal className="h-5 w-5" />
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
