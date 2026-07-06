"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import {
  JOB_TYPE_LABEL, SYSTEM_LABEL, STATUS_LABEL, STATUS_COLOR, LEVEL_LABEL,
  SCORE_CRITERIA, PPE_OPTIONS,
} from "@/lib/labels";

type Rep = {
  id: string; date: string; title: string; description: string;
  jobType: string | null; systemCategory: string | null; location: string | null;
  tools: string[]; ppe: string[]; learned: string | null;
  status: string; assignedMentorId: string | null; mentorComment: string | null;
  scores: Record<string, number> | null;
  user: { name: string | null; image: string | null; level: string | null; school: string | null };
};

export default function MentorView({ meId, meName, meImage, reports: initial }: {
  meId: string; meName: string; meImage?: string | null; reports: Rep[];
}) {
  const [reports, setReports] = useState<Rep[]>(initial);
  const [tab, setTab] = useState<"mine" | "all">("mine");
  const [evalTarget, setEvalTarget] = useState<Rep | null>(null);

  const mine = reports.filter(r => r.assignedMentorId === meId);
  const list = tab === "mine" ? mine : reports;
  const pending = mine.filter(r => r.status === "PENDING_APPROVAL").length;

  const onDone = (updated: Rep) => {
    setReports(prev => prev.map(r => (r.id === updated.id ? { ...r, ...updated } : r)));
    setEvalTarget(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-blue-950 text-white shadow-lg">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div>
            <span className="font-bold text-yellow-400 text-lg">SNTrainee</span>
            <span className="text-blue-300 text-xs ml-2">พี่เลี้ยง</span>
          </div>
          <div className="flex items-center gap-3">
            {meImage && <img src={meImage} className="w-7 h-7 rounded-full" alt="" />}
            <span className="text-sm text-blue-200 hidden sm:inline">{meName}</span>
            <button onClick={() => signOut({ callbackUrl: "/" })} className="text-xs text-blue-300 hover:text-white px-2 py-1 rounded hover:bg-blue-800">ออกจากระบบ</button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-1">รายงานนักศึกษา</h1>
        <p className="text-gray-500 text-sm mb-6">อนุมัติและประเมินงานที่ได้รับมอบหมาย</p>

        <div className="flex gap-2 mb-6">
          <Tab active={tab === "mine"} onClick={() => setTab("mine")}>งานของฉัน {pending > 0 && <span className="ml-1 bg-amber-500 text-white text-xs px-1.5 rounded-full">{pending}</span>}</Tab>
          <Tab active={tab === "all"} onClick={() => setTab("all")}>ทั้งหมด</Tab>
        </div>

        {list.length === 0 ? (
          <p className="text-center py-20 text-gray-400">ไม่มีรายการ</p>
        ) : (
          <div className="space-y-3">
            {list.map(r => {
              const canAct = r.assignedMentorId === meId;
              return (
                <div key={r.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-xs font-medium bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{fmt(r.date)}</span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLOR[r.status]}`}>{STATUS_LABEL[r.status]}</span>
                        {r.systemCategory && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{SYSTEM_LABEL[r.systemCategory]}</span>}
                        {r.jobType && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{JOB_TYPE_LABEL[r.jobType]}</span>}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        {r.user.image && <img src={r.user.image} className="w-5 h-5 rounded-full" alt="" />}
                        <span className="font-medium">{r.user.name}</span>
                        {r.user.level && <span className="text-xs text-gray-400">{LEVEL_LABEL[r.user.level]}</span>}
                      </div>
                      <h3 className="font-semibold text-gray-800 mt-1">{r.title}</h3>
                      {r.location && <p className="text-xs text-gray-400">📍 {r.location}</p>}
                      <p className="text-gray-500 text-sm mt-1">{r.description}</p>
                      {r.tools.length > 0 && <p className="text-xs text-gray-400 mt-1">🔧 {r.tools.join(", ")}</p>}
                      {r.ppe.length > 0 && <p className="text-xs text-green-600 mt-1">🦺 {r.ppe.length} รายการความปลอดภัย</p>}
                      {r.learned && <p className="text-sm text-gray-500 mt-1"><span className="font-medium">สิ่งที่เรียนรู้:</span> {r.learned}</p>}
                      {r.mentorComment && (
                        <div className="mt-2 text-sm bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 text-amber-800">
                          <span className="font-medium">ความเห็น:</span> {r.mentorComment}
                        </div>
                      )}
                      {r.scores && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {SCORE_CRITERIA.map(c => (
                            <span key={c.key} className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">{c.label}: {r.scores![c.key] ?? "-"}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    {canAct && r.status !== "APPROVED" && (
                      <button onClick={() => setEvalTarget(r)} className="shrink-0 bg-blue-700 hover:bg-blue-800 text-white text-sm px-3 py-1.5 rounded-lg font-medium">ตรวจงาน</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {evalTarget && <EvalModal report={evalTarget} onClose={() => setEvalTarget(null)} onDone={onDone} />}
    </div>
  );
}

function EvalModal({ report, onClose, onDone }: { report: Rep; onClose: () => void; onDone: (r: Rep) => void }) {
  const [scores, setScores] = useState<Record<string, number>>(
    () => report.scores ?? Object.fromEntries(SCORE_CRITERIA.map(c => [c.key, 3]))
  );
  const [comment, setComment] = useState(report.mentorComment ?? "");
  const [busy, setBusy] = useState(false);

  const submit = async (action: "approve" | "reject") => {
    if (action === "reject" && !comment.trim()) return alert("กรุณาระบุเหตุผลที่ตีกลับ");
    setBusy(true);
    const res = await fetch(`/api/reports/${report.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, scores, comment }),
    });
    setBusy(false);
    if (!res.ok) return alert((await res.json()).error ?? "ไม่สำเร็จ");
    const updated = await res.json();
    onDone({ ...report, ...updated });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-1">ตรวจงาน: {report.user.name}</h2>
        <p className="text-sm text-gray-500 mb-4">{report.title}</p>

        <p className="text-sm font-medium text-gray-700 mb-2">ให้คะแนน (1–5)</p>
        <div className="space-y-3 mb-4">
          {SCORE_CRITERIA.map(c => (
            <div key={c.key}>
              <div className="flex justify-between text-sm mb-1"><span className="text-gray-600">{c.label}</span><span className="font-medium text-blue-700">{scores[c.key]}</span></div>
              <input type="range" min={1} max={5} value={scores[c.key]} onChange={e => setScores({ ...scores, [c.key]: +e.target.value })} className="w-full accent-blue-700" />
            </div>
          ))}
        </div>

        <label className="block text-sm font-medium text-gray-700 mb-1">ความเห็น</label>
        <textarea rows={3} value={comment} onChange={e => setComment(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 resize-none mb-4" placeholder="ข้อเสนอแนะ / เหตุผลที่ตีกลับ" />

        <div className="flex gap-3">
          <button disabled={busy} onClick={() => submit("approve")} className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white py-2.5 rounded-xl font-medium">อนุมัติ</button>
          <button disabled={busy} onClick={() => submit("reject")} className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white py-2.5 rounded-xl font-medium">ตีกลับ</button>
          <button disabled={busy} onClick={onClose} className="px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium">ปิด</button>
        </div>
      </div>
    </div>
  );
}

function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`px-4 py-2 rounded-lg text-sm font-medium ${active ? "bg-blue-700 text-white" : "bg-white text-gray-600 border border-gray-200"}`}>{children}</button>
  );
}

function fmt(date: string) {
  return new Date(date).toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" });
}
