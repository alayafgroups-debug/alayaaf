import { useState } from "react";
import Layout from "@/components/Layout";
import { Search, Plus, Eye, Copy, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const MOCK_SCHEDULES = [
  { id: 1, name: "دوام شركة أ", employees: 9, shifts: 1, hours: "09:00:00", type: "جدول عمل ثابت" },
  { id: 2, name: "دوام النصف", employees: 48, shifts: 1, hours: "09:00:00", type: "جدول عمل ثابت" },
  { id: 3, name: "أكاديمية وعد", employees: 50, shifts: 1, hours: "09:00:00", type: "جدول عمل ثابت" },
  { id: 4, name: "شركة العيسى", employees: 9, shifts: 1, hours: "10:00:00", type: "جدول عمل ثابت" },
  { id: 5, name: "مدارس بلوم", employees: 0, shifts: 1, hours: "09:00:00", type: "جدول عمل ثابت" },
  { id: 6, name: "دوام وكالة العياف للدعاية والاعلان", employees: 4, shifts: 1, hours: "09:00:00", type: "جدول عمل ثابت" },
];

export default function HRAttendanceSchedules() {
  const [search, setSearch] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [scheduleType, setScheduleType] = useState("جدول عمل ثابت");

  return (
    <Layout>
      <div className="p-6 max-w-[1400px] mx-auto space-y-6" dir="rtl">
        {/* Attendance Settings Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-gray-50 border-b border-gray-100 p-4">
            <h2 className="text-lg font-bold text-gray-800">إعدادات الحضور</h2>
          </div>
          <div className="p-6">
            <div className="flex flex-wrap gap-8 items-center text-sm text-gray-700">
              <div className="flex items-center gap-2">
                <Checkbox id="hide-unused" />
                <label htmlFor="hide-unused" className="cursor-pointer">
                  إخفاء سجلات البصمة غير المستخدمة
                </label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="show-chart" />
                <label htmlFor="show-chart" className="cursor-pointer">
                  عرض مخطط جدول العمل
                </label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="show-exit" />
                <label htmlFor="show-exit" className="cursor-pointer">
                  عرض خروج الموظف للبصمة في يوم الدخول
                </label>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Checkbox id="tolerance" />
                  <label htmlFor="tolerance" className="cursor-pointer">
                    هامش التسامح بين نهاية الإذن وبداية الدوام (ثواني)
                  </label>
                </div>
                <Input type="number" defaultValue="60" className="w-20 h-8 text-center" />
              </div>
            </div>
          </div>
        </div>

        {/* Work Schedules Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-800">جداول العمل</h2>
          </div>

          <div className="p-4 space-y-4">
            <div className="flex justify-start">
              <Button 
                onClick={() => setIsAddDialogOpen(true)}
                className="bg-[#004e89] hover:bg-[#003865] text-white flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                جداول العمل
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

            {/* Table */}
            <div className="overflow-x-auto border border-gray-100 rounded-lg">
              <table className="w-full text-sm text-right">
                <thead className="bg-[#004e89] text-white">
                  <tr>
                    <th className="py-3 px-4 font-medium">معرف</th>
                    <th className="py-3 px-4 font-medium">الاسم</th>
                    <th className="py-3 px-4 font-medium">عدد الموظفين</th>
                    <th className="py-3 px-4 font-medium">عدد الفترات</th>
                    <th className="py-3 px-4 font-medium">عدد الساعات</th>
                    <th className="py-3 px-4 font-medium">نوع جدول العمل</th>
                    <th className="py-3 px-4 font-medium text-center">الأمر</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {MOCK_SCHEDULES.map((schedule) => (
                    <tr key={schedule.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-3 px-4">{schedule.id}</td>
                      <td className="py-3 px-4 font-medium text-gray-900">{schedule.name}</td>
                      <td className="py-3 px-4">{schedule.employees}</td>
                      <td className="py-3 px-4">{schedule.shifts}</td>
                      <td className="py-3 px-4">{schedule.hours}</td>
                      <td className="py-3 px-4">{schedule.type}</td>
                      <td className="py-3 px-4">
                        <div className="flex justify-center items-center gap-3">
                          <button className="text-gray-400 hover:text-[#004e89] transition-colors">
                            <Eye className="h-4 w-4" />
                          </button>
                          <button className="text-gray-400 hover:text-blue-500 transition-colors">
                            <Copy className="h-4 w-4" />
                          </button>
                          <button className="text-gray-400 hover:text-red-500 transition-colors">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer Pagination */}
            <div className="flex items-center justify-between text-sm text-gray-500 pt-2">
              <span>إظهار 1 إلى 6 من أصل 6 مدخل</span>
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

        {/* Add Schedule Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="sm:max-w-[425px]" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-right text-lg">نوع جدول العمل *</DialogTitle>
            </DialogHeader>
            <div className="py-6">
              <select 
                className="w-full h-10 border border-gray-300 rounded-md px-3 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#004e89] focus:border-transparent"
                value={scheduleType}
                onChange={(e) => setScheduleType(e.target.value)}
              >
                <option value="جدول عمل ثابت">جدول عمل ثابت</option>
                <option value="جدول عمل متغير">جدول عمل متغير</option>
              </select>
            </div>
            <DialogFooter className="sm:justify-start">
              <Button 
                onClick={() => setIsAddDialogOpen(false)} 
                className="bg-[#004e89] hover:bg-[#003865] text-white"
              >
                التالي
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
