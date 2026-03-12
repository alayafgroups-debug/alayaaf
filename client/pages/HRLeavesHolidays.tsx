import { useState } from "react";
import Layout from "@/components/Layout";
import { Search, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function HRLeavesHolidays() {
  const [search, setSearch] = useState("");

  return (
    <Layout>
      <div className="p-6 max-w-[1200px] mx-auto space-y-6" dir="rtl">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-800">العُطل والاجازات الرسمية</h2>
            <Button className="bg-[#004e89] hover:bg-[#003865] text-white flex items-center gap-2">
              <Plus className="h-4 w-4" />
            </Button>
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
              <p>محتوى العطل والإجازات الرسمية...</p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
