import Layout from "@/components/Layout";
import { BarChart3, ChevronLeft, FileText, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useI18n } from "@/i18n";

const reportSections = [
  {
    title: "التقارير المالية الموحدة",
    reports: [
      "قائمة الدخل",
      "قائمة الدخل الشامل",
      "قائمة المركز المالي",
      "قائمة التدفقات النقدية",
      "الميزانية التقديرية",
    ],
  },
  {
    title: "ميزان المراجعة",
    reports: [
      "ميزان المراجعة",
      "ميزان المراجعة حسب المشروع",
      "دفتر الأستاذ العام",
      "دفتر الأستاذ المساعد",
    ],
  },
  {
    title: "سندات",
    reports: [
      "سندات القبض",
      "سندات الصرف",
      "كشف حساب الصندوق",
      "كشف حساب البنك",
    ],
  },
  {
    title: "المبيعات",
    reports: [
      "ملخص أرصدة العملاء",
      "كشف حساب عميل",
      "أعمار الديون",
      "قائمة التحصيلات النقدية",
    ],
  },
  {
    title: "مشتريات",
    reports: [
      "ملخص أرصدة الموردين",
      "كشف حساب مورد",
      "أعمار الديون للموردين",
      "قائمة المدفوعات النقدية",
    ],
  },
  {
    title: "الرواتب",
    reports: [
      "كشف حساب موظف",
      "كشف رواتب الموظفين",
      "تقرير البدلات والاستقطاعات",
      "تقرير مستحقات نهاية الخدمة",
    ],
  },
  {
    title: "الزكاة والضريبة",
    reports: [
      "تقرير ضريبة القيمة المضافة",
      "تقرير الإقرارات الضريبية",
      "تقرير الزكاة",
    ],
  },
  {
    title: "إضافات",
    reports: [
      "المصاريف المقدمة",
      "الأصول الثابتة",
      "الإهلاك المتراكم",
      "تكلفة المبيعات",
    ],
  },
] as const;

export default function AccountingReports() {
  const { t, direction } = useI18n();
  const [search, setSearch] = useState("");

  const sections = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return reportSections;

    return reportSections
      .map((section) => ({
        ...section,
        reports: section.reports.filter((report) =>
          `${report} ${t(report)}`.toLowerCase().includes(query),
        ),
      }))
      .filter((section) => section.reports.length > 0);
  }, [search, t]);

  return (
    <Layout>
      <main dir={direction} className="mx-auto max-w-7xl space-y-6 pb-10">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-700 text-white shadow-sm">
              <BarChart3 className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{t("التقارير")}</h1>
              <p className="mt-1 text-sm text-slate-500">{t("تقارير مالية وتشغيلية شاملة")}</p>
            </div>
          </div>
        </header>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="relative max-w-xl">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("ابحث في التقارير...")}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pe-3 ps-10 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {sections.map((section) => (
            <section key={section.title} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between bg-slate-800 px-4 py-3 text-white">
                <h2 className="text-sm font-bold">{t(section.title)}</h2>
                <FileText className="h-4 w-4 text-slate-300" />
              </div>
              <div className="divide-y divide-slate-100">
                {section.reports.map((report) => (
                  <button
                    key={report}
                    type="button"
                    className="group flex w-full items-center justify-between px-4 py-3 text-start text-sm text-slate-700 transition hover:bg-blue-50 hover:text-blue-700"
                  >
                    <span>{t(report)}</span>
                    <ChevronLeft className="h-4 w-4 text-slate-300 transition group-hover:text-blue-600" />
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>

        {sections.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center text-sm text-slate-500">
            {t("لا توجد تقارير مطابقة")}
          </div>
        ) : null}
      </main>
    </Layout>
  );
}
