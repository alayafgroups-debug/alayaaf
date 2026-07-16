import { useState, useEffect } from "react";
import { ChevronLeft, Send, MessageCircle } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";

type Props = { empId: string; empName: string; onBack: () => void };
type Msg = { id: string; type: string; subject: string; message: string; status: string; created: string; admin_note?: string };

export default function ContactManagementPage({ empId, empName, onBack }: Props) {
  const [tab, setTab] = useState<"send" | "history">("send");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (tab !== "history") return;
    setLoading(true);
    supabase.from("hr_requests").select("id, request_type, status, details, admin_note, created_at").eq("emp_id", empId).eq("request_type", "تواصل مع الإدارة").order("created_at", { ascending: false })
      .then(({ data }) => {
        setHistory((data ?? []).map((r: any) => ({
          id: String(r.id),
          type: String(r.request_type ?? "—"),
          subject: String(r.details?.subject || "رسالة"),
          message: String(r.details?.message || "—"),
          status: String(r.status ?? "معلق"),
          created: new Date(r.created_at).toLocaleDateString("ar-SA"),
          admin_note: String(r.admin_note || ""),
        })));
        setLoading(false);
      });
  }, [tab, empId]);

  const handleSend = async () => {
    if (!subject.trim()) { toast.error("يرجى كتابة الموضوع"); return; }
    if (!message.trim()) { toast.error("يرجى كتابة الرسالة"); return; }
    setSending(true);
    const { error } = await supabase.from("hr_requests").insert([{
      id: crypto.randomUUID(),
      emp_id: empId,
      emp_name: empName,
      request_type: "تواصل مع الإدارة",
      status: "معلق",
      details: { subject, message },
      created_at: new Date().toISOString(),
    }]);
    setSending(false);
    if (error) { toast.error("تعذر الإرسال: " + error.message); return; }
    toast.success("تم إرسال رسالتك إلى الإدارة");
    setSubject("");
    setMessage("");
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="flex items-center gap-3 p-4">
          <button onClick={onBack} className="text-[#004e89]"><ChevronLeft className="h-6 w-6 rotate-180" /></button>
          <MessageCircle className="h-5 w-5 text-[#004e89]" />
          <h2 className="font-bold text-lg text-gray-900">التواصل مع الإدارة</h2>
        </div>
        <div className="flex border-b">
          <button onClick={() => setTab("send")} className={`flex-1 py-3 text-sm font-semibold border-b-2 transition ${tab === "send" ? "border-[#004e89] text-[#004e89]" : "border-transparent text-gray-500"}`}>إرسال رسالة</button>
          <button onClick={() => setTab("history")} className={`flex-1 py-3 text-sm font-semibold border-b-2 transition ${tab === "history" ? "border-[#004e89] text-[#004e89]" : "border-transparent text-gray-500"}`}>الرسائل السابقة</button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 pb-24">
        {tab === "send" ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-4">
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-1.5">الموضوع</label>
              <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="مثال: اقتراح أو استفسار..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#004e89]" />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-1.5">الرسالة</label>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={6} placeholder="اكتب رسالتك هنا..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#004e89] resize-none" />
            </div>
            <button onClick={handleSend} disabled={sending} className="w-full flex items-center justify-center gap-2 bg-[#004e89] text-white rounded-xl py-3 text-sm font-semibold hover:bg-[#003865] disabled:opacity-60 transition">
              <Send className="h-4 w-4" />
              {sending ? "جاري الإرسال..." : "إرسال"}
            </button>
          </div>
        ) : loading ? (
          <div className="text-center py-12 text-gray-400">جاري التحميل...</div>
        ) : history.length === 0 ? (
          <div className="text-center py-12 text-gray-400">لا توجد رسائل سابقة</div>
        ) : history.map((msg) => (
          <div key={msg.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-3">
            <div className="flex items-start justify-between mb-2">
              <p className="font-semibold text-gray-900">{msg.subject}</p>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${msg.status === "موافق" ? "bg-green-100 text-green-700" : msg.status === "مرفوض" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>{msg.status}</span>
            </div>
            <p className="text-sm text-gray-600">{msg.message}</p>
            <p className="text-xs text-gray-400 mt-2">{msg.created}</p>
            {msg.admin_note && <div className="mt-2 bg-blue-50 rounded-lg px-3 py-2 text-sm text-blue-800"><span className="font-semibold">رد الإدارة: </span>{msg.admin_note}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
