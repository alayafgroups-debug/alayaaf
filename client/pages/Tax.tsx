import Layout from "@/components/Layout";
import { Receipt } from "lucide-react";
import { useLocation } from "react-router-dom";

export default function Tax() {
  const location = useLocation();
  const isTaxReports = location.pathname === "/expenses/tax-reports";

  return (
    <Layout
      subMenu={{
        title: "المحاسبة والمالية",
        items: [
          { label: "شجرة الحسابات", href: "/expenses" },
          { label: "حساب الضرائب", href: "/expenses/tax" },
          { label: "تقارير ضريبية", href: "/expenses/tax-reports" },
        ],
      }}
    >
      <div className="space-y-6" dir="rtl">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            {isTaxReports ? "تقارير ضريبية" : "حساب الضرائب"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {isTaxReports
              ? "عرض وتحليل التقارير الضريبية الشاملة."
              : "إدارة حساب الضرائب وتطبيقها على الفواتير والمعاملات."}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-green-100">
            <Receipt className="h-7 w-7 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            {isTaxReports ? "تقارير ضريبية" : "حساب الضرائب"}
          </h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            {isTaxReports
              ? "سيتم إضافة التقارير الضريبية الشاملة قريباً، بما في ذلك تقارير ضريبة القيمة المضافة والإقرارات الضريبية."
              : "سيتم إضافة نظام حساب الضرائب التلقائي قريباً، بما في ذلك تطبيق الضريبة على الفواتير وإدارة معدلات الضريبة."}
          </p>
        </div>
      </div>
    </Layout>
  );
}
