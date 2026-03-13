import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function HRSuccessionTrackingReport() {
  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">تقرير متابعة الخطط التطويرية للتعاقب</h1>
      </div>

      <div className="bg-white rounded-md border shadow-sm">
        <div className="p-4 border-b flex justify-between items-center bg-[#004e89] text-white">
          <span className="font-semibold">تقرير متابعة الخطط التطويرية للتعاقب</span>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-[#004e89]">
              <TableRow>
                <TableHead className="text-white text-right">معرف</TableHead>
                <TableHead className="text-white text-right">اسم المرشح</TableHead>
                <TableHead className="text-white text-right">الأهداف التطويرية</TableHead>
                <TableHead className="text-white text-right">البرنامج التدريبي</TableHead>
                <TableHead className="text-white text-right">الوظيفة المستهدفة بالتعاقب</TableHead>
                <TableHead className="text-white text-right">التقدم</TableHead>
                <TableHead className="text-white text-right">تاريخ آخر تعديل</TableHead>
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
    </div>
  );
}
