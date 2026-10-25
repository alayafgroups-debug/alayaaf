import { useI18n } from "@/i18n";
import { COMPANY_PRINT_LOGO, VISION_2030_LOGO } from "@/lib/printBranding";

/**
 * ترويسة الطباعة لصفحات تُطبع بـ window.print (HR-19): مخفية على الشاشة، وتظهر في الطباعة فقط داخل منطقة الطباعة.
 * شعار الشركة في بداية السطر، والعنوان (إن وُجد) في الوسط، وشعار رؤية 2030 في نهايته.
 */
export default function PrintBrandHeader({ title, className = "" }: { title?: string; className?: string }) {
  const { t } = useI18n();
  return (
    // السمة hidden (لا الصنف وحده): مسافات space-y على الشاشة تتجاهلها؛ وفي الطباعة يُظهرها print:flex
    <div hidden className={`hidden items-center justify-between gap-4 bg-white pb-3 print:flex ${className}`}>
      <img src={COMPANY_PRINT_LOGO} alt={t("شعار الشركة")} className="h-16 w-auto max-w-[130px] object-contain" />
      <div className="min-w-0 flex-1 text-center text-lg font-bold text-black">{title ?? ""}</div>
      <img src={VISION_2030_LOGO} alt={t("رؤية المملكة 2030")} className="h-14 w-auto max-w-[100px] object-contain" />
    </div>
  );
}
