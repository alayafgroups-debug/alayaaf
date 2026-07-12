import { useEffect, useRef, useState } from "react";
import Layout from "@/components/Layout";
import { Plus, Printer, Download, Save, Trash2, Edit, X, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "@/hooks/use-toast";

const CLEARANCE_KEY = "termination_clearance_template";
const RELEASE_KEY = "termination_release_template";

const CLEARANCE_DEFAULT = `<p>أقر بأني استلمت من / (company_name) جميع الأموال والمبالغ المستحقة لي عن مختلف الأنواع الناتجة عن عملي وحتى انتهاء فترة خدمتي من (joining_date) إلى (termination_date) سواء كان مصدرها الرواتب الأساسية أو الإضافية أو البدلات النقدية أو العينية أو ساعات العمل الإضافية أو مستحقات إجازات السنوية أو مستحقات نهاية الخدمة أو أي مصدر آخر عادي أو استثنائي.</p><p><br></p><p>ويعتبر موافقتي على نموذج مخالصة الذمة تامة ونهائية ولا يحق لي بموجبها إقامة أي دعوى متعلقة بعقد العمل في أي وقت لدى أي جهة قضائية أو شبه قضائية داخل المملكة العربية السعودية أو خارجها.</p><p><br></p><p>وفي حالة عودتي للعمل مجدداً للعمل فأنا بعد جديد كموظف جديد.</p>`;

const RELEASE_DEFAULT = `<p style="text-align:center"><strong>إقرار من شركة: (company_name)</strong></p><p><br></p><p>بأن الموظف: (employee_name) يحمل هوية/جواز سفر رقم (identity_no) تحت رقم قد كان يعمل لدى الشركة في وظيفة (job_title)</p><p>بداية من تاريخ (joining_date) وحتى تاريخ (termination_date) وقد سلم كافة عهدة الشركة التي كانت في حوزته وتم إصدار هذا النموذج بناءً على طلبه.</p>`;

type Reason = { id: string; reason: string };

const TABS = [
  { id: "clearance", label: "إعداد قالب إقرار مخالصة خدمة" },
  { id: "release", label: "إعداد قالب إقرار إخلاء طرف" },
  { id: "reasons", label: "أسباب إخلاء الطرف" },
];

function RichEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (html: string) => void;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, []);

  const updateCounts = () => {
    const text = editorRef.current?.innerText ?? "";
    setCharCount(text.length);
    setWordCount(text.trim() ? text.trim().split(/\s+/).length : 0);
  };

  const execCmd = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleInput();
  };

  const handleInput = () => {
    const html = editorRef.current?.innerHTML ?? "";
    onChange(html);
    updateCounts();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Tab") {
      e.preventDefault();
      execCmd("insertText", "\u00a0\u00a0\u00a0\u00a0");
    }
  };

  const toolBtns: { title: string; cmd: string; val?: string; content: string }[] = [
    { title: "عريض", cmd: "bold", content: "<strong>B</strong>" },
    { title: "مائل", cmd: "italic", content: "<em>I</em>" },
    { title: "تسطير", cmd: "underline", content: "<u>U</u>" },
    { title: "ضرب", cmd: "strikeThrough", content: "<s>S</s>" },
    { title: "رابط", cmd: "createLink", val: prompt?.toString(), content: "🔗" },
  ];

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden" dir="rtl">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-1 border-b border-gray-200 bg-gray-50 p-2">
        <ToolBtn title="رجوع" onClick={() => execCmd("undo")}>↩</ToolBtn>
        <ToolBtn title="تقدم" onClick={() => execCmd("redo")}>↪</ToolBtn>
        <div className="w-px bg-gray-300 mx-1 self-stretch" />
        <ToolBtn title="عريض" onClick={() => execCmd("bold")}><strong>B</strong></ToolBtn>
        <ToolBtn title="مائل" onClick={() => execCmd("italic")}><em>I</em></ToolBtn>
        <ToolBtn title="تسطير" onClick={() => execCmd("underline")}><u>U</u></ToolBtn>
        <ToolBtn title="ضرب" onClick={() => execCmd("strikeThrough")}><s>S</s></ToolBtn>
        <div className="w-px bg-gray-300 mx-1 self-stretch" />
        <ToolBtn title="محاذاة يمين" onClick={() => execCmd("justifyRight")}>⮞</ToolBtn>
        <ToolBtn title="محاذاة وسط" onClick={() => execCmd("justifyCenter")}>≡</ToolBtn>
        <ToolBtn title="محاذاة يسار" onClick={() => execCmd("justifyLeft")}>⮜</ToolBtn>
        <ToolBtn title="ضبط" onClick={() => execCmd("justifyFull")}>☰</ToolBtn>
        <div className="w-px bg-gray-300 mx-1 self-stretch" />
        <ToolBtn title="قائمة منقطة" onClick={() => execCmd("insertUnorderedList")}>•≡</ToolBtn>
        <ToolBtn title="قائمة مرقمة" onClick={() => execCmd("insertOrderedList")}>1≡</ToolBtn>
        <div className="w-px bg-gray-300 mx-1 self-stretch" />
        <select
          onChange={(e) => execCmd("fontSize", e.target.value)}
          className="h-7 text-xs border border-gray-300 rounded px-1 bg-white"
          defaultValue="3"
        >
          {[1, 2, 3, 4, 5, 6, 7].map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        <select
          onChange={(e) => execCmd("formatBlock", e.target.value)}
          className="h-7 text-xs border border-gray-300 rounded px-1 bg-white"
          defaultValue="p"
        >
          <option value="p">فقرة</option>
          <option value="h1">عنوان 1</option>
          <option value="h2">عنوان 2</option>
          <option value="h3">عنوان 3</option>
        </select>
        <div className="w-px bg-gray-300 mx-1 self-stretch" />
        <ToolBtn title="إزالة التنسيق" onClick={() => execCmd("removeFormat")}>✕</ToolBtn>
      </div>

      {/* Editable area */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        dir="rtl"
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        className="min-h-[200px] max-h-[380px] overflow-y-auto p-4 text-sm leading-7 outline-none"
        style={{ direction: "rtl" }}
      />

      {/* Footer word/char count */}
      <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-3 py-1.5 text-xs text-gray-500">
        <span>POWERED BY JODIT</span>
        <span>{wordCount} كلمة · {charCount} حرف</span>
      </div>
    </div>
  );
}

function ToolBtn({ title, onClick, children }: { title: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="h-7 min-w-[28px] px-1.5 rounded text-sm border border-transparent hover:bg-gray-200 hover:border-gray-300 transition text-gray-700"
    >
      {children}
    </button>
  );
}

export default function HRTerminationSettings() {
  const [activeTab, setActiveTab] = useState("clearance");
  const [clearanceTemplate, setClearanceTemplate] = useState(CLEARANCE_DEFAULT);
  const [releaseTemplate, setReleaseTemplate] = useState(RELEASE_DEFAULT);
  const [reasons, setReasons] = useState<Reason[]>([]);
  const [reasonsLoading, setReasonsLoading] = useState(true);
  const [newReason, setNewReason] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [savingReason, setSavingReason] = useState(false);

  useEffect(() => {
    const loadTemplates = async () => {
      const { data } = await supabase
        .from("hr_settings")
        .select("setting_key, setting_value")
        .in("setting_key", [CLEARANCE_KEY, RELEASE_KEY]);

      (data ?? []).forEach((row: any) => {
        const val = typeof row.setting_value === "string" ? row.setting_value : JSON.stringify(row.setting_value);
        const clean = val.replace(/^"|"$/g, "").replace(/\\n/g, "\n");
        if (row.setting_key === CLEARANCE_KEY && clean) setClearanceTemplate(clean);
        if (row.setting_key === RELEASE_KEY && clean) setReleaseTemplate(clean);
      });
    };

    const loadReasons = async () => {
      setReasonsLoading(true);
      const { data, error } = await supabase.from("termination_release_reasons").select("*").order("created_at");
      if (!error && data) setReasons(data.map((r: any) => ({ id: String(r.id), reason: String(r.reason) })));
      setReasonsLoading(false);
    };

    loadTemplates();
    loadReasons();
  }, []);

  const saveTemplate = async (key: string, value: string) => {
    setSavingTemplate(true);
    try {
      const { error } = await supabase
        .from("hr_settings")
        .upsert({ setting_key: key, setting_value: value }, { onConflict: "setting_key" });
      if (error) throw error;
      toast({ title: "تم حفظ القالب بنجاح" });
    } catch (error) {
      toast({ title: "تعذر الحفظ", description: error instanceof Error ? error.message : "", variant: "destructive" });
    } finally {
      setSavingTemplate(false);
    }
  };

  const restoreDefault = (tab: string) => {
    if (tab === "clearance") setClearanceTemplate(CLEARANCE_DEFAULT);
    else if (tab === "release") setReleaseTemplate(RELEASE_DEFAULT);
  };

  const addReason = async () => {
    if (!newReason.trim()) return;
    setSavingReason(true);
    try {
      const { data, error } = await supabase
        .from("termination_release_reasons")
        .insert({ reason: newReason.trim() })
        .select()
        .single();
      if (error) throw error;
      setReasons((prev) => [...prev, { id: String(data.id), reason: String(data.reason) }]);
      setNewReason("");
      toast({ title: "تمت إضافة السبب" });
    } catch (error) {
      toast({ title: "تعذر الإضافة", description: error instanceof Error ? error.message : "", variant: "destructive" });
    } finally {
      setSavingReason(false);
    }
  };

  const updateReason = async (id: string) => {
    if (!editingText.trim()) return;
    try {
      const { error } = await supabase.from("termination_release_reasons").update({ reason: editingText.trim() }).eq("id", id);
      if (error) throw error;
      setReasons((prev) => prev.map((r) => (r.id === id ? { ...r, reason: editingText.trim() } : r)));
      setEditingId(null);
      toast({ title: "تم التعديل" });
    } catch (error) {
      toast({ title: "تعذر التعديل", description: error instanceof Error ? error.message : "", variant: "destructive" });
    }
  };

  const deleteReason = async (id: string) => {
    if (!confirm("حذف هذا السبب؟")) return;
    const { error } = await supabase.from("termination_release_reasons").delete().eq("id", id);
    if (error) { toast({ title: "تعذر الحذف", variant: "destructive" }); return; }
    setReasons((prev) => prev.filter((r) => r.id !== id));
    toast({ title: "تم الحذف" });
  };

  return (
    <Layout>
      <div className="w-full p-4 space-y-4" dir="rtl">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Tab bar */}
          <div className="flex border-b border-gray-200 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap px-5 py-3.5 text-sm font-medium border-b-2 transition ${
                  activeTab === tab.id
                    ? "border-[#004e89] text-white bg-[#004e89]"
                    : "border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Clearance template tab */}
          {activeTab === "clearance" && (
            <div className="p-5 space-y-4">
              <RichEditor value={clearanceTemplate} onChange={setClearanceTemplate} />
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => restoreDefault("clearance")}><RefreshCw className="h-4 w-4 ml-2" /> استعادة الإتراضي</Button>
                <Button onClick={() => saveTemplate(CLEARANCE_KEY, clearanceTemplate)} disabled={savingTemplate} className="bg-[#004e89] hover:bg-[#003d6d] text-white">
                  {savingTemplate ? "جاري الحفظ..." : "حفظ"}
                </Button>
              </div>
            </div>
          )}

          {/* Release template tab */}
          {activeTab === "release" && (
            <div className="p-5 space-y-4">
              <RichEditor value={releaseTemplate} onChange={setReleaseTemplate} />
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => restoreDefault("release")}><RefreshCw className="h-4 w-4 ml-2" /> استعادة الإتراضي</Button>
                <Button onClick={() => saveTemplate(RELEASE_KEY, releaseTemplate)} disabled={savingTemplate} className="bg-[#004e89] hover:bg-[#003d6d] text-white">
                  {savingTemplate ? "جاري الحفظ..." : "حفظ"}
                </Button>
              </div>
            </div>
          )}

          {/* Reasons tab */}
          {activeTab === "reasons" && (
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3 bg-[#004e89] text-white px-4 py-3 rounded-lg">
                <h2 className="font-bold">أسباب إخلاء الطرف</h2>
                <div className="flex items-center gap-2">
                  <button className="p-1.5 hover:bg-white/10 rounded"><Printer className="h-4 w-4" /></button>
                  <button className="p-1.5 hover:bg-white/10 rounded"><Download className="h-4 w-4" /></button>
                  <select className="h-7 text-sm text-black rounded px-2 bg-white border-none">
                    <option>10</option>
                    <option>25</option>
                    <option>50</option>
                  </select>
                </div>
              </div>

              {/* Add reason */}
              <div className="flex gap-2">
                <Input
                  value={newReason}
                  onChange={(e) => setNewReason(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") addReason(); }}
                  placeholder="أدخل سبب إخلاء الطرف الجديد"
                  className="flex-1"
                />
                <Button onClick={addReason} disabled={savingReason || !newReason.trim()} className="bg-[#004e89] hover:bg-[#003d6d] text-white">
                  <Plus className="h-4 w-4 ml-1" /> إضافة
                </Button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm text-right border border-gray-200 rounded-lg overflow-hidden">
                  <thead className="bg-gray-50 text-gray-700 border-b border-gray-200">
                    <tr>
                      <th className="py-3 px-4 font-medium w-20">معرف</th>
                      <th className="py-3 px-4 font-medium">سبب الإخلاء</th>
                      <th className="py-3 px-4 font-medium text-center w-28">الأمر</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {reasonsLoading ? (
                      <tr><td colSpan={3} className="py-8 text-center text-gray-400">جاري التحميل...</td></tr>
                    ) : reasons.length === 0 ? (
                      <tr><td colSpan={3} className="py-8 text-center text-gray-400">لا توجد أسباب مضافة</td></tr>
                    ) : reasons.map((item, index) => (
                      <tr key={item.id} className="hover:bg-gray-50/50">
                        <td className="py-3 px-4">{index + 1}</td>
                        <td className="py-3 px-4">
                          {editingId === item.id ? (
                            <div className="flex gap-2">
                              <Input value={editingText} onChange={(e) => setEditingText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") updateReason(item.id); }} className="flex-1 h-8 text-sm" autoFocus />
                              <button onClick={() => updateReason(item.id)} className="text-emerald-600 hover:text-emerald-800"><Save className="h-4 w-4" /></button>
                              <button onClick={() => setEditingId(null)} className="text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>
                            </div>
                          ) : (
                            item.reason
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex justify-center items-center gap-3">
                            <button onClick={() => { setEditingId(item.id); setEditingText(item.reason); }} className="text-gray-400 hover:text-[#004e89]"><Edit className="h-4 w-4" /></button>
                            <button onClick={() => deleteReason(item.id)} className="text-red-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="text-xs text-gray-500 text-left">يعرض {reasons.length} سجل</div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
