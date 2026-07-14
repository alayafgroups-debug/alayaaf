import { useEffect, useState } from "react";
import { ChevronLeft, Clock, CheckCircle, XCircle } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

type Props = { empId: string; onBack: () => void };

type Record_ = {
  id: string;
  date: string;
  check_in: string | null;
  check_out: string | null;
  status: string;
  late_minutes: number;
};

export default function AttendanceReportPage({ empId, onBack }: Props) {
  const [records, setRecords] = useState<Record_[]>([]);
  const [loading, setLoading] = useState(true);
  const [monthFilter, setMonthFilter] = useState(new Date().toISOString().slice(0, 7));

  useEffect(() => {
    async function load() {
      setLoading(true);
      const start = `${monthFilter}-01`;
      const end = `${monthFilter}-31`;
      const { data } = await supabase
        .from("attendance")
        .select("id, date, check_in, check_out, status, late_minutes")
        .eq("emp_id", empId)
        .gte("date", start)
        .lte("date", end)
        .order("date", { ascending: false });
      setRecords((data ?? []) as Record_[]);
      setLoading(false);
    }
    load();
  }, [empId, monthFilter]);

  const totalPresent = records.filter((r) => r.status === "حاضر").length;
  const totalAbsent = records.filter((r) => r.status === "غائب").length;
  const totalLate = records.filter((r) => (r.late_minutes ?? 0) > 0).length;

  const statusColor = (s: string) =>
    s === "حاضر" ? "text-green-600 bg-green-50" : s === "غائب" ? "text-red-600 bg-red-50" : "text-orange-600 bg-orange-50";

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="flex items-center gap-3 p-4">
          <button onClick={onBack} className="text-[#004e89]"><ChevronLeft className="h-6 w-6 rotate-180" /></button>
          <h2 className="font-bold text-lg text-gray-900">دوامي</h2>
        </div>
        <div className="px-4 pb-3">
          <input type="month" value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#004e89]" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-24 bg-gray-50">
        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3 p-4">
          <div className="bg-white rounded-xl shadow-sm p-3 text-center border border-gray-100">
            <p className="text-2xl font-bold text-green-600">{totalPresent}</p>
            <p className="text-xs text-gray-500 mt-1">يوم حضور</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-3 text-center border border-gray-100">
            <p className="text-2xl font-bold text-red-500">{totalAbsent}</p>
            <p className="text-xs text-gray-500 mt-1">يوم غياب</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-3 text-center border border-gray-100">
            <p className="text-2xl font-bold text-orange-500">{totalLate}</p>
            <p className="text-xs text-gray-500 mt-1">تأخر</p>
          </div>
        </div>

        {/* Records */}
        <div className="px-4">
          {loading ? (
            <div className="text-center py-12 text-gray-400">جاري التحميل...</div>
          ) : records.length === 0 ? (
            <div className="text-center py-12 text-gray-400">لا توجد سجلات لهذا الشهر</div>
          ) : (
            records.map((rec) => (
              <div key={rec.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-gray-800 text-sm">{rec.date}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(rec.status)}`}>{rec.status}</span>
                </div>
                <div className="flex gap-6 text-sm">
                  <div className="flex items-center gap-1 text-gray-600">
                    <Clock className="h-4 w-4 text-green-500" />
                    <span>{rec.check_in ?? "—"}</span>
                  </div>
                  <div className="flex items-center gap-1 text-gray-600">
                    <Clock className="h-4 w-4 text-red-400" />
                    <span>{rec.check_out ?? "—"}</span>
                  </div>
                  {(rec.late_minutes ?? 0) > 0 && (
                    <div className="text-orange-500 text-xs font-medium self-center">تأخر {rec.late_minutes} د</div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
