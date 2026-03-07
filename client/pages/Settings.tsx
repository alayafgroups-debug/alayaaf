import Layout from "@/components/Layout";
import { useState } from "react";
import { Settings as SettingsIcon } from "lucide-react";

export default function Settings() {
  const [language, setLanguage] = useState("ar");

  return (
    <Layout subMenu={null}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>الإعدادات</span>
              <span>/</span>
              <span>إعدادات الشركة</span>
            </div>
            <h1 className="mt-2 text-2xl font-semibold text-foreground">
              إعدادات الشركة
            </h1>
          </div>
          <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary-700">
            <SettingsIcon className="h-4 w-4" />
            حفظ الإعدادات
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-sm">
          <button className="rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground">
            معلومات الشركة
          </button>
          <button className="rounded-lg border border-border bg-card px-4 py-2 font-semibold text-foreground">
            الإعدادات الضريبية
          </button>
          <button className="rounded-lg border border-border bg-card px-4 py-2 font-semibold text-foreground">
            إعدادات إضافية
          </button>
        </div>

        <div className="space-y-6">
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="bg-blue-600 px-4 py-3 text-sm font-semibold text-white">
              معلومات الشركة
            </div>
            <div className="grid gap-4 p-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-foreground">
                  اسم الشركة
                </label>
                <input
                  className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  defaultValue="شركة لاكجري العياف"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">
                  الرقم الضريبي
                </label>
                <input
                  className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  defaultValue="311111111111113"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">
                  رقم السجل التجاري
                </label>
                <input
                  className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  defaultValue="1010101010"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">
                  البريد الإلكتروني
                </label>
                <input
                  className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  defaultValue="info@demo.com"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">
                  رقم الهاتف
                </label>
                <input
                  className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  defaultValue="0500000000"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">
                  المدينة
                </label>
                <input
                  className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  defaultValue="الرياض"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm font-medium text-foreground">
                  العنوان
                </label>
                <input
                  className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  defaultValue="شارع الملك فهد - الرياض"
                />
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="bg-emerald-600 px-4 py-3 text-sm font-semibold text-white">
              الإعدادات الضريبية
            </div>
            <div className="grid gap-4 p-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-foreground">
                  نسبة ضريبة القيمة المضافة
                </label>
                <input
                  className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  defaultValue="15%"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">
                  طريقة احتساب الضريبة
                </label>
                <select className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
                  <option>شامل</option>
                  <option>غير شامل</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">
                  الرقم المميز للفوترة
                </label>
                <input
                  className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  defaultValue="ZATCA-0001"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">
                  صلاحية الفاتورة الإلكترونية
                </label>
                <input
                  className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  defaultValue="30 يوم"
                />
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="bg-rose-600 px-4 py-3 text-sm font-semibold text-white">
              إعدادات إضافية
            </div>
            <div className="grid gap-4 p-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-foreground">
                  العملة الافتراضية
                </label>
                <select className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
                  <option>ريال سعودي</option>
                  <option>دولار أمريكي</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">
                  المنطقة الزمنية
                </label>
                <select className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
                  <option>GMT+3</option>
                  <option>GMT+4</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm font-medium text-foreground">
                  لغة النظام
                </label>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setLanguage("ar")}
                    className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                      language === "ar"
                        ? "bg-primary text-primary-foreground"
                        : "border border-border bg-card text-foreground"
                    }`}
                  >
                    العربية
                  </button>
                  <button
                    type="button"
                    onClick={() => setLanguage("en")}
                    className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                      language === "en"
                        ? "bg-primary text-primary-foreground"
                        : "border border-border bg-card text-foreground"
                    }`}
                  >
                    English
                  </button>
                </div>
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm font-medium text-foreground">
                  ملاحظات
                </label>
                <textarea
                  className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  rows={3}
                  defaultValue=""
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
