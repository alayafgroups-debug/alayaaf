import { useState } from "react";
import { Plus, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function HRSuccessionCandidates() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">الموظفين المرشحين</h1>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#004e89] hover:bg-[#003b6d]">
              <Plus className="h-5 w-5 ml-2" />
              إضافة مرشح
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>إضافة مرشح</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">الإدارة</label>
                <select className="w-full border rounded-md p-2 bg-gray-50">
                  <option>الإدارة</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">القسم</label>
                <select className="w-full border rounded-md p-2 bg-gray-50">
                  <option>القسم</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">موظف *</label>
                <select className="w-full border rounded-md p-2">
                  <option></option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">المنصب *</label>
                <select className="w-full border rounded-md p-2">
                  <option></option>
                </select>
              </div>
              <div className="space-y-2 col-span-2">
                <label className="text-sm font-medium">استبيان الموظفين المرشحين للتعاقب *</label>
                <select className="w-full border rounded-md p-2">
                  <option></option>
                </select>
              </div>
            </div>
            <div className="flex justify-start">
              <Button className="bg-[#004e89] hover:bg-[#003b6d] w-24">حفظ</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-white rounded-md border shadow-sm">
        <div className="p-4 border-b flex justify-between items-center bg-[#004e89] text-white">
          <div className="flex items-center gap-4">
            <span className="font-semibold">الموظفين المرشحين</span>
            <div className="flex items-center gap-2">
              <span>الكل</span>
              <select className="text-black rounded px-2 py-1">
                <option></option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <select className="text-black rounded px-2 py-1">
              <option>10</option>
              <option>25</option>
              <option>50</option>
            </select>
            <Filter className="h-5 w-5 cursor-pointer" />
            <Plus className="h-5 w-5 cursor-pointer" />
            <Search className="h-5 w-5 cursor-pointer" />
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">اسم الموظف</TableHead>
              <TableHead className="text-right">الإدارة</TableHead>
              <TableHead className="text-right">القسم</TableHead>
              <TableHead className="text-right">الوظيفة الحالية</TableHead>
              <TableHead className="text-right">الوظيفة المستهدفة بالتعاقب</TableHead>
              <TableHead className="text-right">الحالة</TableHead>
              <TableHead className="text-center w-24">الأمر</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                لا توجد بيانات
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
