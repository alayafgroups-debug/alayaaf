/**
 * أرقام إنجليزية فيما يكتبه المستخدم (HR-16).
 * الأرقام العربية-الهندية (٠-٩ و۰-۹) وفاصلتاها (٫ ٬) والنسبة (٪) تتحول فور كتابتها في حقول النص إلى 0-9 و. , %.
 * فيُحفظ ويُبحث ويُتحقق بما يظهر على الشاشة: خط «Alayaaf Latin Digits» يعرضها بأشكال إنجليزية، فبدون هذا
 * يرفض التحقق (مثل الرقم الضريبي) قيمة تبدو صحيحة.
 * يعمل في مرحلة الالتقاط قبل React، ويضع القيمة بالمُعيِّن الأصلي حتى يرى React التغيير ويستدعي onChange بالقيمة المحوّلة.
 * لا يمس حقول كلمة المرور ولا حقول الأرقام والتواريخ (لها لوحة إدخالها).
 */
const ARABIC_DIGIT_CHARS = /[٠-٬۰-۹]/;
const TEXT_INPUT_TYPES = new Set(["text", "search", "tel", "email", "url"]);

export const toLatinDigits = (value: string) => value
  .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660))
  .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 0x06F0))
  .replace(/٫/g, ".")
  .replace(/٬/g, ",")
  .replace(/٪/g, "%");

const nativeValueSetter = (field: HTMLInputElement | HTMLTextAreaElement) => {
  const prototype = field instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  return Object.getOwnPropertyDescriptor(prototype, "value")?.set;
};

const normalizeField = (event: Event) => {
  if ((event as InputEvent).isComposing) return;
  const target = event.target;
  let field: HTMLInputElement | HTMLTextAreaElement | null = null;
  if (target instanceof HTMLTextAreaElement) field = target;
  else if (target instanceof HTMLInputElement && TEXT_INPUT_TYPES.has(target.type)) field = target;
  if (!field || !ARABIC_DIGIT_CHARS.test(field.value)) return;
  const setter = nativeValueSetter(field);
  if (!setter) return;
  let start: number | null = null;
  let end: number | null = null;
  try { start = field.selectionStart; end = field.selectionEnd; } catch { /* نوع حقل بلا تحديد */ }
  // التحويل حرف بحرف، فموضع المؤشر لا يتغير
  setter.call(field, toLatinDigits(field.value));
  if (start !== null && end !== null) {
    try { field.setSelectionRange(start, end); } catch { /* نوع حقل بلا تحديد */ }
  }
};

export function installLatinDigitsInput() {
  if (typeof window === "undefined") return;
  const flag = window as unknown as { __alayaafLatinDigitsInput?: boolean };
  if (flag.__alayaafLatinDigitsInput) return;
  flag.__alayaafLatinDigitsInput = true;
  window.addEventListener("input", normalizeField, true);
}
