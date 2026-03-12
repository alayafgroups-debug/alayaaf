import { useState } from "react";
import Layout from "@/components/Layout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Printer, FileText, Search } from "lucide-react";

export default function HRInsuranceSocial() {
  const [searchTerm, setSearchTerm] = useState("");

  const mockData = [
    {
      id: 1,
      jobId: "101",
      name: "Ahmed Ali",
      employeeShare: "0.00%",
      companyShare: "100.00%",
      total: "200.00",
      subscriptionNumber: "12345678",
      subscriptionDate: "2024-01-01"
    }
  ];

  return (
    <Layout>
      <div className="p-6 max-w-[1600px] mx-auto space-y-6" dir="rtl">
        {/* Header with actions */}
        <div className="flex justify-between items-center bg-white p-4 rounded-lg border shadow-sm">
          <div className="flex gap-2">
            <Button variant="outline" size="icon" className="text-blue-600 border-blue-600 hover:bg-blue-50">
              <Printer className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="text-blue-600 border-blue-600 hover:bg-blue-50">
              <FileText className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex gap-4 items-center">
            <Select defaultValue="all">
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="مكان العمل" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="all">
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="القسم" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="all">
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="الإدارة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="all">
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="الفرع" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
              </SelectContent>
            </Select>
            <div className="font-semibold text-lg text-[#004e89]">
              التأمينات الاجتماعية
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
               placeholder="بحث بالاسم أو الرقم الوظيفي..."
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
                <TableHead className="text-white text-right font-medium">نسبة تحمل الموظف</TableHead>
                <TableHead className="text-white text-right font-medium">نسبة تحمل المنشأة</TableHead>
                <TableHead className="text-white text-right font-medium">الإجمالي</TableHead>
                <TableHead className="text-white text-right font-medium">رقم الاشتراك</TableHead>
                <TableHead className="text-white text-right font-medium">تاريخ الاشتراك</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockData.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.jobId}</TableCell>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell>{row.employeeShare}</TableCell>
                  <TableCell>{row.companyShare}</TableCell>
                  <TableCell>{row.total}</TableCell>
                  <TableCell>{row.subscriptionNumber}</TableCell>
                  <TableCell>{row.subscriptionDate}</TableCell>
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
