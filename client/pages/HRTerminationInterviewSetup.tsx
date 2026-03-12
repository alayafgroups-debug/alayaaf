import Layout from "@/components/Layout";
import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Printer, FileText, Plus, Eye, MoreHorizontal } from "lucide-react";

export default function HRTerminationInterviewSetup() {
  const [searchTerm, setSearchTerm] = useState("");

  const mockData = [
    {
      id: 1,
      question: "اذا كانت الاجابة (لا) اشرح الاسباب",
      type: "سؤال مفتوح",
      order: "47",
      status: "فعال"
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
            <Eye className="h-4 w-4" />
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button size="icon" className="bg-[#004e89] hover:bg-[#003d6d] text-white">
                <Plus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent dir="rtl" className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="text-xl font-semibold mb-4 text-right">إضافة عنصر جديد للنموذج</DialogTitle>
              </DialogHeader>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label>السؤال *</Label>
                  <Input />
                </div>

                <div className="space-y-2">
                  <Label>نوع العنصر *</Label>
                  <Select defaultValue="open">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">سؤال مفتوح</SelectItem>
                      <SelectItem value="choices">خيارات متعددة</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>مطلوب *</Label>
                  <Select defaultValue="optional">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="optional">اختياري</SelectItem>
                      <SelectItem value="required">إجباري</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>الترتيب *</Label>
                  <Select defaultValue="1">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1</SelectItem>
                      <SelectItem value="2">2</SelectItem>
                      <SelectItem value="3">3</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>الاب</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر الأب" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">بدون</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>الحالة *</Label>
                  <Select defaultValue="inactive">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">فعال</SelectItem>
                      <SelectItem value="inactive">غير فعال</SelectItem>
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
        <div className="flex gap-4 items-center">
          <Select defaultValue="active">
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="فعال" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">فعال</SelectItem>
              <SelectItem value="all">الكل</SelectItem>
            </SelectContent>
          </Select>
          <div className="font-semibold text-lg text-[#004e89]">
            عناصر نموذج مقابلة إنهاء الخدمة
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
      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-[#004e89] hover:bg-[#004e89]">
              <TableHead className="text-white text-right font-medium">السؤال</TableHead>
              <TableHead className="text-white text-right font-medium">نوع العنصر</TableHead>
              <TableHead className="text-white text-right font-medium">الترتيب</TableHead>
              <TableHead className="text-white text-center font-medium">الحالة</TableHead>
              <TableHead className="text-white text-center font-medium w-[80px]">الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockData.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-medium">{row.question}</TableCell>
                <TableCell>{row.type}</TableCell>
                <TableCell>{row.order}</TableCell>
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
