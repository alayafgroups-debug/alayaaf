import { useEffect, useMemo, useState } from "react";
import { Network } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useI18n } from "@/i18n";
import { employeeErrorText } from "@/components/hr/employeeErrors";
import BulkEmployeeFieldDialog, { type BulkFieldOption, type BulkFieldTarget } from "@/components/hr/BulkEmployeeFieldDialog";

export type SectionTarget = {
  id: string;
  empId: string;
  name: string;
  sectionId: string;
  sectionName: string;
  departmentId: string;
  directorate: string;
  branchId: string;
};

/** عنصر من الهيكل: rawName الاسم كما هو محفوظ (يُكتب في سجل الموظف كما يفعل ملفه)، وname بعد حذف المسافات للعرض والمطابقة */
type OrgRow = { id: string; rawName: string; name: string; nameEn: string; parentId: string; parentName: string; active: boolean };

const INACTIVE_STATUSES = ["غير فعال", "غير نشط", "inactive"];
const toOrgRow = (row: Record<string, unknown>, parentKey: string, parentNameKey = ""): OrgRow => ({
  id: String(row.id ?? ""),
  rawName: String(row.name ?? ""),
  name: String(row.name ?? "").trim(),
  nameEn: String(row.name_en ?? "").trim(),
  parentId: parentKey && row[parentKey] ? String(row[parentKey]) : "",
  parentName: parentNameKey ? String(row[parentNameKey] ?? "").trim() : "",
  // بلا عمود حالة: فعال
  active: !INACTIVE_STATUSES.includes(String(row.status ?? "").trim().toLowerCase()),
});

/**
 * نقل عدة موظفين إلى قسم آخر مرة واحدة (HR-18، من قائمة الموظفين).
 * القسم في الهيكل التنظيمي تابع لإدارة، والإدارة لفرع؛ فيُحفظ مع القسم إدارته وفرعه كما يفعل ملف الموظف:
 * section_id واسمه (department)، وdepartment_id واسمها (directorate)، وbranch_id إن كان للإدارة فرع.
 * تُعرض الأقسام الفعالة التي إدارتها وفرعها فعالان (كما يعرض ملف الموظف)، مجمّعة حسب الإدارة.
 */
export default function BulkSectionDialog({ open, employees, onClose, onDone }: {
  open: boolean;
  employees: SectionTarget[];
  onClose: () => void;
  onDone: () => void;
}) {
  const { t, locale } = useI18n();
  const [sections, setSections] = useState<OrgRow[]>([]);
  const [departments, setDepartments] = useState<OrgRow[]>([]);
  const [branches, setBranches] = useState<OrgRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setLoadError("");
    void (async () => {
      // «*»: الاسم الإنجليزي (name_en) والحالة يُقرآن إن وُجد العمودان
      const [sectionResult, departmentResult, branchResult] = await Promise.all([
        supabase.from("org_sections").select("*").order("name"),
        supabase.from("departments").select("*").order("name"),
        supabase.from("branches").select("*").order("name"),
      ]);
      if (cancelled) return;
      const error = sectionResult.error ?? departmentResult.error ?? branchResult.error;
      if (error) {
        setLoadError(employeeErrorText(error, "تعذر تحميل الأقسام"));
        setSections([]);
      } else {
        setSections((sectionResult.data ?? []).map((row) => toOrgRow(row as Record<string, unknown>, "department_id", "department")).filter((row) => row.id && row.name));
        setDepartments((departmentResult.data ?? []).map((row) => toOrgRow(row as Record<string, unknown>, "branch_id")).filter((row) => row.id));
        setBranches((branchResult.data ?? []).map((row) => toOrgRow(row as Record<string, unknown>, "")).filter((row) => row.id));
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [open]);

  const options = useMemo<BulkFieldOption[]>(() => {
    // الاسم بلغة الواجهة: الإنجليزي المحفوظ إن وُجد، وإلا الترجمة
    const display = (row: OrgRow) => (locale === "en" ? row.nameEn || t(row.name) : row.name);
    const departmentById = new Map(departments.map((row) => [row.id, row]));
    const branchById = new Map(branches.map((row) => [row.id, row]));
    const built = sections
      .map((section) => {
        const department = section.parentId ? departmentById.get(section.parentId) : undefined;
        const branch = department?.parentId ? branchById.get(department.parentId) : undefined;
        return { section, department, branch };
      })
      // كملف الموظف: لا يُختار قسم أو إدارة أو فرع غير فعال
      .filter(({ section, department, branch }) => section.active && (!department || department.active) && (!branch || branch.active));
    // إدارتان بالاسم نفسه في فرعين: يُضاف اسم الفرع لتمييزهما
    const nameCounts = new Map<string, number>();
    new Map(built.filter((item) => item.department).map((item) => [item.department!.id, item.department!])).forEach((department) => {
      const name = display(department);
      nameCounts.set(name, (nameCounts.get(name) ?? 0) + 1);
    });
    return built
      .map(({ section, department, branch }) => {
        const departmentLabel = department
          ? display(department) + ((nameCounts.get(display(department)) ?? 0) > 1 && branch ? ` (${display(branch)})` : "")
          : section.parentName ? (locale === "en" ? t(section.parentName) : section.parentName) : "";
        const patch: Record<string, unknown> = {
          section_id: section.id,
          department: section.rawName,
          department_id: section.parentId || null,
          directorate: department?.rawName ?? section.parentName,
        };
        if (branch) patch.branch_id = branch.id;
        return {
          value: section.id,
          label: display(section),
          group: departmentLabel || t("بلا إدارة"),
          groupKey: section.parentId || "__none__",
          detail: `${t("الإدارة")}: ${departmentLabel || t("بلا إدارة")} — ${t("الفرع")}: ${branch ? display(branch) : t("دون تغيير")}`,
          warning: section.parentId ? undefined : t("هذا القسم غير تابع لإدارة في الهيكل التنظيمي: ستُفرَّغ إدارة المنقولين، فلا يظهرون في تصفية الإدارات وكشوفها. اربط القسم بإدارة من الهيكل التنظيمي أولًا إن لم يكن هذا المقصود."),
          patch,
        };
      })
      .sort((a, b) => a.group.localeCompare(b.group, locale) || a.label.localeCompare(b.label, locale));
  }, [sections, departments, branches, locale, t]);

  const targets = useMemo<BulkFieldTarget[]>(() => {
    const display = (row: OrgRow) => (locale === "en" ? row.nameEn || t(row.name) : row.name);
    const sectionById = new Map(sections.map((row) => [row.id, row]));
    const sectionByName = new Map(sections.map((row) => [row.name, row]));
    return employees.map((employee) => {
      // القسم بالمعرّف، وإلا بالاسم المحفوظ نصًا
      const section = sectionById.get(employee.sectionId) ?? sectionByName.get(employee.sectionName.trim());
      const currentLabel = section
        ? display(section)
        : employee.sectionName.trim() ? (locale === "en" ? t(employee.sectionName.trim()) : employee.sectionName.trim()) : t("بلا قسم");
      return {
        id: employee.id,
        empId: employee.empId,
        name: employee.name,
        current: employee.sectionId,
        currentLabel,
        // «في القسم أصلًا» فقط إن طابقت الإدارة والفرع أيضًا؛ وإلا يُصحَّح سجله
        currentPatch: {
          section_id: employee.sectionId,
          department: employee.sectionName,
          department_id: employee.departmentId,
          directorate: employee.directorate,
          branch_id: employee.branchId,
        },
      };
    });
  }, [employees, sections, locale, t]);

  return (
    <BulkEmployeeFieldDialog
      open={open}
      icon={<Network className="h-5 w-5" />}
      title="تغيير القسم للمحددين"
      selectLabel="القسم الجديد"
      choosePlaceholder="اختر القسم"
      currentHeading="أقسام المحددين الحالية"
      willChangeLabel="عدد من سينتقلون"
      sameLabel="في هذا القسم أصلًا"
      changedLabel="عدد من انتقلوا"
      actionLabel="نقل إلى القسم"
      note="ينتقل المحددون إلى القسم المختار مع إدارته وفرعه كما في الهيكل التنظيمي. الراتب الأساسي وجدول الدوام لا يتغيران، لكن العطل الرسمية الخاصة بفرع أو إدارة أو قسم تتبع المكان الجديد في الأشهر غير المعتمدة رواتبها (أعد حسابها)، والكشوف والتقارير تتبع القسم الجديد، وتغيّر الفرع يغيّر ما يراه الموظف من بيانات الفروع."
      targets={targets}
      options={options}
      loading={loading}
      loadError={loadError}
      onClose={onClose}
      onDone={onDone}
    />
  );
}
