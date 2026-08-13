import Layout from "@/components/Layout";
import { useState } from "react";
import { Settings as SettingsIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n";

export default function Settings() {
  const { locale, setLocale } = useI18n();

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
            <h1 className="mt-2 text-3xl font-bold text-foreground">
              إعدادات الشركة
            </h1>
          </div>
          <button className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-500/25 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200">
            <SettingsIcon className="h-4 w-4" />
            حفظ الإعدادات
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-sm">
          <button className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 font-bold text-white shadow-lg shadow-blue-500/20 hover:shadow-xl transition-all duration-200">
            معلومات الشركة
          </button>
          <button className="rounded-xl border border-border/50 bg-white px-5 py-2.5 font-bold text-foreground hover:bg-muted/50 transition-colors">
            الإعدادات الضريبية
          </button>
          <a href="/zatca/settings" className="rounded-xl border border-border/50 bg-white px-5 py-2.5 font-bold text-foreground hover:bg-muted/50 transition-colors inline-flex">
            إعدادات ZATCA
          </a>
          <button className="rounded-xl border border-border/50 bg-white px-5 py-2.5 font-bold text-foreground hover:bg-muted/50 transition-colors">
            إعدادات إضافية
          </button>
        </div>

        <div className="space-y-6">
          <div className="overflow-hidden rounded-2xl border border-border/50 bg-white shadow-sm animate-fade-in-up">
            <div className="bg-gradient-to-l from-blue-800 to-blue-900 px-6 py-4 text-sm font-bold text-white flex items-center gap-2">
              <SettingsIcon className="h-4 w-4" />
              معلومات الشركة
            </div>
            <div className="grid gap-6 p-6 sm:grid-cols-2">
              <div>
                <label className="text-sm font-bold text-foreground text-right block mb-2">
                  اسم الشركة
                </label>
                <input
                  className="w-full rounded-xl border border-border/50 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
                  defaultValue="شركة لاكجري العياف"
                />
              </div>
              <div>
                <label className="text-sm font-bold text-foreground text-right block mb-2">
                  الرقم الضريبي
                </label>
                <input
                  className="w-full rounded-xl border border-border/50 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
                  defaultValue="311111111111113"
                />
              </div>
              <div>
                <label className="text-sm font-bold text-foreground text-right block mb-2">
                  رقم السجل التجاري
                </label>
                <input
                  className="w-full rounded-xl border border-border/50 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
                  defaultValue="1010101010"
                />
              </div>
              <div>
                <label className="text-sm font-bold text-foreground text-right block mb-2">
                  البريد الإلكتروني
                </label>
                <input
                  className="w-full rounded-xl border border-border/50 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
                  defaultValue="info@demo.com"
                />
              </div>
              <div>
                <label className="text-sm font-bold text-foreground text-right block mb-2">
                  رقم الهاتف
                </label>
                <input
                  className="w-full rounded-xl border border-border/50 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
                  defaultValue="0500000000"
                />
              </div>
              <div>
                <label className="text-sm font-bold text-foreground text-right block mb-2">
                  المدينة
                </label>
                <input
                  className="w-full rounded-xl border border-border/50 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
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
                    onClick={() => void setLocale("ar")}
                    className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                      locale === "ar"
                        ? "bg-primary text-primary-foreground"
                        : "border border-border bg-card text-foreground"
                    }`}
                  >
                    العربية
                  </button>
                  <button
                    type="button"
                    onClick={() => void setLocale("en")}
                    className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                      locale === "en"
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
