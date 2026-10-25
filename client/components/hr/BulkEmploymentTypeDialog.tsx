import { useMemo } from "react";
import { UserCog } from "lucide-react";
import { useI18n } from "@/i18n";
import { EMPLOYMENT_TYPES } from "@/pages/EmployeeForm";
import BulkEmployeeFieldDialog, { type BulkFieldOption, type BulkFieldTarget } from "@/components/hr/BulkEmployeeFieldDialog";

export type EmploymentTypeTarget = { id: string; empId: string; name: string; employmentType: string };

/**
 * تغيير نوع التوظيف لعدة موظفين مرة واحدة (HR-18، من قائمة الموظفين): أساسي، جزئي، عقد، متعاون.
 * لا يغيّر الراتب ولا الحضور؛ «متعاون» يُظهر الموظف أيضًا في صفحة الموظفين المتعاونين.
 */
export default function BulkEmploymentTypeDialog({ open, employees, onClose, onDone }: {
  open: boolean;
  employees: EmploymentTypeTarget[];
  onClose: () => void;
  onDone: () => void;
}) {
  const { t } = useI18n();

  const options = useMemo<BulkFieldOption[]>(
    () => EMPLOYMENT_TYPES.map((type) => ({ value: type, label: t(type), patch: { employment_type: type } })),
    [t],
  );

  const targets = useMemo<BulkFieldTarget[]>(
    () => employees.map((employee) => {
      const current = employee.employmentType.trim();
      return { id: employee.id, empId: employee.empId, name: employee.name, current, currentLabel: current ? t(current) : t("غير محدد") };
    }),
    [employees, t],
  );

  return (
    <BulkEmployeeFieldDialog
      open={open}
      icon={<UserCog className="h-5 w-5" />}
      title="تغيير نوع التوظيف للمحددين"
      selectLabel="نوع التوظيف الجديد"
      choosePlaceholder="اختر نوع التوظيف"
      currentHeading="أنواع توظيف المحددين الحالية"
      willChangeLabel="عدد من سيتغير نوعهم"
      sameLabel="على هذا النوع أصلًا"
      changedLabel="عدد من تغيّر نوعهم"
      actionLabel="تغيير النوع"
      note="نوع التوظيف لا يغيّر الراتب ولا الحضور. من يصير «متعاون» يظهر أيضًا في صفحة «الموظفون المتعاونون»، ومن يُنقل منه يختفي منها."
      targets={targets}
      options={options}
      onClose={onClose}
      onDone={onDone}
    />
  );
}
