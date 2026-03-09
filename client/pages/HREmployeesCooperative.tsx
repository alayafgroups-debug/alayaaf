import Layout from "@/components/Layout";
import { Users } from "lucide-react";
import { PageHeader } from "@/components/SalesPageUI";

export default function HREmployeesCooperative() {
  return (
    <Layout>
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader
          icon={Users}
          title="الموظفون المتعاونون"
          subtitle="قائمة الموظفين المتعاونين والمتعاقدين بصفة تعاون"
          gradient="from-blue-600 to-indigo-700"
        />
        <div className="rounded-xl border border-border bg-card shadow-sm p-12 flex flex-col items-center justify-center gap-4 text-center" dir="rtl">
          <div className="h-16 w-16 rounded-2xl bg-blue-100 flex items-center justify-center">
            <Users className="h-8 w-8 text-blue-600" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">الموظفون المتعاونون</h2>
          <p className="text-sm text-muted-foreground max-w-sm">
            سيتم عرض الموظفين المصنفين كـ"متعاونين" هنا. سيتم توضيح معايير التصنيف لاحقاً.
          </p>
        </div>
      </div>
    </Layout>
  );
}
