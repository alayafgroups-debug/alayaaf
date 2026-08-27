import PlaceholderModule from "@/components/PlaceholderModule";
import { ShoppingCart } from "lucide-react";

export const purchasesFeatures = [
  { label: "فواتير المشتريات", href: "/purchases/invoices" },
  { label: "مصروفات نقدية", href: "/purchases/cash-expenses" },
  { label: "إشعارات مدينة", href: "/purchases/debit-notes" },
  { label: "إشعارات دائنة", href: "/purchases/credit-notes" },
  { label: "أوامر الشراء", href: "/purchases/orders" },
  { label: "تقارير المشتريات الشاملة", href: "/purchases/reports" },
];

export default function Purchases() {
  return (
    <PlaceholderModule
      title="إدارة المشتريات"
      description="نظام شامل لإدارة جميع عمليات الشراء والتعاملات مع الموردين، مع تقارير تفصيلية وتتبع العمليات"
      icon={ShoppingCart}
      features={purchasesFeatures}
    />
  );
}
