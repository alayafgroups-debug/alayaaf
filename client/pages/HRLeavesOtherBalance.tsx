import { useState } from "react";
import Layout from "@/components/Layout";
import { Search, Download, Printer, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function HRLeavesOtherBalance() {
  const [search, setSearch] = useState("");

  return (
    <Layout>
      <div className="p-6 max-w-[1200px] mx-auto space-y-6" dir="rtl">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          
          <div className="bg-[#004e89] text-white p-3 flex flex-col md:flex-row items-center justify-between gap-4">
            <h2 className="text-lg font-bold">أرصدة الاجازات الأخرى</h2>
            <div className="flex items-center gap-2">
              <button className="p-1.5 hover:bg-white/10 rounded transition-colors text-white" title="تصدير">
                <Download className="h-4 w-4" />
              </button>
              <button className="p-1.5 hover:bg-white/10 rounded transition-colors text-white" title="سجل">
                <FileText className="h-4 w-4" />
              </button>
              <button className="p-1.5 hover:bg-white/10 rounded transition-colors text-white" title="طباعة">
                <Printer className="h-4 w-4" />
              </button>
            </div>
          </div>
          
          <div className="p-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-4">
              <div className="relative w-full md:w-72">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="بحث..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-3 pr-9 h-10"
                />
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg border border-gray-100 p-12 text-center text-gray-500">
              <p>محتوى أرصدة الإجازات الأخرى...</p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
