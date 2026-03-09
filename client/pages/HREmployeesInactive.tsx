import Layout from "@/components/Layout";
import { UserX } from "lucide-react";
import { PageHeader } from "@/components/SalesPageUI";

export default function HREmployeesInactive() {
  return (
    <Layout>
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader
          icon={UserX}
          title="الموظفون غير الفعالين"
          subtitle="قائمة الموظفين غير الفعالين أو المنتهية خدمتهم"
          gradient="from-slate-600 to-gray-700"
        />
        <div className="rounded-xl border border-border bg-card shadow-sm p-12 flex flex-col items-center justify-center gap-4 text-center" dir="rtl">
          <div className="h-16 w-16 rounded-2xl bg-slate-100 flex items-center justify-center">
            <UserX className="h-8 w-8 text-slate-500" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">الموظفون غير الفعالين</h2>
          <p className="text-sm text-muted-foreground max-w-sm">
            سيتم عرض الموظفين المصنفين كـ"غير فعالين" هنا. سيتم توضيح معايير التصنيف لاحقاً.
          </p>
        </div>
      </div>
    </Layout>
  );
}
