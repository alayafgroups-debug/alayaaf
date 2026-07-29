import { Wrench } from "lucide-react";
import Layout from "@/components/Layout";
import DeductionSettingsPage from "./DeductionSettingsPage";

export default function HRDeductionsEmails() {
  return (
    <Layout>
      <div dir="rtl" className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-orange-100 rounded-lg">
            <Wrench className="h-6 w-6 text-orange-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">أسباب الخصومات والفترات</h1>
            <p className="text-sm text-gray-600 mt-1">إدارة أسباب الخصومات وجداول إرسال الإيميلات وتوليد الإيميلات للموظفين</p>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <DeductionSettingsPage />
        </div>
      </div>
    </Layout>
  );
}
