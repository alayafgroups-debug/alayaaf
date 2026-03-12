import Layout from "@/components/Layout";
import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Printer, FileText, Plus, Search, MoreHorizontal, Calendar as CalendarIcon, Upload } from "lucide-react";

export default function HRTerminationEmployees() {
  const [searchTerm, setSearchTerm] = useState("");

  const mockData = [
    {
      id: 1,
      jobId: "801",
      name: "SABBIR HOSSAIN",
      department: "إدارة الموارد البشرية",
      section: "-",
      reason: "انتهاء مدة العقد أو باتفاق بين الطرفين",
      terminationDate: "2026-02-10",
      reward: "0.00",
      leaveValue: "840.00",
      total: "6,240.00",
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
          <Dialog>
            <DialogTrigger asChild>
              <Button size="icon" className="bg-[#004e89] hover:bg-[#003d6d] text-white">
                <Plus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl" dir="rtl">
              <DialogHeader>
                <DialogTitle className="text-xl font-semibold mb-4 text-right">إنهاء خدمة الموظف</DialogTitle>
              </DialogHeader>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <p className="text-sm font-medium text-gray-700 text-left">راتب الموظف SAR 8,000.00</p>
                </div>
                
                <div className="space-y-2 col-span-2">
                  <Label>الموظف *</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="عبدالمجيد شودري" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">عبدالمجيد شودري</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>نوع العقد *</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر نوع العقد" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">محدد المدة</SelectItem>
                      <SelectItem value="2">غير محدد المدة</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>هل يتضمن العقد تعويض محدد؟ *</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="لا" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no">لا</SelectItem>
                      <SelectItem value="yes">نعم</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 col-span-2">
                  <Label>سبب إنهاء الخدمة *</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر سبب إنهاء الخدمة" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">انتهاء مدة العقد أو باتفاق بين الطرفين</SelectItem>
                      <SelectItem value="2">استقالة الموظف</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>تاريخ التعيين</Label>
                  <div className="relative">
                    <Input type="date" className="bg-gray-100" readOnly value="2021-06-07" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>تاريخ إنهاء الخدمة *</Label>
                  <div className="relative">
                    <Input type="date" />
                  </div>
                </div>

                <div className="col-span-2">
                  <p className="text-xs text-gray-500 text-center mb-4">
                    المدة: 4 سنة/سنوات، 11 شهر/أشهر، 6 يوم/أيام
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>مكافأة إنهاء الخدمة *</Label>
                  <Input defaultValue="19733.33" />
                </div>

                <div className="space-y-2">
                  <Label>قيمة الإجازات السنوية المتبقية *</Label>
                  <Input defaultValue="0.00" />
                  <p className="text-xs text-gray-500 mt-1">0 يوم</p>
                </div>

                <div className="space-y-2">
                  <Label>مستحقات أخرى</Label>
                  <Input defaultValue="0" />
                </div>

                <div className="space-y-2 col-span-2">
                  <Label>الإجمالي *</Label>
                  <Input className="bg-gray-100 font-bold" readOnly value="19733.33" />
                  <p className="text-xs text-gray-500 mt-1">(عملة الراتب الأساسي)</p>
                </div>

                <div className="space-y-2 col-span-2">
                  <Label>ملاحظات مستحقات أخرى</Label>
                  <Input />
                </div>

                <div className="space-y-2 col-span-2">
                  <Label>الوصف</Label>
                  <Textarea rows={3} />
                </div>

                <div className="space-y-2 col-span-2">
                  <Label>المرفق</Label>
                  <div className="border border-dashed rounded-lg p-4 flex justify-center items-center cursor-pointer hover:bg-gray-50">
                    <div className="flex items-center text-blue-600 gap-2">
                      <Upload className="h-4 w-4" />
                      <span>إضافة مرفقات</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <Button className="bg-[#004e89] hover:bg-[#003d6d] text-white px-8">حفظ</Button>
              </div>
            </DialogContent>
          </Dialog>
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
            إنهاء خدمة الموظفين
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg border">
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
          <label className="text-sm text-gray-600 mb-1 block">الإدارة</label>
          <Select defaultValue="all">
            <SelectTrigger>
              <SelectValue placeholder="الكل" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">الكل</SelectItem>
              <SelectItem value="hr">إدارة الموارد البشرية</SelectItem>
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
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border shadow-sm overflow-hidden overflow-x-auto">
        <Table className="min-w-[1200px]">
          <TableHeader>
            <TableRow className="bg-[#004e89] hover:bg-[#004e89]">
              <TableHead className="text-white text-right font-medium">الرقم الوظيفي</TableHead>
              <TableHead className="text-white text-right font-medium">الاسم</TableHead>
              <TableHead className="text-white text-right font-medium">الإدارة</TableHead>
              <TableHead className="text-white text-right font-medium">القسم</TableHead>
              <TableHead className="text-white text-right font-medium">سبب إنهاء الخدمة</TableHead>
              <TableHead className="text-white text-right font-medium">تاريخ إنهاء الخدمة</TableHead>
              <TableHead className="text-white text-right font-medium">مكافأة إنهاء الخدمة</TableHead>
              <TableHead className="text-white text-right font-medium">قيمة الإجازات السنوية المتبقية</TableHead>
              <TableHead className="text-white text-right font-medium">الإجمالي</TableHead>
              <TableHead className="text-white text-center font-medium">الحالة</TableHead>
              <TableHead className="text-white text-center font-medium w-[80px]">الأمر</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockData.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.jobId}</TableCell>
                <TableCell className="font-medium">{row.name}</TableCell>
                <TableCell>{row.department}</TableCell>
                <TableCell>{row.section}</TableCell>
                <TableCell className="max-w-[200px] truncate" title={row.reason}>{row.reason}</TableCell>
                <TableCell>{row.terminationDate}</TableCell>
                <TableCell>{row.reward}</TableCell>
                <TableCell>{row.leaveValue}</TableCell>
                <TableCell>{row.total}</TableCell>
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
