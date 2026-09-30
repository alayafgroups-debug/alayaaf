import Layout from "@/components/Layout";
import { useState } from "react";
import { Building2, Landmark, Languages, Settings as SettingsIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n";
import { COMPANY_PROFILE } from "@/lib/companyProfile";
import DocumentTemplateWorkspace from "@/components/document-templates/DocumentTemplateWorkspace";

/**
 * إعدادات الشركة للعرض فقط: بيانات المنشأة مصدرها الملف المعتمد (lib/companyProfile)
 * وهي نفسها المطبوعة على الفواتير والمسجلة في شهادة ZATCA، فلا تُعدَّل من هذه الشاشة.
 * إعدادات الضريبة الفعلية في صفحة إعدادات ZATCA وإعدادات المحاسبة.
 */
export default function Settings() {
  const { locale, setLocale, t, direction } = useI18n();
  const [activeSection, setActiveSection] = useState<"company" | "templates">("company");

  const companyFields: Array<{ label: string; value: string; mono?: boolean }> = [
    { label: "اسم الشركة", value: COMPANY_PROFILE.companyNameAr },
    { label: "الاسم بالإنجليزية", value: COMPANY_PROFILE.companyNameEn },
    { label: "الرقم الضريبي", value: COMPANY_PROFILE.vatNumber, mono: true },
    { label: "رقم السجل التجاري", value: COMPANY_PROFILE.commercialRegistration, mono: true },
    { label: "العنوان الوطني", value: COMPANY_PROFILE.addressAr },
    { label: "العنوان بالإنجليزية", value: COMPANY_PROFILE.addressEn },
  ];
  const bankFields: Array<{ label: string; value: string; mono?: boolean }> = [
    { label: "اسم المستفيد", value: COMPANY_PROFILE.bank.beneficiaryAr },
    { label: "البنك", value: COMPANY_PROFILE.bank.nameAr },
    { label: "رقم الحساب", value: COMPANY_PROFILE.bank.accountNumber, mono: true },
    { label: "الآيبان", value: COMPANY_PROFILE.bank.iban, mono: true },
    { label: "الفرع", value: `${COMPANY_PROFILE.bank.branchNameAr} (${COMPANY_PROFILE.bank.branchCode})` },
  ];

  const renderField = (field: { label: string; value: string; mono?: boolean }) => (
    <div key={field.label}>
      <p className="mb-1 text-xs font-semibold text-muted-foreground">{t(field.label)}</p>
      <p className={cn("rounded-xl border border-border/50 bg-slate-50 px-4 py-2.5 text-sm text-foreground", field.mono && "font-mono")}>{field.value || "—"}</p>
    </div>
  );

  return (
    <Layout subMenu={null}>
      <div className="space-y-6" dir={direction}>
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{t("الإعدادات")}</span>
            <span>/</span>
            <span>{t(activeSection === "templates" ? "قوالب المستندات" : "إعدادات الشركة")}</span>
          </div>
          <h1 className="mt-2 text-3xl font-bold text-foreground">
            {t(activeSection === "templates" ? "قوالب المستندات" : "إعدادات الشركة")}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-sm">
          <button onClick={() => setActiveSection("company")} className={cn("rounded-xl px-5 py-2.5 font-bold transition-all duration-200", activeSection === "company" ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20" : "border border-border/50 bg-white text-foreground hover:bg-muted/50")}>
            {t("معلومات الشركة")}
          </button>
          <a href="/zatca/settings" className="inline-flex rounded-xl border border-border/50 bg-white px-5 py-2.5 font-bold text-foreground transition-colors hover:bg-muted/50">
            {t("إعدادات ZATCA")}
          </a>
          <a href="/expenses/settings" className="inline-flex rounded-xl border border-border/50 bg-white px-5 py-2.5 font-bold text-foreground transition-colors hover:bg-muted/50">
            {t("إعدادات المحاسبة")}
          </a>
          <button onClick={() => setActiveSection("templates")} className={cn("rounded-xl px-5 py-2.5 font-bold transition-all duration-200", activeSection === "templates" ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20" : "border border-border/50 bg-white text-foreground hover:bg-muted/50")}>
            {t("قوالب المستندات")}
          </button>
        </div>

        {activeSection === "templates" ? <DocumentTemplateWorkspace /> : (
          <div className="space-y-6">
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {t("بيانات الشركة للعرض فقط: هي نفسها المطبوعة على الفواتير والمسجلة لدى هيئة الزكاة والضريبة (ZATCA)، وتغييرها يتم بطلب تطوير مع تحديث شهادة الربط. نسبة الضريبة وطريقة احتسابها تُضبط في الفاتورة وإعدادات المحاسبة.")}
            </div>

            <div className="overflow-hidden rounded-2xl border border-border/50 bg-white shadow-sm">
              <div className="flex items-center gap-2 bg-gradient-to-l from-blue-800 to-blue-900 px-6 py-4 text-sm font-bold text-white">
                <Building2 className="h-4 w-4" />
                {t("معلومات الشركة")}
              </div>
              <div className="grid gap-5 p-6 sm:grid-cols-2">{companyFields.map(renderField)}</div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-border/50 bg-white shadow-sm">
              <div className="flex items-center gap-2 bg-emerald-700 px-6 py-4 text-sm font-bold text-white">
                <Landmark className="h-4 w-4" />
                {t("الحساب البنكي المطبوع على الفواتير")}
              </div>
              <div className="grid gap-5 p-6 sm:grid-cols-2">{bankFields.map(renderField)}</div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-border/50 bg-white shadow-sm">
              <div className="flex items-center gap-2 bg-slate-700 px-6 py-4 text-sm font-bold text-white">
                <Languages className="h-4 w-4" />
                {t("لغة النظام")}
              </div>
              <div className="flex flex-wrap items-center gap-2 p-6">
                <button
                  type="button"
                  onClick={() => void setLocale("ar")}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${locale === "ar" ? "bg-primary text-primary-foreground" : "border border-border bg-card text-foreground"}`}
                >
                  العربية
                </button>
                <button
                  type="button"
                  onClick={() => void setLocale("en")}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${locale === "en" ? "bg-primary text-primary-foreground" : "border border-border bg-card text-foreground"}`}
                >
                  English
                </button>
                <span className="ms-2 inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <SettingsIcon className="h-3.5 w-3.5" />
                  {t("تُحفظ اللغة لحسابك ولا تؤثر على المستخدمين الآخرين.")}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
