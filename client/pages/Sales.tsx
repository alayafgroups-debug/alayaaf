import PlaceholderModule from "@/components/PlaceholderModule";
import { FileText } from "lucide-react";

export default function Sales() {
  const features = [
    "عروض الأسعار (Quotations)",
    "أوامر البيع (Sales Orders)",
    "فواتير المبيعات (Sales Invoices) - متوافقة مع ZATCA",
    "سندات التسليم (Delivery Notes)",
    "مردودات المبيعات (Sales Returns)",
    "تقارير المبيعات المتقدمة",
    "تتبع الحالة والتنبيهات",
  ];

  return (
    <PlaceholderModule
      title="إدارة المبيعات"
      description="نظام متكامل لإدارة عمليات البيع من العرض إلى الفاتورة النهائية، مع التوافق الكامل مع معايير ZATCA للفوترة الإلكترونية"
      icon={FileText}
      features={features}
    />
  );
}
