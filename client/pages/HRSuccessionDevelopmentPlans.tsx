import { Plus, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useI18n } from "@/i18n";

export default function HRSuccessionDevelopmentPlans() {
  const { t, direction } = useI18n();

  return (
    <div className="space-y-6" dir={direction}>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t("الخطط التطويرية للتعاقب الوظيفي")}</h1>
        <Button className="bg-[#004e89] hover:bg-[#003b6d]">
          <Plus className="h-5 w-5 ml-2" />
          {t("إضافة خطة")}
        </Button>
      </div>

      <div className="bg-white rounded-md border shadow-sm">
        <div className="p-4 border-b flex justify-between items-center bg-[#004e89] text-white">
          <div className="flex items-center gap-4">
            <span className="font-semibold">{t("الخطط التطويرية للتعاقب الوظيفي")}</span>
            <div className="flex items-center gap-2">
              <span>{t("الكل")}</span>
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

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">{t("اسم المرشح")}</TableHead>
                <TableHead className="text-right">{t("الأهداف التطويرية")}</TableHead>
                <TableHead className="text-right">{t("البرنامج التدريبي")}</TableHead>
                <TableHead className="text-right">{t("الوظيفة المستهدفة بالتعاقب")}</TableHead>
                <TableHead className="text-right">{t("اسم المشرف")}</TableHead>
                <TableHead className="text-right">{t("تاريخ البداية")}</TableHead>
                <TableHead className="text-right">{t("تاريخ الانتهاء")}</TableHead>
                <TableHead className="text-right">{t("الحالة")}</TableHead>
                <TableHead className="text-center w-24">{t("الأمر")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                  {t("لا توجد بيانات")}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
