import { useState } from "react";
import Layout from "@/components/Layout";
import { Search, Plus, Eye, Copy, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const MOCK_TYPES = [
  { id: 1, name: "إجازة سنوية", duration: "21 يوم", deduction: "0%", status: "مفعلة" },
  { id: 2, name: "إجازة مرضية", duration: "30 يوم", deduction: "0%", status: "مفعلة" },
  { id: 3, name: "وفاة زوجة الموظف أو أحد أصوله أو فروعه", duration: "5 يوم", deduction: "0%", status: "مفعلة" },
  { id: 4, name: "مولود", duration: "3 يوم", deduction: "0%", status: "مفعلة" },
  { id: 5, name: "حج", duration: "15 يوم", deduction: "0%", status: "مفعلة" },
  { id: 6, name: "دراسية", duration: "20 يوم", deduction: "0%", status: "مفعلة" },
  { id: 7, name: "إجازة وضع", duration: "70 يوم", deduction: "0%", status: "مفعلة" },
  { id: 8, name: "وفاة الزوج", duration: "130 يوم", deduction: "0%", status: "مفعلة" },
  { id: 9, name: "أخرى", duration: "10 يوم", deduction: "من الراتب الأساسي (الافتراضي)", status: "مفعلة" },
  { id: 10, name: "زواج", duration: "5 يوم", deduction: "0%", status: "مفعلة" },
  { id: 11, name: "إجازة إضطرارية", duration: "7 يوم", deduction: "0%", status: "مفعلة" },
];

export default function HRLeavesTypes() {
  const [search, setSearch] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  return (
    <Layout>
      <div className="p-6 max-w-[1400px] mx-auto space-y-6" dir="rtl">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-800">تصنيف الإجازات</h2>
            <Button 
              onClick={() => setIsAddDialogOpen(true)}
              className="bg-[#004e89] hover:bg-[#003865] text-white flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              تصنيف جديد
            </Button>
          </div>
          
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="relative w-72">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="بحث"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-3 pr-9 h-10"
                />
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span>عرض</span>
                <select className="border-gray-200 rounded-md text-sm p-1.5 focus:ring-[#004e89] focus:border-[#004e89]">
                  <option>25</option>
                  <option>50</option>
                  <option>100</option>
                </select>
                <span>من السجلات</span>
              </div>
            </div>

            <div className="overflow-x-auto border border-gray-100 rounded-lg">
              <table className="w-full text-sm text-right">
                <thead className="bg-[#004e89] text-white">
                  <tr>
                    <th className="py-3 px-4 font-medium w-20">معرف</th>
                    <th className="py-3 px-4 font-medium min-w-[250px]">اسم التصنيف</th>
                    <th className="py-3 px-4 font-medium">مدة الإجازة (باليوم)</th>
                    <th className="py-3 px-4 font-medium">نسبة الخصم من الراتب (%)</th>
                    <th className="py-3 px-4 font-medium text-center">الحالة</th>
                    <th className="py-3 px-4 font-medium text-center w-32">الأمر</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {MOCK_TYPES.map((type) => (
                    <tr key={type.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-3 px-4 text-center">{type.id}</td>
                      <td className="py-3 px-4 font-medium">{type.name}</td>
                      <td className="py-3 px-4">{type.duration}</td>
                      <td className="py-3 px-4">{type.deduction}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded font-medium text-xs">
                          {type.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex justify-center items-center gap-3">
                          <button className="text-gray-400 hover:text-[#004e89] transition-colors"><Eye className="h-4 w-4" /></button>
                          <button className="text-gray-400 hover:text-blue-500 transition-colors"><Copy className="h-4 w-4" /></button>
                          <button className="text-red-400 hover:text-red-600 transition-colors"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="flex items-center justify-between text-sm text-gray-500 pt-2">
              <span>إظهار 1 إلى 11 من أصل 11 مدخل</span>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" className="h-8 px-3 text-gray-500 bg-white" disabled>السابق</Button>
                <Button variant="default" size="sm" className="h-8 w-8 p-0 bg-[#004e89] hover:bg-[#003865]">1</Button>
                <Button variant="outline" size="sm" className="h-8 px-3 text-gray-500 bg-white" disabled>التالي</Button>
              </div>
            </div>
          </div>
        </div>

        {/* Add Leave Type Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden" dir="rtl">
            <DialogHeader className="p-4 border-b border-gray-100 bg-gray-50/50">
              <DialogTitle className="text-right text-lg font-bold">تصنيف جديد</DialogTitle>
            </DialogHeader>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[70vh] overflow-y-auto">
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">الاسم بالعربية <span className="text-red-500">*</span></label>
                <Input className="h-10" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">الاسم بالإنجليزية <span className="text-red-500">*</span></label>
                <Input className="h-10" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">مدة الإجازة (باليوم) <span className="text-red-500">*</span></label>
                <Input type="number" defaultValue="1" className="h-10" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">إجازة مدفوعة الأجر <span className="text-red-500">*</span></label>
                <div className="flex gap-6 h-10 items-center">
                  <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="paid" className="text-[#004e89]" defaultChecked /><span>نعم</span></label>
                  <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="paid" className="text-[#004e89]" /><span>لا</span></label>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">تؤثر على رصيد الإجازات <span className="text-red-500">*</span></label>
                <div className="flex gap-6 h-10 items-center">
                  <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="affects_balance" className="text-[#004e89]" defaultChecked /><span>نعم</span></label>
                  <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="affects_balance" className="text-[#004e89]" /><span>لا</span></label>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">كيف تحسب الإجازة</label>
                <select className="w-full h-10 border border-gray-300 rounded-md px-3 bg-white text-sm outline-none focus:ring-2 focus:ring-[#004e89]">
                  <option>السنة العقدية</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">تقييد الجنس <span className="text-red-500">*</span></label>
                <select className="w-full h-10 border border-gray-300 rounded-md px-3 bg-white text-sm outline-none focus:ring-2 focus:ring-[#004e89]">
                  <option>لكلا الجنسيين</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">الحالة الاجتماعية <span className="text-red-500">*</span></label>
                <select className="w-full h-10 border border-gray-300 rounded-md px-3 bg-white text-sm outline-none focus:ring-2 focus:ring-[#004e89]">
                  <option>الكل ...</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">فئة الموظفين <span className="text-red-500">*</span></label>
                <select className="w-full h-10 border border-gray-300 rounded-md px-3 bg-white text-sm outline-none focus:ring-2 focus:ring-[#004e89]">
                  <option>الكل</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">تحديد رقم هاتف <span className="text-red-500">*</span></label>
                <div className="flex gap-6 h-10 items-center">
                  <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="phone_req" className="text-[#004e89]" defaultChecked /><span>نعم</span></label>
                  <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="phone_req" className="text-[#004e89]" /><span>لا</span></label>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">تحديد موظف بديل <span className="text-red-500">*</span></label>
                <div className="flex gap-6 h-10 items-center">
                  <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="replacement_req" className="text-[#004e89]" defaultChecked /><span>نعم</span></label>
                  <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="replacement_req" className="text-[#004e89]" /><span>لا</span></label>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">العلاوات الداخلة في بدل الإجازة</label>
                <Input className="h-10" />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-gray-700">نوع نموذج إرسال الطلب <span className="text-red-500">*</span></label>
                <select className="w-full h-10 border border-gray-300 rounded-md px-3 bg-white text-sm outline-none focus:ring-2 focus:ring-[#004e89]">
                  <option>الرجاء اختيار النموذج حسب النوع</option>
                </select>
              </div>
            </div>
            <DialogFooter className="p-4 border-t border-gray-100 bg-gray-50/50 sm:justify-start">
              <Button onClick={() => setIsAddDialogOpen(false)} className="bg-[#004e89] hover:bg-[#003865] text-white px-8">
                حفظ
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </Layout>
  );
}
