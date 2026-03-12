import { useState } from "react";
import Layout from "@/components/Layout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Printer, FileText, Settings, Search, MoreHorizontal } from "lucide-react";

export default function HRTerminationDues() {
  const [searchTerm, setSearchTerm] = useState("");

  const mockData = [
    {
      id: 1,
      employeeName: "SABBIR HOSSAIN",
      clearanceDate: "2026-02-10",
      paymentDate: "2026-02-15",
      duesAmount: "6,240.00",
      annualLeaveAmount: "840.00",
      paidAmount: "6,240.00",
      remainingAmount: "0.00",
      currency: "SAR",
      status: "موافق عليه"
    }
  ];

  return (
    <Layout>
      <div className="p-6 max-w-[1600px] mx-auto space-y-6" dir="rtl">
      {/* Header with actions */}
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <Button variant="outline" size="icon" className="text-blue-600 border-blue-600 hover:bg-blue-50">
            <Printer className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="text-blue-600 border-blue-600 hover:bg-blue-50">
            <FileText className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="text-blue-600 border-blue-600 hover:bg-blue-50">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex gap-4 items-center">
          <Select defaultValue="all">
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="تقرير المستحقات" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">الكل</SelectItem>
            </SelectContent>
          </Select>
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg border">
        <div>
          <label className="text-sm text-gray-600 mb-1 block">بحث</label>
          <div className="relative">
            <Search className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder="اسم الموظف..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-9"
            />
          </div>
        </div>
        <div>
          <label className="text-sm text-gray-600 mb-1 block">الحالة</label>
          <Select defaultValue="all">
            <SelectTrigger>
              <SelectValue placeholder="الكل" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">الكل</SelectItem>
              <SelectItem value="approved">موافق عليه</SelectItem>
              <SelectItem value="pending">قيد الانتظار</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-[#004e89] hover:bg-[#004e89]">
              <TableHead className="text-white text-right font-medium">اسم الموظف</TableHead>
              <TableHead className="text-white text-right font-medium">تاريخ التصفية</TableHead>
              <TableHead className="text-white text-right font-medium">تاريخ الدفع</TableHead>
              <TableHead className="text-white text-right font-medium">مبلغ المستحقات</TableHead>
              <TableHead className="text-white text-right font-medium">مبلغ رصيد الإجازات السنوية</TableHead>
              <TableHead className="text-white text-right font-medium">المبلغ المدفوع</TableHead>
              <TableHead className="text-white text-right font-medium">المبلغ المتبقي</TableHead>
              <TableHead className="text-white text-right font-medium">عملة</TableHead>
              <TableHead className="text-white text-center font-medium">الحالة</TableHead>
              <TableHead className="text-white text-center font-medium w-[80px]">الأمر</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockData.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-medium">{row.employeeName}</TableCell>
                <TableCell>{row.clearanceDate}</TableCell>
                <TableCell>{row.paymentDate}</TableCell>
                <TableCell>{row.duesAmount}</TableCell>
                <TableCell>{row.annualLeaveAmount}</TableCell>
                <TableCell>{row.paidAmount}</TableCell>
                <TableCell>{row.remainingAmount}</TableCell>
                <TableCell>{row.currency}</TableCell>
                <TableCell className="text-center">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                    {row.status}
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {mockData.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8 text-gray-500">
                  لا توجد بيانات متاحة في الجدول
                </TableCell>
              </TableRow>
            )}
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
