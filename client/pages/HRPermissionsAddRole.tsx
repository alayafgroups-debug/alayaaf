import { useState } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronRight, ChevronLeft } from "lucide-react";

const PERMISSION_TABS = [
  "قائمة الموظفين",
  "قسم التقارير",
  "حساب الدوام",
  "حساب الراتب",
  "قياس الأداء",
  "إرسال الطلبات",
  "الطلبات الواردة",
  "التأمينات",
  "المساءلات والإنذارات",
  "قسم الإعلانات",
  "قسم السلفيات",
  "النظام المالي",
  "تواصل مع الإدارة",
  "الإجازات",
  "عمولات الموظفين",
  "إدارة المشاريع والمهام",
  "إدارة التدريب"
];

export default function HRPermissionsAddRole() {
  const [activeTab, setActiveTab] = useState("قائمة الموظفين");

  return (
    <Layout>
      <div className="p-6 max-w-[1600px] mx-auto space-y-6" dir="rtl">
        <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
          <h2 className="text-xl font-bold text-[#004e89]">إضافة دور جديد</h2>
          <Button className="bg-[#004e89] hover:bg-[#003865] px-8">حفظ</Button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden p-6 space-y-8">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">الاسم بالعربية <span className="text-red-500">*</span></Label>
              <Input className="h-10 border-gray-300" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">الاسم بالانجليزية <span className="text-red-500">*</span></Label>
              <Input className="h-10 border-gray-300" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">حالة الدور <span className="text-red-500">*</span></Label>
              <select className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
                <option>فعال</option>
                <option>غير فعال</option>
              </select>
            </div>
          </div>

          <div className="space-y-4">
            {/* Tabs Scrollable Container */}
            <div className="flex items-center gap-2 border-b border-gray-200 pb-2 overflow-x-auto whitespace-nowrap hide-scrollbar">
              <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8 text-gray-400">
                <ChevronRight className="h-4 w-4" />
              </Button>
              
              {PERMISSION_TABS.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                    activeTab === tab 
                      ? "bg-[#004e89] text-white" 
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {tab}
                </button>
              ))}

              <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8 text-gray-400">
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </div>

            {/* Select All */}
            <div className="flex justify-end">
              <div className="flex items-center gap-2">
                <Label htmlFor="selectAll" className="text-sm font-medium cursor-pointer">اختيار الكل</Label>
                <Checkbox id="selectAll" />
              </div>
            </div>

            {/* Permissions Content Area */}
            {activeTab === "قائمة الموظفين" && (
              <div className="space-y-6">
                
                {/* Section 1 */}
                <div className="border border-gray-200 rounded-lg p-4 space-y-4">
                  <div className="flex items-center gap-2 mb-4 bg-gray-50 -mx-4 -mt-4 px-4 py-2 border-b border-gray-200 rounded-t-lg">
                    <Checkbox id="group1" />
                    <Label htmlFor="group1" className="font-bold text-gray-800">قائمة الموظفين</Label>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="flex items-center justify-between border border-gray-100 p-2 rounded bg-gray-50/50">
                      <Label className="text-sm cursor-pointer" htmlFor="p1">استعراض موظفي الإدارة فقط</Label>
                      <input type="radio" name="emp_view" id="p1" className="h-4 w-4 text-[#004e89]" />
                    </div>
                    <div className="flex items-center justify-between border border-gray-100 p-2 rounded bg-gray-50/50">
                      <Label className="text-sm cursor-pointer" htmlFor="p2">استعراض موظفي الفرع فقط</Label>
                      <input type="radio" name="emp_view" id="p2" className="h-4 w-4 text-[#004e89]" />
                    </div>
                    <div className="flex items-center justify-between border border-gray-100 p-2 rounded bg-gray-50/50">
                      <Label className="text-sm cursor-pointer" htmlFor="p3">استعراض موظفي القسم فقط</Label>
                      <input type="radio" name="emp_view" id="p3" className="h-4 w-4 text-[#004e89]" />
                    </div>
                    <div className="flex items-center justify-between border border-gray-100 p-2 rounded bg-gray-50/50">
                      <Label className="text-sm cursor-pointer" htmlFor="p4">استعراض موظفي ادارته المباشرة فقط</Label>
                      <input type="radio" name="emp_view" id="p4" className="h-4 w-4 text-[#004e89]" />
                    </div>
                    <div className="flex items-center justify-between border border-gray-100 p-2 rounded bg-gray-50/50">
                      <Label className="text-sm cursor-pointer" htmlFor="p5">كل الموظفين</Label>
                      <input type="radio" name="emp_view" id="p5" className="h-4 w-4 text-[#004e89]" />
                    </div>
                  </div>
                </div>

                {/* Section 2 */}
                <div className="border border-gray-200 rounded-lg p-4 space-y-4">
                  <div className="flex items-center gap-2 mb-4 bg-gray-50 -mx-4 -mt-4 px-4 py-2 border-b border-gray-200 rounded-t-lg">
                    <Checkbox id="group2" />
                    <Label htmlFor="group2" className="font-bold text-gray-800">عرض</Label>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-3">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                      <Label className="text-sm cursor-pointer" htmlFor="c1">إضافة موظف جديد</Label>
                      <Checkbox id="c1" />
                    </div>
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                      <Label className="text-sm cursor-pointer" htmlFor="c2">تعديل بيانات موظف</Label>
                      <Checkbox id="c2" />
                    </div>
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                      <Label className="text-sm cursor-pointer" htmlFor="c3">استعراض الموظفين غير الفعالين</Label>
                      <Checkbox id="c3" />
                    </div>
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                      <Label className="text-sm cursor-pointer" htmlFor="c4">حركات الموظفين</Label>
                      <Checkbox id="c4" />
                    </div>
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                      <Label className="text-sm cursor-pointer" htmlFor="c5">عرض حركات السلف</Label>
                      <Checkbox id="c5" />
                    </div>
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                      <Label className="text-sm cursor-pointer" htmlFor="c6">إضافة حركة سلف</Label>
                      <Checkbox id="c6" />
                    </div>
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                      <Label className="text-sm cursor-pointer" htmlFor="c7">عرض حركات الإجازات</Label>
                      <Checkbox id="c7" />
                    </div>
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                      <Label className="text-sm cursor-pointer" htmlFor="c8">عرض حركات العهد</Label>
                      <Checkbox id="c8" />
                    </div>
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                      <Label className="text-sm cursor-pointer" htmlFor="c9">إضافة حركة عهدة</Label>
                      <Checkbox id="c9" />
                    </div>
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                      <Label className="text-sm cursor-pointer" htmlFor="c10">إضافة حركة صرف</Label>
                      <Checkbox id="c10" />
                    </div>
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                      <Label className="text-sm cursor-pointer" htmlFor="c11">عرض حركات الدورات التدريبية</Label>
                      <Checkbox id="c11" />
                    </div>
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                      <Label className="text-sm cursor-pointer" htmlFor="c12">إضافة حركة دورة تدريبية</Label>
                      <Checkbox id="c12" />
                    </div>
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                      <Label className="text-sm cursor-pointer" htmlFor="c13">إضافة حركة نقل</Label>
                      <Checkbox id="c13" />
                    </div>
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                      <Label className="text-sm cursor-pointer" htmlFor="c14">عرض حركة الشراء</Label>
                      <Checkbox id="c14" />
                    </div>
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                      <Label className="text-sm cursor-pointer" htmlFor="c15">إضافة حركة شراء</Label>
                      <Checkbox id="c15" />
                    </div>
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                      <Label className="text-sm cursor-pointer" htmlFor="c16">إضافة حركة ساعة إضافية</Label>
                      <Checkbox id="c16" />
                    </div>
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                      <Label className="text-sm cursor-pointer" htmlFor="c17">عرض حركة الاستئذان</Label>
                      <Checkbox id="c17" />
                    </div>
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                      <Label className="text-sm cursor-pointer" htmlFor="c18">إضافة حركة استئذان</Label>
                      <Checkbox id="c18" />
                    </div>
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                      <Label className="text-sm cursor-pointer" htmlFor="c19">إضافة حركة صيانة</Label>
                      <Checkbox id="c19" />
                    </div>
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                      <Label className="text-sm cursor-pointer" htmlFor="c20">عرض حركة مباشرة العمل</Label>
                      <Checkbox id="c20" />
                    </div>
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                      <Label className="text-sm cursor-pointer" htmlFor="c21">إضافة حركة مباشرة عمل</Label>
                      <Checkbox id="c21" />
                    </div>
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                      <Label className="text-sm cursor-pointer" htmlFor="c22">إضافة حركة الانتدابات</Label>
                      <Checkbox id="c22" />
                    </div>
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                      <Label className="text-sm cursor-pointer" htmlFor="c23">إلغاء التفعيل</Label>
                      <Checkbox id="c23" />
                    </div>
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                      <Label className="text-sm cursor-pointer" htmlFor="c24">تعديل بيانات التابعين</Label>
                      <Checkbox id="c24" />
                    </div>
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                      <Label className="text-sm cursor-pointer" htmlFor="c25">إيداع رصيد الإجازة</Label>
                      <Checkbox id="c25" />
                    </div>
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                      <Label className="text-sm cursor-pointer" htmlFor="c26">إنهاء الخدمة</Label>
                      <Checkbox id="c26" />
                    </div>
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                      <Label className="text-sm cursor-pointer" htmlFor="c27">تعديل</Label>
                      <Checkbox id="c27" />
                    </div>
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                      <Label className="text-sm cursor-pointer" htmlFor="c28">حذف</Label>
                      <Checkbox id="c28" />
                    </div>
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                      <Label className="text-sm cursor-pointer" htmlFor="c29">فرق العمل</Label>
                      <Checkbox id="c29" />
                    </div>
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                      <Label className="text-sm cursor-pointer" htmlFor="c30">ربط حساب الموظف</Label>
                      <Checkbox id="c30" />
                    </div>
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                      <Label className="text-sm cursor-pointer" htmlFor="c31">إضافة</Label>
                      <Checkbox id="c31" />
                    </div>
                  </div>
                </div>

                {/* Section 3 */}
                <div className="border border-gray-200 rounded-lg p-4 space-y-4">
                  <div className="flex items-center gap-2 mb-4 bg-gray-50 -mx-4 -mt-4 px-4 py-2 border-b border-gray-200 rounded-t-lg">
                    <Checkbox id="group3" />
                    <Label htmlFor="group3" className="font-bold text-gray-800">البيانات المالية</Label>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-3">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                      <Label className="text-sm cursor-pointer" htmlFor="f1">إضافة البيانات المالية</Label>
                      <Checkbox id="f1" />
                    </div>
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                      <Label className="text-sm cursor-pointer" htmlFor="f2">تعديل البيانات المالية</Label>
                      <Checkbox id="f2" />
                    </div>
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                      <Label className="text-sm cursor-pointer" htmlFor="f3">حذف البيانات المالية</Label>
                      <Checkbox id="f3" />
                    </div>
                  </div>
                </div>

                {/* Section 4 */}
                <div className="border border-gray-200 rounded-lg p-4 space-y-4">
                  <div className="flex items-center gap-2 mb-4 bg-gray-50 -mx-4 -mt-4 px-4 py-2 border-b border-gray-200 rounded-t-lg">
                    <Checkbox id="group4" />
                    <Label htmlFor="group4" className="font-bold text-gray-800">السماح باستعراض حالة حضور الموظفين</Label>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="flex items-center justify-between border border-gray-100 p-2 rounded bg-gray-50/50">
                      <Label className="text-sm cursor-pointer" htmlFor="a1">استعراض حالة حضور موظفي الإدارة فقط</Label>
                      <input type="radio" name="att_view" id="a1" className="h-4 w-4 text-[#004e89]" />
                    </div>
                    <div className="flex items-center justify-between border border-gray-100 p-2 rounded bg-gray-50/50">
                      <Label className="text-sm cursor-pointer" htmlFor="a2">استعراض حالة حضور موظفي الفرع فقط</Label>
                      <input type="radio" name="att_view" id="a2" className="h-4 w-4 text-[#004e89]" />
                    </div>
                    <div className="flex items-center justify-between border border-gray-100 p-2 rounded bg-gray-50/50">
                      <Label className="text-sm cursor-pointer" htmlFor="a3">استعراض حالة حضور موظفي القسم فقط</Label>
                      <input type="radio" name="att_view" id="a3" className="h-4 w-4 text-[#004e89]" />
                    </div>
                    <div className="flex items-center justify-between border border-gray-100 p-2 rounded bg-gray-50/50">
                      <Label className="text-sm cursor-pointer" htmlFor="a4">استعراض حالة حضور الموظفين الذين تحت ادارته المباشرة فقط</Label>
                      <input type="radio" name="att_view" id="a4" className="h-4 w-4 text-[#004e89]" />
                    </div>
                    <div className="flex items-center justify-between border border-gray-100 p-2 rounded bg-gray-50/50">
                      <Label className="text-sm cursor-pointer" htmlFor="a5">استعراض حالة حضور جميع الموظفين</Label>
                      <input type="radio" name="att_view" id="a5" className="h-4 w-4 text-[#004e89]" />
                    </div>
                  </div>
                </div>

              </div>
            )}
            
            {activeTab !== "قائمة الموظفين" && (
              <div className="py-12 text-center text-gray-500">
                محتوى {activeTab} سيظهر هنا
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
