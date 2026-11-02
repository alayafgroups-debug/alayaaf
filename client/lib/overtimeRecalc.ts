import { supabase } from "@/lib/supabaseClient";

export type OvertimeSync = { updated: number; warning: string };

// مفتاح ترجمة: يُعرض بـ t() في الصفحة
export const OVERTIME_SYNC_WARNING = "تعذر إعادة حساب قيمة الإضافي على جدول وراتب كل موظف الآن؛ قد يكون بعض الإضافي في الكشف على جدول أو راتب قديم";

/**
 * HR-27 (كسمارت): قبل حساب كشف الرواتب يُعاد حساب قيمة إضافي الشهر على جدول وراتب كل موظف الآن،
 * فلا يدخل الكشف مبلغ حُسب على جدول أو راتب قديم (مثلًا شهر فُتح من جديد بعد حذف طلب اعتماد).
 * - قبل تحديث HR-27، أو لمستخدم لا يدير الحضور ولا الرواتب: لا تحذير، ويُحسب الكشف على المبالغ المحفوظة كما كان.
 * - إن لم تكتمل في المرة الواحدة (سجلات كثيرة) تُعاد حتى تكتمل (attempts مرات على الأكثر).
 * - أي خطأ آخر: يعود warning ليعرضه الكشف، ويمنع الإرسال.
 * لا يُمس الشهر المقفل. updated = عدد ما تغيّر مبلغه.
 */
export async function syncOvertimeAmounts(period: string, attempts = 3): Promise<OvertimeSync> {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(String(period ?? ""))) return { updated: 0, warning: "" };
  let updated = 0;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const { data, error } = await supabase.rpc("recalc_overtime_amounts", { p_month: period });
      if (error) {
        const code = String((error as { code?: string }).code ?? "");
        const message = String((error as { message?: string }).message ?? "");
        if (["PGRST202", "42883"].includes(code) || message.includes("OVERTIME_RECALC_NOT_ALLOWED")) return { updated, warning: "" };
        return { updated, warning: OVERTIME_SYNC_WARNING };
      }
      const result = (data ?? {}) as { updated?: number; incomplete?: boolean };
      updated += Number(result.updated) || 0;
      if (!result.incomplete) return { updated, warning: "" };
    } catch {
      return { updated, warning: OVERTIME_SYNC_WARNING };
    }
  }
  return { updated, warning: OVERTIME_SYNC_WARNING };
}
