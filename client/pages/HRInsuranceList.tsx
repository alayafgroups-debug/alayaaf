import { useState } from "react";
import Layout from "@/components/Layout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Printer, FileText, Search, Plus, Trash2, Edit } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export default function HRInsuranceList() {
  const [searchTerm, setSearchTerm] = useState("");

  const mockData = [
    {
      id: 1,
      arabicDescription: "سعودي (غير قابل للخصم)",
      englishDescription: "سعودي (غير قابل للخصم)",
      employeeShare: "0.00%",
      companyShare: "100.00%",
      includeAllowances: "لا",
      allowances: ""
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
            <Dialog>
              <DialogTrigger asChild>
                <Button size="icon" className="bg-[#004e89] hover:bg-[#003d6d] text-white">
                  <Plus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent dir="rtl">
                <DialogHeader>
                  <DialogTitle className="text-xl font-semibold mb-4 text-right">إضافة تأمين اجتماعي</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>الوصف بالعربية *</Label>
                    <Input />
                  </div>
                  <div className="space-y-2">
                    <Label>الوصف بالانجليزية *</Label>
                    <Input />
                  </div>
                  <div className="space-y-2">
                    <Label>نسبة الموظف % *</Label>
                    <Input type="number" defaultValue="0" />
                  </div>
                  <div className="space-y-2">
                    <Label>نسبة المنشأة % *</Label>
                    <Input type="number" defaultValue="0" />
                  </div>
                  <div className="space-y-2">
                    <Label>شمول البدلات</Label>
                    <Select defaultValue="no">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="no">لا</SelectItem>
                        <SelectItem value="yes">نعم</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end mt-6">
                    <Button className="bg-[#004e89] hover:bg-[#003d6d] text-white px-8">حفظ</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="flex gap-4 items-center">
            <div className="font-semibold text-lg text-[#004e89]">
              قائمة التأمينات الاجتماعية
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
                <TableHead className="text-white text-right font-medium">الوصف بالعربية</TableHead>
                <TableHead className="text-white text-right font-medium">الوصف بالانجليزية</TableHead>
                <TableHead className="text-white text-right font-medium">نسبة الموظف</TableHead>
                <TableHead className="text-white text-right font-medium">نسبة المنشأة</TableHead>
                <TableHead className="text-white text-right font-medium">شمول البدلات</TableHead>
                <TableHead className="text-white text-right font-medium">البدلات</TableHead>
                <TableHead className="text-white text-center font-medium w-[120px]">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockData.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.arabicDescription}</TableCell>
                  <TableCell>{row.englishDescription}</TableCell>
                  <TableCell>{row.employeeShare}</TableCell>
                  <TableCell>{row.companyShare}</TableCell>
                  <TableCell>{row.includeAllowances}</TableCell>
                  <TableCell>{row.allowances}</TableCell>
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
