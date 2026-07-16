import { useState, useEffect } from "react";
import { ChevronLeft, Send, AlertOctagon } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";

type Props = { empId: string; empName: string; isManager: boolean; onBack: () => void };
type Complaint = { id: string; subject: string; message: string; status: string; created: string; admin_note?: string; emp_name?: string };

export default function ComplaintsPage({ empId, empName, isManager, onBack }: Props) {
  const [tab, setTab] = useState<"send" | "history">("send");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (tab !== "history") return;
    setLoading(true);
    let q = supabase.from("hr_requests").select("id, emp_name, request_type, status, details, admin_note, created_at").eq("request_type", "شكوى").order("created_at", { ascending: false });
    if (!isManager) q = q.eq("emp_id", empId);
    q.then(({ data }) => {
      setHistory((data ?? []).map((r: any) => ({
        id: String(r.id),
        subject: String(r.details?.subject || "شكوى"),
        message: String(r.details?.message || "—"),
        status: String(r.status ?? "معلق"),
        created: new Date(r.created_at).toLocaleDateString("ar-SA"),
        admin_note: String(r.admin_note || ""),
        emp_name: String(r.emp_name || "—"),
      })));
      setLoading(false);
    });
  }, [tab, empId, isManager]);

  const handleSend = async () => {
    if (!subject.trim()) { toast.error("يرجى كتابة موضوع الشكوى"); return; }
    if (!message.trim()) { toast.error("يرجى كتابة تفاصيل الشكوى"); return; }
    setSending(true);
    const { error } = await supabase.from("hr_requests").insert([{
      id: crypto.randomUUID(),
      emp_id: empId,
      emp_name: empName,
      request_type: "شكوى",
      status: "معلق",
      details: { subject, message },
      created_at: new Date().toISOString(),
    }]);
    setSending(false);
    if (error) { toast.error("تعذر الإرسال: " + error.message); return; }
    toast.success("تم تقديم شكواك بنجاح");
    setSubject("");
    setMessage("");
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="flex items-center gap-3 p-4">
          <button onClick={onBack} className="text-[#004e89]"><ChevronLeft className="h-6 w-6 rotate-180" /></button>
          <AlertOctagon className="h-5 w-5 text-orange-500" />
          <h2 className="font-bold text-lg text-gray-900">الشكاوي</h2>
        </div>
        <div className="flex border-b">
          {!isManager && <button onClick={() => setTab("send")} className={`flex-1 py-3 text-sm font-semibold border-b-2 transition ${tab === "send" ? "border-[#004e89] text-[#004e89]" : "border-transparent text-gray-500"}`}>تقديم شكوى</button>}
          <button onClick={() => setTab("history")} className={`flex-1 py-3 text-sm font-semibold border-b-2 transition ${tab === "history" ? "border-[#004e89] text-[#004e89]" : "border-transparent text-gray-500"}`}>{isManager ? "جميع الشكاوي" : "شكاواي"}</button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 pb-24">
        {tab === "send" ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-4">
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-1.5">موضوع الشكوى</label>
              <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="موضوع الشكوى..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#004e89]" />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-1.5">تفاصيل الشكوى</label>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={6} placeholder="اشرح شكواك بالتفصيل..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#004e89] resize-none" />
            </div>
            <button onClick={handleSend} disabled={sending} className="w-full flex items-center justify-center gap-2 bg-orange-500 text-white rounded-xl py-3 text-sm font-semibold hover:bg-orange-600 disabled:opacity-60 transition">
              <Send className="h-4 w-4" />
              {sending ? "جاري الإرسال..." : "تقديم الشكوى"}
            </button>
          </div>
        ) : loading ? (
          <div className="text-center py-12 text-gray-400">جاري التحميل...</div>
        ) : history.length === 0 ? (
          <div className="text-center py-12 text-gray-400">لا توجد شكاوي مقدمة</div>
        ) : history.map((c) => (
          <div key={c.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-3">
            <div className="flex items-start justify-between mb-2">
              <div>
                {isManager && <p className="text-xs text-[#004e89] font-medium mb-0.5">{c.emp_name}</p>}
                <p className="font-semibold text-gray-900">{c.subject}</p>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.status === "موافق" ? "bg-green-100 text-green-700" : c.status === "مرفوض" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>{c.status}</span>
            </div>
            <p className="text-sm text-gray-600">{c.message}</p>
            <p className="text-xs text-gray-400 mt-2">{c.created}</p>
            {c.admin_note && <div className="mt-2 bg-blue-50 rounded-lg px-3 py-2 text-sm text-blue-800"><span className="font-semibold">الرد: </span>{c.admin_note}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
