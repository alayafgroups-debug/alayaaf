import { useState } from "react";
import { Plus, Search, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const mockOvertime = [
  { id: 1, description: "الساعة بساعة ونصف", value: "150" },
];

export default function HRFinancialOvertime() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">أنواع الساعات الإضافية</h1>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#004e89] hover:bg-[#003b6d]">
              <Plus className="h-5 w-5 ml-2" />
              إضافة نوع جديد
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>إضافة نوع ساعات إضافية</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">الوصف</label>
                <Input placeholder="أدخل الوصف" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">قيمة الساعة (%)</label>
                <Input type="number" placeholder="مثال: 150" />
              </div>
              <Button className="w-full bg-[#004e89] hover:bg-[#003b6d]">حفظ</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-white rounded-md border shadow-sm">
        <div className="p-4 border-b flex justify-between items-center">
          <div className="relative w-64">
            <Search className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder="بحث..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-9"
            />
          </div>
          <div className="flex items-center space-x-2 space-x-reverse text-sm text-gray-500">
            <span>عرض</span>
            <select className="border rounded p-1">
              <option>25</option>
              <option>50</option>
              <option>100</option>
            </select>
            <span>من السجلات</span>
          </div>
        </div>

        <Table>
          <TableHeader className="bg-[#004e89]">
            <TableRow>
              <TableHead className="text-white text-right w-16">معرف</TableHead>
              <TableHead className="text-white text-right">الوصف</TableHead>
              <TableHead className="text-white text-right">قيمة الساعة (%)</TableHead>
              <TableHead className="text-white text-center w-24">الأمر</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockOvertime.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.id}</TableCell>
                <TableCell>{item.description}</TableCell>
                <TableCell>{item.value}</TableCell>
                <TableCell>
                  <div className="flex justify-center items-center gap-2">
                    <button className="text-gray-500 hover:text-[#004e89]">
                      <Edit className="h-4 w-4" />
                    </button>
                    <button className="text-red-500 hover:text-red-700">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <div className="p-4 border-t flex justify-between items-center text-sm text-gray-500">
          <div>إظهار 1 إلى 1 من أصل 1 مدخل</div>
          <div className="flex space-x-1 space-x-reverse">
            <Button variant="outline" size="sm" disabled>السابق</Button>
            <Button variant="default" size="sm" className="bg-[#004e89]">1</Button>
            <Button variant="outline" size="sm" disabled>التالي</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
