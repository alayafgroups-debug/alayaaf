import { useState } from "react";
import Layout from "@/components/Layout";
import { Search, Plus, Filter, FileText, Printer, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";

const MOCK_ROLES = [
  { id: "11", nameAr: "محاسب", nameEn: "ACCOUNTAND", status: "فعال", addedDate: "2025-12-15 09:22:14", updateDate: "2025-12-15 10:01:55" },
  { id: "10", nameAr: "مدير قسم", nameEn: "Section Manager", status: "فعال", addedDate: "2020-06-22 15:32:04", updateDate: "2025-12-21 09:36:24" },
  { id: "9", nameAr: "مدير فرع", nameEn: "Branch Manager", status: "فعال", addedDate: "2020-06-22 15:29:22", updateDate: "2023-03-15 22:48:03" },
  { id: "8", nameAr: "مدير ادارة", nameEn: "Department Manager", status: "فعال", addedDate: "2019-11-27 10:15:11", updateDate: "2025-12-30 13:13:53" },
  { id: "7", nameAr: "موظف", nameEn: "Employee", status: "فعال", addedDate: "2019-11-27 10:12:50", updateDate: "2025-12-21 16:35:00" },
  { id: "6", nameAr: "مدير الموارد البشرية", nameEn: "manager", status: "فعال", addedDate: "2019-11-20 17:14:04", updateDate: "2021-12-28 01:12:57" },
  { id: "1", nameAr: "مدير النظام", nameEn: "System Admin", status: "فعال", addedDate: "2019-11-20 17:14:04", updateDate: "2021-12-28 00:56:17" },
];

export default function HRPermissionsRoles() {
  return (
    <Layout>
      <div className="p-6 max-w-[1600px] mx-auto space-y-6" dir="rtl">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-[#004e89] text-white p-3 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 w-full md:w-auto">
              <h2 className="text-lg font-bold whitespace-nowrap">قائمة ادوار المستخدمين</h2>
              
              <div className="flex gap-2 text-black w-full sm:w-auto flex-wrap items-center">
                <select className="h-8 rounded px-2 text-sm bg-white border-none outline-none min-w-[120px]">
                  <option>الكل</option>
                  <option>فعال</option>
                  <option>غير فعال</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
              <div className="flex items-center gap-2">
                <button className="p-1.5 hover:bg-white/10 rounded transition-colors text-white" title="تحديث">
                  <ShieldCheck className="h-4 w-4" />
                </button>
                <button className="p-1.5 hover:bg-white/10 rounded transition-colors text-white" title="سجل">
                  <FileText className="h-4 w-4" />
                </button>
                <button className="p-1.5 hover:bg-white/10 rounded transition-colors text-white" title="طباعة">
                  <Printer className="h-4 w-4" />
                </button>
              </div>
              <div className="text-black">
                <select className="h-8 w-16 rounded px-2 text-sm bg-white border-none outline-none font-medium">
                  <option>10</option>
                  <option>25</option>
                  <option>50</option>
                </select>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-center whitespace-nowrap">
              <thead className="bg-gray-50 text-gray-700 border-b border-gray-200">
                <tr>
                  <th className="py-3 px-2 font-medium">الامر</th>
                  <th className="py-3 px-2 font-medium">تاريخ اخر تعديل</th>
                  <th className="py-3 px-2 font-medium">
                    تاريخ الاضافة <select className="h-6 w-full mt-1 border border-gray-200 rounded text-xs"><option></option></select>
                  </th>
                  <th className="py-3 px-2 font-medium">الحالة</th>
                  <th className="py-3 px-2 font-medium min-w-[200px]">
                    اسم الدور بالانجليزية <Input placeholder="" className="h-6 mt-1 text-center" />
                  </th>
                  <th className="py-3 px-2 font-medium min-w-[200px]">
                    اسم الدور <Input placeholder="" className="h-6 mt-1 text-center" />
                  </th>
                  <th className="py-3 px-2 font-medium min-w-[100px]">رقم الدور</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {MOCK_ROLES.map((role) => (
                  <tr key={role.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-3 px-2">
                      {role.nameEn === "System Admin" ? (
                        <span className="text-gray-400">Admin</span>
                      ) : (
                        <button className="text-gray-500 hover:text-[#004e89]">•••</button>
                      )}
                    </td>
                    <td className="py-3 px-2">{role.updateDate}</td>
                    <td className="py-3 px-2">{role.addedDate}</td>
                    <td className="py-3 px-2">
                      <span className="inline-flex px-2 py-1 rounded bg-green-50 text-green-600 text-xs font-medium">
                        {role.status}
                      </span>
                    </td>
                    <td className="py-3 px-2">{role.nameEn}</td>
                    <td className="py-3 px-2 font-medium">{role.nameAr}</td>
                    <td className="py-3 px-2">{role.id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="bg-gray-50 p-4 border-t border-gray-100 flex items-center justify-between text-sm">
            <span className="text-gray-500">يعرض 1 إلى {MOCK_ROLES.length} من أصل {MOCK_ROLES.length} سجل</span>
            <div className="flex gap-1 opacity-50 pointer-events-none">
              <Button variant="outline" size="sm" className="h-8 px-3">السابق</Button>
              <Button variant="outline" size="sm" className="h-8 px-3">التالي</Button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
