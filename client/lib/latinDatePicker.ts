import { currentLocale, translateText } from "@/i18n";

/**
 * لوحة اختيار التاريخ بأرقام إنجليزية (HR-21).
 * لوحة التقويم الأصلية لحقل التاريخ يرسمها المتصفح بلغة جهاز المستخدم (أرقام عربية وأشهر عربية على
 * Chrome العربي) مهما كانت لغة الصفحة، ولا يغيّرها CSS ولا السمة lang. فتُفتح بدلها هذه اللوحة لكل
 * <input type="date"> و<input type="month"> في النظام: أرقام إنجليزية دائمًا، وأسماء الأشهر والأيام بلغة الواجهة.
 * الحقل نفسه يبقى كما هو (القيمة YYYY-MM-DD أو YYYY-MM، والكتابة فيه، وmin/max)، وأرقامه تُرسم إنجليزية بخط
 * «Alayaaf Latin Digits» (global.css). الاختيار يضع القيمة بالمُعيِّن الأصلي ويطلق input وchange، فيستدعي React onChange.
 * صفحات الفاتورة الضريبية وإشعار الدائن وإعدادات الهيئة تبقى بلوحة المتصفح (منطقة محمية).
 * لإبقاء لوحة المتصفح لحقل بعينه: data-native-picker على الحقل أو أحد آبائه.
 * على iPhone وiPad تبقى لوحة الجهاز: iOS يفتحها عند التركيز ولا يمكن منعها بأمان.
 */

const PROTECTED_PATHS = ["/sales/invoices", "/sales/credit-note", "/zatca/settings"];
const SUPPORTED_TYPES = new Set(["date", "month"]);
const POPUP_CLASS = "alf-date-picker";
const WEEK_START = 0; // الأحد

type Kind = "date" | "month";
type State = { input: HTMLInputElement; kind: Kind; year: number; month: number; popup: HTMLDivElement; path: string; watch: number };

let state: State | null = null;
const MIN_YEAR = 1900;
const MAX_YEAR = 2100;

const t = (text: string) => translateText(text);
const english = () => currentLocale() === "en";
const pad = (value: number) => String(value).padStart(2, "0");
const dateValue = (year: number, month: number, day: number) => `${year}-${pad(month + 1)}-${pad(day)}`;
const monthValue = (year: number, month: number) => `${year}-${pad(month + 1)}`;

/** تاريخ اليوم بتوقيت الرياض */
const riyadhToday = () => {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Riyadh", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const part = (type: string) => Number(parts.find((item) => item.type === type)?.value ?? 0);
  return { year: part("year"), month: part("month") - 1, day: part("day") };
};

const parseDate = (value: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  return match && Number(match[1]) >= 1000 ? { year: Number(match[1]), month: Number(match[2]) - 1, day: Number(match[3]) } : null;
};
const parseMonth = (value: string) => {
  const match = /^(\d{4})-(\d{2})/.exec(value.trim());
  return match && Number(match[1]) >= 1000 ? { year: Number(match[1]), month: Number(match[2]) - 1 } : null;
};

const intlLocale = () => (english() ? "en-US" : "ar-SA-u-ca-gregory-nu-latn");
const monthNames = () => Array.from({ length: 12 }, (_, index) =>
  new Intl.DateTimeFormat(intlLocale(), { month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(2026, index, 1))));
const weekdayNames = () => Array.from({ length: 7 }, (_, index) => {
  const day = (WEEK_START + index) % 7;
  // 2026-10-04 يوم أحد
  return new Intl.DateTimeFormat(intlLocale(), { weekday: english() ? "short" : "narrow", timeZone: "UTC" }).format(new Date(Date.UTC(2026, 9, 4 + day)));
});

const isProtectedPage = () => {
  const pathname = window.location.pathname.toLowerCase().replace(/\/+$/, "");
  return PROTECTED_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
};

/** iPhone وiPad (وiPad بواجهة Mac) */
const isIOS = () => /iP(hone|od|ad)/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

/**
 * أيقونة التقويم الأصلية تُخفى (تُفتح منها لوحة المتصفح بـ Enter بعد Tab) وتظهر بدلها أيقونة خلفية،
 * إلا في الصفحات المحمية وحقول data-native-picker. العلامة على html تتبع الصفحة الحالية عند كل تركيز.
 */
const syncPageFlag = () => {
  document.documentElement.setAttribute("data-latin-picker", isProtectedPage() ? "off" : "on");
};

const eligible = (target: EventTarget | null): target is HTMLInputElement =>
  target instanceof HTMLInputElement
  && SUPPORTED_TYPES.has(target.type)
  && !target.disabled
  && !target.readOnly
  && !target.closest("[data-native-picker]")
  && !isProtectedPage();

/** يضع القيمة كما لو كتبها المستخدم: React يرى التغيير ويستدعي onChange */
const commitValue = (input: HTMLInputElement, value: string) => {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  if (!setter) return;
  setter.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
};

const injectStyles = () => {
  if (document.getElementById("alf-date-picker-style")) return;
  const style = document.createElement("style");
  style.id = "alf-date-picker-style";
  style.textContent = `
.${POPUP_CLASS}{position:absolute;z-index:2147483000;width:280px;background:#fff;color:#0f172a;border:1px solid #cbd5e1;border-radius:12px;box-shadow:0 16px 40px rgba(15,23,42,.18);padding:10px;font-family:"Alayaaf Latin Digits","Inter","Tajawal",sans-serif;font-size:13px;user-select:none}
.${POPUP_CLASS} .alf-head{display:flex;align-items:center;gap:6px;margin-bottom:8px}
.${POPUP_CLASS} .alf-head select{flex:1;min-width:0;height:30px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;padding:0 6px;font:inherit;color:inherit}
.${POPUP_CLASS} button{font:inherit;color:inherit;background:none;border:0;cursor:pointer;border-radius:8px}
.${POPUP_CLASS} .alf-nav{width:30px;height:30px;flex:none;font-size:18px;line-height:1;color:#075f94}
.${POPUP_CLASS} .alf-nav:hover,.${POPUP_CLASS} .alf-cell:not(:disabled):hover{background:#e0f2fe}
.${POPUP_CLASS} .alf-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:2px}
.${POPUP_CLASS} .alf-months{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}
.${POPUP_CLASS} .alf-week{text-align:center;font-size:11px;font-weight:700;color:#64748b;padding:4px 0}
.${POPUP_CLASS} .alf-cell{height:32px;text-align:center}
.${POPUP_CLASS} .alf-months .alf-cell{height:40px}
.${POPUP_CLASS} .alf-cell.alf-out{color:#94a3b8}
.${POPUP_CLASS} .alf-cell.alf-today{box-shadow:inset 0 0 0 1px #0ea5e9;font-weight:700}
.${POPUP_CLASS} .alf-cell.alf-selected{background:#075f94;color:#fff;font-weight:700}
.${POPUP_CLASS} .alf-cell:disabled{color:#cbd5e1;cursor:not-allowed}
.${POPUP_CLASS} .alf-foot{display:flex;justify-content:space-between;gap:6px;margin-top:8px;border-top:1px solid #e2e8f0;padding-top:8px}
.${POPUP_CLASS} .alf-foot button{padding:4px 10px;color:#075f94;font-weight:600}
.${POPUP_CLASS} .alf-foot button:hover{background:#f1f5f9}
.${POPUP_CLASS} .alf-foot button:disabled{color:#cbd5e1;cursor:not-allowed}
.${POPUP_CLASS} button:focus-visible,.${POPUP_CLASS} select:focus-visible{outline:2px solid #0ea5e9;outline-offset:1px}
@supports selector(::-webkit-calendar-picker-indicator){
html[data-latin-picker="on"] input:is([type="date"],[type="month"]):not([data-native-picker]):not([data-native-picker] *)::-webkit-calendar-picker-indicator{display:none}
html[data-latin-picker="on"] input:is([type="date"],[type="month"]):not([data-native-picker]):not([data-native-picker] *):not(:disabled){background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='3' y='4' width='18' height='18' rx='2'/%3E%3Cpath d='M16 2v4M8 2v4M3 10h18'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 8px center;background-size:16px 16px;padding-inline-end:30px;cursor:pointer}
html[data-latin-picker="on"][dir="rtl"] input:is([type="date"],[type="month"]):not([data-native-picker]):not([data-native-picker] *):not(:disabled){background-position:left 8px center}
}
`;
  document.head.appendChild(style);
};

const element = <K extends keyof HTMLElementTagNameMap>(tag: K, className = "", text = "") => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
};

const button = (className: string, text: string, onClick: () => void, title = "", role = "") => {
  const node = element("button", className, text);
  node.type = "button";
  if (role) node.dataset.role = role;
  if (title) { node.title = title; node.setAttribute("aria-label", title); }
  // لا يأخذ الزر التركيز من الحقل
  node.addEventListener("mousedown", (event) => event.preventDefault());
  node.addEventListener("click", (event) => { event.preventDefault(); event.stopPropagation(); onClick(); });
  return node;
};

const yearSelect = (current: number, minYear: number, maxYear: number, onPick: (year: number) => void) => {
  const select = element("select");
  select.dataset.role = "year";
  select.setAttribute("aria-label", t("السنة"));
  for (let year = maxYear; year >= minYear; year -= 1) {
    const option = element("option", "", String(year));
    option.value = String(year);
    if (year === current) option.selected = true;
    select.appendChild(option);
  }
  select.addEventListener("change", () => onPick(Number(select.value)));
  return select;
};

/** حدود السنوات: من min/max إن وُجدا، وإلا 1940 حتى 20 سنة بعد هذه السنة */
const yearBounds = (input: HTMLInputElement, viewYear: number) => {
  const minYear = Number(/^(\d{4})/.exec(input.min)?.[1]) || Math.min(1940, viewYear);
  const maxYear = Number(/^(\d{4})/.exec(input.max)?.[1]) || Math.max(riyadhToday().year + 20, viewYear);
  const clamp = (year: number) => Math.min(MAX_YEAR, Math.max(MIN_YEAR, year));
  return { minYear: clamp(Math.min(minYear, viewYear)), maxYear: clamp(Math.max(maxYear, viewYear)) };
};

const inRange = (input: HTMLInputElement, value: string) =>
  (!input.min || value >= input.min.slice(0, value.length)) && (!input.max || value <= input.max.slice(0, value.length));

const render = () => {
  if (!state) return;
  const { input, kind, popup } = state;
  if (!input.isConnected) { closePicker(); return; }
  // إعادة البناء تحذف العنصر المركَّز (القائمة أو الزر)؛ يُعاد التركيز إلى مثيله الجديد
  const focused = popup.contains(document.activeElement) ? (document.activeElement as HTMLElement).dataset.role ?? "" : "";
  popup.replaceChildren();
  popup.dir = english() ? "ltr" : "rtl";
  const today = riyadhToday();
  const prevArrow = english() ? "‹" : "›";
  const nextArrow = english() ? "›" : "‹";
  const head = element("div", "alf-head");
  const { minYear, maxYear } = yearBounds(input, state.year);

  if (kind === "date") {
    const selected = parseDate(input.value);
    head.append(
      button("alf-nav", prevArrow, () => shiftMonth(-1), t("الشهر السابق"), "prev"),
      (() => {
        const select = element("select");
        select.dataset.role = "month";
        select.setAttribute("aria-label", t("الشهر"));
        monthNames().forEach((name, index) => {
          const option = element("option", "", name);
          option.value = String(index);
          if (index === state!.month) option.selected = true;
          select.appendChild(option);
        });
        select.addEventListener("change", () => { if (state) { state.month = Number(select.value); render(); } });
        return select;
      })(),
      yearSelect(state.year, minYear, maxYear, (year) => { if (state) { state.year = year; render(); } }),
      button("alf-nav", nextArrow, () => shiftMonth(1), t("الشهر التالي"), "next"),
    );
    const grid = element("div", "alf-grid");
    weekdayNames().forEach((name) => grid.appendChild(element("div", "alf-week", name)));
    const first = new Date(Date.UTC(state.year, state.month, 1));
    const offset = (first.getUTCDay() - WEEK_START + 7) % 7;
    const start = Date.UTC(state.year, state.month, 1 - offset);
    for (let index = 0; index < 42; index += 1) {
      const day = new Date(start + index * 86400000);
      const year = day.getUTCFullYear();
      const month = day.getUTCMonth();
      const date = day.getUTCDate();
      const value = dateValue(year, month, date);
      const classes = ["alf-cell"];
      if (month !== state.month) classes.push("alf-out");
      if (year === today.year && month === today.month && date === today.day) classes.push("alf-today");
      if (selected && selected.year === year && selected.month === month && selected.day === date) classes.push("alf-selected");
      const cell = button(classes.join(" "), String(date), () => pick(value), value);
      cell.dataset.role = `day-${value}`;
      cell.disabled = !inRange(input, value);
      grid.appendChild(cell);
    }
    popup.append(head, grid);
  } else {
    const selected = parseMonth(input.value);
    head.append(
      button("alf-nav", prevArrow, () => { if (state) { state.year = Math.max(MIN_YEAR, state.year - 1); render(); } }, t("السنة السابقة"), "prev"),
      yearSelect(state.year, minYear, maxYear, (year) => { if (state) { state.year = year; render(); } }),
      button("alf-nav", nextArrow, () => { if (state) { state.year = Math.min(MAX_YEAR, state.year + 1); render(); } }, t("السنة التالية"), "next"),
    );
    const grid = element("div", "alf-months");
    monthNames().forEach((name, index) => {
      const value = monthValue(state!.year, index);
      const classes = ["alf-cell"];
      if (state!.year === today.year && index === today.month) classes.push("alf-today");
      if (selected && selected.year === state!.year && selected.month === index) classes.push("alf-selected");
      const cell = button(classes.join(" "), name, () => pick(value), value);
      cell.dataset.role = `day-${value}`;
      cell.disabled = !inRange(input, value);
      grid.appendChild(cell);
    });
    popup.append(head, grid);
  }

  const foot = element("div", "alf-foot");
  const todayValue = kind === "date" ? dateValue(today.year, today.month, today.day) : monthValue(today.year, today.month);
  const todayButton = button("", kind === "date" ? t("اليوم") : t("هذا الشهر"), () => pick(todayValue));
  todayButton.disabled = !inRange(input, todayValue);
  foot.appendChild(todayButton);
  if (!input.required) foot.appendChild(button("", t("مسح"), () => pick("")));
  foot.appendChild(button("", t("إغلاق"), () => closePicker(true)));
  popup.appendChild(foot);
  position();
  if (focused) (popup.querySelector(`[data-role="${focused}"]`) as HTMLElement | null)?.focus({ preventScroll: true });
};

const shiftMonth = (delta: number) => {
  if (!state) return;
  const next = new Date(Date.UTC(state.year, state.month + delta, 1));
  state.year = next.getUTCFullYear();
  state.month = next.getUTCMonth();
  render();
};

const pick = (value: string) => {
  if (!state) return;
  const { input } = state;
  closePicker(true);
  if (input.value !== value) commitValue(input, value);
};

/**
 * تحت الحقل، أو فوقه إن كانت المساحة فوقه أوسع، داخل الجزء الظاهر من الشاشة أو من النافذة المنبثقة
 * (اللوحة داخل النافذة المنبثقة إن كان الحقل فيها حتى تبقى قابلة للنقر).
 */
const position = () => {
  if (!state) return;
  const { input, popup } = state;
  const container = popup.parentElement;
  if (!container) return;
  const rect = input.getBoundingClientRect();
  const popupHeight = popup.offsetHeight;
  const popupWidth = popup.offsetWidth;
  const inBody = container === document.body;
  const box = inBody ? null : container.getBoundingClientRect();
  const visibleTop = box ? Math.max(0, box.top) : 0;
  const visibleBottom = box ? Math.min(window.innerHeight, box.bottom) : window.innerHeight;
  const visibleLeft = box ? Math.max(0, box.left) : 0;
  const visibleRight = box ? Math.min(window.innerWidth, box.right) : window.innerWidth;
  const spaceBelow = visibleBottom - rect.bottom;
  const spaceAbove = rect.top - visibleTop;
  const below = spaceBelow >= popupHeight + 8 || spaceBelow >= spaceAbove;
  let top = below ? rect.bottom + 4 : rect.top - popupHeight - 4;
  // لا تتجاوز الجزء الظاهر (تغطي الحقل إن لزم) بدل تمرير الصفحة أو النافذة المنبثقة
  top = Math.max(visibleTop + 4, Math.min(top, visibleBottom - popupHeight - 4));
  // محاذاة بداية الحقل حسب اتجاه الصفحة، داخل الحدود الظاهرة
  let left = english() ? rect.left : rect.right - popupWidth;
  left = Math.max(visibleLeft + 4, Math.min(left, visibleRight - popupWidth - 4));
  if (inBody) {
    popup.style.top = `${top + window.scrollY}px`;
    popup.style.left = `${left + window.scrollX}px`;
  } else {
    popup.style.top = `${top - box!.top + container.scrollTop - container.clientTop}px`;
    popup.style.left = `${left - box!.left + container.scrollLeft - container.clientLeft}px`;
  }
};

export const closePicker = (refocus = false) => {
  if (!state) return;
  const { input, popup, watch } = state;
  state = null;
  window.clearInterval(watch);
  popup.remove();
  if (refocus && input.isConnected) {
    try { input.focus({ preventScroll: true }); } catch { /* الحقل لم يعد قابلًا للتركيز */ }
  }
};

const openPicker = (input: HTMLInputElement, viaKeyboard = false) => {
  if (state?.input === input) return;
  closePicker();
  injectStyles();
  const kind: Kind = input.type === "month" ? "month" : "date";
  const today = riyadhToday();
  const current = kind === "date" ? parseDate(input.value) : parseMonth(input.value);
  const fallback = parseDate(input.min) ?? parseMonth(input.min);
  const view = current ?? (input.min && !inRange(input, kind === "date" ? dateValue(today.year, today.month, today.day) : monthValue(today.year, today.month)) && fallback ? fallback : today);
  const popup = element("div", POPUP_CLASS);
  popup.setAttribute("role", "dialog");
  popup.setAttribute("aria-label", kind === "date" ? t("اختر التاريخ") : t("اختر الشهر"));
  // داخل النافذة المنبثقة (Radix وغيرها) حتى لا تُعد النقرة خارجها فتُغلق، وإلا في body
  const container = (input.closest('[role="dialog"]') as HTMLElement | null) ?? document.body;
  container.appendChild(popup);
  state = { input, kind, year: view.year, month: view.month, popup, path: window.location.pathname, watch: 0 };
  render();
  // يُغلق إن اختفى الحقل (حُفظ النموذج وأُغلقت نافذته) أو تغيّرت الصفحة دون نقرة
  state.watch = window.setInterval(() => {
    if (state && (!state.input.isConnected || !state.popup.isConnected || window.location.pathname !== state.path)) closePicker();
  }, 400);
  if (viaKeyboard) {
    const target = popup.querySelector(".alf-selected:not(:disabled)") ?? popup.querySelector(".alf-today:not(:disabled)") ?? popup.querySelector(".alf-cell:not(:disabled)");
    (target as HTMLElement | null)?.focus({ preventScroll: true });
  }
};

const onClick = (event: MouseEvent) => {
  dropStale();
  if (!eligible(event.target)) return;
  // يمنع لوحة المتصفح، ويُبقي الكتابة في الحقل كما هي
  event.preventDefault();
  openPicker(event.target);
};

/** لوحة بقيت لحقل حُذف من الصفحة: تُغلق قبل أي معالجة (حتى لا تبتلع Escape التالي) */
const dropStale = () => {
  if (state && (!state.input.isConnected || !state.popup.isConnected)) closePicker();
};

const onKeyDown = (event: KeyboardEvent) => {
  dropStale();
  if (state && event.key === "Escape") {
    // Escape يغلق اللوحة وحدها، لا النافذة المنبثقة التي فيها الحقل (مستمعها على document أيضًا، ومستمعنا أسبق)
    event.preventDefault();
    event.stopImmediatePropagation();
    closePicker(true);
    return;
  }
  if (!eligible(event.target)) return;
  // Space وAlt+السهم وF4 تفتح لوحة المتصفح؛ تُفتح بدلها هذه، والتركيز فيها
  if ((event.altKey && (event.key === "ArrowDown" || event.key === "ArrowUp")) || event.key === "F4" || event.key === " ") {
    event.preventDefault();
    openPicker(event.target, true);
  } else if (event.key === "Tab" && state) {
    closePicker();
  }
};

const onPointerDown = (event: Event) => {
  dropStale();
  if (!state) return;
  const target = event.target as Node | null;
  if (target && (state.popup.contains(target) || target === state.input)) return;
  closePicker();
};

const onInput = (event: Event) => {
  if (!state || event.target !== state.input) return;
  // كتابة التاريخ في الحقل واللوحة مفتوحة: تتبعها اللوحة (السنة الجزئية أثناء الكتابة، مثل 0020، تُتجاهل)
  const kind = state.kind;
  const current = kind === "date" ? parseDate(state.input.value) : parseMonth(state.input.value);
  if (!current) return;
  state.year = current.year;
  state.month = current.month;
  render();
};

export function installLatinDatePicker() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  const flag = window as unknown as { __alayaafLatinDatePicker?: boolean };
  if (flag.__alayaafLatinDatePicker) return;
  flag.__alayaafLatinDatePicker = true;
  if (isIOS()) return;
  injectStyles();
  syncPageFlag();
  document.addEventListener("focusin", (event) => {
    if (event.target instanceof HTMLInputElement && SUPPORTED_TYPES.has(event.target.type)) syncPageFlag();
  }, true);
  document.addEventListener("mousedown", (event) => {
    if (event.target instanceof HTMLInputElement && SUPPORTED_TYPES.has(event.target.type)) syncPageFlag();
  }, true);
  document.addEventListener("click", onClick, true);
  document.addEventListener("keydown", onKeyDown, true);
  document.addEventListener("pointerdown", onPointerDown, true);
  document.addEventListener("input", onInput, true);
  window.addEventListener("resize", () => { if (state) position(); });
  // تمرير ما يحوي اللوحة (الصفحة أو النافذة المنبثقة) يحرّكها مع الحقل؛ تمرير غيره يغيّر موضع الحقل وحده فيغلقها
  window.addEventListener("scroll", (event) => {
    if (!state) return;
    const target = event.target;
    const scroller = target instanceof Document ? target.documentElement : target instanceof Node ? target : null;
    if (scroller && scroller.contains(state.popup)) return;
    closePicker();
  }, true);
  window.addEventListener("popstate", () => { closePicker(); syncPageFlag(); });
}
