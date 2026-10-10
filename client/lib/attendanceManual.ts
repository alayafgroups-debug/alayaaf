// التحضير اليدوي من شاشات الإدارة (حساب الدوام / التحضير الفردي والجماعي).
// القاعدة: بصمة الموظف الموثّقة جغرافيًا من بوابة الموظف لا تُستبدل أبدًا من هذه الشاشات.
import { supabase } from "@/lib/supabaseClient";
import { fetchAllRows } from "@/lib/fetchAll";
import { eachDate, riyadhToday } from "@/lib/hrDates";
import { isApprovedStatus } from "@/lib/hrStatus";
import { isScheduledWorkDay, type WorkSchedule } from "@/lib/workSchedule";

export const VERIFIED_ATTENDANCE_SOURCE = "employee_geolocation";
export const MANUAL_ATTENDANCE_SOURCE = "manager_manual";
/** الحالة الوحيدة المسموح تحضيرها لتاريخ مستقبلي */
export const FUTURE_ALLOWED_STATUS = "إجازة";

/**
 * سجل محمي من التعديل الإداري: بصمة من بوابة الموظف، أو سجل يحمل بصمة موثّقة جغرافيًا
 * (دالة البوابة عند الانصراف تضع location_verified = true دون تغيير entry_source،
 * فقد يحمل سجل أنشأه المدير بصمة انصراف موثّقة).
 */
export const isProtectedAttendance = (row: { entry_source?: unknown; location_verified?: unknown }) =>
  String(row.entry_source ?? "") === VERIFIED_ATTENDANCE_SOURCE || row.location_verified === true;

export type ManualAttendanceRow = { emp_id: string; date: string } & Record<string, unknown>;
export type ManualAttendanceOptions = {
  /**
   * true: يُحدَّث السجل الموجود غير الموثّق (تعديل فردي صريح لموظف ويوم).
   * false (الافتراضي): تُدرج الأيام الناقصة فقط ولا يُمس أي سجل موجود (يدوي أو قديم أو موثّق).
   */
  overwriteExisting?: boolean;
};
export type ManualAttendanceResult = {
  /** السجلات التي حُفظت فعلًا (إنشاء أو تحديث) */
  saved: number;
  /** سجلات تُركت لأنها بصمة موثّقة من بوابة الموظف */
  skippedVerified: number;
  /** سجلات موجودة مسبقًا تُركت دون تعديل (التحضير المتعدد يضيف الأيام الناقصة فقط) */
  skippedExisting: number;
  /** سجلات تغيّرت أثناء الحفظ (غالبًا بصمة الموظف) فلم تُستبدل */
  skippedConcurrent: number;
  error: unknown | null;
};

const WRITE_CHUNK = 500;
const ID_CHUNK = 100;
const chunk = <T,>(items: T[], size: number): T[][] => {
  const parts: T[][] = [];
  for (let index = 0; index < items.length; index += size) parts.push(items.slice(index, index + size));
  return parts;
};
const rowKey = (empId: unknown, date: unknown) => `${String(empId ?? "")}:${String(date ?? "").slice(0, 10)}`;

/** أيام عمل الموظف في الفترة حسب جدول دوامه؛ من لا جدول له: الأحد إلى الخميس */
export const scheduleWorkDates = (from: string, to: string, schedule: WorkSchedule | null | undefined): string[] =>
  eachDate(from, to).filter((date) => isScheduledWorkDay(date, schedule));

/** أيام التحضير لموظف: يوم واحد يُقبل كما هو، والفترة متعددة الأيام تقتصر على أيام عمله حسب جدول دوامه */
export const manualAttendanceDatesFor = (from: string, to: string, schedule: WorkSchedule | null | undefined): string[] => {
  const dates = eachDate(from, to);
  return dates.length > 1 ? dates.filter((date) => isScheduledWorkDay(date, schedule)) : dates;
};

/** أيام التحضير بلا جدول دوام: يوم واحد يُقبل كما هو، والفترة متعددة الأيام تستثني الجمعة والسبت */
export const manualAttendanceDates = (from: string, to: string): string[] => manualAttendanceDatesFor(from, to, null);

/**
 * يعيد نص الخطأ (قبل الترجمة) أو null إن كانت الأوقات صحيحة.
 * الانصراف قبل الحضور = وردية ليلية تمتد لليوم التالي وهي مقبولة؛ يُرفض فقط تساوي الوقتين.
 */
export const manualAttendanceTimeError = (checkIn: string, checkOut: string, requireCheckIn: boolean): string | null => {
  if (requireCheckIn && !checkIn) return "حدد وقت الحضور";
  if (checkOut && !checkIn) return "لا يمكن تسجيل وقت الانصراف بدون وقت الحضور";
  if (checkIn && checkOut && checkOut.slice(0, 5) === checkIn.slice(0, 5)) return "وقت الانصراف لا يمكن أن يساوي وقت الحضور";
  return null;
};

/** يعيد نص الخطأ (قبل الترجمة) إن كان التاريخ بعد اليوم (بتوقيت الرياض) والحالة ليست إجازة */
export const manualAttendanceFutureError = (lastDate: string, status: string): string | null =>
  String(lastDate ?? "").slice(0, 10) > riyadhToday() && String(status ?? "").trim() !== FUTURE_ALLOWED_STATUS
    ? "لا يمكن التحضير لتاريخ بعد اليوم إلا بحالة إجازة"
    : null;

/**
 * يحفظ سجلات التحضير اليدوي دون المساس ببصمات الموظفين الموثّقة:
 * 1) يزيل تكرار (الموظف، التاريخ) داخل الدفعة (الأخير يغلب).
 * 2) يقرأ السجلات الموجودة للموظفين والفترة.
 * 3) يتخطى أي سجل محمي (entry_source = employee_geolocation أو location_verified = true).
 * 4) السجلات الجديدة تُدرج بـ ON CONFLICT DO NOTHING حتى لا تُستبدل بصمة سُجّلت أثناء الحفظ.
 * 5) السجلات الموجودة غير المحمية تُترك كما هي، إلا مع overwriteExisting فتُحدَّث بشرط أنها ما زالت غير موثّقة.
 * كل سجل يُكتب يحمل entry_source = manager_manual و location_verified = false.
 */
export async function saveManualAttendance(rows: ManualAttendanceRow[], options: ManualAttendanceOptions = {}): Promise<ManualAttendanceResult> {
  const result: ManualAttendanceResult = { saved: 0, skippedVerified: 0, skippedExisting: 0, skippedConcurrent: 0, error: null };
  // دفعة واحدة لا تحمل المفتاح (emp_id, date) مرتين: الأخير يغلب
  const uniqueRows = [...new Map(rows.map((row) => [rowKey(row.emp_id, row.date), row] as const)).values()];
  if (!uniqueRows.length) return result;
  // حماية إضافية: الصفحات تتحقق قبل الاستدعاء
  const futureRow = uniqueRows.find((row) => manualAttendanceFutureError(String(row.date ?? ""), String(row.status ?? "")));
  if (futureRow) return { ...result, error: new Error(manualAttendanceFutureError(String(futureRow.date ?? ""), String(futureRow.status ?? "")) ?? "") };

  const empIds = [...new Set(uniqueRows.map((row) => row.emp_id))];
  const dates = uniqueRows.map((row) => String(row.date).slice(0, 10)).sort();
  const from = dates[0];
  const to = dates[dates.length - 1];
  /** المفتاح ← هل السجل الموجود محمي */
  const existing = new Map<string, boolean>();
  try {
    for (const ids of chunk(empIds, ID_CHUNK)) {
      const found = await fetchAllRows<{ emp_id: unknown; date: unknown; entry_source: unknown; location_verified: unknown }>((start, end) => supabase
        .from("attendance")
        .select("emp_id, date, entry_source, location_verified")
        .in("emp_id", ids)
        .gte("date", from)
        .lte("date", to)
        .order("date")
        .order("emp_id")
        .range(start, end));
      found.forEach((row) => existing.set(rowKey(row.emp_id, row.date), isProtectedAttendance(row)));
    }
  } catch (error) {
    return { ...result, error };
  }

  const prepared = uniqueRows.map((row) => ({ ...row, entry_source: MANUAL_ATTENDANCE_SOURCE, location_verified: false }));
  const toInsert: typeof prepared = [];
  const toUpdate: typeof prepared = [];
  prepared.forEach((row) => {
    const key = rowKey(row.emp_id, row.date);
    if (!existing.has(key)) toInsert.push(row);
    else if (existing.get(key)) result.skippedVerified += 1;
    else if (options.overwriteExisting) toUpdate.push(row);
    else result.skippedExisting += 1;
  });

  for (const part of chunk(toInsert, WRITE_CHUNK)) {
    const { data, error } = await supabase.from("attendance").upsert(part, { onConflict: "emp_id,date", ignoreDuplicates: true }).select("id");
    if (error) return { ...result, error };
    const inserted = data?.length ?? 0;
    result.saved += inserted;
    result.skippedConcurrent += part.length - inserted;
  }
  // التحديث بشرط أن السجل ما زال غير موثّق؛ إن وثّقه الموظف أثناء الحفظ لا يُستبدل
  for (const row of toUpdate) {
    const { data, error } = await supabase
      .from("attendance")
      .update(row)
      .eq("emp_id", row.emp_id)
      .eq("date", row.date)
      .eq("location_verified", false)
      .or(`entry_source.is.null,entry_source.neq.${VERIFIED_ATTENDANCE_SOURCE}`)
      .select("id");
    if (error) return { ...result, error };
    const updated = data?.length ?? 0;
    result.saved += updated;
    if (!updated) result.skippedConcurrent += 1;
  }
  return result;
}

/** رسالة عربية موحّدة لنتيجة الحفظ (تُمرَّر دالة الترجمة وتنسيق الأرقام من الصفحة) */
export const manualAttendanceResultText = (result: ManualAttendanceResult, t: (text: string) => string, formatNumber: (value: number) => string, savedSuffix = "") => {
  const parts = [`${t("تم حفظ")} ${formatNumber(result.saved)} ${t("سجل حضور")}${savedSuffix ? ` ${savedSuffix}` : ""}`];
  if (result.skippedExisting) parts.push(`${t("وتُرك")} ${formatNumber(result.skippedExisting)} ${t("سجل موجود مسبقًا دون تعديل")}`);
  if (result.skippedVerified) parts.push(`${t("تم تخطي")} ${formatNumber(result.skippedVerified)} ${t("سجل بصمة موثّقة من بوابة الموظف دون تعديل")}`);
  if (result.skippedConcurrent) parts.push(`${t("وتُرك")} ${formatNumber(result.skippedConcurrent)} ${t("سجل تغيّر أثناء الحفظ دون استبدال")}`);
  return parts.join("، ");
};

// ───────────── أيام لا تُحتسب غيابًا: العطل الرسمية والإجازات المعتمدة ─────────────

/** عطلة رسمية من جدول official_holidays (الفرع/الإدارة/القسم فارغ = تنطبق على الجميع) */
export type OfficialHoliday = { start: string; end: string; branch: string; department: string; section: string };
/** أسماء نطاق الموظف المخزنة (بالعربية) لكل مستوى، لمطابقة نطاق العطلة */
export type HolidayScope = { branch: string[]; department: string[]; section: string[] };
export type ApprovedLeave = { employeeId: string; empId: string; start: string; end: string; leaveType: string };

const dateKey = (value: unknown) => String(value ?? "").slice(0, 10);
const spanEnd = (start: string, end: string) => (end && end >= start ? end : start);

/** يحمل العطل الرسمية المتقاطعة مع الفترة؛ عند الخطأ تُعاد قائمة فارغة مع الخطأ (لا يتوقف التقرير) */
export async function loadOfficialHolidays(from: string, to: string): Promise<{ holidays: OfficialHoliday[]; error: unknown | null }> {
  try {
    const { data, error } = await supabase
      .from("official_holidays")
      .select("start_date, end_date, branch, department, section, team")
      .lte("start_date", to)
      .or(`end_date.gte.${from},end_date.is.null`);
    if (error) return { holidays: [], error };
    const holidays = (data ?? [])
      .map((row: Record<string, unknown>) => {
        const start = dateKey(row.start_date);
        return { start, end: spanEnd(start, dateKey(row.end_date)), branch: String(row.branch ?? "").trim(), department: String(row.department ?? "").trim(), section: String(row.section ?? "").trim(), team: String(row.team ?? "").trim() };
      })
      // عطلة فريق عمل: لا يوجد في سجل الموظف ما يطابق الفريق، فلا تُطبَّق على أحد (مثل لوحة الموارد البشرية)
      .filter((holiday) => holiday.start && !holiday.team && holiday.end >= from && holiday.start <= to)
      .map(({ team: _team, ...holiday }) => holiday);
    return { holidays, error: null };
  } catch (error) {
    return { holidays: [], error };
  }
}

/** يحمل الإجازات المعتمدة المتقاطعة مع الفترة لكل الموظفين،
 * ومعها أرقام كل الموظفين (النشطين وغير النشطين) لمعرفة الأرقام المكررة عند النسب بالرقم */
export async function loadApprovedLeaves(from: string, to: string): Promise<{ leaves: ApprovedLeave[]; codeOwners: { id: string; empId: string }[] | null; error: unknown | null }> {
  try {
    const owners = await fetchAllRows<Record<string, unknown>>((start, end) => supabase
      .from("employees")
      .select("id, emp_id")
      .order("id")
      .range(start, end));
    const codeOwners = owners.map((row) => ({ id: String(row.id ?? ""), empId: String(row.emp_id ?? "").trim() }));
    const rows = await fetchAllRows<Record<string, unknown>>((start, end) => supabase
      .from("leave_requests")
      .select("id, emp_id, employee_id, start_date, end_date, status, leave_type")
      .lte("start_date", to)
      .or(`end_date.gte.${from},end_date.is.null`)
      .order("start_date")
      .order("id")
      .range(start, end));
    const leaves = rows
      .filter((row) => isApprovedStatus(row.status) && row.start_date)
      .map((row) => {
        const start = dateKey(row.start_date);
        return { employeeId: String(row.employee_id ?? "").trim(), empId: String(row.emp_id ?? "").trim(), start, end: spanEnd(start, dateKey(row.end_date)), leaveType: String(row.leave_type ?? "").trim() };
      })
      .filter((leave) => leave.end >= from && leave.start <= to);
    return { leaves, codeOwners, error: null };
  } catch (error) {
    return { leaves: [], codeOwners: null, error };
  }
}

const scopeMatches = (value: string, names: string[]) => !value || names.some((name) => String(name ?? "").trim() === value);

/** أيام العطل الرسمية التي تنطبق على نطاق موظف داخل الفترة */
export const officialHolidayDates = (holidays: OfficialHoliday[], scope: HolidayScope, from: string, to: string): Set<string> => {
  const dates = new Set<string>();
  holidays.forEach((holiday) => {
    if (!scopeMatches(holiday.branch, scope.branch) || !scopeMatches(holiday.department, scope.department) || !scopeMatches(holiday.section, scope.section)) return;
    eachDate(holiday.start > from ? holiday.start : from, holiday.end < to ? holiday.end : to).forEach((date) => dates.add(date));
  });
  return dates;
};

/**
 * أيام الإجازات المعتمدة لكل موظف (بمعرّف الموظف uuid) داخل الفترة.
 * المطابقة بـ employee_id أولًا؛ وإن لم يُسجَّل فبالرقم الوظيفي فقط إن كان لموظف واحد
 * (توجد أرقام وظيفية مكررة مثل EMP-030 فلا تُنسب الإجازة لغير صاحبها).
 */
export const approvedLeaveDatesByEmployee = (
  leaves: ApprovedLeave[],
  employees: { id: string; empId: string }[],
  from: string,
  to: string,
  // كل الموظفين (وليس النشطين فقط) حتى لا يُنسب رقم مكرر لموظف نشط وهو لغيره
  codeOwners?: { id: string; empId: string }[] | null,
): Map<string, Set<string>> => {
  const ids = new Set(employees.map((employee) => employee.id));
  const idsByCode = new Map<string, string[]>();
  (codeOwners && codeOwners.length ? codeOwners : employees).forEach((employee) => {
    const code = employee.empId.trim();
    if (code) idsByCode.set(code, [...(idsByCode.get(code) ?? []), employee.id]);
  });
  const result = new Map<string, Set<string>>();
  leaves.forEach((leave) => {
    let owner = "";
    if (leave.employeeId) owner = ids.has(leave.employeeId) ? leave.employeeId : "";
    else {
      const matches = idsByCode.get(leave.empId) ?? [];
      if (matches.length === 1 && ids.has(matches[0])) owner = matches[0];
    }
    if (!owner) return;
    const dates = result.get(owner) ?? new Set<string>();
    eachDate(leave.start > from ? leave.start : from, leave.end < to ? leave.end : to).forEach((date) => dates.add(date));
    result.set(owner, dates);
  });
  return result;
};
