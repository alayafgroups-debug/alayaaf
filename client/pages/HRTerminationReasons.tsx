import Layout from "@/components/Layout";
import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Search, Edit, Trash2 } from "lucide-react";

export default function HRTerminationReasons() {
  const [searchTerm, setSearchTerm] = useState("");

  const mockData = [
    { id: 1, reason: "استقالة الموظف", effect: "لا يؤدي إلى حرمان الموظف من مكافأة نهاية الخدمة" },
    { id: 2, reason: "انتهاء مدة العقد أو باتفاق بين الطرفين على انهاء العقد", effect: "لا يؤدي إلى حرمان الموظف من مكافأة نهاية الخدمة" },
    { id: 3, reason: "فسخ العقد من قبل الشركة لأحد الحالات لارتكاب مخالفة لا تؤدي الى حرمان الموظف من المكافأة", effect: "لا يؤدي إلى حرمان الموظف من مكافأة نهاية الخدمة" },
    { id: 4, reason: "فسخ العقد نتيجة لارتكاب الموظف مخالفة تسبب في الفصل وحرمانه من المكافأة", effect: "يؤدي إلى حرمان الموظف من مكافأة نهاية الخدمة" },
    { id: 5, reason: "إنهاء العاملة لعقد العمل خلال سنة أشهر من عقد الزواج أو خلال ثلاثة أشهر من الوضع", effect: "لا يؤدي إلى حرمان الموظف من مكافأة نهاية الخدمة" },
    { id: 6, reason: "ترك العمل نتيجة قوة قاهرة", effect: "لا يؤدي إلى حرمان الموظف من مكافأة نهاية الخدمة" },
  ];

  return (
    <Layout>
      <div className="p-6 max-w-[1600px] mx-auto space-y-6" dir="rtl">
      {/* Header with actions */}
      <div className="flex justify-between items-center bg-white p-4 rounded-lg border shadow-sm">
        <div className="flex gap-4 items-center flex-1">
          <div className="relative w-[300px]">
            <Search className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder="بحث"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-9"
            />
          </div>
        </div>
        <div className="flex gap-4 items-center">
          <Dialog>
            <DialogTrigger asChild>
              <Button className="bg-[#004e89] hover:bg-[#003d6d] text-white flex gap-2">
                <span>أضف أسباب إنهاء الخدمة</span>
                <Plus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent dir="rtl">
              <DialogHeader>
                <DialogTitle className="text-xl font-semibold mb-4 text-right">أضف سبب جديد</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>السبب *</Label>
                  <Input />
                </div>

                <div className="space-y-2">
                  <Label>تأثيره على مكافأة نهاية الخدمة *</Label>
                  <Select defaultValue="no_effect">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no_effect">لا يؤدي إلى حرمان الموظف من مكافأة نهاية الخدمة</SelectItem>
                      <SelectItem value="effect">يؤدي إلى حرمان الموظف من مكافأة نهاية الخدمة</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-start mt-6">
                <Button className="bg-[#004e89] hover:bg-[#003d6d] text-white px-8">حفظ</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex justify-end gap-2 items-center mb-2">
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
        <span className="text-sm text-gray-500 ml-4">عرض</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-[#004e89] hover:bg-[#004e89]">
              <TableHead className="text-white text-right font-medium w-[80px]">معرف</TableHead>
              <TableHead className="text-white text-right font-medium">السبب</TableHead>
              <TableHead className="text-white text-right font-medium">تأثيره على مكافأة نهاية الخدمة</TableHead>
              <TableHead className="text-white text-center font-medium w-[120px]">الأمر</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockData.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.id}</TableCell>
                <TableCell className="font-medium">{row.reason}</TableCell>
                <TableCell>{row.effect}</TableCell>
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
