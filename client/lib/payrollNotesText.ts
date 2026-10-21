import { currentLocale, translateText } from "@/i18n";

/**
 * ملاحظات صف الرواتب بلغة الواجهة (HR-15).
 * الملاحظات تُحفظ بالعربية عند الحساب (payrollLineNotes في payrollCalc) بأجزاء مفصولة بـ " - ".
 * في الواجهة الإنجليزية يُترجم كل جزء معروف الصيغة، وما لا تُعرف صيغته يُترجم بالقاموس أو يبقى كما هو.
 * لا يغيّر شيئًا في العربية ولا في المحفوظ.
 */
const N = "([0-9][0-9.,]*)";

const PATTERNS: Array<[RegExp, (match: RegExpMatchArray) => string]> = [
  [new RegExp(`^أيام العمل ${N}$`), (m) => `Work days ${m[1]}`],
  [new RegExp(`^حضور ${N}$`), (m) => `Present ${m[1]}`],
  [new RegExp(`^غياب ${N}$`), (m) => `Absent ${m[1]}`],
  [new RegExp(`^خصم الغياب ${N}$`), (m) => `Absence deduction ${m[1]}`],
  [new RegExp(`^أيام بلا تسجيل ${N} \\(لم تُخصم\\)$`), (m) => `Unrecorded days ${m[1]} (not deducted)`],
  [new RegExp(`^إجازة ${N}$`), (m) => `Leave ${m[1]}`],
  [new RegExp(`^إجازة بدون راتب أو بأجر ناقص ${N} يوم \\(خصم ${N}\\)$`), (m) => `Unpaid or partially paid leave ${m[1]} days (deduction ${m[2]})`],
  [/^لم يعمل أي يوم في الفترة: خُصم أجرها كاملًا$/, () => "Did not work any day in the period: the full wage was deducted"],
  [new RegExp(`^حصة الموظف في التأمينات ${N} تتحملها المنشأة لعدم وجود أجر$`), (m) => `Employee GOSI share ${m[1]} is borne by the company (no wage)`],
  [new RegExp(`^قبل التعيين ${N} يوم \\(المستحق ${N} أساسي \\+ ${N} بدلات من ${N} \\+ ${N}\\)$`), (m) => `Before hire ${m[1]} days (due ${m[2]} basic + ${m[3]} allowances of ${m[4]} + ${m[5]})`],
  [new RegExp(`^جزاءات ${N}$`), (m) => `Penalties ${m[1]}`],
  [new RegExp(`^جزاءات متبقية تُخصم في الأشهر التالية ${N} \\(لا يُخصم في الشهر أكثر من أجر 5 أيام ${N} — المادة 72\\)$`), (m) => `Remaining penalties deducted in the following months ${m[1]} (no more than 5 days' wage ${m[2]} per month — Article 72)`],
  [new RegExp(`^سلف ${N}$`), (m) => `Advances ${m[1]}`],
  [new RegExp(`^لم يُخصم من قسط السلف ${N}؛ يبقى في رصيد السلفة ويمتد السداد$`), (m) => `Not deducted from the advance installment ${m[1]}; it stays in the advance balance and repayment is extended`],
  [new RegExp(`^اقتطاعات شهرية ${N}(?: \\((.*)\\))?$`), (m) => `Monthly deductions ${m[1]}${m[2] ? ` (${m[2].split("، ").map((label) => translateText(label)).join(", ")})` : ""}`],
  [new RegExp(`^لم يُخصم من الاقتطاعات الشهرية ${N}$`), (m) => `Not deducted from monthly deductions ${m[1]}`],
  [new RegExp(`^خُفّضت السلف والاقتطاعات والجزاءات ${N} حتى لا يتجاوز المحسوم نصف الأجر المستحق \\(المادة 93: ${N}\\)$`), (m) => `Advances, deductions and penalties reduced by ${m[1]} so deductions do not exceed half the due wage (Article 93: ${m[2]})`],
  [new RegExp(`^بدلات مخصومة ${N}$`), (m) => `Deducted allowances ${m[1]}`],
  [new RegExp(`^إضافي ${N}$`), (m) => `Overtime ${m[1]}`],
  [new RegExp(`^خُفّضت الاستقطاعات ${N} حتى لا يكون الصافي سالبًا$`), (m) => `Deductions reduced by ${m[1]} so the net is not negative`],
];

const localizePart = (part: string) => {
  const clean = part.trim();
  for (const [pattern, render] of PATTERNS) {
    const match = clean.match(pattern);
    if (match) return render(match);
  }
  return translateText(clean);
};

export const localizePayrollNotes = (notes: string): string => {
  if (!notes || currentLocale() !== "en") return notes;
  return notes.split(" - ").map(localizePart).join(" - ");
};
