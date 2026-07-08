"use client";

import { useState } from "react";
import AppNav from "./AppNav";
import SpinWheel from "./SpinWheel";
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
  location: string | null; tools: string[] | null; ppe: string[] | null; images: string[];
  learned: string | null; solution: string | null; result: string | null;
  status: string; editReason: string | null;
  user: { id: string; name: string | null; nickname: string | null; image: string | null; level: string | null; school: string | null; startDate: string | null; endDate: string | null };
  evaluations: EvalRecord[];
};

const THAI_MONTHS = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];
function batchKeyFromDates(start: string | null, end: string | null) {
  if (!start || !end) return null;
  return `${start.slice(0, 7)}|${end.slice(0, 7)}`;
}
function batchLabelFromKey(key: string, n: number) {
  const [start, end] = key.split("|");
  const sm = parseInt(start.split("-")[1]) - 1;
  const [ey, em] = end.split("-").map(Number);
  return `รุ่น ${n} (${THAI_MONTHS[sm]} - ${THAI_MONTHS[em - 1]} พ.ศ. ${ey + 543})`;
}

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
  const [editReasonPopup, setEditReasonPopup] = useState<string | null>(null);
  const [studentFilter, setStudentFilter] = useState("ALL");
  const [batchFilter, setBatchFilter] = useState("ALL");
  const [showSpin, setShowSpin] = useState(false);
  const [spinBatchFilter, setSpinBatchFilter] = useState("ALL");

  // Build unique student + batch lists from reports
  const studentMap = new Map<string, Rep["user"]>();
  reports.forEach(r => { if (!studentMap.has(r.user.id)) studentMap.set(r.user.id, r.user); });
  const studentList = [...studentMap.values()];

  const batchKeys = [...new Set(
    studentList.map(u => batchKeyFromDates(u.startDate, u.endDate)).filter(Boolean) as string[]
  )].sort();
  const batchMap = Object.fromEntries(batchKeys.map((k, i) => [k, batchLabelFromKey(k, i + 1)]));

  // Derive filtered reports
  const byBatch = batchFilter === "ALL" ? reports : reports.filter(r => batchKeyFromDates(r.user.startDate, r.user.endDate) === batchFilter);
  const byStudent = studentFilter === "ALL" ? byBatch : byBatch.filter(r => r.user.id === studentFilter);

  const pending = byStudent.filter(r => r.evaluations.every(e => e.mentorId !== meId));
  const done = byStudent.filter(r => r.evaluations.some(e => e.mentorId === meId));
  const list = tab === "pending" ? pending : tab === "done" ? done : byStudent;
  const myPendingCount = pending.filter(r => r.status === "PENDING").length;

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

  // Stat counts (across all filtered reports, not just current tab)
  const totalStudents = new Set(byStudent.map(r => r.user.id)).size;
  const myDoneCount = done.length;

  return (
    <div className="min-h-screen" style={{ background: "#F4F6FB" }}>
      <AppNav name={meName} nickname={meNickname} email={meEmail} image={meImage} role="MENTOR" profileHref="/profile" />

      <main className="max-w-6xl mx-auto px-4 py-6">

        {/* Header */}
        <div className="flex items-start justify-between mb-5 gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-800">รายงานนักศึกษาฝึกงาน</h1>
            <p className="text-gray-400 text-xs mt-0.5">คะแนนจะถูกเฉลี่ยจากทุกพี่เลี้ยงที่ประเมิน</p>
          </div>
          <button onClick={() => setShowSpin(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-sm shrink-0 transition-all active:scale-95 shadow-md"
            style={{ background: "linear-gradient(135deg,#FFC000,#ffaa00)", color: "#0D1F3C", boxShadow: "0 4px 16px rgba(255,192,0,0.35)" }}>
            🎡 Spin
          </button>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {[
            { icon: "👩‍🎓", label: "นักศึกษา", value: totalStudents, bg: "#EEF4FF", fg: "#003E8E" },
            { icon: "📋", label: "รายงานทั้งหมด", value: byStudent.length, bg: "#F0FDF4", fg: "#059669" },
            { icon: "⏳", label: "รอฉันประเมิน", value: myPendingCount, bg: "#FFFBEB", fg: "#D97706" },
            { icon: "✅", label: "ฉันประเมินแล้ว", value: myDoneCount, bg: "#F5F3FF", fg: "#7C3AED" },
          ].map(({ icon, label, value, bg, fg }) => (
            <div key={label} className="rounded-2xl p-3.5 shadow-sm border border-white" style={{ background: bg }}>
              <div className="text-lg mb-0.5">{icon}</div>
              <div className="text-2xl font-bold" style={{ color: fg }}>{value}</div>
              <div className="text-xs font-medium mt-0.5" style={{ color: fg + "BB" }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Filters + Tabs row */}
        <div className="flex flex-wrap items-center gap-2 mb-5">
          {/* Batch filter */}
          {batchKeys.length > 0 && (
            <select value={batchFilter} onChange={e => { setBatchFilter(e.target.value); setStudentFilter("ALL"); }}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white shadow-sm">
              <option value="ALL">ทุกรุ่น</option>
              {batchKeys.map(k => <option key={k} value={k}>{batchMap[k]}</option>)}
            </select>
          )}
          {/* Student filter */}
          <select value={studentFilter} onChange={e => setStudentFilter(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white shadow-sm">
            <option value="ALL">นักศึกษาทุกคน</option>
            {studentList
              .filter(u => batchFilter === "ALL" || batchKeyFromDates(u.startDate, u.endDate) === batchFilter)
              .map(u => (
                <option key={u.id} value={u.id}>{u.name}{u.nickname ? ` (${u.nickname})` : ""}</option>
              ))}
          </select>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Tab pills */}
          <div className="flex gap-1.5">
            <Tab active={tab === "pending"} onClick={() => setTab("pending")}>
              รอประเมิน{myPendingCount > 0 && <span className="ml-1.5 bg-amber-500 text-white text-xs px-1.5 py-0.5 rounded-full">{myPendingCount}</span>}
            </Tab>
            <Tab active={tab === "done"} onClick={() => setTab("done")}>ฉันประเมินแล้ว ({done.length})</Tab>
            <Tab active={tab === "all"} onClick={() => setTab("all")}>ทั้งหมด ({byStudent.length})</Tab>
          </div>
        </div>

        {/* Report list */}
        {list.length === 0 ? (
          <p className="text-center py-20 text-gray-400">ไม่มีรายการ</p>
        ) : (
          <div className="space-y-3">
            {list.map(r => {
              const myEval = r.evaluations.find(e => e.mentorId === meId);
              const avg = avgScores(r.evaluations);
              const tools = r.tools ?? [];
              const ppe = r.ppe ?? [];
              return (
                <div key={r.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

                  {/* Card header bar */}
                  <div className="px-5 py-3 flex items-start justify-between gap-3"
                    style={{ background: "linear-gradient(135deg,#003E8E,#0052b4)" }}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        {r.user.image && <img src={r.user.image} className="w-6 h-6 rounded-full ring-1 ring-white/30 shrink-0" alt="" />}
                        <span className="text-white font-semibold text-sm truncate">{r.user.name}{r.user.nickname ? ` (${r.user.nickname})` : ""}</span>
                        {r.user.level && <span className="text-blue-200 text-xs shrink-0">{LEVEL_LABEL[r.user.level]}</span>}
                      </div>
                      <p className="text-white font-bold leading-snug">{r.title}</p>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                        <span className="text-blue-200 text-xs">📅 {fmt(r.date)}</span>
                        {r.location && <span className="text-blue-200 text-xs">📍 {r.location}</span>}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <div className="flex items-center gap-1.5 flex-wrap justify-end">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[r.status]}`}>{STATUS_LABEL[r.status]}</span>
                        {r.editReason && (
                          <button onClick={() => setEditReasonPopup(r.editReason)}
                            className="text-xs px-1.5 py-0.5 rounded-full font-medium hover:opacity-80"
                            style={{ background: "#FEF3C7", color: "#92400E" }}>✏️ แก้ไขแล้ว</button>
                        )}
                        {r.evaluations.length > 0 && (
                          <span className="text-xs bg-white/15 text-white px-2 py-0.5 rounded-full">
                            👥 {r.evaluations.length} คน · {overallAvg(r.evaluations)}
                          </span>
                        )}
                      </div>
                      <button onClick={() => setEvalTarget(r)}
                        className="text-xs px-3 py-1.5 rounded-lg font-semibold text-white border border-white/30 hover:bg-white/10"
                        style={{ background: myEval ? "rgba(99,102,241,0.7)" : "rgba(255,255,255,0.1)" }}>
                        {myEval ? "แก้ไขคะแนน" : "ประเมิน"}
                      </button>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="px-5 py-3 space-y-2 text-sm">
                    <p className="text-gray-600 leading-relaxed">{r.description}</p>
                    {r.learned && <p className="text-gray-500 text-xs"><span className="font-semibold text-gray-600">ปัญหาที่พบ: </span>{r.learned}</p>}
                    {r.solution && <p className="text-gray-500 text-xs"><span className="font-semibold text-gray-600">วิธีแก้: </span>{r.solution}</p>}
                    {r.result && <p className="text-gray-500 text-xs"><span className="font-semibold text-gray-600">ผลลัพธ์: </span>{r.result}</p>}

                    {/* Tools + PPE */}
                    {(tools.length > 0 || ppe.length > 0) && (
                      <div className="flex flex-wrap gap-1 pt-0.5">
                        {tools.map((t, i) => <span key={i} className="text-xs px-2 py-0.5 rounded-full" style={{ background: "#EEF2FF", color: "#003E8E" }}>🔧 {t}</span>)}
                        {ppe.map((t, i) => <span key={i} className="text-xs px-2 py-0.5 rounded-full" style={{ background: "#FEF9C3", color: "#92400E" }}>🦺 {t}</span>)}
                      </div>
                    )}

                    {/* Images */}
                    {r.images?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {r.images.map((url, i) => (
                          <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                            <img src={url} alt="" className="h-16 w-16 object-cover rounded-xl border border-gray-200 hover:opacity-80 transition-opacity" />
                          </a>
                        ))}
                      </div>
                    )}

                    {/* Avg score chips from all mentors */}
                    {r.evaluations.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-0.5">
                        {SCORE_CRITERIA.map(c => (
                          <span key={c.key} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                            {c.label} {avg[c.key]?.toFixed(1) ?? "-"}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* My eval badge */}
                    {myEval && (
                      <div className="text-xs bg-green-50 border border-green-100 rounded-xl px-3 py-2 text-green-700">
                        ✓ คุณประเมินแล้ว{myEval.comment ? ` · "${myEval.comment}"` : ""}
                      </div>
                    )}
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

      {/* Spin wheel overlay */}
      {showSpin && (() => {
        // Build spin batch list
        const spinBatchKeys = [...new Set(
          studentList.map(u => batchKeyFromDates(u.startDate, u.endDate)).filter(Boolean) as string[]
        )].sort();
        const spinBatchMap = Object.fromEntries(spinBatchKeys.map((k, i) => [k, batchLabelFromKey(k, i + 1)]));

        // Filtered students for wheel
        const wheelStudents = studentList
          .filter(u => spinBatchFilter === "ALL" || batchKeyFromDates(u.startDate, u.endDate) === spinBatchFilter)
          .map(u => ({ id: u.id, label: u.nickname ?? (u.name ?? "").split(" ")[0] ?? u.name ?? "?" }));

        // Add mentor at a random position
        const mentorEntry = { id: meId, label: meNickname ?? meName.split(" ")[0] ?? meName, isMentor: true };
        const insertAt = Math.floor(Math.random() * (wheelStudents.length + 1));
        const people = [...wheelStudents.slice(0, insertAt), mentorEntry, ...wheelStudents.slice(insertAt)];

        return (
          <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "rgba(13,31,60,0.97)" }}>
            {/* Batch filter bar at top */}
            {spinBatchKeys.length > 0 && (
              <div className="flex items-center gap-2 px-6 pt-4 shrink-0">
                <span className="text-xs text-white/40 font-semibold">กรองรุ่น:</span>
                <select value={spinBatchFilter} onChange={e => setSpinBatchFilter(e.target.value)}
                  className="border-0 rounded-xl px-3 py-1.5 text-xs font-medium"
                  style={{ background: "rgba(255,255,255,0.1)", color: "white" }}>
                  <option value="ALL" style={{ color: "#000" }}>ทุกรุ่น</option>
                  {spinBatchKeys.map(k => <option key={k} value={k} style={{ color: "#000" }}>{spinBatchMap[k]}</option>)}
                </select>
              </div>
            )}
            <SpinWheel key={spinBatchFilter} people={people} onClose={() => setShowSpin(false)} />
          </div>
        );
      })()}

      {editReasonPopup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setEditReasonPopup(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">✏️</span>
              <h3 className="font-bold text-gray-800">เหตุผลที่แก้ไขรายงาน</h3>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed bg-amber-50 rounded-xl px-4 py-3 border border-amber-100">{editReasonPopup}</p>
            <button onClick={() => setEditReasonPopup(null)}
              className="mt-4 w-full py-2.5 rounded-xl font-medium text-sm text-white"
              style={{ background: "#003E8E" }}>ปิด</button>
          </div>
        </div>
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
        <p className="text-sm text-gray-500 mb-1">{report.user.name}{report.user.nickname ? ` (${report.user.nickname})` : ""}</p>
        <p className="text-xs text-gray-400 mb-4">{fmt(report.date)}</p>

        {/* Report details */}
        <div className="rounded-xl border border-blue-100 mb-5 overflow-hidden text-sm">
          {/* Title bar */}
          <div className="px-4 py-3" style={{ background: "linear-gradient(135deg,#003E8E,#0052b4)" }}>
            <p className="font-bold text-white text-base leading-snug">{report.title}</p>
            {report.location && <p className="text-blue-200 text-xs mt-0.5">📍 {report.location}</p>}
          </div>

          <div className="divide-y divide-gray-100">
            <RD label="รายละเอียดงาน" icon="📋">{report.description}</RD>
            {report.learned && <RD label="ปัญหาที่พบ" icon="⚠️">{report.learned}</RD>}
            {report.solution && <RD label="วิธีแก้ปัญหา" icon="🔧">{report.solution}</RD>}
            {report.result && <RD label="ผลลัพธ์และสิ่งที่ได้รับ" icon="✅">{report.result}</RD>}

            {(report.tools ?? []).length > 0 && (
              <div className="px-4 py-3 bg-white">
                <p className="text-xs font-semibold text-gray-500 mb-2">🔩 เครื่องมือ/อุปกรณ์ที่ใช้</p>
                <div className="flex flex-wrap gap-1.5">
                  {(report.tools ?? []).map((t, i) => <span key={i} className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: "#EEF2FF", color: "#003E8E" }}>{t}</span>)}
                </div>
              </div>
            )}
            {(report.ppe ?? []).length > 0 && (
              <div className="px-4 py-3 bg-white">
                <p className="text-xs font-semibold text-gray-500 mb-2">🦺 อุปกรณ์ป้องกันที่ใช้</p>
                <div className="flex flex-wrap gap-1.5">
                  {(report.ppe ?? []).map((t, i) => <span key={i} className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: "#FEF9C3", color: "#92400E" }}>{t}</span>)}
                </div>
              </div>
            )}
            {report.images?.length > 0 && (
              <div className="px-4 py-3 bg-white">
                <p className="text-xs font-semibold text-gray-500 mb-2">📷 รูปภาพประกอบ</p>
                <div className="flex flex-wrap gap-2">
                  {report.images.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt={`รูป ${i + 1}`} className="h-24 w-auto rounded-lg object-cover border border-gray-200" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

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

function RD({ label, icon, children }: { label: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="px-4 py-3 bg-white">
      <p className="text-xs font-semibold text-gray-500 mb-1">{icon} {label}</p>
      <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{children as string}</p>
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
