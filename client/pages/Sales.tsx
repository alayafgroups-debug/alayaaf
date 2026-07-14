import PlaceholderModule from "@/components/PlaceholderModule";
import { FileText } from "lucide-react";

export const salesFeatures = [
  { label: "عروض الأسعار", href: "/sales/quotations" },
  { label: "أوامر البيع", href: "/sales/orders" },
  { label: "فواتير المبيعات", href: "/sales/invoices" },
  { label: "إشعار دائن", href: "/sales/credit-note" },
  { label: "إشعار تسليم", href: "/sales/delivery-note" },
  { label: "سندات القبض والصرف", href: "/expenses/petty-cash" },
  { label: "تقارير المبيعات المتقدمة" },
  { label: "تتبع الحالة والتنبيهات" },
];

export default function Sales() {
  return (
    <PlaceholderModule
      title="إدارة المبيعات"
      description="نظام متكامل لإدارة عمليات البيع من العرض إلى الفاتورة النهائية، مع التوافق الكامل مع معايير ZATCA للفوترة الإلكترونية"
      icon={FileText}
      features={salesFeatures}
    />
  );
}
