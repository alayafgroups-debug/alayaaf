import { useState } from "react";
import Layout from "@/components/Layout";
import { Search, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function HRPenaltiesDecisions() {
  const [search, setSearch] = useState("");

  return (
    <Layout>
      <div className="p-6 max-w-[1200px] mx-auto space-y-6" dir="rtl">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-800">القرارات النهائية</h2>
            <Button className="bg-[#004e89] hover:bg-[#003865] text-white flex items-center gap-2">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
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
                  <option>25</option>
                  <option>50</option>
                  <option>100</option>
                </select>
                <span>من السجلات</span>
              </div>
            </div>

            <div className="overflow-x-auto border border-gray-100 rounded-lg mt-4">
              <table className="w-full text-sm text-right">
                <thead className="bg-[#004e89] text-white">
                  <tr>
                    <th className="py-3 px-4 font-medium w-24">معرف</th>
                    <th className="py-3 px-4 font-medium min-w-[200px]">الوصف بالعربية</th>
                    <th className="py-3 px-4 font-medium min-w-[200px]">الوصف بالانجليزية</th>
                    <th className="py-3 px-4 font-medium">الحالة</th>
                    <th className="py-3 px-4 font-medium text-center w-32">الأمر</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-500 font-medium bg-gray-50/30">
                      لا توجد بيانات في الجدول
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between text-sm text-gray-500 pt-2">
              <span>يعرض 0 إلى 0 من أصل 0 سجل</span>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" className="h-8 px-3 text-gray-500 bg-white" disabled>
                  السابق
                </Button>
                <Button variant="outline" size="sm" className="h-8 px-3 text-gray-500 bg-white" disabled>
                  التالي
                </Button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </Layout>
  );
}
