import { useEffect, useState } from "react";
import { AlertTriangle, Loader2, UserCheck } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useI18n } from "@/i18n";

type Preview = { approver_name: string | null; source: string; has_account: boolean };

const SOURCE_LABELS: Record<string, string> = {
  direct_manager: "المدير المباشر",
  approver: "المعتمد المحدد",
  payroll_chain: "سلسلة موافقات الرواتب",
};

/**
 * لمن سيُرسل الطلب قبل إرساله: نفس قاعدة قاعدة البيانات عند الإرسال (request_approver_preview).
 * كل الطلبات عدا اعتماد الرواتب تذهب إلى المدير المباشر لمقدم الطلب.
 */
export default function ApproverPreview({ kind, empId, approverId }: { kind: "request" | "leave" | "payroll"; empId?: string; approverId?: string }) {
  const { t } = useI18n();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void supabase
      .rpc("request_approver_preview", { p_kind: kind, p_emp_id: empId || null, p_approver_id: approverId || null })
      .then(({ data, error }) => {
        if (cancelled) return;
        setLoading(false);
        if (error || !data) {
          // الدالة غير مثبتة بعد أو لا صلاحية: لا نعرض شيئًا بدل معلومة خاطئة
          setUnavailable(true);
          return;
        }
        setUnavailable(false);
        setPreview(data as Preview);
      });
    return () => { cancelled = true; };
  }, [kind, empId, approverId]);

  if (unavailable) return null;
  if (loading) {
    return <p className="flex items-center gap-2 text-xs text-gray-500"><Loader2 className="h-3.5 w-3.5 animate-spin" />{t("جارٍ تحديد المعتمد...")}</p>;
  }
  if (!preview) return null;

  const name = String(preview.approver_name ?? "").trim();
  const sourceLabel = t(SOURCE_LABELS[preview.source] ?? preview.source);
  if (name && preview.has_account) {
    return (
      <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">
        <UserCheck className="mt-0.5 h-4 w-4 shrink-0" />
        <p>{t("سيُرسل الطلب للاعتماد إلى")}: <strong>{name}</strong> ({sourceLabel})</p>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <p>
        {name
          ? `${t("المعتمد")} (${sourceLabel}): ${name} — ${t("ليس له حساب دخول بنفس بريده في ملفه، فلن يصل الطلب لأحد. راجع الموارد البشرية لتصحيح البريد أو المدير المباشر.")}`
          : `${t("لا يوجد")} ${sourceLabel} ${t("في ملفك، فلن يصل الطلب لأحد. راجع الموارد البشرية لتحديده.")}`}
      </p>
    </div>
  );
}
