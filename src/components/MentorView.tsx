"use client";

import { useState } from "react";
import AppNav from "./AppNav";
import { STATUS_LABEL, STATUS_COLOR, LEVEL_LABEL, SCORE_CRITERIA } from "@/lib/labels";

type EvalRecord = {
  id: string;
  mentorId: string;
  scores: Record<string, number>;
  comment: string | null;
  mentor: { id: string; name: string | null; nickname: string | null };
};

type Rep = {
  id: string; date: string; title: string; description: string;
  location: string | null; tools: string[]; ppe: string[];
  learned: string | null; solution: string | null; result: string | null;
  status: string;
  user: { name: string | null; nickname: string | null; image: string | null; level: string | null; school: string | null };
  evaluations: EvalRecord[];
};

function avgScores(evals: EvalRecord[]): Record<string, number> {
  if (!evals.length) return {};
  const result: Record<string, number> = {};
  for (const c of SCORE_CRITERIA) {
    result[c.key] = evals.reduce((s, e) => s + (e.scores[c.key] ?? 0), 0) / evals.length;
  }
  return result;
}

function overallAvg(evals: EvalRecord[]): string {
  if (!evals.length) return "-";
  const all = evals.flatMap(e => Object.values(e.scores).filter(Boolean) as number[]);
  return (all.reduce((a, b) => a + b, 0) / all.length).toFixed(1);
}

export default function MentorView({ meId, meName, meNickname, meEmail, meImage, reports: initial }: {
  meId: string; meName: string; meNickname?: string | null; meEmail?: string | null; meImage?: string | null; reports: Rep[];
}) {
  const [reports, setReports] = useState<Rep[]>(initial);
  const [tab, setTab] = useState<"pending" | "done" | "all">("pending");
  const [evalTarget, setEvalTarget] = useState<Rep | null>(null);

  const pending = reports.filter(r => r.evaluations.every(e => e.mentorId !== meId));
  const done = reports.filter(r => r.evaluations.some(e => e.mentorId === meId));
  const list = tab === "pending" ? pending : tab === "done" ? done : reports;
  const pendingCount = pending.filter(r => r.status === "PENDING").length;

  const onEvalDone = (reportId: string, ev: EvalRecord) => {
    setReports(prev => prev.map(r => {
      if (r.id !== reportId) return r;
      const existing = r.evaluations.findIndex(e => e.mentorId === meId);
      const evals = existing >= 0
        ? r.evaluations.map((e, i) => i === existing ? ev : e)
        : [...r.evaluations, ev];
      return { ...r, evaluations: evals, status: "SCORED" };
    }));
    setEvalTarget(null);
  };

  return (
    <div className="min-h-screen" style={{ background: "#F4F6FB" }}>
      <AppNav name={meName} nickname={meNickname} email={meEmail} image={meImage} role="MENTOR" profileHref="/profile" />

      <main className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-1">รายงานนักศึกษาฝึกงาน</h1>
        <p className="text-gray-500 text-sm mb-6">ประเมินให้คะแนนได้ทุกรายงาน — คะแนนจะถูกเฉลี่ยจากทุกพี่เลี้ยงที่ประเมิน</p>

        <div className="flex gap-2 mb-6">
          <Tab active={tab === "pending"} onClick={() => setTab("pending")}>
            ยังไม่ประเมิน {pendingCount > 0 && <span className="ml-1 bg-amber-500 text-white text-xs px-1.5 py-0.5 rounded-full">{pendingCount}</span>}
          </Tab>
          <Tab active={tab === "done"} onClick={() => setTab("done")}>ประเมินแล้ว ({done.length})</Tab>
          <Tab active={tab === "all"} onClick={() => setTab("all")}>ทั้งหมด ({reports.length})</Tab>
        </div>

        {list.length === 0 ? (
          <p className="text-center py-20 text-gray-400">ไม่มีรายการ</p>
        ) : (
          <div className="space-y-3">
            {list.map(r => {
              const myEval = r.evaluations.find(e => e.mentorId === meId);
              const avg = avgScores(r.evaluations);
              return (
                <div key={r.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-xs font-medium bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{fmt(r.date)}</span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLOR[r.status]}`}>{STATUS_LABEL[r.status]}</span>
                        {r.evaluations.length > 0 && (
                          <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">
                            👥 {r.evaluations.length} พี่เลี้ยงประเมิน · เฉลี่ย {overallAvg(r.evaluations)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        {r.user.image && <img src={r.user.image} className="w-5 h-5 rounded-full" alt="" />}
                        <span className="font-medium">{r.user.name}</span>
                        {r.user.nickname && <span className="text-xs text-gray-500">({r.user.nickname})</span>}
                        {r.user.level && <span className="text-xs text-gray-400">{LEVEL_LABEL[r.user.level]}</span>}
                      </div>
                      <h3 className="font-semibold text-gray-800 mt-1">{r.title}</h3>
                      {r.location && <p className="text-xs text-gray-400">📍 {r.location}</p>}
                      <p className="text-gray-500 text-sm mt-1 line-clamp-2">{r.description}</p>
                      {r.learned && <p className="text-xs text-gray-500 mt-1"><span className="font-medium text-gray-600">ปัญหาที่พบ:</span> {r.learned}</p>}
                      {r.solution && <p className="text-xs text-gray-500 mt-0.5"><span className="font-medium text-gray-600">วิธีแก้:</span> {r.solution}</p>}

                      {/* Average scores from all mentors */}
                      {r.evaluations.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {SCORE_CRITERIA.map(c => (
                            <span key={c.key} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                              {c.label}: {avg[c.key]?.toFixed(1) ?? "-"}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* My eval badge */}
                      {myEval && (
                        <div className="mt-2 text-xs bg-green-50 border border-green-100 rounded-lg px-3 py-1.5 text-green-700">
                          ✓ คุณประเมินแล้ว {myEval.comment && `· "${myEval.comment}"`}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => setEvalTarget(r)}
                      className="text-xs px-3 py-1.5 rounded-lg font-medium shrink-0 text-white"
                      style={{ background: myEval ? "#6366f1" : "#003E8E" }}>
                      {myEval ? "แก้ไขคะแนน" : "ประเมิน"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {evalTarget && (
        <EvalModal
          report={evalTarget}
          myExisting={evalTarget.evaluations.find(e => e.mentorId === meId) ?? null}
          onClose={() => setEvalTarget(null)}
          onDone={onEvalDone}
        />
      )}
    </div>
  );
}

function EvalModal({ report, myExisting, onClose, onDone }: {
  report: Rep;
  myExisting: EvalRecord | null;
  onClose: () => void;
  onDone: (reportId: string, ev: EvalRecord) => void;
}) {
  const [scores, setScores] = useState<Record<string, number>>(
    myExisting?.scores ?? Object.fromEntries(SCORE_CRITERIA.map(c => [c.key, 3]))
  );
  const [comment, setComment] = useState(myExisting?.comment ?? "");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/evaluations", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId: report.id, scores, comment }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { alert(data.error ?? `บันทึกไม่สำเร็จ (${res.status})`); return; }
      onDone(report.id, data);
    } catch (e) {
      alert("เกิดข้อผิดพลาด กรุณาลองใหม่");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-0.5">ประเมินงาน</h2>
        <p className="text-sm text-gray-500 mb-1">{report.user.name}{report.user.nickname ? ` (${report.user.nickname})` : ""} · {report.title}</p>
        <p className="text-xs text-gray-400 mb-4">{fmt(report.date)}</p>

        <p className="text-sm font-medium text-gray-700 mb-3">คะแนนแต่ละหมวด (1–5)</p>
        <div className="space-y-4 mb-4">
          {SCORE_CRITERIA.map(c => (
            <div key={c.key}>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-gray-600">{c.label}</span>
                <span className="font-bold text-lg" style={{ color: "#003E8E" }}>{scores[c.key]}</span>
              </div>
              <div className="flex gap-1">
                {[1,2,3,4,5].map(v => (
                  <button key={v} onClick={() => setScores({ ...scores, [c.key]: v })}
                    className="flex-1 py-1.5 rounded-lg text-sm font-medium transition-all"
                    style={scores[c.key] === v
                      ? { background: "#003E8E", color: "#fff" }
                      : { background: "#F4F6FB", color: "#6b7280" }}>
                    {v}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <label className="block text-sm font-medium text-gray-700 mb-1">ความเห็น / ข้อเสนอแนะ</label>
        <textarea rows={3} value={comment} onChange={e => setComment(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500 resize-none mb-5"
          placeholder="ข้อเสนอแนะสำหรับนักศึกษา..." />

        <div className="flex gap-3">
          <button disabled={busy} onClick={submit}
            className="flex-1 text-white py-2.5 rounded-xl font-medium disabled:opacity-50"
            style={{ background: "#003E8E" }}>
            {busy ? "กำลังบันทึก..." : myExisting ? "อัปเดตคะแนน" : "บันทึกคะแนน"}
          </button>
          <button disabled={busy} onClick={onClose}
            className="px-5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium">ปิด</button>
        </div>
      </div>
    </div>
  );
}

function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center ${active ? "text-white" : "bg-white text-gray-600 border border-gray-200"}`}
      style={active ? { background: "#003E8E" } : {}}>
      {children}
    </button>
  );
}

function fmt(date: string) {
  return new Date(date).toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" });
}
