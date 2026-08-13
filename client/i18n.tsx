import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { readUserSession } from "@/lib/authSession";

export type Locale = "ar" | "en";
export type Direction = "rtl" | "ltr";

type I18nContextValue = {
  locale: Locale;
  direction: Direction;
  t: (value: string) => string;
  setLocale: (locale: Locale) => Promise<void>;
  formatDate: (value: Date | string | number, options?: Intl.DateTimeFormatOptions) => string;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
};

const translations: Record<string, string> = {
  "لاكجري العياف": "Luxury Al Ayaf",
  "القائمة الرئيسية": "Main menu",
  "لوحة التحكم": "Dashboard",
  "المبيعات": "Sales",
  "المشتريات": "Purchases",
  "الموارد البشرية": "Human resources",
  "العملاء والموردين": "Customers and vendors",
  "المحاسبة والمالية": "Accounting and finance",
  "الذكاء الاصطناعي": "Artificial intelligence",
  "الإعدادات": "Settings",
  "تصغير القائمة": "Collapse menu",
  "توسيع القائمة": "Expand menu",
  "العودة للقائمة الرئيسية": "Back to main menu",
  "تسجيل الخروج": "Log out",
  "بحث...": "Search...",
  "شركة لاكجري العياف": "Luxury Al Ayaf Company",
  "نظام الموارد البشرية": "Human resources system",
  "نظام إدارة الأعمال المتكامل": "Integrated business management system",
  "سعيد الشودري": "Saeed Al-Shoudri",
  "مدير النظام": "System administrator",
  "اتصل بنا": "Contact us",
  "تواصل مع الإدارة": "Contact management",
  "تحديث الكاش": "Refresh cache",
  "آلة حاسبة": "Calculator",
  "الطلبات الواردة": "Incoming requests",
  "الإشعارات": "Notifications",
  "اللغة": "Language",
  "المهام والمشاريع": "Tasks and projects",
  "الحساب": "Account",
  "الملف الشخصي": "Profile",
  "لوحة إدارة الأعمال": "Business dashboard",
  "لوحة الموارد البشرية": "HR dashboard",
  "تغيير الحساب / تسجيل الدخول": "Switch account / Sign in",
  "العربية": "Arabic",
  "English": "English",
  "الإيميل الرئيسي": "Primary email",
  "المعلومات": "Information",
  "حفظ": "Save",
  "إلغاء": "Cancel",
  "إغلاق": "Close",
  "إرسال": "Send",
  "جاري الحفظ...": "Saving...",
  "جاري الإرسال...": "Sending...",
  "جاري التحميل...": "Loading...",
  "لا توجد بيانات": "No data available",
  "لا توجد إشعارات": "No notifications",
  "معلق": "Pending",
  "معلقة": "Pending",
  "موافق": "Approved",
  "مرفوض": "Rejected",
  "مكتمل": "Completed",
  "قيد التنفيذ": "In progress",
  "تسجيل الدخول": "Sign in",
  "حفظ الإعدادات": "Save settings",
  "إعدادات الشركة": "Company settings",
  "معلومات الشركة": "Company information",
  "الإعدادات الضريبية": "Tax settings",
  "إعدادات إضافية": "Additional settings",
  "اسم الشركة": "Company name",
  "الرقم الضريبي": "Tax number",
  "رقم السجل التجاري": "Commercial registration",
  "البريد الإلكتروني": "Email",
  "رقم الهاتف": "Phone number",
  "المدينة": "City",
  "العنوان": "Address",
};

const getInitialLocale = (): Locale => {
  if (typeof window === "undefined") return "ar";
  return window.localStorage.getItem("app_language") === "en" ? "en" : "ar";
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(getInitialLocale);
  const direction: Direction = locale === "ar" ? "rtl" : "ltr";

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = direction;
    document.body.dir = direction;
  }, [locale, direction]);

  useEffect(() => {
    const restoreUserPreference = async () => {
      if (typeof window === "undefined" || window.localStorage.getItem("app_language")) return;
      const session = readUserSession();
      if (!session?.empId) return;
      const { data } = await supabase
        .from("user_preferences")
        .select("preferences")
        .eq("emp_id", session.empId)
        .maybeSingle();
      const savedLocale = (data?.preferences as { lang?: string } | null)?.lang;
      if (savedLocale === "ar" || savedLocale === "en") setLocaleState(savedLocale);
    };
    void restoreUserPreference();
  }, []);

  const setLocale = async (nextLocale: Locale) => {
    setLocaleState(nextLocale);
    localStorage.setItem("app_language", nextLocale);
    const session = readUserSession();
    if (!session?.empId) return;
    const { data } = await supabase
      .from("user_preferences")
      .select("preferences")
      .eq("emp_id", session.empId)
      .maybeSingle();
    await supabase.from("user_preferences").upsert({
      emp_id: session.empId,
      preferences: { ...((data?.preferences as object) ?? {}), lang: nextLocale },
      updated_at: new Date().toISOString(),
    }, { onConflict: "emp_id" });
  };

  const value = useMemo<I18nContextValue>(() => ({
    locale,
    direction,
    t: (source) => locale === "en" ? translations[source] ?? source : source,
    setLocale,
    formatDate: (date, options) => new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-US", options).format(new Date(date)),
    formatNumber: (number, options) => new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-US", options).format(number),
  }), [locale, direction]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useI18n must be used inside I18nProvider");
  return value;
}
