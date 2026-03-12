import { useState } from "react";
import Layout from "@/components/Layout";
import { Search, Printer, Download, Eye, FileText, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const MOCK_ARCHIVE = [
  { 
    id: 1, 
    month: "فبراير - 2026", 
    name: "SHA ALOM MIYA", 
    absenceDays: 0, 
    overtimeHours: "00:00:00", 
    basicSalary: "2,000.00", 
    allowances: "0.00", 
    privileges: "0.00", 
    totalEntitlements: "2,000.00", 
    deductions: "0.00", 
    leaves: "0.00", 
    advances: "0.00", 
    absenceVal: "1,266.67", 
    totalDeductions: "1,266.67", 
    netDue: "733.33", 
    salaryAdvance: "0.00", 
    dueForDisbursement: "733.33" 
  },
];

export default function HRPayrollArchive() {
  const [search, setSearch] = useState("");

  return (
    <Layout>
      <div className="p-6 max-w-full overflow-hidden mx-auto space-y-6" dir="rtl">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          
          {/* Blue Header Bar */}
          <div className="bg-[#004e89] text-white p-3 flex flex-col xl:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-wrap">
              <h2 className="text-lg font-bold whitespace-nowrap">ارشيف الرواتب</h2>
              
              <div className="flex gap-2 text-black">
                <select className="h-8 rounded px-2 text-sm bg-white border-none outline-none min-w-[80px]">
                  <option>2026</option>
                  <option>2025</option>
                </select>
                <select className="h-8 rounded px-2 text-sm bg-white border-none outline-none min-w-[80px]">
                  <option>فبراير</option>
                  <option>مارس</option>
                </select>
                <select className="h-8 rounded px-2 text-sm bg-white border-none outline-none min-w-[120px]">
                  <option>الفرع</option>
                </select>
                <select className="h-8 rounded px-2 text-sm bg-white border-none outline-none min-w-[120px]">
                  <option>الإدارة</option>
                </select>
                <select className="h-8 rounded px-2 text-sm bg-white border-none outline-none min-w-[150px]">
                  <option>فندق منى كونكورد</option>
                  <option>مواقع العمل</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <button className="p-1.5 hover:bg-white/10 rounded transition-colors text-white" title="تصدير">
                  <Download className="h-4 w-4" />
                </button>
                <button className="p-1.5 hover:bg-white/10 rounded transition-colors text-white" title="سجل">
                  <FileText className="h-4 w-4" />
                </button>
                <button className="p-1.5 hover:bg-white/10 rounded transition-colors text-white" title="طباعة">
                  <Printer className="h-4 w-4" />
                </button>
              </div>
              <div className="bg-white rounded px-2 py-1 text-black font-medium text-sm flex items-center justify-center min-w-[40px]">
                500
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-center whitespace-nowrap">
              <thead className="bg-gray-50 text-gray-700 border-b border-gray-200">
                <tr>
                  <th className="py-3 px-2 font-medium">شهر</th>
                  <th className="py-3 px-2 font-medium min-w-[150px]">
                    <Input 
                      placeholder="الاسم" 
                      className="h-8 text-center text-sm"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </th>
                  <th className="py-3 px-2 font-medium">مجموع أيام الغياب</th>
                  <th className="py-3 px-2 font-medium">الساعات الإضافية</th>
                  <th className="py-3 px-2 font-medium">الراتب الأساسي</th>
                  <th className="py-3 px-2 font-medium">بدلات</th>
                  <th className="py-3 px-2 font-medium">إمتيازات</th>
                  <th className="py-3 px-2 font-medium">الساعات الإضافية</th>
                  <th className="py-3 px-2 font-medium text-[#004e89]">إجمالي الاستحقاقات</th>
                  <th className="py-3 px-2 font-medium">إقتطاعات</th>
                  <th className="py-3 px-2 font-medium">الإجازات</th>
                  <th className="py-3 px-2 font-medium">السلف</th>
                  <th className="py-3 px-2 font-medium">غياب</th>
                  <th className="py-3 px-2 font-medium text-red-600">إجمالي الإقتطاعات</th>
                  <th className="py-3 px-2 font-medium">الصافي المستحق</th>
                  <th className="py-3 px-2 font-medium">مقدم الراتب</th>
                  <th className="py-3 px-2 font-medium text-green-600">مستحق الصرف</th>
                  <th className="py-3 px-2 font-medium">الأمر</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {MOCK_ARCHIVE.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-3 px-2 text-gray-600">{record.month}</td>
                    <td className="py-3 px-2 font-medium text-gray-900 whitespace-normal min-w-[150px] max-w-[200px] leading-tight text-right">{record.name}</td>
                    <td className="py-3 px-2">{record.absenceDays}</td>
                    <td className="py-3 px-2">{record.overtimeHours}</td>
                    <td className="py-3 px-2">{record.basicSalary}</td>
                    <td className="py-3 px-2">{record.allowances}</td>
                    <td className="py-3 px-2">{record.privileges}</td>
                    <td className="py-3 px-2">0.00</td>
                    <td className="py-3 px-2 font-semibold text-[#004e89]">{record.totalEntitlements}</td>
                    <td className="py-3 px-2">{record.deductions}</td>
                    <td className="py-3 px-2">{record.leaves}</td>
                    <td className="py-3 px-2">{record.advances}</td>
                    <td className="py-3 px-2">{record.absenceVal}</td>
                    <td className="py-3 px-2 font-semibold text-red-600">{record.totalDeductions}</td>
                    <td className="py-3 px-2">{record.netDue}</td>
                    <td className="py-3 px-2">{record.salaryAdvance}</td>
                    <td className="py-3 px-2 font-semibold text-green-600">{record.dueForDisbursement}</td>
                    <td className="py-3 px-2">
                      <div className="flex items-center justify-center gap-2">
                        <button className="text-gray-400 hover:text-[#004e89] transition-colors" title="عرض">
                          <Eye className="h-4 w-4" />
                        </button>
                        <button className="text-red-400 hover:text-red-600 transition-colors" title="حذف">
                          <XCircle className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}
