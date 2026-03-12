import { useState } from "react";
import Layout from "@/components/Layout";
import { ChevronDown, Search, Printer, FileText, Grid, RefreshCw, Filter, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

export default function HRRequestsIncoming() {
  const [needsProcessing, setNeedsProcessing] = useState(true);

  // Example empty mock data as per screenshot
  const MOCK: any[] = [];

  return (
    <Layout>
      <div className="mx-auto h-[calc(100vh-100px)] flex flex-col bg-white border border-gray-200 rounded-lg overflow-hidden" dir="rtl">
        
        {/* Top Header Bar */}
        <div className="bg-[#004e89] text-white flex items-center justify-between px-3 py-2 text-sm">
          <div className="flex items-center gap-3">
            <button className="hover:bg-white/10 p-1.5 rounded"><Printer className="w-4 h-4" /></button>
            <button className="hover:bg-white/10 p-1.5 rounded"><FileText className="w-4 h-4" /></button>
            <button className="hover:bg-white/10 p-1.5 rounded"><Grid className="w-4 h-4" /></button>
          </div>
          
          <div className="flex items-center gap-3 font-semibold absolute left-1/2 -translate-x-1/2">
            <div className="flex items-center">
              <select className="bg-white text-gray-800 text-xs px-2 py-1 rounded-l outline-none border-none h-7">
                <option>الإدارة</option>
              </select>
              <select className="bg-white text-gray-800 text-xs px-2 py-1 rounded-r border-r border-gray-200 outline-none h-7">
                <option>اليوم</option>
              </select>
            </div>
            <span>الطلبات الواردة</span>
          </div>

          <div className="flex items-center gap-2">
            <select className="bg-white text-gray-800 text-xs px-2 py-1 rounded outline-none w-16 h-7 text-center">
              <option>500</option>
            </select>
          </div>
        </div>

        {/* Table Header Row */}
        <div className="flex-1 overflow-auto bg-white">
          <table className="w-full text-sm text-right">
            <thead className="bg-gray-50 border-b border-gray-200 text-xs text-gray-600 font-medium sticky top-0">
              <tr>
                <th className="px-3 py-2 border-l border-gray-200 w-[8%] font-medium">رقم الطلب</th>
                <th className="px-3 py-2 border-l border-gray-200 w-[10%] font-medium">تاريخ الطلب</th>
                <th className="px-3 py-2 border-l border-gray-200 w-[10%] font-medium">الرقم الوظيفي</th>
                <th className="px-3 py-2 border-l border-gray-200 w-[15%] font-medium">إسم الموظف</th>
                <th className="px-3 py-2 border-l border-gray-200 w-[10%] font-medium">نوع الحركة</th>
                <th className="px-3 py-2 border-l border-gray-200 w-[12%] font-medium">نوع الطلب <ChevronDown className="inline w-3 h-3 float-left mt-0.5"/></th>
                <th className="px-3 py-2 border-l border-gray-200 w-[10%] font-medium">الحالة <ChevronDown className="inline w-3 h-3 float-left mt-0.5"/></th>
                <th className="px-3 py-2 border-l border-gray-200 w-[12%] font-medium">اخر تحديث <ChevronDown className="inline w-3 h-3 float-left mt-0.5"/></th>
                <th className="px-3 py-2 w-[13%] font-medium">الأمر</th>
              </tr>
            </thead>
            <tbody>
              {/* Empty state to match screenshot */}
              {MOCK.length === 0 && (
                <tr>
                  <td colSpan={9} className="h-64 bg-white"></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Bar */}
        <div className="bg-gray-50 border-t border-gray-200 px-4 py-2 flex items-center justify-between text-xs text-gray-600">
          <div className="flex items-center gap-2">
            <button className="px-3 py-1 bg-white border border-gray-300 rounded text-gray-400 cursor-not-allowed">التالي</button>
            <button className="px-3 py-1 bg-white border border-gray-300 rounded text-gray-400 cursor-not-allowed">السابق</button>
            <button className="w-6 h-6 flex items-center justify-center bg-white border border-gray-300 rounded text-gray-500 hover:bg-gray-100">
              <RefreshCw className="w-3 h-3" />
            </button>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-gray-500">عرض 0 إلى 0 من 0</span>
              <label className="flex items-center gap-1.5 cursor-pointer font-medium text-gray-700">
                <span>تحتاج إلى معالجة</span>
                <input 
                  type="checkbox" 
                  checked={needsProcessing}
                  onChange={(e) => setNeedsProcessing(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-[#004e89] focus:ring-[#004e89]"
                />
              </label>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="flex items-center border border-gray-300 rounded bg-white overflow-hidden">
                <button className="p-1 hover:bg-gray-100 border-l border-gray-300"><Grid className="w-4 h-4 text-gray-500"/></button>
                <div className="px-2 flex items-center gap-2 bg-gray-50 h-full border-l border-gray-300 text-gray-600">
                  <span>رقم الطلب</span>
                  <ChevronDown className="w-3 h-3" />
                </div>
                <button className="p-1 hover:bg-gray-100 border-l border-gray-300 bg-gray-50"><ArrowUpDown className="w-3 h-3 text-gray-500"/></button>
                <button className="p-1 hover:bg-gray-100 bg-[#004e89] text-white"><Filter className="w-4 h-4"/></button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </Layout>
  );
}
