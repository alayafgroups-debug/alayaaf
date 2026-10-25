/**
 * طريقة صرف راتب الموظف (HR-17): عمود employees.salary_payment_method كما في سمارت.
 * القيم محفوظة بالعربية وتُعرض بلغة الواجهة؛ الفارغ = غير محدد.
 * ترتيب كشف الرواتب كترتيب سمارت: نقدي، ثم مدد، ثم تحويل بنكي، ثم شيك، ثم غير المحدد.
 */
export const SALARY_PAYMENT_METHODS = ["نقدي", "مدد", "تحويل بنكي", "شيك"] as const;

export const UNSPECIFIED_PAYMENT_METHOD = "غير محدد";

export const paymentMethodOf = (value: unknown) => {
  const text = String(value ?? "").trim();
  return (SALARY_PAYMENT_METHODS as readonly string[]).includes(text) ? text : "";
};

export const paymentMethodRank = (value: string) => {
  const index = (SALARY_PAYMENT_METHODS as readonly string[]).indexOf(value);
  return index === -1 ? SALARY_PAYMENT_METHODS.length : index;
};
