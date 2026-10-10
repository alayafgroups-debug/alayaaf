// رسائل عربية لرموز أخطاء قاعدة البيانات في الموارد البشرية (الطلبات والإجازات والأدوار)
const HR_ERROR_MESSAGES: Record<string, string> = {
  REQUEST_SENDER_MISMATCH: "لا يمكنك إرسال طلب باسم موظف آخر",
  REQUEST_EMPLOYEE_REQUIRED: "حدد الموظف صاحب الطلب",
  REQUEST_EMPLOYEE_NOT_FOUND: "الرقم الوظيفي غير موجود",
  REQUEST_PAYROLL_NOT_ALLOWED: "طلب اعتماد الرواتب يتطلب صلاحية إدارة الرواتب",
  REQUEST_FIELDS_LOCKED: "يمكن تغيير القرار والملاحظة فقط؛ بيانات الطلب لا تُعدَّل",
  REQUEST_ALREADY_DECIDED: "صدر قرار في هذا الطلب مسبقًا",
  REQUEST_INVALID_STATUS: "حالة القرار غير صحيحة",
  REQUEST_SELF_DECISION: "لا يمكنك اتخاذ قرار في طلب يخصك أو أرسلته أنت",
  PAYROLL_NOTHING_TO_APPROVE: "كل رواتب هذا الشهر للموظفين المحددين معتمدة أو مرحّلة مسبقًا",
  PAYROLL_POSTED_LOCKED: "رواتب الشهر مرحّلة محاسبيًا ولا تُعدَّل",
  PAYROLL_INPUTS_INCOMPLETE: "تعذر تحميل بعض بيانات الحساب (إعدادات الراتب أو جداول الدوام أو العطل أو الإجازات)؛ لم يُحفظ ولم يُرسل شيء. أعد المحاولة",
  PAYROLL_ROWS_CHANGED: "أنشأ مستخدم آخر صفوف رواتب هذا الشهر في اللحظة نفسها؛ أعد فتح الكشف وحاول مرة أخرى",
  PAYROLL_PENDING_OTHER_SENDER: "بعض الموظفين المحددين ضمن طلب اعتماد معلق أرسله مستخدم آخر لهذا الشهر؛ انتظر قرار الإدارة أو اطلب منه سحب طلبه أولًا",
  PAYROLL_ROWS_NOT_APPROVED: "رواتب في هذا الشهر لا تطابق ما وافقت عليه الإدارة (لم تدخل طلبًا موافقًا عليه، أو في طلب معلق، أو تغيّر مبلغها بعد الموافقة)؛ أعد إرسالها للاعتماد ثم رحّل",
  PAYROLL_PERIOD_ALREADY_POSTED_NEW_ROWS: "الشهر مرحّل مسبقًا وأُضيفت إليه رواتب بعد الترحيل؛ لا تُرحَّل بقيد الشهر (احذفها وأضفها في الشهر التالي أو بقيد تسوية)",
  PAYROLL_PERIOD_ALREADY_POSTED: "الشهر مرحّل محاسبيًا؛ لا تُضاف إليه رواتب جديدة (أضفها في الشهر التالي أو بقيد تسوية)",
  PAYROLL_PERIOD_NOTHING_EARNED: "لا مصروف رواتب مستحق في هذا الشهر (لم يُستحق أي أجر)؛ لا يوجد ما يُرحَّل",
  PAYROLL_HOLD_NOT_RELEASABLE: "الراتب ليس موقوف الصرف بعد الترحيل؛ لا يوجد إيقاف يُرفع",
  PAYROLL_ROW_NOT_FOUND: "صف الراتب غير موجود",
  PAYROLL_PERIOD_REQUIRES_APPROVAL: "لا يُرحَّل الشهر قبل اعتماد كل رواتبه (المعلق والمرفوض يمنعان الترحيل)",
  PAYROLL_ACCOUNT_IS_VAT_ACCOUNT: "أحد حسابات الرواتب مضبوط على حساب ضريبة القيمة المضافة؛ صحّحه من إعدادات الحسابات قبل الترحيل",
  PAYROLL_ACCOUNT_CLASS_INVALID: "حسابات الرواتب غير صحيحة النوع (المصروف من 5، الالتزامات من 2، سلف الموظفين من 1)",
  PAYROLL_PERIOD_AMOUNTS_INVALID: "في كشف الشهر صفوف بمبالغ غير صحيحة؛ أعد إرسال الكشف من صفحة كشف الرواتب",
  PAYROLL_PERIOD_TOTALS_NOT_BALANCED: "مجاميع كشف الشهر غير متوازنة؛ أعد إرسال الكشف من صفحة كشف الرواتب",
  PAYROLL_PERIOD_EMPTY: "لا توجد رواتب محفوظة لهذا الشهر",
  PAYROLL_POSTING_RULE_NOT_FOUND: "قاعدة الترحيل المحاسبي غير مضبوطة",
  PAYROLL_MANAGE_PERMISSION_REQUIRED: "الترحيل يتطلب صلاحية إدارة الرواتب",
  ACCOUNTING_MANAGE_PERMISSION_REQUIRED: "الترحيل يتطلب صلاحية إدارة المحاسبة",
  ACCOUNTING_FISCAL_PERIOD_REQUIRED: "لا توجد فترة مالية تشمل نهاية هذا الشهر",
  ACCOUNTING_FISCAL_PERIOD_CLOSED: "الفترة المالية لهذا الشهر مقفلة",
  POSTED_PAYROLL_IMMUTABLE: "الراتب مرحّل محاسبيًا ولا يُعدَّل",
  PAYROLL_PREVIOUS_REQUEST_LOCKED: "تعذر سحب طلبك المعلق السابق لهذا الشهر؛ لم تُغيَّر الأرقام. أعد فتح الصفحة وحاول مرة أخرى",
  PAYROLL_SESSION_MISSING: "انتهت جلسة الدخول؛ سجّل الدخول من جديد ثم أعد الإرسال",
  ROLE_IN_USE: "الدور مستخدم لموظفين أو مستخدمين خاصين؛ انقلهم إلى دور آخر قبل حذفه",
  ROLE_IN_USE_RENAME: "الدور مستخدم؛ لا يُعاد تسميته. أنشئ دورًا جديدًا وانقل إليه الموظفين",
  ROLE_PERMISSION_ABOVE_CALLER: "لا يمكنك منح صلاحية أعلى من صلاحياتك",
  CANNOT_MODIFY_OWN_ROLE: "لا يمكنك تعديل الدور الذي تحمله",
  SYSTEM_ADMIN_ROLE_PROTECTED: "دور مدير النظام محمي",
  ORG_ITEM_IN_USE: "العنصر مرتبط بموظفين أو بأقسام؛ انقلهم إلى عنصر آخر قبل حذفه",
  ORG_ITEM_NAME_TAKEN: "الاسم مستخدم لعنصر آخر؛ تغيير الاسم إليه يدمج موظفي العنصرين. اختر اسمًا مختلفًا",
  ORG_ITEM_NAME_REQUIRED: "الاسم مطلوب",
  PENALTY_PAYROLL_LOCKED: "رواتب هذا الشهر معتمدة أو مرحّلة؛ لا يُحذف جزاء خُصم منها ولا يُعدَّل",
  APPROVAL_CHAIN_ACTIVE_EXISTS: "توجد سلسلة موافقات فعالة لهذا النوع؛ عطّلها أولًا",
};

export const hrRequestErrorText = (error: unknown, fallback = "حدث خطأ غير متوقع") => {
  const err = error as { message?: string; code?: string; details?: string } | null;
  const text = `${err?.message ?? ""} ${err?.details ?? ""}`;
  // الأطول أولًا حتى لا يطابق ROLE_IN_USE رسالة ROLE_IN_USE_RENAME
  const key = Object.keys(HR_ERROR_MESSAGES).sort((a, b) => b.length - a.length).find((code) => text.includes(code));
  if (key) return HR_ERROR_MESSAGES[key];
  if (err?.code === "23505") return "الاسم مستخدم مسبقًا";
  if (err?.code === "42501") return "ليست لديك صلاحية لهذه العملية";
  if (err?.code === "PGRST116") return "لم يُحفظ شيء: لا تملك صلاحية هذه العملية على هذا السجل";
  if (/failed to fetch|network/i.test(text)) return "تعذر الاتصال بالخادم؛ تحقق من الإنترنت ثم أعد المحاولة";
  return err?.message || fallback;
};

// الخطأ نفسه يُمرَّر (لا رسالته فقط) حتى لا يضيع رمزه مثل 42501 أو 23505
export const payrollApprovalErrorText = (error: unknown) => hrRequestErrorText(error, "حدث خطأ غير متوقع");
