import { useState } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";

export default function HRPenaltiesSettings() {
  return (
    <Layout>
      <div className="p-6 max-w-[1200px] mx-auto space-y-6" dir="rtl">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-800">إعدادات</h2>
          </div>
          
          <div className="p-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
              
              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                  إمكانية تطبيق جزاء قبل انتهاء الفترة المسموحة لرد الموظف <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-6 mt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="apply_penalty_early" className="text-[#004e89] focus:ring-[#004e89] w-4 h-4" />
                    <span className="text-sm text-gray-700">نعم</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="apply_penalty_early" className="text-[#004e89] focus:ring-[#004e89] w-4 h-4" defaultChecked />
                    <span className="text-sm text-gray-700">لا</span>
                  </label>
                </div>
              </div>

              <div className="space-y-3 relative">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                  الفترة المسموحة لتجاوز رد الموظف <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input 
                    type="number" 
                    className="w-full h-10 border border-gray-300 rounded-md px-3 pl-12 bg-white text-sm focus:ring-2 focus:ring-[#004e89] focus:border-transparent outline-none" 
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">يوم/أيام</span>
                </div>
              </div>

              <div className="space-y-3 md:col-span-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                  تفعيل إرسال إشعار للمدير المباشر بالمساءلات التي ترسل للموظفين
                </label>
                <div className="flex gap-6 mt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="notify_manager" className="text-[#004e89] focus:ring-[#004e89] w-4 h-4" />
                    <span className="text-sm text-gray-700">نعم</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="notify_manager" className="text-[#004e89] focus:ring-[#004e89] w-4 h-4" defaultChecked />
                    <span className="text-sm text-gray-700">لا</span>
                  </label>
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
