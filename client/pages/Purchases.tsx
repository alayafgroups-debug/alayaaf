import PlaceholderModule from "@/components/PlaceholderModule";
import { ShoppingCart } from "lucide-react";

export const purchasesFeatures = [
  { label: "طلبات الشراء", href: "/purchases/requests" },
  { label: "أوامر الشراء", href: "/purchases/orders" },
  { label: "سندات الاستلام", href: "/purchases/receipts" },
  { label: "فواتير المشتريات", href: "/purchases/invoices" },
  { label: "مردودات المشتريات" },
  { label: "تقارير المشتريات الشاملة" },
  { label: "إدارة الموردين والعروض" },
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
