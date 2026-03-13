import { useState } from "react";
import Layout from "@/components/Layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

export default function HRApprovalsAdd() {
  return (
    <Layout>
      <div className="p-6 max-w-[1600px] mx-auto space-y-6" dir="rtl">
        {/* Progress steps (visual only based on image) */}
        <div className="bg-white p-6 rounded-lg border shadow-sm flex flex-col items-center gap-6">
          <div className="flex w-full justify-between items-center text-sm font-medium text-gray-500 mb-4 px-10 relative">
            <div className="absolute top-1/2 left-20 right-20 h-[2px] bg-gray-200 -z-10 -translate-y-1/2"></div>
            
            <div className="flex gap-2 items-center text-[#004e89] bg-white pr-2">
              <div className="w-6 h-6 rounded bg-[#004e89] text-white flex items-center justify-center text-xs">1</div>
              <span>بيانات سلسلة الموافقات</span>
            </div>
            
            <div className="flex gap-2 items-center bg-white px-2">
              <div className="w-6 h-6 rounded bg-gray-200 text-gray-500 flex items-center justify-center text-xs">2</div>
              <span>مجال سلسلة الموافقات</span>
            </div>
            
            <div className="flex gap-2 items-center bg-white px-2">
              <div className="w-6 h-6 rounded bg-gray-200 text-gray-500 flex items-center justify-center text-xs">3</div>
              <span>تحديد لجنة الموافقات من المدراء والموظفين</span>
            </div>
            
            <div className="flex gap-2 items-center bg-white px-2">
              <div className="w-6 h-6 rounded bg-gray-200 text-gray-500 flex items-center justify-center text-xs">4</div>
              <span>الطلبات المرتبطة</span>
            </div>
            
            <div className="flex gap-2 items-center bg-white pl-2">
              <div className="w-6 h-6 rounded bg-gray-200 text-gray-500 flex items-center justify-center text-xs">5</div>
              <span>تحديد تسلسل اللجنة</span>
            </div>
          </div>

          <div className="w-full text-right font-semibold text-lg text-gray-800 border-b pb-4 mb-4">
            بيانات سلسلة الموافقات
          </div>

          <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-gray-700">الوصف بالعربية *</Label>
              <Input className="bg-gray-50" />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-700">الوصف بالانجليزية *</Label>
              <Input className="bg-gray-50" />
            </div>
            <div className="space-y-3 col-span-1 md:col-span-2">
              <Label className="text-gray-700">فعال *</Label>
              <RadioGroup defaultValue="yes" className="flex gap-6 mt-2">
                <div className="flex items-center space-x-2 space-x-reverse">
                  <RadioGroupItem value="yes" id="active_yes" />
                  <Label htmlFor="active_yes" className="font-normal cursor-pointer">نعم</Label>
                </div>
                <div className="flex items-center space-x-2 space-x-reverse">
                  <RadioGroupItem value="no" id="active_no" />
                  <Label htmlFor="active_no" className="font-normal cursor-pointer">لا</Label>
                </div>
              </RadioGroup>
            </div>
          </div>

          <div className="w-full flex justify-start gap-2 mt-8">
            <Button className="bg-[#004e89] hover:bg-[#003d6d] text-white px-8">التالي</Button>
            <Button variant="outline" className="text-gray-500 px-8" disabled>السابق</Button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
