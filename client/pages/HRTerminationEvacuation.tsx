import Layout from "@/components/Layout";
import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Printer, FileText, Plus, Search, MoreHorizontal } from "lucide-react";

export default function HRTerminationEvacuation() {
  const [searchTerm, setSearchTerm] = useState("");

  const mockData = [
    {
      id: 1,
      requestNumber: "1117",
      jobId: "801",
      name: "SABBIR HOSSAIN",
      reason: "خروج نهائي",
      declaration: "تم الإقرار",
      declarationDate: "2026-02-05 04:23:38",
      status: "موافق عليه",
      addedDate: "2026-02-05 04:19:41"
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
          <Button size="icon" className="bg-[#004e89] hover:bg-[#003d6d] text-white">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex gap-4 items-center">
          <Select defaultValue="all">
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="الكل" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">الكل</SelectItem>
            </SelectContent>
          </Select>
          <div className="font-semibold text-lg text-[#004e89]">
            إخلاء الطرف
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
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 p-4 bg-gray-50 rounded-lg border">
        <div>
          <label className="text-sm text-gray-600 mb-1 block">رقم الطلب</label>
          <div className="relative">
            <Search className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
            <Input className="pr-9" />
          </div>
        </div>
        <div>
          <label className="text-sm text-gray-600 mb-1 block">الرقم الوظيفي</label>
          <div className="relative">
            <Search className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
            <Input className="pr-9" />
          </div>
        </div>
        <div>
          <label className="text-sm text-gray-600 mb-1 block">الاسم</label>
          <div className="relative">
            <Search className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
            <Input className="pr-9" />
          </div>
        </div>
        <div>
          <label className="text-sm text-gray-600 mb-1 block">إقرار الموظف</label>
          <Select defaultValue="all">
            <SelectTrigger>
              <SelectValue placeholder="الكل" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">الكل</SelectItem>
              <SelectItem value="done">تم الإقرار</SelectItem>
            </SelectContent>
          </Select>
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
        <div>
          <label className="text-sm text-gray-600 mb-1 block">تاريخ الإضافة</label>
          <Input type="date" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border shadow-sm overflow-hidden overflow-x-auto">
        <Table className="min-w-[1000px]">
          <TableHeader>
            <TableRow className="bg-[#004e89] hover:bg-[#004e89]">
              <TableHead className="text-white text-right font-medium">رقم الطلب</TableHead>
              <TableHead className="text-white text-right font-medium">الرقم الوظيفي</TableHead>
              <TableHead className="text-white text-right font-medium">الاسم</TableHead>
              <TableHead className="text-white text-right font-medium">سبب الإخلاء</TableHead>
              <TableHead className="text-white text-center font-medium">إقرار الموظف</TableHead>
              <TableHead className="text-white text-right font-medium">تاريخ الإقرار</TableHead>
              <TableHead className="text-white text-center font-medium">الحالة</TableHead>
              <TableHead className="text-white text-right font-medium">تاريخ الإضافة</TableHead>
              <TableHead className="text-white text-center font-medium w-[80px]">الأمر</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockData.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.requestNumber}</TableCell>
                <TableCell>{row.jobId}</TableCell>
                <TableCell className="font-medium">{row.name}</TableCell>
                <TableCell>{row.reason}</TableCell>
                <TableCell className="text-center">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                    {row.declaration}
                  </span>
                </TableCell>
                <TableCell>{row.declarationDate}</TableCell>
                <TableCell className="text-center">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                    {row.status}
                  </span>
                </TableCell>
                <TableCell>{row.addedDate}</TableCell>
                <TableCell className="text-center">
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
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
