import { useState } from "react";
import Layout from "@/components/Layout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Printer, FileText, Search } from "lucide-react";

export default function HRInsuranceOvertime() {
  const [searchTerm, setSearchTerm] = useState("");

  const mockData = [
    {
      id: 1,
      jobId: "402",
      name: "BHAUD ALAM",
      department: "إدارة الموارد البشرية",
      section: "شركة العيسى",
      month: "يناير - 2026",
      overtimeHours: "154.00SAR",
      totalInsurance: "0.00SAR"
    }
  ];

  return (
    <Layout>
      <div className="p-6 max-w-[1600px] mx-auto space-y-6" dir="rtl">
        {/* Header with actions */}
        <div className="flex justify-between items-center bg-white p-4 rounded-lg border shadow-sm overflow-x-auto">
          <div className="flex gap-2 min-w-max">
            <Button variant="outline" size="icon" className="text-blue-600 border-blue-600 hover:bg-blue-50">
              <Printer className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="text-blue-600 border-blue-600 hover:bg-blue-50">
              <FileText className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex gap-4 items-center min-w-max mr-4">
            <Select defaultValue="all">
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="مكان العمل" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="all">
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="الفرع" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="all">
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="شهر" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="1">يناير</SelectItem>
                <SelectItem value="2">فبراير</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="2026">
              <SelectTrigger className="w-[100px]">
                <SelectValue placeholder="2026" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2026">2026</SelectItem>
                <SelectItem value="2025">2025</SelectItem>
              </SelectContent>
            </Select>
            <div className="font-semibold text-lg text-[#004e89]">
              التأمينات للساعات الإضافية-للرواتب المعتمدة
            </div>
            <Select defaultValue="10">
              <SelectTrigger className="w-[80px]">
                <SelectValue placeholder="10" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
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
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg border shadow-sm overflow-hidden overflow-x-auto">
          <Table className="min-w-[1000px]">
            <TableHeader>
              <TableRow className="bg-[#004e89] hover:bg-[#004e89]">
                <TableHead className="text-white text-right font-medium">الرقم الوظيفي</TableHead>
                <TableHead className="text-white text-right font-medium">الاسم</TableHead>
                <TableHead className="text-white text-right font-medium">الإدارة</TableHead>
                <TableHead className="text-white text-right font-medium">القسم</TableHead>
                <TableHead className="text-white text-right font-medium">شهر</TableHead>
                <TableHead className="text-white text-right font-medium">الساعات الإضافية</TableHead>
                <TableHead className="text-white text-right font-medium">إجمالي قيمة التأمين</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockData.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.jobId}</TableCell>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell>{row.department}</TableCell>
                  <TableCell>{row.section}</TableCell>
                  <TableCell>{row.month}</TableCell>
                  <TableCell>{row.overtimeHours}</TableCell>
                  <TableCell>{row.totalInsurance}</TableCell>
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
