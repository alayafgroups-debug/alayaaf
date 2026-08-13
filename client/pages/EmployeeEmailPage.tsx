import { useEffect, useMemo, useState } from "react";
import { Mail, Trash2, Send, Settings as SettingsIcon, ChevronLeft, Lock, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

interface MailMessage {
  id: string;
  from_email: string;
  to_email: string;
  subject: string;
  body: string;
  read_at?: string | null;
  created_at: string;
}

type Folder = "inbox" | "sent" | "trash" | "settings";

export default function EmployeeEmailPage({
  onBack,
  empId,
  employeeName,
}: {
  onBack: () => void;
  empId?: string;
  employeeName?: string;
}) {
  const [activeFolder, setActiveFolder] = useState<Folder>("inbox");
  const [employeeEmail, setEmployeeEmail] = useState("");
  const [messages, setMessages] = useState<MailMessage[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<MailMessage | null>(null);
  const [mailboxPassword, setMailboxPassword] = useState("");
  const [mailboxAuthenticated, setMailboxAuthenticated] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoadingEmail, setIsLoadingEmail] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [loginError, setLoginError] = useState("");

  useEffect(() => {
    async function loadEmployeeEmail() {
      if (!empId) {
        setLoginError("لم يتم العثور على الرقم الوظيفي");
        setIsLoadingEmail(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke("manage-employee-credentials", {
        body: { action: "mailbox-info", empId },
      });
      if (error || !data?.success) {
        setLoginError(data?.error || "لم يتم إنشاء بريد إلكتروني لك بعد");
      } else {
        setEmployeeEmail(String(data.generated_email || ""));
      }
      setIsLoadingEmail(false);
    }

    loadEmployeeEmail();
  }, [empId]);

  useEffect(() => {
    async function loadMessages() {
      if (!employeeEmail || !mailboxAuthenticated) {
        setMessages([]);
        return;
      }
      const { data, error } = await supabase
        .from("employee_mail_messages")
        .select("id, from_email, to_email, subject, body, read_at, created_at")
        .or(`to_email.eq.${employeeEmail},from_email.eq.${employeeEmail}`)
        .order("created_at", { ascending: false });
      if (!error && data) setMessages(data as MailMessage[]);
    }

    loadMessages();
  }, [employeeEmail, mailboxAuthenticated]);

  const inbox = useMemo(
    () => messages.filter((message) => message.to_email === employeeEmail),
    [messages, employeeEmail],
  );
  const sent = useMemo(
    () => messages.filter((message) => message.from_email === employeeEmail),
    [messages, employeeEmail],
  );
  const visibleMessages = activeFolder === "inbox" ? inbox : activeFolder === "sent" ? sent : [];

  const folders: { id: Folder; label: string; count: number }[] = [
    { id: "inbox", label: "صندوق الوارد", count: inbox.filter((message) => !message.read_at).length },
    { id: "sent", label: "المرسل", count: sent.length },
    { id: "trash", label: "المهملات", count: 0 },
    { id: "settings", label: "الإعدادات", count: 0 },
  ];

  const handleMailboxLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!mailboxPassword) {
      setLoginError("أدخل كلمة مرور البريد الإلكتروني");
      return;
    }

    setIsSigningIn(true);
    setLoginError("");
    const { data, error } = await supabase.functions.invoke("manage-employee-credentials", {
      body: { action: "verify-mailbox", empId, password: mailboxPassword },
    });
    setIsSigningIn(false);
    if (error || !data?.success) {
      setLoginError(data?.error || "كلمة مرور البريد غير صحيحة");
      return;
    }

    setMailboxPassword("");
    setMailboxAuthenticated(true);
  };

  const openMessage = async (message: MailMessage) => {
    setSelectedEmail(message);
    if (message.to_email === employeeEmail && !message.read_at) {
      const readAt = new Date().toISOString();
      await supabase.from("employee_mail_messages").update({ read_at: readAt }).eq("id", message.id);
      setMessages((current) => current.map((item) => item.id === message.id ? { ...item, read_at: readAt } : item));
    }
  };

  if (isLoadingEmail) {
    return (
      <div className="h-screen bg-gray-900 text-white flex items-center justify-center" dir="rtl">
        <p className="text-gray-400">جاري تحميل البريد الإلكتروني...</p>
      </div>
    );
  }

  if (!mailboxAuthenticated) {
    return (
      <div className="h-screen bg-gray-900 text-white flex items-center justify-center p-4" dir="rtl">
        <div className="w-full max-w-md rounded-2xl border border-gray-700 bg-gray-800 p-6 shadow-2xl">
          <button onClick={onBack} className="mb-6 flex items-center gap-1 text-sm text-gray-400 hover:text-white">
            <ChevronLeft className="h-4 w-4 rotate-180" />
            رجوع
          </button>
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600/20">
              <Mail className="h-7 w-7 text-blue-400" />
            </div>
            <h1 className="text-xl font-bold">الدخول إلى البريد الإلكتروني</h1>
            <p className="mt-2 text-sm text-gray-400">البريد مثبت لحسابك، أدخل كلمة المرور فقط</p>
          </div>
          <form onSubmit={handleMailboxLogin} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm text-gray-300">البريد الإلكتروني</label>
              <input
                dir="ltr"
                type="email"
                value={employeeEmail}
                readOnly
                className="w-full cursor-not-allowed rounded-lg border border-gray-600 bg-gray-900 px-4 py-3 text-left font-mono text-blue-300 outline-none"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm text-gray-300">كلمة مرور البريد</label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={mailboxPassword}
                  onChange={(event) => {
                    setMailboxPassword(event.target.value);
                    setLoginError("");
                  }}
                  disabled={!employeeEmail || isSigningIn}
                  autoComplete="current-password"
                  placeholder="أدخل كلمة المرور"
                  className="w-full rounded-lg border border-gray-600 bg-gray-900 py-3 pr-10 pl-10 text-white outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {loginError && <p className="text-sm text-red-400">{loginError}</p>}
            <button
              type="submit"
              disabled={!employeeEmail || isSigningIn}
              className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSigningIn ? "جاري الدخول..." : "دخول البريد"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-900 text-white flex flex-col md:flex-row" dir="rtl">
      <div className="hidden md:flex w-64 bg-gray-800 flex-col border-l border-gray-700">
        <div className="p-4 border-b border-gray-700">
          <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center gap-2">
            <Send className="h-4 w-4" />
            إرسال
          </button>
        </div>
        <nav className="flex-1 p-2">
          {folders.map((folder) => (
            <button
              key={folder.id}
              onClick={() => { setActiveFolder(folder.id); setSelectedEmail(null); }}
              className={`w-full text-right px-4 py-2.5 rounded-lg font-medium transition flex items-center justify-between ${activeFolder === folder.id ? "bg-blue-600 text-white" : "text-gray-300 hover:bg-gray-700"}`}
            >
              <span>{folder.label}</span>
              {folder.count > 0 && <span className="bg-red-500 text-xs font-bold rounded-full min-w-5 h-5 px-1 flex items-center justify-center">{folder.count}</span>}
            </button>
          ))}
        </nav>
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="bg-gray-800 border-b border-gray-700 p-4 flex items-center justify-between md:justify-start md:gap-4">
          <button onClick={onBack} className="text-gray-400 hover:text-white">
            <ChevronLeft className="h-6 w-6 rotate-180" />
          </button>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Mail className="h-5 w-5 text-blue-400" />
              المراسلات
            </h1>
            {employeeEmail && <p dir="ltr" className="text-xs text-blue-300 font-mono mt-1 text-left">{employeeEmail}</p>}
          </div>
          <button onClick={() => setActiveFolder("settings")} className="md:hidden mr-auto text-gray-400 hover:text-white">
            <SettingsIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-hidden">
          {!selectedEmail ? (
            <div className="h-full overflow-y-auto">
              {(activeFolder === "inbox" || activeFolder === "sent") && (
                <div className="divide-y divide-gray-700">
                  {visibleMessages.map((message) => (
                    <button
                      key={message.id}
                      onClick={() => openMessage(message)}
                      className={`w-full p-4 text-right hover:bg-gray-800 transition ${activeFolder === "inbox" && !message.read_at ? "bg-gray-800/70 border-r-4 border-blue-500" : ""}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p dir="ltr" className="font-semibold text-left truncate">{activeFolder === "inbox" ? message.from_email : message.to_email}</p>
                          <p className="text-sm text-gray-300 mt-1 truncate">{message.subject}</p>
                          <p className="text-xs text-gray-500 mt-2 truncate">{message.body}</p>
                        </div>
                        <span className="text-xs text-gray-500 whitespace-nowrap">{new Date(message.created_at).toLocaleDateString("ar-SA")}</span>
                      </div>
                    </button>
                  ))}
                  {visibleMessages.length === 0 && <div className="p-8 text-center text-gray-400">لا توجد رسائل</div>}
                </div>
              )}

              {activeFolder === "trash" && <div className="p-8 text-center text-gray-400">سلة المهملات فارغة</div>}

              {activeFolder === "settings" && (
                <div className="p-6 space-y-4">
                  <h2 className="text-lg font-semibold">إعدادات البريد الإلكتروني</h2>
                  <div className="bg-gray-800 p-4 rounded-lg">
                    <label className="text-sm text-gray-400">عنوانك البريدي</label>
                    <p dir="ltr" className="text-white font-mono mt-1 text-left">{employeeEmail || "لم يتم إنشاء إيميل لهذا الموظف"}</p>
                  </div>
                  <label className="flex items-center gap-2 bg-gray-800 p-4 rounded-lg cursor-pointer">
                    <input type="checkbox" defaultChecked className="rounded" />
                    إشعارات البريد الجديد
                  </label>
                  <label className="flex items-center gap-2 bg-gray-800 p-4 rounded-lg cursor-pointer">
                    <input type="checkbox" defaultChecked className="rounded" />
                    اشتراك في رسائل الخصومات
                  </label>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full overflow-y-auto p-6">
              <div className="max-w-2xl">
                <button onClick={() => setSelectedEmail(null)} className="text-gray-400 hover:text-white mb-4 flex items-center gap-1">
                  <ChevronLeft className="h-4 w-4 rotate-180" />
                  رجوع
                </button>
                <div className="bg-gray-800 rounded-lg p-6">
                  <div className="flex items-start justify-between border-b border-gray-700 pb-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-400">من:</p>
                      <p dir="ltr" className="text-white font-semibold text-left">{selectedEmail.from_email}</p>
                      <p className="text-sm text-gray-400 mt-2">إلى:</p>
                      <p dir="ltr" className="text-white text-sm text-left">{selectedEmail.to_email}</p>
                    </div>
                    <button className="text-gray-400 hover:text-white"><Trash2 className="h-5 w-5" /></button>
                  </div>
                  <h2 className="text-xl font-bold mb-2">{selectedEmail.subject}</h2>
                  <div className="text-sm text-gray-400 mb-6">{new Date(selectedEmail.created_at).toLocaleString("ar-SA")}</div>
                  <div className="bg-gray-900 p-4 rounded text-white leading-relaxed whitespace-pre-line">{selectedEmail.body}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="md:hidden flex gap-1 bg-gray-800 border-t border-gray-700 p-2 overflow-x-auto">
        {folders.slice(0, 3).map((folder) => (
          <button
            key={folder.id}
            onClick={() => { setActiveFolder(folder.id); setSelectedEmail(null); }}
            className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition ${activeFolder === folder.id ? "bg-blue-600 text-white" : "text-gray-400 hover:bg-gray-700"}`}
          >
            {folder.label}{folder.count > 0 ? ` (${folder.count})` : ""}
          </button>
        ))}
      </div>
    </div>
  );
}
