import Layout from "@/components/Layout";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export default function HRTerminationSettings() {
  return (
    <Layout>
      <div className="p-6 max-w-[1600px] mx-auto space-y-6" dir="rtl">
      <div className="bg-white rounded-lg border shadow-sm">
        <Tabs defaultValue="settings" className="w-full">
          <TabsList className="w-full flex justify-start border-b rounded-none p-0 h-auto bg-transparent">
            <TabsTrigger 
              value="settings" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#004e89] data-[state=active]:bg-transparent data-[state=active]:text-[#004e89] py-3 px-6 font-medium text-gray-600"
            >
              إعدادات إنهاء الخدمة
            </TabsTrigger>
            <TabsTrigger 
              value="clearance" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#004e89] data-[state=active]:bg-transparent data-[state=active]:text-[#004e89] py-3 px-6 font-medium text-gray-600"
            >
              إعداد قالب إقرار مخالصة ذمة
            </TabsTrigger>
            <TabsTrigger 
              value="evacuation" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#004e89] data-[state=active]:bg-transparent data-[state=active]:text-[#004e89] py-3 px-6 font-medium text-gray-600"
            >
              إعداد قالب إقرار إخلاء طرف
            </TabsTrigger>
            <TabsTrigger 
              value="reasons" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#004e89] data-[state=active]:bg-transparent data-[state=active]:text-[#004e89] py-3 px-6 font-medium text-gray-600"
            >
              أسباب إخلاء الطرف
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="settings" className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              
              <div className="space-y-3 col-span-1 md:col-span-2">
                <Label className="text-base font-medium">الموافقة التلقائية لعملية إنهاء الخدمة *</Label>
                <RadioGroup defaultValue="no" className="flex gap-6 mt-2">
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <RadioGroupItem value="yes" id="auto_approve_yes" />
                    <Label htmlFor="auto_approve_yes" className="font-normal cursor-pointer">نعم</Label>
                  </div>
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <RadioGroupItem value="no" id="auto_approve_no" />
                    <Label htmlFor="auto_approve_no" className="font-normal cursor-pointer">لا</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label>مستوى الموافقة الأول</Label>
                <Select defaultValue="1">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">عبدالمجيد شودري</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>مستوى الموافقة الثاني</Label>
                <Select defaultValue="1">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">سعيد محمد نور الحق</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>مستوى الموافقة الثالث</Label>
                <Select defaultValue="1">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">نادر القرشي</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Empty div for grid alignment */}
              <div></div>

              <div className="space-y-2">
                <Label>مكافأة إنهاء الخدمة تحسب من *</Label>
                <Select defaultValue="basic">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic">الراتب الأساسي</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label>هل تحسب المكافأة للموظفين الذين خدموا في الشركة لأقل من سنة *</Label>
                <RadioGroup defaultValue="no" className="flex gap-6 mt-2">
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <RadioGroupItem value="yes" id="calc_less_year_yes" />
                    <Label htmlFor="calc_less_year_yes" className="font-normal cursor-pointer">نعم</Label>
                  </div>
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <RadioGroupItem value="no" id="calc_less_year_no" />
                    <Label htmlFor="calc_less_year_no" className="font-normal cursor-pointer">لا</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label>مقدار المكافأة لكل سنة للموظفين الذين خدموا أقل أو ما يساوي خمس سنين *</Label>
                <Select defaultValue="half">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="half">نصف راتب لكل سنة</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>مقدار المكافأة لكل سنة للموظفين الذين خدموا أكثر من خمس سنين *</Label>
                <Select defaultValue="full">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full">راتب شهر لكل سنة</SelectItem>
                  </SelectContent>
                </Select>
              </div>

            </div>

            <div className="flex justify-end mt-8">
              <Button className="bg-[#004e89] hover:bg-[#003d6d] text-white px-8">حفظ</Button>
            </div>
          </TabsContent>
          
          <TabsContent value="clearance" className="p-6">
            <div className="text-center py-10 text-gray-500">
              محتوى إعداد قالب إقرار مخالصة ذمة
            </div>
          </TabsContent>
          
          <TabsContent value="evacuation" className="p-6">
            <div className="text-center py-10 text-gray-500">
              محتوى إعداد قالب إقرار إخلاء طرف
            </div>
          </TabsContent>
          
          <TabsContent value="reasons" className="p-6">
            <div className="text-center py-10 text-gray-500">
              محتوى أسباب إخلاء الطرف
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
    </Layout>
  );
}
