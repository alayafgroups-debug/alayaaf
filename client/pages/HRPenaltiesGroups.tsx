import { useState } from "react";
import Layout from "@/components/Layout";
import { Search, Plus, Trash2, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const MOCK_GROUPS = [
  { id: 1, name: "المجموعة الأولى", desc: "" },
];

export default function HRPenaltiesGroups() {
  const [search, setSearch] = useState("");

  return (
    <Layout>
      <div className="p-6 max-w-[1200px] mx-auto space-y-6" dir="rtl">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-800">مجموعات المخالفات</h2>
          </div>
          
          <div className="p-4 space-y-4">
            <div className="flex justify-start">
              <Button className="bg-[#004e89] hover:bg-[#003865] text-white flex items-center gap-2">
                <Plus className="h-4 w-4" />
              </Button>
            </div>

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
                  <option>10</option>
                  <option>25</option>
                  <option>50</option>
                </select>
                <span>من السجلات</span>
              </div>
            </div>

            <div className="overflow-x-auto border border-gray-100 rounded-lg mt-4">
              <table className="w-full text-sm text-right">
                <thead className="bg-[#004e89] text-white">
                  <tr>
                    <th className="py-3 px-4 font-medium w-24">معرف</th>
                    <th className="py-3 px-4 font-medium min-w-[200px]">الاسم</th>
                    <th className="py-3 px-4 font-medium min-w-[200px]">الوصف</th>
                    <th className="py-3 px-4 font-medium text-center w-32">الأمر</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {MOCK_GROUPS.map((group) => (
                    <tr key={group.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-3 px-4">{group.id}</td>
                      <td className="py-3 px-4">{group.name}</td>
                      <td className="py-3 px-4">{group.desc}</td>
                      <td className="py-3 px-4">
                        <div className="flex justify-center items-center gap-3">
                          <button className="text-gray-400 hover:text-blue-500 transition-colors">
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button className="text-red-400 hover:text-red-600 transition-colors">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between text-sm text-gray-500 pt-2">
              <span>إظهار 1 إلى 1 من أصل 1 مدخل</span>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" className="h-8 px-3 text-gray-500 bg-white" disabled>
                  السابق
                </Button>
                <Button variant="default" size="sm" className="h-8 w-8 p-0 bg-[#004e89] hover:bg-[#003865]">
                  1
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
