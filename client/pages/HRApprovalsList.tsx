import { useState } from "react";
import Layout from "@/components/Layout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, Trash2, Edit } from "lucide-react";
import { Link } from "react-router-dom";

export default function HRApprovalsList() {
  const [searchTerm, setSearchTerm] = useState("");

  const mockData = [
    {
      id: 1,
      arabicDescription: "كل الطلبات",
      englishDescription: "All Applications",
      committeeMembers: "سعيد محمد نور الحق - عبدالمجيد شودري -",
      relatedRequests: "الإجازات - السلف - صرف رواتب الموظفين - صرف - تصفية مستحقات - عهدة - عهدة مالية - تجديد عهدة مالية - إغلاق عهدة مالية - استقالة - نقل - دورة تدريبية - عمل إضافي - شراء - صيانة - أخرى - استئذان - التعريف بالراتب - انتداب - إخلاء طرف - مخالصة ذمة موظف - طلب وظيفة - مباشرة العمل - إعادة تقييم - وظيفة شاغرة - إقالة موظف - صرف إمتياز مالي - تعديل راتب - مهمة عمل - اعتماد مخالفة - صرف عمولة - صرف مستحقات إدارة - صرف المستحقات - جوائز -",
      status: "فعال"
    }
  ];

  return (
    <Layout>
      <div className="p-6 max-w-[1600px] mx-auto space-y-6" dir="rtl">
        {/* Header with actions */}
        <div className="flex justify-between items-center bg-white p-4 rounded-lg border shadow-sm">
          <div className="flex gap-2">
            <Link to="/hr/approvals/add">
              <Button className="bg-[#004e89] hover:bg-[#003d6d] text-white flex gap-2">
                <Plus className="h-4 w-4" />
                <span>إضافة سلسلة موافقات</span>
              </Button>
            </Link>
          </div>
          <div className="font-semibold text-lg text-[#004e89]">
            قائمة سلسلة الموافقات
          </div>
        </div>

        {/* Filters Row */}
        <div className="bg-white p-4 rounded-lg border shadow-sm flex items-center justify-between">
           <div className="relative w-1/3">
             <Search className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
             <Input
               placeholder="بحث..."
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="pr-9"
             />
           </div>
           <div className="flex items-center gap-2">
             <span className="text-sm text-gray-500">عرض</span>
             <Select defaultValue="25">
               <SelectTrigger className="w-[80px]">
                 <SelectValue placeholder="25" />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value="10">10</SelectItem>
                 <SelectItem value="25">25</SelectItem>
                 <SelectItem value="50">50</SelectItem>
               </SelectContent>
             </Select>
             <span className="text-sm text-gray-500">من السجلات</span>
           </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg border shadow-sm overflow-hidden overflow-x-auto">
          <Table className="min-w-[1200px]">
            <TableHeader>
              <TableRow className="bg-[#004e89] hover:bg-[#004e89]">
                <TableHead className="text-white text-right font-medium w-[80px]">معرف</TableHead>
                <TableHead className="text-white text-right font-medium">الوصف بالعربية</TableHead>
                <TableHead className="text-white text-right font-medium">الوصف بالإنجليزية</TableHead>
                <TableHead className="text-white text-right font-medium min-w-[200px]">أعضاء اللجنة</TableHead>
                <TableHead className="text-white text-right font-medium min-w-[400px]">الطلبات المرتبطة</TableHead>
                <TableHead className="text-white text-center font-medium w-[100px]">الحالة</TableHead>
                <TableHead className="text-white text-center font-medium w-[120px]">الأمر</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockData.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.id}</TableCell>
                  <TableCell className="font-medium">{row.arabicDescription}</TableCell>
                  <TableCell>{row.englishDescription}</TableCell>
                  <TableCell>{row.committeeMembers}</TableCell>
                  <TableCell className="text-xs leading-relaxed text-gray-600">{row.relatedRequests}</TableCell>
                  <TableCell className="text-center">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                      {row.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex justify-center gap-2">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:bg-blue-50 hover:text-blue-700">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-50 hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between text-sm text-gray-500">
          <div>إظهار 1 إلى {mockData.length} من أصل {mockData.length} مدخل</div>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" disabled>السابق</Button>
            <Button variant="outline" size="sm" className="bg-blue-50 text-blue-600 border-blue-200">1</Button>
            <Button variant="outline" size="sm" disabled>التالي</Button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
