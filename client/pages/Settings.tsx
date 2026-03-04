import Layout from "@/components/Layout";
import { Settings as SettingsIcon } from "lucide-react";

export default function Settings() {
  return (
    <Layout subMenu={null}>
      <div className="max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <div className="mb-4 inline-flex rounded-lg bg-primary-100 p-3">
            <SettingsIcon className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">الإعدادات</h1>
          <p className="mt-2 text-lg text-muted-foreground">
            إدارة إعدادات النظام والبيانات الأساسية
          </p>
        </div>

        {/* Content Area */}
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Panel */}
          <div className="lg:col-span-2">
            <div className="erp-card">
              <div className="py-16 text-center">
                <div className="mb-4 flex justify-center">
                  <SettingsIcon className="h-16 w-16 text-muted-foreground/30" />
                </div>
                <h3 className="text-xl font-semibold text-foreground">
                  الإعدادات قريباً
                </h3>
                <p className="mt-2 text-muted-foreground">
                  صفحة الإعدادات قيد التطوير حالياً.
                </p>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="flex flex-col gap-6">
            {/* Settings Categories */}
            <div className="erp-card">
              <h3 className="mb-4 font-semibold text-foreground">
                فئات الإعدادات
              </h3>
              <ul className="space-y-3">
                <li className="text-sm text-muted-foreground">
                  • إعدادات الشركة
                </li>
                <li className="text-sm text-muted-foreground">
                  • إعدادات ZATCA
                </li>
                <li className="text-sm text-muted-foreground">
                  • المستخدمين والصلاحيات
                </li>
                <li className="text-sm text-muted-foreground">
                  • الإشعارات والتنبيهات
                </li>
                <li className="text-sm text-muted-foreground">
                  • النسخ الاحتياطي
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
