"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import AppNav from "./AppNav";

type QuizQ = { q: string; options: string[]; answer: number };

type LessonData = {
  id: string; title: string; order: number;
  videoUrl: string | null; fileUrl: string | null; fileName: string | null;
  completed: boolean;
  quiz: { id: string; passScore: number; questions: QuizQ[]; bestScore: number | null; passed: boolean } | null;
};

type CourseData = {
  id: string; title: string; description: string | null; emoji: string; order: number;
  lessons: LessonData[];
};

function homeFor(role: string) {
  if (role === "ADMIN" || role === "EXECUTIVE") return "/admin";
  if (role === "MENTOR") return "/mentor";
  return "/dashboard";
}

function driveEmbed(url: string) {
  const m = url.match(/\/file\/d\/([^/?]+)/);
  return m ? `https://drive.google.com/file/d/${m[1]}/preview` : url;
}

// ── Modal shell ──────────────────────────────────────────────────────────────

function ModalShell({ title, children, onClose, wide }: { title: string; children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4" style={{ background: "rgba(0,0,0,0.5)" }} onClick={onClose}>
      <div className={`bg-white w-full rounded-t-2xl md:rounded-2xl shadow-2xl overflow-hidden ${wide ? "md:max-w-2xl" : "md:max-w-md"}`} onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
          <button onClick={onClose} className="p-1 rounded text-gray-400 hover:text-gray-700">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
          <p className="font-semibold text-gray-800">{title}</p>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Shared input style ────────────────────────────────────────────────────────
const IPT = "w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-400 bg-white";

// ── Course form (add / edit) ──────────────────────────────────────────────────

function CourseFormModal({ initial, onClose, onSave }: {
  initial?: CourseData;
  onClose: () => void;
  onSave: (d: { title: string; description: string; emoji: string }) => Promise<void>;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [emoji, setEmoji] = useState(initial?.emoji ?? "📋");
  const [busy, setBusy] = useState(false);

  return (
    <ModalShell title={initial ? "แก้ไขหลักสูตร" : "เพิ่มหลักสูตร"} onClose={onClose}>
      <div className="p-5 space-y-3">
        <div className="flex gap-3">
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">อีโมจิ</label>
            <input value={emoji} onChange={e => setEmoji(e.target.value)} className={IPT + " w-16 text-center text-2xl"} />
          </div>
          <div className="flex-1">
            <label className="text-xs font-medium text-gray-500 block mb-1">ชื่อหลักสูตร *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} className={IPT} placeholder="เช่น ความปลอดภัยในการทำงาน" />
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">คำอธิบาย</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} className={IPT + " resize-none"} rows={3} placeholder="รายละเอียดหลักสูตร..." />
        </div>
        <div className="flex gap-2 pt-1">
          <button disabled={busy || !title.trim()} onClick={async () => { setBusy(true); await onSave({ title, description, emoji }); setBusy(false); }}
            className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-50" style={{ background: "#003E8E" }}>
            {busy ? "กำลังบันทึก..." : "บันทึก"}
          </button>
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200">ยกเลิก</button>
        </div>
      </div>
    </ModalShell>
  );
}

// ── Lesson form (add / edit) ──────────────────────────────────────────────────

function LessonFormModal({ initial, onClose, onSave }: {
  initial?: LessonData;
  onClose: () => void;
  onSave: (d: { title: string; videoUrl: string | null; fileUrl: string | null; fileName: string | null }) => Promise<void>;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [videoUrl, setVideoUrl] = useState(initial?.videoUrl ?? "");
  const [fileUrl, setFileUrl] = useState(initial?.fileUrl ?? "");
  const [fileName, setFileName] = useState(initial?.fileName ?? "");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const uploadPdf = async (file: File) => {
    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/training/upload", { method: "POST", body: form });
    if (res.ok) {
      const data = await res.json();
      setFileUrl(data.url);
      setFileName(data.name);
    } else {
      const err = await res.json().catch(() => ({}));
      alert(err.error ?? "อัปโหลดไม่สำเร็จ");
    }
    setUploading(false);
  };

  return (
    <ModalShell title={initial ? "แก้ไขหัวข้อ" : "เพิ่มหัวข้อ"} onClose={onClose}>
      <div className="p-5 space-y-3">
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">ชื่อหัวข้อ *</label>
          <input value={title} onChange={e => setTitle(e.target.value)} className={IPT} placeholder="เช่น บทนำระบบไฟฟ้า" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">🎬 ลิงค์วิดีโอ Google Drive</label>
          <input value={videoUrl} onChange={e => setVideoUrl(e.target.value)} className={IPT} placeholder="https://drive.google.com/file/d/..." />
          <p className="text-xs text-gray-400 mt-1">วางลิงค์แชร์จาก Google Drive (แปลงเป็น embed อัตโนมัติ)</p>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">📄 ไฟล์บรรยาย PDF (ไม่เกิน 20MB)</label>
          {fileUrl ? (
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl border border-gray-200">
              <span className="text-sm text-gray-700 flex-1 truncate">📎 {fileName || "ไฟล์"}</span>
              <button onClick={() => { setFileUrl(""); setFileName(""); }} className="text-xs text-red-500 hover:text-red-700 flex-shrink-0">ลบ</button>
            </div>
          ) : (
            <button onClick={() => fileRef.current?.click()} disabled={uploading}
              className="w-full py-3 border border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors disabled:opacity-50">
              {uploading ? "⏳ กำลังอัปโหลด..." : "📁 คลิกเพื่ออัปโหลด PDF"}
            </button>
          )}
          <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={e => e.target.files?.[0] && uploadPdf(e.target.files[0])} />
        </div>
        <div className="flex gap-2 pt-1">
          <button disabled={busy || !title.trim() || uploading} onClick={async () => {
            setBusy(true);
            await onSave({ title, videoUrl: videoUrl.trim() || null, fileUrl: fileUrl.trim() || null, fileName: fileName.trim() || null });
            setBusy(false);
          }} className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-50" style={{ background: "#003E8E" }}>
            {busy ? "กำลังบันทึก..." : "บันทึก"}
          </button>
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200">ยกเลิก</button>
        </div>
      </div>
    </ModalShell>
  );
}

// ── Quiz builder ──────────────────────────────────────────────────────────────

function QuizBuilderModal({ lesson, onClose, onSave }: {
  lesson: LessonData;
  onClose: () => void;
  onSave: (d: { passScore: number; questions: QuizQ[] }) => Promise<void>;
}) {
  const [passScore, setPassScore] = useState(lesson.quiz?.passScore ?? 70);
  const [questions, setQuestions] = useState<QuizQ[]>(
    lesson.quiz?.questions.length ? lesson.quiz.questions : [{ q: "", options: ["", "", "", ""], answer: 0 }]
  );
  const [busy, setBusy] = useState(false);

  const addQ = () => setQuestions(p => [...p, { q: "", options: ["", "", "", ""], answer: 0 }]);
  const removeQ = (i: number) => setQuestions(p => p.filter((_, j) => j !== i));
  const setQ = (i: number, patch: Partial<QuizQ>) => setQuestions(p => p.map((q, j) => j === i ? { ...q, ...patch } : q));
  const setOpt = (qi: number, oi: number, val: string) =>
    setQ(qi, { options: questions[qi].options.map((o, j) => j === oi ? val : o) });

  const valid = questions.every(q => q.q.trim() && q.options.every(o => o.trim()));

  return (
    <ModalShell title={`ข้อสอบ: ${lesson.title}`} onClose={onClose} wide>
      <div className="p-5 overflow-y-auto" style={{ maxHeight: "65vh" }}>
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
          <span className="text-sm text-gray-600">เกณฑ์ผ่าน</span>
          <input type="number" min={50} max={100} value={passScore} onChange={e => setPassScore(Number(e.target.value))}
            className="w-16 border border-gray-200 rounded-lg px-2 py-1 text-sm text-center" />
          <span className="text-sm text-gray-500">% ขึ้นไป</span>
        </div>

        <div className="space-y-4">
          {questions.map((q, qi) => (
            <div key={qi} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <div className="flex items-start gap-2 mb-3">
                <span className="text-sm font-bold text-gray-400 mt-2 flex-shrink-0">{qi + 1}.</span>
                <input value={q.q} onChange={e => setQ(qi, { q: e.target.value })} className={IPT + " flex-1"} placeholder="คำถาม..." />
                {questions.length > 1 && (
                  <button onClick={() => removeQ(qi)} className="mt-2 text-red-400 hover:text-red-600 text-lg leading-none flex-shrink-0">×</button>
                )}
              </div>
              <div className="space-y-2 pl-5">
                {q.options.map((opt, oi) => (
                  <div key={oi} className="flex items-center gap-2">
                    <input type="radio" name={`ans-${qi}`} checked={q.answer === oi} onChange={() => setQ(qi, { answer: oi })}
                      className="flex-shrink-0" style={{ accentColor: "#003E8E" }} />
                    <input value={opt} onChange={e => setOpt(qi, oi, e.target.value)}
                      className={`${IPT} ${q.answer === oi ? "border-green-400 bg-green-50" : ""}`}
                      placeholder={`ตัวเลือก ${String.fromCharCode(65 + oi)}`} />
                  </div>
                ))}
                <p className="text-xs text-gray-400">กดวงกลมเพื่อทำเครื่องหมายเฉลย</p>
              </div>
            </div>
          ))}
        </div>

        <button onClick={addQ}
          className="mt-3 w-full py-2.5 border border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors">
          + เพิ่มข้อ
        </button>
      </div>

      <div className="px-5 pb-5 flex gap-2 border-t border-gray-100 pt-4">
        <button disabled={busy || !valid} onClick={async () => { setBusy(true); await onSave({ passScore, questions }); setBusy(false); }}
          className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-50" style={{ background: "#003E8E" }}>
          {busy ? "กำลังบันทึก..." : `บันทึก ${questions.length} ข้อ`}
        </button>
        <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200">ยกเลิก</button>
      </div>
    </ModalShell>
  );
}

// ── Lesson modal (viewer) ─────────────────────────────────────────────────────

function LessonModal({ lesson, courseId, onClose, onComplete, onQuizDone }: {
  lesson: LessonData; courseId: string;
  onClose: () => void;
  onComplete: (lessonId: string) => void;
  onQuizDone: (updated: LessonData) => void;
}) {
  const [answers, setAnswers] = useState<(number | null)[]>(
    lesson.quiz ? new Array(lesson.quiz.questions.length).fill(null) : []
  );
  const [quizResult, setQuizResult] = useState<{ score: number; passed: boolean; correct: number; total: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [marking, setMarking] = useState(false);

  const submitQuiz = async () => {
    if (!lesson.quiz || answers.some(a => a === null)) return;
    setSubmitting(true);
    const res = await fetch(`/api/training/quiz/${lesson.quiz.id}/attempt`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answers })
    });
    const data = await res.json();
    setQuizResult(data);
    setSubmitting(false);
    if (data.passed) {
      onQuizDone({ ...lesson, completed: true, quiz: { ...lesson.quiz!, bestScore: data.score, passed: true } });
    } else if (lesson.quiz!.bestScore === null || data.score > lesson.quiz!.bestScore) {
      onQuizDone({ ...lesson, quiz: { ...lesson.quiz!, bestScore: data.score } });
    }
  };

  const markDone = async () => {
    if (lesson.completed) return;
    setMarking(true);
    await fetch("/api/training/progress", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lessonId: lesson.id }) });
    onComplete(lesson.id);
    setMarking(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col md:items-center md:justify-center md:p-6" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}>
      <div className="bg-white w-full md:max-w-3xl md:rounded-2xl shadow-2xl flex flex-col overflow-hidden" style={{ maxHeight: "100dvh", height: "100dvh", ...(typeof window !== "undefined" && window.innerWidth >= 768 ? { maxHeight: "90vh", height: "auto" } : {}) }}>
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 flex-shrink-0" style={{ background: "linear-gradient(135deg,#003E8E,#0052b4)" }}>
          <button onClick={onClose} className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-white truncate">{lesson.title}</p>
            {lesson.completed && <span className="text-xs text-green-300">✓ เรียนแล้ว</span>}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-5 space-y-6">
            {/* Video */}
            {lesson.videoUrl && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">▶ วิดีโอสอน</p>
                <div className="rounded-xl overflow-hidden bg-black" style={{ aspectRatio: "16/9" }}>
                  <iframe src={driveEmbed(lesson.videoUrl)} className="w-full h-full" allow="autoplay" allowFullScreen style={{ border: "none" }} />
                </div>
              </div>
            )}

            {/* PDF */}
            {lesson.fileUrl && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">📄 ไฟล์บรรยาย</p>
                <div className="border border-gray-200 rounded-xl overflow-hidden" style={{ height: 480 }}>
                  <iframe src={lesson.fileUrl} className="w-full h-full" style={{ border: "none" }} />
                </div>
                <a href={lesson.fileUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-block mt-2 text-xs text-blue-600 hover:underline">
                  ⬇ ดาวน์โหลด {lesson.fileName ?? "ไฟล์"}
                </a>
              </div>
            )}

            {/* Quiz */}
            {lesson.quiz && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
                  ✏️ แบบทดสอบ · ผ่าน {lesson.quiz.passScore}%
                  {lesson.quiz.bestScore != null && ` · คะแนนดีสุด ${lesson.quiz.bestScore}%`}
                </p>

                {quizResult ? (
                  <div className={`rounded-2xl p-6 text-center border ${quizResult.passed ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
                    <div className="text-5xl font-bold mb-1" style={{ color: quizResult.passed ? "#10B981" : "#EF4444" }}>{quizResult.score}%</div>
                    <p className="font-semibold text-lg mb-1" style={{ color: quizResult.passed ? "#059669" : "#DC2626" }}>
                      {quizResult.passed ? "🎉 ผ่านแล้ว!" : "❌ ไม่ผ่าน"}
                    </p>
                    <p className="text-sm text-gray-500 mb-4">ตอบถูก {quizResult.correct} จาก {quizResult.total} ข้อ</p>
                    {!quizResult.passed && (
                      <button onClick={() => { setQuizResult(null); setAnswers(new Array(lesson.quiz!.questions.length).fill(null)); }}
                        className="text-sm px-4 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50">
                        ลองใหม่
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {lesson.quiz.questions.map((q, qi) => (
                      <div key={qi} className="bg-gray-50 rounded-2xl p-4">
                        <p className="text-sm font-semibold text-gray-800 mb-3">{qi + 1}. {q.q}</p>
                        <div className="space-y-2">
                          {q.options.map((opt, oi) => (
                            <button key={oi} onClick={() => {
                              const a = [...answers];
                              a[qi] = oi;
                              setAnswers(a);
                            }}
                              className={`w-full text-left px-4 py-2.5 rounded-xl text-sm border transition-all ${answers[qi] === oi ? "border-blue-400 bg-blue-50 text-blue-800 font-medium" : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"}`}>
                              {String.fromCharCode(65 + oi)}. {opt}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                    <button onClick={submitQuiz} disabled={submitting || answers.some(a => a === null)}
                      className="w-full py-3 rounded-2xl font-semibold text-white text-sm disabled:opacity-40 transition-opacity"
                      style={{ background: "#003E8E" }}>
                      {submitting ? "กำลังตรวจ..." : `ส่งคำตอบ (${answers.filter(a => a !== null).length}/${lesson.quiz.questions.length} ข้อ)`}
                    </button>
                  </div>
                )}
              </div>
            )}

            {!lesson.videoUrl && !lesson.fileUrl && !lesson.quiz && (
              <div className="text-center py-16 text-gray-400 text-sm">ยังไม่มีเนื้อหาในหัวข้อนี้</div>
            )}
          </div>
        </div>

        {/* Footer — mark complete (only for non-quiz lessons) */}
        {!lesson.quiz && (
          <div className="px-5 py-4 border-t border-gray-100 flex-shrink-0">
            {lesson.completed ? (
              <div className="text-center text-sm text-green-600 font-medium py-1">✓ ทำเครื่องหมายเรียนแล้ว</div>
            ) : (
              <button onClick={markDone} disabled={marking}
                className="w-full py-3 rounded-2xl font-semibold text-white text-sm disabled:opacity-50"
                style={{ background: "#003E8E" }}>
                {marking ? "กำลังบันทึก..." : "✅ ทำเครื่องหมายว่าเรียนแล้ว"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Lesson row ────────────────────────────────────────────────────────────────

function LessonRow({ lesson, index, isAdmin, onOpen, onEdit, onQuiz, onDelete }: {
  lesson: LessonData; index: number; isAdmin: boolean;
  onOpen: () => void; onEdit: () => void; onQuiz: () => void; onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors cursor-pointer group" onClick={onOpen}>
      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-colors ${lesson.completed ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-600"}`}>
        {lesson.completed ? "✓" : index}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 leading-snug">{lesson.title}</p>
        <div className="flex flex-wrap gap-2 mt-0.5">
          {lesson.videoUrl && <span className="text-xs text-gray-400">▶ วิดีโอ</span>}
          {lesson.fileUrl && <span className="text-xs text-gray-400">📄 {lesson.fileName ?? "PDF"}</span>}
          {lesson.quiz && (
            <span className={`text-xs font-medium ${lesson.quiz.passed ? "text-green-600" : lesson.quiz.bestScore != null ? "text-amber-600" : "text-gray-400"}`}>
              ✏️ แบบทดสอบ{lesson.quiz.bestScore != null ? ` · ${lesson.quiz.bestScore}%` : ""}
            </span>
          )}
          {!lesson.videoUrl && !lesson.fileUrl && !lesson.quiz && <span className="text-xs text-gray-300">ยังไม่มีเนื้อหา</span>}
        </div>
      </div>
      {isAdmin && (
        <div className="flex gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
          <button onClick={onEdit} className="text-xs px-2 py-1 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">แก้ไข</button>
          <button onClick={onQuiz} className="text-xs px-2 py-1 rounded-lg border border-amber-200 text-amber-600 hover:bg-amber-50">
            {lesson.quiz ? "ข้อสอบ" : "+ข้อสอบ"}
          </button>
          <button onClick={onDelete} className="text-xs px-2 py-1 rounded-lg border border-red-200 text-red-500 hover:bg-red-50">ลบ</button>
        </div>
      )}
      <span className="text-gray-300 flex-shrink-0">›</span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

type AdminModal =
  | { type: "addCourse" }
  | { type: "editCourse"; course: CourseData }
  | { type: "addLesson"; course: CourseData }
  | { type: "editLesson"; lesson: LessonData; course: CourseData }
  | { type: "quiz"; lesson: LessonData };

export default function TrainingView({ initCourses, meId, meRole, meName, meImage }: {
  initCourses: CourseData[]; meId: string; meRole: string; meName: string; meImage: string | null;
}) {
  const isAdmin = meRole === "ADMIN";
  const [courses, setCourses] = useState(initCourses);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobilePane, setMobilePane] = useState<"list" | "course">("list");
  const [lessonModal, setLessonModal] = useState<{ lesson: LessonData; courseId: string } | null>(null);
  const [adminModal, setAdminModal] = useState<AdminModal | null>(null);

  const selected = courses.find(c => c.id === selectedId) ?? null;

  const updateLesson = (courseId: string, updated: LessonData) => {
    setCourses(prev => prev.map(c => c.id === courseId
      ? { ...c, lessons: c.lessons.map(l => l.id === updated.id ? updated : l) }
      : c
    ));
    if (lessonModal?.lesson.id === updated.id) setLessonModal({ lesson: updated, courseId });
  };

  const markComplete = (lessonId: string, courseId: string) => {
    const lesson = courses.find(c => c.id === courseId)?.lessons.find(l => l.id === lessonId);
    if (lesson) updateLesson(courseId, { ...lesson, completed: true });
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F0F2F8" }}>
      <AppNav name={meName} image={meImage} role={meRole} profileHref="/profile" fullWidth />

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Page header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold" style={{ color: "#003E8E" }}>เนื้อหาอบรม</h1>
            <p className="text-sm text-gray-400">{courses.length} หลักสูตร</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href={homeFor(meRole)}
              className="text-sm px-3 py-1.5 rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors">
              ← กลับ
            </Link>
            {isAdmin && (
              <button onClick={() => setAdminModal({ type: "addCourse" })}
                className="text-sm px-4 py-1.5 rounded-xl text-white font-medium" style={{ background: "#003E8E" }}>
                + เพิ่มหลักสูตร
              </button>
            )}
          </div>
        </div>

        <div className="flex gap-5 items-start">
          {/* ── Course list ──────────────────────────────────────────────── */}
          <div className={`w-full md:w-72 flex-shrink-0 ${mobilePane === "course" ? "hidden md:block" : ""}`}>
            {courses.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center text-gray-400 text-sm">
                {isAdmin ? 'กด "+ เพิ่มหลักสูตร" เพื่อเริ่มต้น' : "ยังไม่มีหลักสูตร"}
              </div>
            ) : (
              <div className="space-y-3">
                {courses.map(c => {
                  const total = c.lessons.length;
                  const done = c.lessons.filter(l => l.completed).length;
                  const pct = total ? Math.round((done / total) * 100) : 0;
                  const active = selectedId === c.id;
                  return (
                    <div key={c.id} className={`bg-white rounded-2xl border shadow-sm transition-all ${active ? "border-blue-400 ring-1 ring-blue-300" : "border-gray-100 hover:border-blue-200"}`}>
                      <button className="w-full text-left p-4" onClick={() => { setSelectedId(c.id); setMobilePane("course"); }}>
                        <div className="flex items-start gap-3">
                          <span className="text-2xl flex-shrink-0">{c.emoji}</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-800 text-sm leading-snug">{c.title}</p>
                            {c.description && <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{c.description}</p>}
                            <div className="mt-2.5 flex items-center gap-2">
                              <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: pct === 100 ? "#10B981" : "#003E8E" }} />
                              </div>
                              <span className="text-xs text-gray-400 flex-shrink-0">{done}/{total}</span>
                            </div>
                          </div>
                        </div>
                      </button>
                      {isAdmin && (
                        <div className="flex gap-1 px-4 pb-3 justify-end border-t border-gray-50 pt-2">
                          <button onClick={() => setAdminModal({ type: "editCourse", course: c })}
                            className="text-xs px-2 py-1 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">แก้ไข</button>
                          <button onClick={async () => {
                            if (!confirm(`ลบหลักสูตร "${c.title}" และเนื้อหาทั้งหมด?`)) return;
                            await fetch(`/api/training/${c.id}`, { method: "DELETE" });
                            setCourses(p => p.filter(x => x.id !== c.id));
                            if (selectedId === c.id) setSelectedId(null);
                          }} className="text-xs px-2 py-1 rounded-lg border border-red-200 text-red-500 hover:bg-red-50">ลบ</button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Course detail ─────────────────────────────────────────────── */}
          <div className={`flex-1 min-w-0 ${mobilePane === "list" ? "hidden md:block" : ""}`}>
            {selected ? (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {/* mobile back */}
                <div className="md:hidden flex items-center gap-2 px-5 py-3 border-b border-gray-50 bg-gray-50">
                  <button onClick={() => setMobilePane("list")} className="text-sm text-blue-600">← กลับ</button>
                  <span className="text-sm font-medium text-gray-700 truncate">{selected.emoji} {selected.title}</span>
                </div>
                {/* header */}
                <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-50">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-3xl flex-shrink-0">{selected.emoji}</span>
                    <div className="min-w-0">
                      <p className="font-bold text-gray-800 leading-snug">{selected.title}</p>
                      {selected.description && <p className="text-xs text-gray-400 mt-0.5 truncate">{selected.description}</p>}
                    </div>
                  </div>
                  {isAdmin && (
                    <button onClick={() => setAdminModal({ type: "addLesson", course: selected })}
                      className="text-sm px-3 py-1.5 rounded-xl text-white font-medium flex-shrink-0" style={{ background: "#003E8E" }}>
                      + หัวข้อ
                    </button>
                  )}
                </div>
                {/* lessons */}
                {selected.lessons.length === 0 ? (
                  <div className="py-16 text-center text-gray-400 text-sm">
                    {isAdmin ? 'กด "+ หัวข้อ" เพื่อเพิ่มเนื้อหา' : "ยังไม่มีหัวข้อ"}
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {selected.lessons.map((l, i) => (
                      <LessonRow key={l.id} lesson={l} index={i + 1} isAdmin={isAdmin}
                        onOpen={() => setLessonModal({ lesson: l, courseId: selected.id })}
                        onEdit={() => setAdminModal({ type: "editLesson", lesson: l, course: selected })}
                        onQuiz={() => setAdminModal({ type: "quiz", lesson: l })}
                        onDelete={async () => {
                          if (!confirm(`ลบหัวข้อ "${l.title}" ?`)) return;
                          await fetch(`/api/training/${selected.id}/lessons/${l.id}`, { method: "DELETE" });
                          setCourses(p => p.map(c => c.id === selected.id ? { ...c, lessons: c.lessons.filter(x => x.id !== l.id) } : c));
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="hidden md:flex flex-col items-center justify-center h-64 bg-white rounded-2xl border border-gray-100 shadow-sm text-gray-400 gap-3">
                <span className="text-4xl">📚</span>
                <p className="text-sm">เลือกหลักสูตรทางซ้ายเพื่อดูเนื้อหา</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lesson viewer */}
      {lessonModal && (
        <LessonModal
          lesson={lessonModal.lesson}
          courseId={lessonModal.courseId}
          onClose={() => setLessonModal(null)}
          onComplete={lid => markComplete(lid, lessonModal.courseId)}
          onQuizDone={updated => updateLesson(lessonModal.courseId, updated)}
        />
      )}

      {/* Admin modals */}
      {isAdmin && adminModal?.type === "addCourse" && (
        <CourseFormModal onClose={() => setAdminModal(null)} onSave={async d => {
          const res = await fetch("/api/training", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(d) });
          if (!res.ok) { alert("ไม่สำเร็จ"); return; }
          const c = await res.json();
          setCourses(p => [...p, { ...c, lessons: [] }]);
          setAdminModal(null);
        }} />
      )}

      {isAdmin && adminModal?.type === "editCourse" && (
        <CourseFormModal initial={adminModal.course} onClose={() => setAdminModal(null)} onSave={async d => {
          const res = await fetch(`/api/training/${adminModal.course.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(d) });
          if (!res.ok) { alert("ไม่สำเร็จ"); return; }
          const u = await res.json();
          setCourses(p => p.map(c => c.id === u.id ? { ...c, ...u } : c));
          setAdminModal(null);
        }} />
      )}

      {isAdmin && adminModal?.type === "addLesson" && (
        <LessonFormModal onClose={() => setAdminModal(null)} onSave={async d => {
          const res = await fetch(`/api/training/${adminModal.course.id}/lessons`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(d) });
          if (!res.ok) { alert("ไม่สำเร็จ"); return; }
          const l = await res.json();
          setCourses(p => p.map(c => c.id === adminModal.course.id ? { ...c, lessons: [...c.lessons, { ...l, completed: false, quiz: null }] } : c));
          setAdminModal(null);
        }} />
      )}

      {isAdmin && adminModal?.type === "editLesson" && (
        <LessonFormModal initial={adminModal.lesson} onClose={() => setAdminModal(null)} onSave={async d => {
          const res = await fetch(`/api/training/${adminModal.course.id}/lessons/${adminModal.lesson.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(d) });
          if (!res.ok) { alert("ไม่สำเร็จ"); return; }
          const u = await res.json();
          updateLesson(adminModal.course.id, { ...adminModal.lesson, ...u });
          setAdminModal(null);
        }} />
      )}

      {isAdmin && adminModal?.type === "quiz" && (
        <QuizBuilderModal lesson={adminModal.lesson} onClose={() => setAdminModal(null)} onSave={async d => {
          const res = await fetch("/api/training/quiz", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lessonId: adminModal.lesson.id, ...d }) });
          if (!res.ok) { alert("ไม่สำเร็จ"); return; }
          const q = await res.json();
          const newQuiz = { id: q.id, passScore: q.passScore, questions: q.questions as QuizQ[], bestScore: adminModal.lesson.quiz?.bestScore ?? null, passed: adminModal.lesson.quiz?.passed ?? false };
          setCourses(p => p.map(c => ({ ...c, lessons: c.lessons.map(l => l.id === adminModal.lesson.id ? { ...l, quiz: newQuiz } : l) })));
          setAdminModal(null);
        }} />
      )}
    </div>
  );
}
