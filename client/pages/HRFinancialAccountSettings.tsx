import { useState } from "react";
import { Search, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const mockAccounts = [
  { id: 1, description: "حساب الرواتب والأجور", accountCode: "210101" },
  { id: 2, description: "حساب البدلات", accountCode: "210102" },
  { id: 3, description: "حساب السلف", accountCode: "110301" },
  { id: 4, description: "حساب التأمينات الاجتماعية", accountCode: "210201" },
];

export default function HRFinancialAccountSettings() {
  const [searchTerm, setSearchTerm] = useState("");

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">إعدادات الحسابات للنظام المحاسبي</h1>
        <Button className="bg-[#004e89] hover:bg-[#003b6d]">
          <Save className="h-5 w-5 ml-2" />
          حفظ الإعدادات
        </Button>
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
        </div>

        <Table>
          <TableHeader className="bg-[#004e89]">
            <TableRow>
              <TableHead className="text-white text-right w-16">معرف</TableHead>
              <TableHead className="text-white text-right">الوصف</TableHead>
              <TableHead className="text-white text-right w-1/3">رقم الحساب في النظام المالي</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockAccounts.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.id}</TableCell>
                <TableCell>{item.description}</TableCell>
                <TableCell>
                  <Input defaultValue={item.accountCode} className="text-right w-full max-w-sm" dir="ltr" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
