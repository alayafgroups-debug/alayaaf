import { supabase } from "@/lib/supabaseClient";

/**
 * أسماء الهيكل والمسميات بالإنجليزية (HR-15): الاسم العربي ← name_en من الفروع والإدارات والأقسام ومواقع العمل والمسميات.
 * بيانات الموظف تحفظ هذه الأسماء نصًا عربيًا، فتُعرض وتُصدَّر بالإنجليزية في الواجهة الإنجليزية متى وُجد name_en.
 * الجدول أو العمود غير الموجود أو غير المسموح بقراءته يُتجاهل.
 */
const ORG_TABLES = ["branches", "departments", "org_sections", "hr_work_locations", "hr_jobs"] as const;

export async function loadOrgEnglishNames(): Promise<Map<string, string>> {
  const results = await Promise.all(ORG_TABLES.map((table) => supabase.from(table).select("*")));
  const names = new Map<string, string>();
  results.forEach(({ data }) => {
    ((data ?? []) as Record<string, unknown>[]).forEach((item) => {
      const arabic = String(item.name ?? "").trim();
      const english = String(item.name_en ?? "").trim();
      if (arabic && english && !names.has(arabic)) names.set(arabic, english);
    });
  });
  return names;
}
