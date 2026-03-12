import { useState } from "react";
import { Search, ChevronLeft, ChevronRight, Calendar, UserCheck, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export default function LeavesReport() {
  const [reportType, setReportType] = useState("تقرير تفصيلي");
  const [leaveType, setLeaveType] = useState("الكل");
  const [branch, setBranch] = useState("الكل");
  const [management, setManagement] = useState("الكل");
  const [department, setDepartment] = useState("الكل");
  const [workLocation, setWorkLocation] = useState("الكل");
  const [paidLeave, setPaidLeave] = useState("الكل");
  
  const [selectionMode, setSelectionMode] = useState<"all" | "custom">("all");

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full">
      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center sticky top-0 z-10">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <Calendar className="w-6 h-6 text-[#004e89]" />
          إجازات
        </h2>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm">
            تصدير PDF
          </button>
          <button className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors shadow-sm">
            تصدير Excel
          </button>
        </div>
      </div>

      <div className="p-6 overflow-y-auto flex-1 space-y-8">
        
        {/* Filters Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
          {/* Row 1 */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700 flex items-center gap-1">
              <span className="text-red-500">*</span> نوع التقرير
            </label>
            <select 
              value={reportType} onChange={e => setReportType(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-lg focus:ring-2 focus:ring-[#004e89] outline-none px-3 py-2.5 h-10"
            >
              <option value="تقرير تفصيلي">تقرير تفصيلي</option>
              <option value="تقرير إجمالي">تقرير إجمالي</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700">نوع الإجازة</label>
            <select 
              value={leaveType} onChange={e => setLeaveType(e.target.value)}
              className="w-full bg-white border border-gray-200 text-gray-800 text-sm rounded-lg focus:ring-2 focus:ring-[#004e89] outline-none px-3 py-2.5 h-10"
            >
              <option value="الكل">الكل</option>
              <option value="سنوية">إجازة سنوية</option>
              <option value="مرضية">إجازة مرضية</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700">الفرع</label>
            <select 
              value={branch} onChange={e => setBranch(e.target.value)}
              className="w-full bg-white border border-gray-200 text-gray-800 text-sm rounded-lg focus:ring-2 focus:ring-[#004e89] outline-none px-3 py-2.5 h-10"
            >
              <option value="الكل">الكل</option>
              <option value="الفرع الرئيسي">الفرع الرئيسي</option>
            </select>
          </div>

          {/* Row 2 */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700">الإدارة</label>
            <select 
              value={management} onChange={e => setManagement(e.target.value)}
              className="w-full bg-white border border-gray-200 text-gray-800 text-sm rounded-lg focus:ring-2 focus:ring-[#004e89] outline-none px-3 py-2.5 h-10"
            >
              <option value="الكل">الكل</option>
              <option value="إدارة الموارد البشرية">إدارة الموارد البشرية</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700">القسم</label>
            <select 
              value={department} onChange={e => setDepartment(e.target.value)}
              className="w-full bg-white border border-gray-200 text-gray-800 text-sm rounded-lg focus:ring-2 focus:ring-[#004e89] outline-none px-3 py-2.5 h-10"
            >
              <option value="الكل">الكل</option>
              <option value="فندق منى كونكورد">فندق منى كونكورد</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700">مكان العمل</label>
            <select 
              value={workLocation} onChange={e => setWorkLocation(e.target.value)}
              className="w-full bg-white border border-gray-200 text-gray-800 text-sm rounded-lg focus:ring-2 focus:ring-[#004e89] outline-none px-3 py-2.5 h-10"
            >
              <option value="الكل">الكل</option>
            </select>
          </div>

          {/* Row 3 */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700">إجازة مدفوعة الأجر</label>
            <select 
              value={paidLeave} onChange={e => setPaidLeave(e.target.value)}
              className="w-full bg-white border border-gray-200 text-gray-800 text-sm rounded-lg focus:ring-2 focus:ring-[#004e89] outline-none px-3 py-2.5 h-10"
            >
              <option value="الكل">الكل</option>
              <option value="نعم">نعم</option>
              <option value="لا">لا</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700">من تاريخ</label>
            <div className="relative">
              <input type="date" className="w-full bg-white border border-gray-200 text-gray-800 text-sm rounded-lg focus:ring-2 focus:ring-[#004e89] outline-none px-3 py-2.5 h-10" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700">إلى تاريخ</label>
            <div className="relative">
              <input type="date" className="w-full bg-white border border-gray-200 text-gray-800 text-sm rounded-lg focus:ring-2 focus:ring-[#004e89] outline-none px-3 py-2.5 h-10" />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 border-t border-gray-100 pt-5">
          <button 
            onClick={() => setSelectionMode("all")}
            className={cn(
              "px-5 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all shadow-sm",
              selectionMode === "all" 
                ? "bg-[#004e89] text-white" 
                : "bg-white border border-[#004e89] text-[#004e89] hover:bg-blue-50"
            )}
          >
            <Users className="w-4 h-4" />
            جميع الموظفين
          </button>
          <button 
            onClick={() => setSelectionMode("custom")}
            className={cn(
              "px-5 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all shadow-sm",
              selectionMode === "custom" 
                ? "bg-[#004e89] text-white" 
                : "bg-white border border-[#004e89] text-[#004e89] hover:bg-blue-50"
            )}
          >
            <UserCheck className="w-4 h-4" />
            اختيار الموظفين
          </button>
        </div>

        {/* Main Employees Table */}
        <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
          <div className="p-3 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>عرض</span>
              <select className="border border-gray-300 rounded px-2 py-1 bg-white outline-none focus:border-[#004e89]">
                <option>10</option>
              </select>
              <span>من السجلات</span>
            </div>
            <div className="relative">
              <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                placeholder="بحث" 
                className="pl-3 pr-9 py-1.5 border border-gray-300 rounded-lg text-sm w-64 focus:outline-none focus:border-[#004e89] focus:ring-1 focus:ring-[#004e89]"
              />
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead className="bg-[#004e89] text-white font-medium">
                <tr>
                  <th className="px-4 py-3 w-12 text-center"><input type="checkbox" className="rounded" /></th>
                  <th className="px-4 py-3 border-r border-white/10">الاسم</th>
                  <th className="px-4 py-3 border-r border-white/10">المسمى الوظيفي</th>
                  <th className="px-4 py-3 border-r border-white/10">القسم</th>
                  <th className="px-4 py-3 border-r border-white/10">الإدارة</th>
                  <th className="px-4 py-3 border-r border-white/10">الفرع</th>
                </tr>
              </thead>
              <tbody>
                <tr className="hover:bg-gray-50 border-b border-gray-100 transition-colors">
                  <td className="px-4 py-3 text-center"><input type="checkbox" className="rounded border-gray-300" /></td>
                  <td className="px-4 py-3 font-medium text-gray-800">محمود البحراوي</td>
                  <td className="px-4 py-3 text-gray-600">مصمم وتشطيبات طباعة وتجليد</td>
                  <td className="px-4 py-3 text-gray-600">شركة العياف التجارية للدعاية والإعلان</td>
                  <td className="px-4 py-3 text-gray-600">إدارة الموارد البشرية</td>
                  <td className="px-4 py-3 text-gray-600">الفرع الرئيسي</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="p-3 border-t border-gray-200 bg-gray-50 flex justify-between items-center text-sm text-gray-600">
            <div>إظهار 1 إلى 1 من أصل 1 مدخل</div>
            <div className="flex gap-1">
              <button className="px-3 py-1.5 rounded border border-gray-300 bg-white hover:bg-gray-50 text-gray-500 disabled:opacity-50">السابق</button>
              <button className="px-3 py-1.5 rounded bg-[#004e89] text-white font-medium">1</button>
              <button className="px-3 py-1.5 rounded border border-gray-300 bg-white hover:bg-gray-50 text-gray-500 disabled:opacity-50">التالي</button>
            </div>
          </div>
        </div>

        {/* Employees on Leave Today Section */}
        <div className="pt-4">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span className="w-1.5 h-6 bg-emerald-500 rounded-full inline-block"></span>
            موظفون في إجازة اليوم :
          </h3>
          
          <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
            <div className="p-3 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>عرض</span>
                <select className="border border-gray-300 rounded px-2 py-1 bg-white outline-none focus:border-[#004e89]">
                  <option>10</option>
                </select>
                <span>من السجلات</span>
              </div>
              <div className="relative">
                <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="بحث" 
                  className="pl-3 pr-9 py-1.5 border border-gray-300 rounded-lg text-sm w-64 focus:outline-none focus:border-[#004e89] focus:ring-1 focus:ring-[#004e89]"
                />
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-right">
                <thead className="bg-[#004e89] text-white font-medium">
                  <tr>
                    <th className="px-4 py-3 w-12 text-center"><input type="checkbox" className="rounded" /></th>
                    <th className="px-4 py-3 border-r border-white/10 w-16 text-center">الصورة</th>
                    <th className="px-4 py-3 border-r border-white/10">الاسم</th>
                    <th className="px-4 py-3 border-r border-white/10">المسمى الوظيفي</th>
                    <th className="px-4 py-3 border-r border-white/10">القسم</th>
                    <th className="px-4 py-3 border-r border-white/10">الإدارة</th>
                    <th className="px-4 py-3 border-r border-white/10">الفرع</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="hover:bg-gray-50 border-b border-gray-100 transition-colors">
                    <td className="px-4 py-3 text-center align-middle"><input type="checkbox" className="rounded border-gray-300" /></td>
                    <td className="px-4 py-2 text-center align-middle">
                      <div className="w-10 h-10 rounded-lg bg-gray-200 mx-auto overflow-hidden border border-gray-300">
                        <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Azad&backgroundColor=e2e8f0" alt="Avatar" className="w-full h-full object-cover" />
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-800 align-middle">MD AZAD</td>
                    <td className="px-4 py-3 text-gray-600 align-middle">عامل تنظيف مكاتب والمنشآت</td>
                    <td className="px-4 py-3 text-gray-600 align-middle">مطعم أغاني</td>
                    <td className="px-4 py-3 text-gray-600 align-middle">إدارة الموارد البشرية</td>
                    <td className="px-4 py-3 text-gray-600 align-middle">الفرع الرئيسي</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="p-3 border-t border-gray-200 bg-gray-50 flex justify-between items-center text-sm text-gray-600">
              <div>إظهار 1 إلى 1 من أصل 1 مدخل</div>
              <div className="flex gap-1">
                <button className="px-3 py-1.5 rounded border border-gray-300 bg-white hover:bg-gray-50 text-gray-500 disabled:opacity-50">السابق</button>
                <button className="px-3 py-1.5 rounded bg-[#004e89] text-white font-medium">1</button>
                <button className="px-3 py-1.5 rounded border border-gray-300 bg-white hover:bg-gray-50 text-gray-500 disabled:opacity-50">التالي</button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
