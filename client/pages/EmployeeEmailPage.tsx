import { useEffect, useState } from "react";
import { Mail, Trash2, Send, Settings as SettingsIcon, ChevronLeft } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

interface Email {
  id: string;
  from: string;
  subject: string;
  preview: string;
  date: string;
  read: boolean;
}

export default function EmployeeEmailPage({
  onBack,
  empId,
  employeeName,
}: {
  onBack: () => void;
  empId?: string;
  employeeName?: string;
}) {
  const [activeFolder, setActiveFolder] = useState<"inbox" | "sent" | "trash" | "settings">("inbox");
  const [employeeEmail, setEmployeeEmail] = useState("");
  const [emails, setEmails] = useState<Email[]>([
    {
      id: "1",
      from: "admin@alayaf.com",
      subject: "رسالة ترحيب",
      preview: "مرحباً بك في نظام المراسلات...",
      date: "اليوم",
      read: false,
    },
  ]);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);

  useEffect(() => {
    async function loadEmployeeEmail() {
      if (!empId && !employeeName) return;

      let query = supabase
        .from("employee_emails")
        .select("generated_email")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1);

      if (empId) query = query.eq("emp_id", empId);
      const firstResult = await query.maybeSingle();
      if (firstResult.data?.generated_email) {
        setEmployeeEmail(String(firstResult.data.generated_email));
        return;
      }

      if (employeeName) {
        const fallback = await supabase
          .from("employee_emails")
          .select("generated_email")
          .eq("status", "active")
          .eq("emp_name", employeeName)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (fallback.data?.generated_email) setEmployeeEmail(String(fallback.data.generated_email));
      }
    }

    loadEmployeeEmail();
  }, [empId, employeeName]);

  const folders = [
    { id: "inbox", label: "صندوق الوارد", count: emails.filter(e => e.read === false).length },
    { id: "sent", label: "المرسل", count: 0 },
    { id: "trash", label: "المهملات", count: 0 },
    { id: "settings", label: "الإعدادات", count: 0 },
  ];

  return (
    <div className="h-screen bg-gray-900 text-white flex flex-col md:flex-row">
      {/* Sidebar */}
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
              onClick={() => {
                setActiveFolder(folder.id as any);
                setSelectedEmail(null);
              }}
              className={`w-full text-right px-4 py-2.5 rounded-lg font-medium transition flex items-center justify-between ${
                activeFolder === folder.id
                  ? "bg-blue-600 text-white"
                  : "text-gray-300 hover:bg-gray-700"
              }`}
            >
              <span>{folder.label}</span>
              {folder.count > 0 && (
                <span className="bg-red-500 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {folder.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-gray-800 border-b border-gray-700 p-4 flex items-center justify-between md:justify-start md:gap-4">
          <div className="md:hidden">
            <button
              onClick={onBack}
              className="text-gray-400 hover:text-white"
            >
              <ChevronLeft className="h-6 w-6 rotate-180" />
            </button>
          </div>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Mail className="h-5 w-5 text-blue-400" />
              المراسلات
            </h1>
            {employeeEmail && (
              <p dir="ltr" className="text-xs text-blue-300 font-mono mt-1 text-left">{employeeEmail}</p>
            )}
          </div>
          <div className="md:hidden ml-auto">
            <button className="text-gray-400 hover:text-white">
              <SettingsIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden">
          {!selectedEmail ? (
            // Email List
            <div className="h-full overflow-y-auto">
              {activeFolder === "inbox" && (
                <div className="divide-y divide-gray-700">
                  {emails.map((email) => (
                    <div
                      key={email.id}
                      onClick={() => setSelectedEmail(email)}
                      className={`p-4 cursor-pointer hover:bg-gray-800 transition ${
                        !email.read ? "bg-gray-750 border-l-4 border-blue-500" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-semibold">{email.from}</p>
                          <p className="text-sm text-gray-400 mt-1 line-clamp-2">
                            {email.subject}
                          </p>
                          <p className="text-xs text-gray-500 mt-2">{email.preview}</p>
                        </div>
                        <span className="text-xs text-gray-500 ml-2">{email.date}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeFolder === "sent" && (
                <div className="p-8 text-center text-gray-400">
                  <p>لا توجد رسائل مرسلة</p>
                </div>
              )}

              {activeFolder === "trash" && (
                <div className="p-8 text-center text-gray-400">
                  <p>سلة المهملات فارغة</p>
                </div>
              )}

              {activeFolder === "settings" && (
                <div className="p-6 space-y-4">
                  <h2 className="text-lg font-semibold">إعدادات البريد الإلكتروني</h2>
                  <div className="space-y-3">
                    <div className="bg-gray-800 p-4 rounded-lg">
                      <label className="text-sm text-gray-400">عنوانك البريدي</label>
                      <p dir="ltr" className="text-white font-mono mt-1 text-left">
                        {employeeEmail || "لم يتم إنشاء إيميل لهذا الموظف"}
                      </p>
                    </div>
                    <div className="bg-gray-800 p-4 rounded-lg">
                      <label className="flex items-center gap-2 text-white cursor-pointer">
                        <input type="checkbox" defaultChecked className="rounded" />
                        إشعارات البريد الجديد
                      </label>
                    </div>
                    <div className="bg-gray-800 p-4 rounded-lg">
                      <label className="flex items-center gap-2 text-white cursor-pointer">
                        <input type="checkbox" defaultChecked className="rounded" />
                        اشتراك في رسائل الخصومات
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            // Email Detail
            <div className="h-full overflow-y-auto p-6">
              <div className="max-w-2xl">
                <button
                  onClick={() => setSelectedEmail(null)}
                  className="text-gray-400 hover:text-white mb-4 flex items-center gap-1"
                >
                  <ChevronLeft className="h-4 w-4 rotate-180" />
                  رجوع
                </button>

                <div className="bg-gray-800 rounded-lg p-6">
                  <div className="flex items-start justify-between border-b border-gray-700 pb-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-400">من:</p>
                      <p className="text-white font-semibold">{selectedEmail.from}</p>
                    </div>
                    <button className="text-gray-400 hover:text-white">
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="mb-4">
                    <p className="text-sm text-gray-400">الموضوع:</p>
                    <h2 className="text-xl font-bold text-white">{selectedEmail.subject}</h2>
                  </div>

                  <div className="text-sm text-gray-400 mb-6">
                    {selectedEmail.date}
                  </div>

                  <div className="bg-gray-900 p-4 rounded text-white leading-relaxed">
                    {selectedEmail.preview}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Folder Tabs */}
      <div className="md:hidden flex gap-1 bg-gray-800 border-t border-gray-700 p-2 overflow-x-auto">
        {folders.slice(0, 3).map((folder) => (
          <button
            key={folder.id}
            onClick={() => {
              setActiveFolder(folder.id as any);
              setSelectedEmail(null);
            }}
            className={`flex-shrink-0 px-3 py-2 rounded-lg text-xs font-medium transition ${
              activeFolder === folder.id
                ? "bg-blue-600 text-white"
                : "text-gray-400 hover:bg-gray-700"
            }`}
          >
            {folder.label}
          </button>
        ))}
      </div>
    </div>
  );
}
