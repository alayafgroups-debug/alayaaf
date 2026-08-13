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
  "الرئيسية": "Home",
  "لوحة المتابعة": "Work dashboard",
  "المشاريع": "Projects",
  "المهام": "Tasks",
  "كل المهام": "All tasks",
  "المهام اليومية": "Daily tasks",
  "ملخص حالات المهام": "Task status summary",
  "مهام المتعاونين": "Collaborator tasks",
  "مهام متعاون فيها": "Tasks I collaborate on",
  "مهام بانتظار موافقتك": "Tasks awaiting your approval",
  "تقارير المهام اليومية": "Daily task reports",
  "الدعم": "Support",
  "إدارة التذاكر": "Ticket management",
  "العملاء": "Clients",
  "إعدادات الوحدة": "Module settings",
  "أقسام إدارة العمل": "Work management sections",
  "مركز العمل": "Work center",
  "المهام والمشاريع والدعم والإعدادات": "Tasks, projects, support, and settings",
  "المهام والمشاريع والدعم": "Tasks, projects, and support",
  "وحدة التشغيل والمتابعة": "Operations and follow-up",
  "عرض جميع الأقسام": "Show all sections",
  "الأقسام": "Sections",
  "مشروع جديد": "New project",
  "مهمة جديدة": "New task",
  "تذكرة جديدة": "New ticket",
  "عميل جديد": "New client",
  "إضافة مشروع جديد": "Add new project",
  "إضافة مهمة جديدة": "Add new task",
  "إضافة عميل": "Add client",
  "إضافة تذكرة دعم": "Add support ticket",
  "اسم المشروع": "Project name",
  "نوع المشروع": "Project type",
  "داخلي": "Internal",
  "خارجي": "External",
  "الإدارة": "Department",
  "مدير المشروع": "Project manager",
  "الوصف": "Description",
  "تاريخ البداية": "Start date",
  "تاريخ النهاية": "End date",
  "عنوان المهمة": "Task title",
  "المشروع": "Project",
  "المسؤول": "Assignee",
  "الأولوية": "Priority",
  "منخفضة": "Low",
  "متوسطة": "Medium",
  "عالية": "High",
  "عاجلة": "Urgent",
  "عدد الساعات": "Hours",
  "تاريخ المهمة": "Task date",
  "الموعد النهائي": "Due date",
  "تكرار المهمة": "Task recurrence",
  "لا": "None",
  "يومي": "Daily",
  "أسبوعي": "Weekly",
  "شهري": "Monthly",
  "نقاط المهمة (كل نقطة في سطر)": "Task points (one per line)",
  "النقطة الأولى": "First point",
  "النقطة الثانية": "Second point",
  "معلومات إضافية": "Additional information",
  "إضافة ملفات (PDF، صور، Excel — بحد أقصى 10MB)": "Add files (PDF, images, Excel — maximum 10MB)",
  "المتعاونون في المهمة": "Task collaborators",
  "تتطلب موافقة المسؤول": "Requires manager approval",
  "العميل": "Client",
  "نوع التذكرة": "Ticket type",
  "استفسار": "Inquiry",
  "مشكلة": "Issue",
  "صيانة": "Maintenance",
  "طلب خدمة جديدة": "New service request",
  "عنوان التذكرة": "Ticket subject",
  "كود دخول الشركة": "Company login code",
  "مسؤول الدعم": "Support representative",
  "نظرة عامة": "Overview",
  "قائمة المهام": "Task list",
  "مراحل المشروع": "Project stages",
  "مؤشرات المشروع": "Project metrics",
  "سير العمل والإنجاز": "Workflow and progress",
  "نسبة التقدم": "Progress",
  "نسبة الإنجاز": "Completion",
  "مهام المشروع": "Project tasks",
  "تفاصيل المهمة": "Task details",
  "بدء تنفيذ المهمة": "Start task",
  "حذف المهمة": "Delete task",
  "نقاط المهمة": "Task points",
  "معلومات إضافية: ": "Additional information: ",
  "تقييم معالجة التذكرة": "Ticket handling rating",
  "اكتب ردًا على التذكرة": "Write a reply to the ticket",
  "إرسال الرد": "Send reply",
  "إغلاق التذكرة": "Close ticket",
  "مهمة منجزة": "Completed task",
  "مهمة متأخرة": "Overdue task",
  "توزيع المهام على المشاريع": "Task distribution by project",
  "أحدث المهام": "Latest tasks",
  "بدون مشروع": "No project",
  "بحث في المهام...": "Search tasks...",
  "بحث في التذاكر...": "Search tickets...",
  "بحث باسم العميل أو الشركة...": "Search by client or company...",
  "عنوان": "Title",
  "من / إلى": "From / To",
  "الساعات": "Hours",
  "الحالة": "Status",
  "التقييم": "Rating",
  "الإجراء": "Actions",
  "الموظف": "Employee",
  "التاريخ": "Date",
  "حالات المهام": "Task statuses",
  "أنواع أعضاء المشاريع": "Project member types",
  "إعدادات الإشعارات": "Notification settings",
  "وقت الاستجابة": "Response time",
  "عنوان جديد": "New title",
  "ساعة": "hour(s)",
  "فعال": "Active",
  "غير فعال": "Inactive",
  "إضافة": "Add",
  "المرفقات": "Attachments",
  "إضافة ملفات": "Add files",
  "لا توجد مرفقات": "No attachments",
  "التعليقات": "Comments",
  "لا توجد تعليقات": "No comments",
  "اكتب تعليقًا...": "Write a comment...",
  "سجل الحركة": "Activity log",
  "سيظهر هنا تاريخ تغييرات العنصر": "Changes to this item will appear here",
  "اختر...": "Select...",
  "لا توجد مشاريع": "No projects",
  "لا توجد مشاريع، أضف مشروعًا جديدًا": "No projects. Add a new project",
  "لا توجد مهام": "No tasks",
  "لا توجد مهام في المشروع": "No tasks in this project",
  "لا توجد مهام مطابقة": "No matching tasks",
  "لا توجد تذاكر": "No tickets",
  "لا يوجد عملاء": "No clients",
  "لا توجد نتائج": "No results",
  "تم إنشاء المشروع": "Project created",
  "تم إنشاء المهمة": "Task created",
  "تم إنشاء التذكرة": "Ticket created",
  "تمت إضافة العميل": "Client added",
  "تم إرسال الرد": "Reply sent",
  "تم حفظ تقييم التذكرة": "Ticket rating saved",
  "تم إغلاق التذكرة": "Ticket closed",
  "تمت الإضافة": "Added",
  "مكتملة": "Completed",
  "متأخرة": "Overdue",
  "متوقفة": "Stopped",
  "انتظار العمل": "Awaiting work",
  "بانتظار الموافقة": "Awaiting approval",
  "جديدة": "New",
  "مفتوحة": "Open",
  "قيد المعالجة": "In progress",
  "مغلقة": "Closed",
  "مستخدم": "User",
  "من تاريخ": "From date",
  "إلى تاريخ": "To date",
  "لا يوجد وصف": "No description",
  "لا توجد نقاط مضافة": "No points added",
  "الكل": "All",
  "مهمة": "task(s)",
  "سجل": "record(s)",
  "غير معين": "Unassigned",
  "الشركة": "Company",
  "البريد": "Email",
  "الهاتف": "Phone",
  "رقم الدعم": "Support number",
  "أضف أنواع أعضاء المشاريع مثل مدير مشروع أو عضو أو مراقب": "Add project member types such as manager, member, or observer",
  "أكبر من 10 ميجابايت": "is larger than 10 MB",
  "الملف": "File",
  "تعذر رفع الملف": "Unable to upload file",
  "اسم المشروع مطلوب": "Project name is required",
  "عنوان المهمة مطلوب": "Task title is required",
  "أكمل بيانات العميل الإلزامية": "Complete the required client information",
  "العنوان والعميل والوصف مطلوبة": "Subject, client, and description are required",
  "تعذر فتح المرفق": "Unable to open attachment",
  "تعذر تحميل الوحدة؛ تأكد من تشغيل ملف قاعدة البيانات المحدّث": "Unable to load the module; make sure the updated database migration is applied",
  "تم إنشاء المهمة لكن تعذر حفظ بعض المتعاونين": "The task was created, but some collaborators could not be saved",
  "تم تحديث بيانات المهمة": "Task details updated",
  "تمت إضافة تعليق": "Comment added",
  "جديد": "New",
  "غير مطلوب": "Not required",
  "نشط": "Active",
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
