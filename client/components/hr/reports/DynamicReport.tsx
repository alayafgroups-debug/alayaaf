import { useState } from "react";
import { Search, Calendar, UserCheck, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { ReportSchema, ReportFilter } from "./reportSchemas";

export default function DynamicReport({ schema }: { schema: ReportSchema }) {
  const [selectionMode, setSelectionMode] = useState<"all" | "custom">("all");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});

  const handleFilterChange = (id: string, value: string) => {
    setFilterValues(prev => ({ ...prev, [id]: value }));
  };

  const renderFilter = (filter: ReportFilter) => {
    if (filter.type === "select") {
      return (
        <select
          value={filterValues[filter.id] || ""}
          onChange={(e) => handleFilterChange(filter.id, e.target.value)}
          className="w-full bg-white border border-gray-200 text-gray-800 text-sm rounded-lg focus:ring-2 focus:ring-[#004e89] outline-none px-3 py-2.5 h-10 appearance-none"
          style={{ backgroundImage: "url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" fill=\"none\" viewBox=\"0 0 24 24\" stroke=\"%239CA3AF\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M19 9l-7 7-7-7\"/></svg>')", backgroundPosition: "left 0.5rem center", backgroundRepeat: "no-repeat", backgroundSize: "1.5em 1.5em" }}
        >
          {filter.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      );
    }
    
    if (filter.type === "date") {
      return (
        <div className="relative">
          <input
            type="date"
            value={filterValues[filter.id] || ""}
            onChange={(e) => handleFilterChange(filter.id, e.target.value)}
            className="w-full bg-white border border-gray-200 text-gray-800 text-sm rounded-lg focus:ring-2 focus:ring-[#004e89] outline-none px-3 py-2.5 h-10 pr-10"
          />
          <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        </div>
      );
    }

    return null;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full animate-in fade-in zoom-in-95 duration-200">
      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center sticky top-0 z-10">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          {schema.title}
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-4">
          {schema.filters.map(filter => (
            <div key={filter.id} className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                {filter.required && <span className="text-red-500">*</span>}
                {filter.label}
              </label>
              {renderFilter(filter)}
            </div>
          ))}
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
                  {schema.tableColumns.map(col => (
                    <th key={col} className="px-4 py-3 border-r border-white/10">{col}</th>
                  ))}
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

      </div>
    </div>
  );
}
