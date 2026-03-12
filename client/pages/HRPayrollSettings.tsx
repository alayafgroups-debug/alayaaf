import { useState } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";

export default function HRPayrollSettings() {
  return (
    <Layout>
      <div className="p-6 max-w-[1200px] mx-auto space-y-8" dir="rtl">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-800">إعدادات حساب الراتب</h2>
          </div>
          
          <div className="p-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* Left Column */}
              <div className="space-y-8">
                <div className="space-y-3">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                    حساب الراتب <span className="text-red-500">*</span>
                  </label>
                  <select className="w-full h-10 border border-gray-300 rounded-md px-3 bg-white text-sm focus:ring-2 focus:ring-[#004e89] outline-none">
                    <option>الأيام</option>
                  </select>
                  <p className="text-xs text-gray-400">اختر طريقة حساب قيمة الراتب للحضور والغياب</p>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                    عرض المتعاونين في كشف الراتب
                  </label>
                  <div className="flex gap-6 mt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="cooperators" className="text-[#004e89] focus:ring-[#004e89] w-4 h-4" />
                      <span className="text-sm text-gray-700">نعم</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="cooperators" className="text-[#004e89] focus:ring-[#004e89] w-4 h-4" defaultChecked />
                      <span className="text-sm text-gray-700">لا</span>
                    </label>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                    تفعيل إمكانية اصدار حساب الراتب مقدما
                  </label>
                  <div className="flex gap-6 mt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="advance_payroll" className="text-[#004e89] focus:ring-[#004e89] w-4 h-4" defaultChecked />
                      <span className="text-sm text-gray-700">نعم</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="advance_payroll" className="text-[#004e89] focus:ring-[#004e89] w-4 h-4" />
                      <span className="text-sm text-gray-700">لا</span>
                    </label>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                    حدد تاريخ صرف الراتب <span className="text-red-500">*</span>
                  </label>
                  <select className="w-full h-10 border border-gray-300 rounded-md px-3 bg-white text-sm focus:ring-2 focus:ring-[#004e89] outline-none">
                    <option>يوم 50 من الشهر</option>
                  </select>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    هذا الخيار يحدد من اجل سياسة احتساب الراتب معتمداً على الاكمال ليوم الشهر بشكل مستمر
                  </p>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-8">
                
                <div className="space-y-3">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                    طريقة احتساب قيمة ساعات أيام الغياب <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-3 mt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="absence_calc" className="text-[#004e89] focus:ring-[#004e89] w-4 h-4" />
                      <span className="text-sm text-gray-700">من الراتب الأساسي (الافتراضي)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="absence_calc" className="text-[#004e89] focus:ring-[#004e89] w-4 h-4" defaultChecked />
                      <span className="text-sm text-gray-700">من إجمالي الراتب الأساسي + البدلات</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="absence_calc" className="text-[#004e89] focus:ring-[#004e89] w-4 h-4" />
                      <span className="text-sm text-gray-700">من إجمالي الراتب الأساسي + البدلات + الإمتيازات</span>
                    </label>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                    احتساب قيمة الساعة العادية للموظف <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-3 mt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="normal_hour_calc" className="text-[#004e89] focus:ring-[#004e89] w-4 h-4" defaultChecked />
                      <span className="text-sm text-gray-700">من الراتب الأساسي (الافتراضي) / 30 يوم / على عدد ساعات الدوام</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="normal_hour_calc" className="text-[#004e89] focus:ring-[#004e89] w-4 h-4" />
                      <span className="text-sm text-gray-700">من (إجمالي الراتب الأساسي + البدلات) / 30 يوم / على عدد ساعات الدوام</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="normal_hour_calc" className="text-[#004e89] focus:ring-[#004e89] w-4 h-4" />
                      <span className="text-sm text-gray-700">من (إجمالي الراتب الأساسي + البدلات + الإمتيازات) / 30 يوم / على عدد ساعات الدوام</span>
                    </label>
                  </div>
                </div>
              </div>

            </div>

            {/* Overtime Calculations */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-gray-100">
              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                  احتساب قيمة الساعة الإضافية الأساسية حتى ال 100% <span className="text-red-500">*</span>
                </label>
                <div className="space-y-3 mt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="ot_basic" className="text-[#004e89] focus:ring-[#004e89] w-4 h-4" defaultChecked />
                    <span className="text-sm text-gray-700">من الراتب الأساسي (الافتراضي)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="ot_basic" className="text-[#004e89] focus:ring-[#004e89] w-4 h-4" />
                    <span className="text-sm text-gray-700">من إجمالي الراتب الأساسي + البدلات</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="ot_basic" className="text-[#004e89] focus:ring-[#004e89] w-4 h-4" />
                    <span className="text-sm text-gray-700">من إجمالي الراتب الأساسي + البدلات + الإمتيازات</span>
                  </label>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                  احتساب قيمة الساعة الإضافية فوق 100% من قيمة الساعات الإضافية الأساسية <span className="text-red-500">*</span>
                </label>
                <div className="space-y-3 mt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="ot_extra" className="text-[#004e89] focus:ring-[#004e89] w-4 h-4" defaultChecked />
                    <span className="text-sm text-gray-700">من الراتب الأساسي (الافتراضي)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="ot_extra" className="text-[#004e89] focus:ring-[#004e89] w-4 h-4" />
                    <span className="text-sm text-gray-700">من إجمالي الراتب الأساسي + البدلات</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="ot_extra" className="text-[#004e89] focus:ring-[#004e89] w-4 h-4" />
                    <span className="text-sm text-gray-700">من إجمالي الراتب الأساسي + البدلات + الإمتيازات</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-gray-100">
              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-700">تفعيل التأمين على الساعات الإضافية</label>
                <select className="w-full h-10 border border-gray-300 rounded-md px-3 bg-white text-sm focus:ring-2 focus:ring-[#004e89] outline-none">
                  <option>لا</option>
                  <option>نعم</option>
                </select>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-700">استثناء السلف من الاقتطاعات</label>
                <div className="flex gap-6 mt-2 h-10 items-center">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="exclude_advances" className="text-[#004e89] focus:ring-[#004e89] w-4 h-4" />
                    <span className="text-sm text-gray-700">نعم</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="exclude_advances" className="text-[#004e89] focus:ring-[#004e89] w-4 h-4" defaultChecked />
                    <span className="text-sm text-gray-700">لا</span>
                  </label>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-700">اعمدة الاجماليات في كشف الراتب</label>
                <select className="w-full h-10 border border-gray-300 rounded-md px-3 bg-white text-sm focus:ring-2 focus:ring-[#004e89] outline-none">
                  <option>الإثنين معاً</option>
                </select>
              </div>
            </div>

            {/* Payroll Calculation Method Settings */}
            <div className="pt-6 border-t border-gray-100">
              <h3 className="text-[#004e89] font-bold text-base mb-6 border-r-4 border-[#004e89] pr-3">إعدادات طريقة احتساب الراتب</h3>
              
              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-700">تفعيل نظام الراتب المكتسب حسب الحضور</label>
                <div className="flex gap-6 mt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="earned_salary" className="text-[#004e89] focus:ring-[#004e89] w-4 h-4" defaultChecked />
                    <span className="text-sm text-gray-700">نعم</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="earned_salary" className="text-[#004e89] focus:ring-[#004e89] w-4 h-4" />
                    <span className="text-sm text-gray-700">لا</span>
                  </label>
                </div>
                <p className="text-xs text-gray-400 mt-2">في نظام الراتب المكتسب يُحسب الراتب كالتالي: (أيام الدوام - أيام الحضور أو الغياب) بناءً على إعداد "قيمة ساعة الغياب" (الراتب الأساسي فقط ، أو مع البدلات المخصصة).</p>
              </div>
            </div>

            {/* Month Days Settings */}
            <div className="pt-6 border-t border-gray-100">
              <h3 className="text-[#004e89] font-bold text-base mb-6 border-r-4 border-[#004e89] pr-3">إعدادات أيام الشهر</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                    طريقة حساب أيام الشهر <span className="text-red-500">*</span>
                  </label>
                  <select className="w-full h-10 border border-gray-300 rounded-md px-3 bg-white text-sm focus:ring-2 focus:ring-[#004e89] outline-none">
                    <option>30 يوم ثابت (افتراضي حسب نظام العمل السعودي)</option>
                  </select>
                  <p className="text-xs text-gray-400">اختر طريقة حساب أيام الشهر في الراتب اليومي. 30 يوم ثابت هو المعيار القانوني في المملكة العربية السعودية.</p>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                    سياسة الأشهر ذات 31 يوم <span className="text-red-500">*</span>
                  </label>
                  <select className="w-full h-10 border border-gray-300 rounded-md px-3 bg-white text-sm focus:ring-2 focus:ring-[#004e89] outline-none">
                    <option>لصالح الموظف (متساهل)</option>
                  </select>
                  <p className="text-xs text-gray-400">عند استخدام 30 يوم ثابت تحدد هذه السياسة كيفية التعامل مع الأشهر ذات 31 يوم.</p>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-gray-100 flex justify-end">
              <Button className="bg-[#004e89] hover:bg-[#003865] text-white px-8 h-10 rounded-md">
                حفظ
              </Button>
            </div>

          </div>
        </div>
      </div>
    </Layout>
  );
}
