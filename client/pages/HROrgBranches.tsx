import { useState } from "react";
import Layout from "@/components/Layout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Printer, FileText, Plus, Trash2, Edit } from "lucide-react";

export default function HROrgBranches() {
  const mockData = [
    { id: 3, name: "شركة لاكجري العياف", manager: "عبدالمجيد شودري", description: "" },
    { id: 2, name: "شركة إدارة العياف", manager: "عبدالمجيد شودري", description: "" },
    { id: 1, name: "الفرع الرئيسي", manager: "عبدالمجيد شودري", description: "" }
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
            <Button size="icon" className="bg-[#004e89] hover:bg-[#003d6d] text-white">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex gap-4 items-center">
            <div className="font-semibold text-lg text-[#004e89]">
              قائمة الفروع
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

        {/* Table */}
        <div className="bg-white rounded-lg border shadow-sm overflow-hidden overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#004e89] hover:bg-[#004e89]">
                <TableHead className="text-white text-right font-medium w-[80px]">رقم الفرع</TableHead>
                <TableHead className="text-white text-right font-medium">الاسم</TableHead>
                <TableHead className="text-white text-right font-medium">المدير</TableHead>
                <TableHead className="text-white text-right font-medium">الوصف</TableHead>
                <TableHead className="text-white text-center font-medium w-[120px]">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockData.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.id}</TableCell>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell>{row.manager}</TableCell>
                  <TableCell>{row.description}</TableCell>
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
