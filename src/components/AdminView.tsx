"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import AppNav from "./AppNav";
import { ROLE_LABEL, LEVEL_LABEL, STATUS_LABEL, STATUS_COLOR, SCORE_CRITERIA } from "@/lib/labels";

type EvalRecord = { id: string; mentorId: string; scores: Record<string, number>; comment: string | null; mentor: { id: string; name: string | null; nickname: string | null } };
type U = { id: string; name: string | null; nickname: string | null; email: string | null; image: string | null; role: string; level: string | null; school: string | null; advisor: string | null; startDate: string | null; endDate: string | null; profileDone: boolean };
type Rep = {
  id: string; date: string; title: string; description: string; location: string | null;
  learned: string | null; solution: string | null; result: string | null;
  ppe: string[] | null; tools: string[] | null; images: string[];
  status: string;
  user: { id: string; name: string | null; nickname: string | null; level: string | null; school: string | null };
  evaluations: EvalRecord[];
};

type Tab = "overview" | "logs" | "export" | "users";

function overallAvg(evals: EvalRecord[]): number | null {
  if (!evals.length) return null;
  const all = evals.flatMap(e => Object.values(e.scores).filter(Boolean) as number[]);
  return all.length ? all.reduce((a, b) => a + b, 0) / all.length : null;
}

export default function AdminView({ readOnly, meId, meName, meNickname, meEmail, meImage, users: initUsers, reports: initReports }: {
  readOnly: boolean; meId: string; meName: string; meNickname?: string | null; meEmail?: string | null; meImage?: string | null; users: U[]; reports: Rep[];
}) {
  const router = useRouter();
  const [users, setUsers] = useState<U[]>(initUsers);
  const [reports, setReports] = useState<Rep[]>(initReports);
  const [tab, setTab] = useState<Tab>("overview");
  const [sideOpen, setSideOpen] = useState(false);
  const [detailUser, setDetailUser] = useState<U | null>(null);
  const [evalTarget, setEvalTarget] = useState<Rep | null>(null);

  const students = users.filter(u => u.role === "STUDENT");
  const mentors = users.filter(u => u.role === "MENTOR" || u.role === "ADMIN");
  const pending = reports.filter(r => r.status === "PENDING").length;

  const onEvalDone = (reportId: string, ev: EvalRecord) => {
    setReports(prev => prev.map(r => {
      if (r.id !== reportId) return r;
      const idx = r.evaluations.findIndex(e => e.mentorId === meId);
      const evals = idx >= 0 ? r.evaluations.map((e, i) => i === idx ? ev : e) : [...r.evaluations, ev];
      return { ...r, evaluations: evals, status: "SCORED" };
    }));
    setEvalTarget(null);
  };

  const setRole = async (userId: string, role: string) => {
    const res = await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ op: "role", userId, role }) });
    if (res.ok) setUsers(prev => prev.map(u => (u.id === userId ? { ...u, role } : u)));
    else alert("เปลี่ยนสิทธิ์ไม่สำเร็จ");
  };

  const NAV: { id: Tab; label: string; badge?: number }[] = [
    { id: "overview", label: "ภาพรวม" },
    { id: "logs", label: "บันทึกการฝึกงาน", badge: pending },
    { id: "export", label: "รายงาน" },
    { id: "users", label: "ผู้ใช้งาน" },
  ];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#F4F6FB" }}>
      <div style={{ background: "#003E8E" }} className="md:hidden flex items-center px-3 h-10 relative z-10">
        <button className="text-white/70 hover:text-white p-1" onClick={() => setSideOpen(o => !o)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </button>
      </div>
      <div className="flex-shrink-0 relative">
        <AppNav name={meName} nickname={meNickname} email={meEmail} image={meImage} role={readOnly ? "EXECUTIVE" : "ADMIN"} profileHref="/profile" />
        <button onClick={() => router.refresh()} title="รีเฟรชข้อมูล"
          className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/>
          </svg>
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {sideOpen && <div className="fixed inset-0 bg-black/40 z-20 md:hidden" onClick={() => setSideOpen(false)} />}
        <aside className={`fixed md:static inset-y-0 left-0 z-30 md:z-auto w-56 flex-shrink-0 flex flex-col transition-transform duration-200 ${sideOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
          style={{ background: "#002d7a", top: 0, paddingTop: "3.5rem" }}>
          <div className="flex flex-col flex-1 py-4 px-3">
            {NAV.map(n => (
              <button key={n.id} onClick={() => { setTab(n.id); setSideOpen(false); }}
                className="flex items-center justify-between w-full px-3 py-2.5 rounded-xl text-sm font-medium mb-1 transition-colors text-left"
                style={tab === n.id ? { background: "#FFC000", color: "#002d7a" } : { color: "rgba(255,255,255,0.65)" }}>
                <span>{n.label}</span>
                {n.badge ? <span className="text-xs font-bold px-1.5 py-0.5 rounded-full" style={{ background: tab === n.id ? "#002d7a" : "#FFC000", color: tab === n.id ? "#FFC000" : "#002d7a" }}>{n.badge}</span> : null}
              </button>
            ))}
          </div>
        </aside>

        <main className="flex-1 overflow-auto p-6">
          {tab === "overview" && <OverviewTab reports={reports} students={students} />}
          {tab === "logs" && <LogsTab reports={reports} meId={meId} readOnly={readOnly} onEval={setEvalTarget} />}
          {tab === "export" && <ExportTab reports={reports} students={students} />}
          {tab === "users" && <UsersTab users={users} readOnly={readOnly} onSetRole={setRole} onDetail={setDetailUser} />}
        </main>
      </div>
      {detailUser && <UserDetailModal user={detailUser} reports={reports} onClose={() => setDetailUser(null)} />}
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

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({ reports, students }: { reports: Rep[]; students: U[] }) {
  const scored = reports.filter(r => r.status === "SCORED");

  const studentStats = students.map(s => {
    const mine = reports.filter(r => r.user.id === s.id);
    const allEvals = mine.flatMap(r => r.evaluations);
    const avg = overallAvg(allEvals);
    return { student: s, reportCount: mine.length, evalCount: allEvals.length, avg };
  }).filter(s => s.reportCount > 0);

  return (
    <div>
      <h1 className="text-xl font-bold mb-1" style={{ color: "#003E8E" }}>ภาพรวม</h1>
      <p className="text-sm text-gray-500 mb-6">สรุปข้อมูลการฝึกงาน</p>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard label="รายงานทั้งหมด" value={reports.length} />
        <StatCard label="รอประเมิน" value={reports.filter(r => r.status === "PENDING").length} accent />
        <StatCard label="ประเมินแล้ว" value={scored.length} />
      </div>

      {studentStats.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-base font-bold mb-1" style={{ color: "#003E8E" }}>คะแนนเฉลี่ยรายนักศึกษาฝึกงาน</h2>
          <p className="text-xs text-gray-400 mb-6">เฉลี่ยจากทุกหมวดคะแนน ทุกการประเมิน · สเกล 1–5</p>
          <ScoreBarChart stats={studentStats} />
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead style={{ background: "#F4F6FB" }}>
            <tr><Th>ชื่อ</Th><Th>ระดับ</Th><Th>รายงาน</Th><Th>ถูกประเมิน</Th><Th>คะแนนเฉลี่ย</Th></tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {students.map(s => {
              const mine = reports.filter(r => r.user.id === s.id);
              const allEvals = mine.flatMap(r => r.evaluations);
              const avg = overallAvg(allEvals);
              return (
                <tr key={s.id} className="hover:bg-gray-50">
                  <Td><span className="font-medium text-gray-800">{s.name}</span></Td>
                  <Td>{s.level ? LEVEL_LABEL[s.level] : "-"}</Td>
                  <Td>{mine.length}</Td>
                  <Td>{allEvals.length} ครั้ง</Td>
                  <Td><span className="font-semibold" style={{ color: "#003E8E" }}>{avg != null ? avg.toFixed(2) : "—"}</span></Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ScoreBarChart({ stats }: { stats: { student: U; reportCount: number; evalCount: number; avg: number | null }[] }) {
  const maxScore = 5;
  const BAR_H = 44;
  const GAP = 14;
  const NAME_W = 130;
  const BAR_AREA = 320;
  const SCORE_W = 48;
  const TOTAL_W = NAME_W + BAR_AREA + SCORE_W + 16;
  const TOTAL_H = stats.length * (BAR_H + GAP) + 20;

  const colors = [
    ["#003E8E", "#0066CC"],
    ["#005BB8", "#0077DD"],
    ["#0052A3", "#006FD6"],
    ["#00419A", "#0060C4"],
    ["#002d7a", "#0055B8"],
  ];

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${TOTAL_W} ${TOTAL_H}`} width="100%" style={{ maxWidth: TOTAL_W, display: "block", margin: "0 auto" }}>
        <defs>
          {stats.map((_, i) => (
            <linearGradient key={i} id={`bar-grad-${i}`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={colors[i % colors.length][0]} />
              <stop offset="100%" stopColor={colors[i % colors.length][1]} />
            </linearGradient>
          ))}
          <linearGradient id="bar-bg" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#F4F6FB" />
            <stop offset="100%" stopColor="#EEF2FF" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {[1,2,3,4,5].map(v => {
          const x = NAME_W + 8 + (v / maxScore) * BAR_AREA;
          return (
            <g key={v}>
              <line x1={x} y1={10} x2={x} y2={TOTAL_H - 10} stroke="#E5E7EB" strokeWidth="1" strokeDasharray="4,3" />
              <text x={x} y={TOTAL_H - 2} textAnchor="middle" fontSize="9" fill="#9CA3AF">{v}</text>
            </g>
          );
        })}

        {stats.map(({ student, evalCount, avg }, i) => {
          const y = 10 + i * (BAR_H + GAP);
          const barW = avg != null ? (avg / maxScore) * BAR_AREA : 0;
          const shortName = (student.name ?? "").split(" ").slice(-1)[0] || student.name || "";
          const displayName = student.nickname ? `${shortName} (${student.nickname})` : shortName;

          return (
            <g key={student.id}>
              {/* Name */}
              <text x={NAME_W - 8} y={y + BAR_H / 2 + 1} textAnchor="end" dominantBaseline="middle" fontSize="12" fill="#374151" fontWeight="500">
                {displayName}
              </text>

              {/* Background track */}
              <rect x={NAME_W + 8} y={y + 4} width={BAR_AREA} height={BAR_H - 8} rx="8" fill="url(#bar-bg)" />

              {/* Score bar */}
              {avg != null && barW > 0 && (
                <rect x={NAME_W + 8} y={y + 4} width={barW} height={BAR_H - 8} rx="8" fill={`url(#bar-grad-${i})`}>
                  <animate attributeName="width" from="0" to={barW} dur="0.7s" fill="freeze" begin={`${i * 0.1}s`} />
                </rect>
              )}

              {/* Eval count badge inside bar */}
              {avg != null && evalCount > 0 && barW > 60 && (
                <text x={NAME_W + 16} y={y + BAR_H / 2 + 1} dominantBaseline="middle" fontSize="10" fill="rgba(255,255,255,0.8)">
                  {evalCount} ครั้ง
                </text>
              )}

              {/* Score label */}
              <text x={NAME_W + 8 + BAR_AREA + 8} y={y + BAR_H / 2 + 1} dominantBaseline="middle" fontSize="14" fontWeight="700" fill="#003E8E">
                {avg != null ? avg.toFixed(2) : "—"}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ─── Logs Tab (บันทึกการฝึกงาน) ──────────────────────────────────────────────

function LogsTab({ reports, meId, readOnly, onEval }: { reports: Rep[]; meId: string; readOnly: boolean; onEval: (r: Rep) => void }) {
  const [filter, setFilter] = useState("ALL");
  const [studentFilter, setStudentFilter] = useState("ALL");

  // unique students from reports
  const studentList = Array.from(new Map(reports.map(r => [r.user.id, r.user])).values());

  const filtered = reports.filter(r =>
    (filter === "ALL" || r.status === filter) &&
    (studentFilter === "ALL" || r.user.id === studentFilter)
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "#003E8E" }}>บันทึกการฝึกงาน</h1>
          <p className="text-sm text-gray-500">{filtered.length} รายการ</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <select value={studentFilter} onChange={e => setStudentFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white">
            <option value="ALL">นักศึกษาทุกคน</option>
            {studentList.map(u => <option key={u.id} value={u.id}>{u.name}{u.nickname ? ` (${u.nickname})` : ""}</option>)}
          </select>
          <select value={filter} onChange={e => setFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white">
            <option value="ALL">ทุกสถานะ</option>
            <option value="PENDING">รอประเมิน</option>
            <option value="SCORED">ประเมินแล้ว</option>
          </select>
        </div>
      </div>

      <div className="space-y-4">
        {filtered.map(r => {
          const avg = overallAvg(r.evaluations);
          const myEval = r.evaluations.find(e => e.mentorId === meId);
          const tools = r.tools ?? [];
          const ppe = r.ppe ?? [];
          return (
            <div key={r.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {/* Card header */}
              <div className="px-5 py-3 flex items-start justify-between gap-3 flex-wrap"
                style={{ background: "linear-gradient(135deg,#003E8E,#0052b4)" }}>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-white text-base leading-snug">{r.title}</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                    <span className="text-blue-200 text-xs">
                      👤 {r.user.name}{r.user.nickname ? ` (${r.user.nickname})` : ""}{r.user.level ? ` · ${LEVEL_LABEL[r.user.level]}` : ""}
                    </span>
                    <span className="text-blue-200 text-xs">📅 {r.date.slice(0, 10)}</span>
                    {r.location && <span className="text-blue-200 text-xs">📍 {r.location}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLOR[r.status]}`}>
                    {STATUS_LABEL[r.status]}
                  </span>
                  {!readOnly && (
                    <button onClick={() => onEval(r)}
                      className="text-xs px-3 py-1 rounded-lg font-medium text-white border border-white/30 hover:bg-white/10 whitespace-nowrap">
                      {myEval ? "แก้ไขคะแนน" : "ประเมิน"}
                    </button>
                  )}
                </div>
              </div>

              {/* Body */}
              <div className="divide-y divide-gray-50 text-sm">
                {/* รายละเอียดงาน */}
                <div className="px-5 py-3">
                  <p className="text-xs font-semibold text-gray-400 mb-1">📋 รายละเอียดงาน</p>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{r.description || <span className="text-gray-300 italic">—</span>}</p>
                </div>

                {/* ปัญหา / วิธีแก้ / ผลลัพธ์ */}
                {(r.learned || r.solution || r.result) && (
                  <div className="px-5 py-3 grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))" }}>
                    {r.learned && (
                      <div>
                        <p className="text-xs font-semibold text-gray-400 mb-1">⚠️ ปัญหาที่พบ</p>
                        <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{r.learned}</p>
                      </div>
                    )}
                    {r.solution && (
                      <div>
                        <p className="text-xs font-semibold text-gray-400 mb-1">🔧 วิธีแก้ไข</p>
                        <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{r.solution}</p>
                      </div>
                    )}
                    {r.result && (
                      <div>
                        <p className="text-xs font-semibold text-gray-400 mb-1">✅ ผลลัพธ์</p>
                        <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{r.result}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Tools + PPE */}
                {(tools.length > 0 || ppe.length > 0) && (
                  <div className="px-5 py-3 flex flex-wrap gap-4">
                    {tools.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-400 mb-1.5">🔩 เครื่องมือ/อุปกรณ์ที่ใช้</p>
                        <div className="flex flex-wrap gap-1.5">
                          {tools.map((t, i) => <span key={i} className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: "#EEF2FF", color: "#003E8E" }}>{t}</span>)}
                        </div>
                      </div>
                    )}
                    {ppe.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-400 mb-1.5">🦺 อุปกรณ์ป้องกันที่ใช้</p>
                        <div className="flex flex-wrap gap-1.5">
                          {ppe.map((t, i) => <span key={i} className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: "#FEF9C3", color: "#92400E" }}>{t}</span>)}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Images */}
                {r.images?.length > 0 && (
                  <div className="px-5 py-3">
                    <p className="text-xs font-semibold text-gray-400 mb-2">📷 รูปภาพประกอบ</p>
                    <div className="flex flex-wrap gap-2">
                      {r.images.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={url} alt={`รูป ${i + 1}`} className="h-28 w-auto rounded-xl object-cover border border-gray-200 hover:opacity-90 transition-opacity" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Evaluation summary */}
                {r.evaluations.length > 0 && (
                  <div className="px-5 py-3 bg-gray-50/50 flex items-center gap-4 flex-wrap">
                    <span className="text-xs text-gray-500">👥 ประเมินแล้ว {r.evaluations.length} คน</span>
                    {avg != null && (
                      <span className="text-sm font-bold" style={{ color: "#003E8E" }}>คะแนนเฉลี่ย {avg.toFixed(2)} / 5.00</span>
                    )}
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-400">
                      {r.evaluations.map(e => (
                        <span key={e.mentorId}>{e.mentor.nickname ?? e.mentor.name}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-16 text-gray-400 text-sm">ไม่พบรายการ</div>
        )}
      </div>
    </div>
  );
}

// ─── Export Tab ───────────────────────────────────────────────────────────────

function avgPerCriteria(evals: EvalRecord[]): Record<string, number> {
  if (!evals.length) return {};
  return Object.fromEntries(SCORE_CRITERIA.map(c => [
    c.key,
    evals.reduce((s, e) => s + (e.scores[c.key] ?? 0), 0) / evals.length,
  ]));
}

function truncate(s: string, n: number) { return s.length > n ? s.slice(0, n) + "…" : s; }

// Short labels for radar chart vertices
const CRITERIA_SHORT = ["ทักษะ", "ปลอดภัย", "รับผิดชอบ", "คุณภาพ", "รายงาน"];

function RadarChart({ scores, size = 160 }: { scores: Record<string, number>; size?: number }) {
  const cx = size / 2, cy = size / 2;
  const r = size * 0.34;
  const n = SCORE_CRITERIA.length;
  const angle = (i: number) => Math.PI * (-0.5 + (2 * i) / n);
  const pt = (i: number, val: number) => {
    const a = angle(i);
    const rr = r * Math.max(0, val) / 5;
    return [cx + rr * Math.cos(a), cy + rr * Math.sin(a)];
  };
  const outerPt = (i: number, scale = 1) => {
    const a = angle(i);
    return [cx + r * scale * Math.cos(a), cy + r * scale * Math.sin(a)];
  };
  const levelPoints = (level: number) =>
    SCORE_CRITERIA.map((_, i) => outerPt(i, level / 5).join(",")).join(" ");
  const dataPoints = SCORE_CRITERIA.map((c, i) => pt(i, scores[c.key] ?? 0).join(",")).join(" ");

  // label anchor logic per axis
  const anchor = (i: number): React.SVGAttributes<SVGTextElement>["textAnchor"] => {
    if (i === 0) return "middle";
    if (i === 1 || i === 2) return "start";
    return "end";
  };
  const labelOffset = (i: number) => {
    const a = angle(i);
    const lr = r + 14;
    return [cx + lr * Math.cos(a), cy + lr * Math.sin(a)];
  };

  const hasData = SCORE_CRITERIA.some(c => (scores[c.key] ?? 0) > 0);

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
      {/* Background levels */}
      {[1,2,3,4,5].map(level => (
        <polygon key={level} points={levelPoints(level)}
          fill={level === 5 ? "#EEF2FF" : "none"}
          stroke="#E2E8F0" strokeWidth="0.6" />
      ))}
      {/* Axis lines */}
      {SCORE_CRITERIA.map((_, i) => {
        const [ox, oy] = outerPt(i);
        return <line key={i} x1={cx} y1={cy} x2={ox} y2={oy} stroke="#CBD5E1" strokeWidth="0.6" />;
      })}
      {/* Data polygon */}
      {hasData && (
        <polygon points={dataPoints}
          fill="rgba(0,62,142,0.18)" stroke="#003E8E" strokeWidth="1.8"
          strokeLinejoin="round" />
      )}
      {/* Data dots */}
      {hasData && SCORE_CRITERIA.map((c, i) => {
        const [px, py] = pt(i, scores[c.key] ?? 0);
        return <circle key={i} cx={px} cy={py} r="2.8" fill="#003E8E" />;
      })}
      {/* Axis labels */}
      {SCORE_CRITERIA.map((_, i) => {
        const [lx, ly] = labelOffset(i);
        return (
          <text key={i} x={lx} y={ly} textAnchor={anchor(i)} dominantBaseline="middle"
            fontSize="9.5" fill="#64748B" fontWeight="500">
            {CRITERIA_SHORT[i]}
          </text>
        );
      })}
      {/* Center score */}
      {hasData && (
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle"
          fontSize="11" fill="#003E8E" fontWeight="700">
          {(SCORE_CRITERIA.reduce((s, c) => s + (scores[c.key] ?? 0), 0) / n).toFixed(1)}
        </text>
      )}
    </svg>
  );
}

function ScoreColor(v: number | null): { bg: string; fg: string } {
  if (v == null) return { bg: "#F3F4F6", fg: "#9CA3AF" };
  if (v >= 4.5) return { bg: "#DCFCE7", fg: "#15803D" };
  if (v >= 3.5) return { bg: "#D1FAE5", fg: "#16A34A" };
  if (v >= 3)   return { bg: "#FEF9C3", fg: "#A16207" };
  if (v >= 2)   return { bg: "#FEE2E2", fg: "#DC2626" };
  return { bg: "#FEE2E2", fg: "#B91C1C" };
}

function ExportTab({ reports, students }: { reports: Rep[]; students: U[] }) {
  const [selectedStudentId, setSelectedStudentId] = useState("ALL");

  const studentStats = students.map(s => {
    const mine = reports.filter(r => r.user.id === s.id);
    const allEvals = mine.flatMap(r => r.evaluations);
    const criteria = avgPerCriteria(allEvals);
    const overall = overallAvg(allEvals);
    return { student: s, mine, allEvals, criteria, overall };
  });

  // Summary stats
  const totalReports = reports.length;
  const scoredReports = reports.filter(r => r.status === "SCORED").length;
  const allEvals = reports.flatMap(r => r.evaluations);
  const allScores = allEvals.flatMap(e => Object.values(e.scores).filter(Boolean) as number[]);
  const globalAvg = allScores.length ? allScores.reduce((a, b) => a + b, 0) / allScores.length : null;

  const exportXlsx = (studentId: string) => {
    const date = new Date().toISOString().slice(0, 10);
    const name = studentId === "ALL" ? "ทั้งหมด" : (students.find(s => s.id === studentId)?.name ?? studentId);

    // ── Sheet 1: ผลการประเมินรายบุคคล ──────────────────────────────────────────
    const s1Head = ["#", "ชื่อ-สกุล", "ชื่อเล่น", "ระดับ", "สถานศึกษา",
      "บันทึก", "การประเมิน",
      ...CRITERIA_SHORT.map(s => `คะแนน: ${s}`),
      "เฉลี่ยรวม"];
    const s1Rows: (string | number)[][] = [s1Head];
    studentStats.forEach(({ student: s, mine, allEvals, criteria, overall }, i) => {
      s1Rows.push([
        i + 1, s.name ?? "", s.nickname ?? "",
        s.level ? LEVEL_LABEL[s.level] : "", s.school ?? "",
        mine.length, allEvals.length,
        ...SCORE_CRITERIA.map(c => criteria[c.key] != null ? +criteria[c.key].toFixed(2) : ""),
        overall != null ? +overall.toFixed(2) : "",
      ]);
    });
    const ws1 = XLSX.utils.aoa_to_sheet(s1Rows);
    ws1["!cols"] = [
      { wch: 4 }, { wch: 22 }, { wch: 10 }, { wch: 7 }, { wch: 20 },
      { wch: 7 }, { wch: 9 },
      ...CRITERIA_SHORT.map(() => ({ wch: 12 })),
      { wch: 10 },
    ];

    // ── Sheet 2: รายการบันทึกฝึกงาน ────────────────────────────────────────────
    const targetStudents = studentId === "ALL"
      ? studentStats.filter(ss => ss.mine.length > 0)
      : studentStats.filter(ss => ss.student.id === studentId && ss.mine.length > 0);

    const detailCols = [
      "วันที่", "หัวข้องาน", "สถานที่",
      "รายละเอียดงาน", "ปัญหาที่พบ", "วิธีแก้ไข", "ผลลัพธ์",
      "เครื่องมือ/อุปกรณ์", "อุปกรณ์ป้องกัน",
      "สถานะ", "ผู้ประเมิน", "เฉลี่ยรวม",
      ...CRITERIA_SHORT.map(s => `คะแนน: ${s}`),
    ];
    const s2Rows: (string | number)[][] = [];
    const merges: XLSX.Range[] = [];
    let ri = 0;

    targetStudents.forEach(({ student: s, mine }) => {
      // Student section header row (merged across all columns)
      const info = [
        s.name ?? "", s.nickname ? `(${s.nickname})` : "",
        s.level ? LEVEL_LABEL[s.level] : "", s.school ?? "",
      ].filter(Boolean).join("  ·  ");
      const sectionRow: (string | number)[] = [info, ...Array(detailCols.length - 1).fill("")];
      s2Rows.push(sectionRow);
      merges.push({ s: { r: ri, c: 0 }, e: { r: ri, c: detailCols.length - 1 } });
      ri++;

      // Column header
      s2Rows.push(detailCols);
      ri++;

      // Report rows sorted by date
      [...mine].sort((a, b) => a.date.localeCompare(b.date)).forEach(r => {
        const crit = avgPerCriteria(r.evaluations);
        const ov = overallAvg(r.evaluations);
        s2Rows.push([
          r.date.slice(0, 10),
          truncate(r.title, 50),
          truncate(r.location ?? "", 25),
          truncate(r.description, 100),
          truncate(r.learned ?? "", 80),
          truncate(r.solution ?? "", 80),
          truncate(r.result ?? "", 80),
          truncate((r.tools ?? []).join(", "), 50),
          truncate((r.ppe ?? []).join(", "), 60),
          STATUS_LABEL[r.status] ?? r.status,
          r.evaluations.length,
          ov != null ? +ov.toFixed(2) : "",
          ...SCORE_CRITERIA.map(c => crit[c.key] != null ? +crit[c.key].toFixed(2) : ""),
        ]);
        ri++;
      });

      // Blank separator
      s2Rows.push(Array(detailCols.length).fill(""));
      ri++;
    });

    const ws2 = XLSX.utils.aoa_to_sheet(s2Rows);
    ws2["!merges"] = merges;
    ws2["!cols"] = [
      { wch: 12 }, { wch: 38 }, { wch: 20 },
      { wch: 42 }, { wch: 38 }, { wch: 38 }, { wch: 38 },
      { wch: 32 }, { wch: 38 },
      { wch: 12 }, { wch: 9 }, { wch: 10 },
      ...CRITERIA_SHORT.map(() => ({ wch: 12 })),
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws1, "ผลการประเมินรายบุคคล");
    XLSX.utils.book_append_sheet(wb, ws2, "รายการบันทึกฝึกงาน");
    XLSX.writeFile(wb, `SNTrainee_${name}_${date}.xlsx`);
  };

  return (
    <div>
      <h1 className="text-xl font-bold mb-1" style={{ color: "#003E8E" }}>รายงาน</h1>
      <p className="text-sm text-gray-500 mb-5">วิเคราะห์และดาวน์โหลดข้อมูลการฝึกงาน</p>

      {/* ── Summary stat cards ── */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: "บันทึกทั้งหมด", value: totalReports, sub: `ประเมินแล้ว ${scoredReports}`, icon: "📋", color: "#003E8E" },
          { label: "คะแนนเฉลี่ยรวม", value: globalAvg != null ? globalAvg.toFixed(2) : "—", sub: "จากทุกรายการ", icon: "⭐", color: "#059669" },
          { label: "นักศึกษาฝึกงาน", value: students.length, sub: `${allEvals.length} การประเมิน`, icon: "👤", color: "#7C3AED" },
        ].map(({ label, value, sub, icon, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col gap-1">
            <span className="text-lg">{icon}</span>
            <div className="text-2xl font-bold" style={{ color }}>{value}</div>
            <div className="text-xs font-medium text-gray-600">{label}</div>
            <div className="text-xs text-gray-400">{sub}</div>
          </div>
        ))}
      </div>

      {/* ── Radar chart cards per student ── */}
      {studentStats.some(s => s.allEvals.length > 0) && (
        <div className="mb-6">
          <h2 className="text-base font-bold mb-3" style={{ color: "#003E8E" }}>ผลการประเมินรายบุคคล</h2>
          <div className="grid grid-cols-1 gap-4" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))" }}>
            {studentStats.filter(s => s.allEvals.length > 0).map(({ student: s, mine, criteria, overall }) => (
              <div key={s.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                {/* Student header */}
                <div className="flex items-center gap-2 mb-3">
                  {s.image ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={s.image} alt="" className="w-9 h-9 rounded-full object-cover" />
                  ) : (
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold"
                      style={{ background: "#003E8E" }}>
                      {(s.name ?? "?")[0]}
                    </div>
                  )}
                  <div>
                    <div className="font-semibold text-gray-800 text-sm leading-tight">{s.name}</div>
                    <div className="text-xs text-gray-400">{s.nickname ? `(${s.nickname}) · ` : ""}{s.level ? LEVEL_LABEL[s.level] : ""}</div>
                  </div>
                  {overall != null && (
                    <div className="ml-auto text-right">
                      <div className="text-xl font-bold" style={{ color: "#003E8E" }}>{overall.toFixed(1)}</div>
                      <div className="text-xs text-gray-400">/ 5.0</div>
                    </div>
                  )}
                </div>

                {/* Radar + scores side by side */}
                <div className="flex items-center gap-3">
                  <RadarChart scores={criteria} size={148} />
                  <div className="flex-1 space-y-1.5">
                    {SCORE_CRITERIA.map((c, i) => {
                      const v = criteria[c.key] ?? null;
                      const { bg, fg } = ScoreColor(v);
                      return (
                        <div key={c.key} className="flex items-center gap-1.5">
                          <span className="text-xs text-gray-500 w-14 shrink-0 truncate">{CRITERIA_SHORT[i]}</span>
                          <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                            {v != null && (
                              <div className="h-full rounded-full transition-all"
                                style={{ width: `${(v / 5) * 100}%`, background: fg }} />
                            )}
                          </div>
                          <span className="text-xs font-bold w-6 text-right" style={{ color: fg }}>
                            {v != null ? v.toFixed(1) : "—"}
                          </span>
                        </div>
                      );
                    })}
                    <div className="text-xs text-gray-400 pt-1">{mine.length} บันทึก</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Comparison table ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-6 overflow-hidden">
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-gray-100 flex-wrap gap-2">
          <div>
            <h2 className="text-base font-bold" style={{ color: "#003E8E" }}>ตารางเปรียบเทียบรายหมวด</h2>
            <p className="text-xs text-gray-400">เฉลี่ยจากทุกรายงานและทุกพี่เลี้ยง · สเกล 1–5</p>
          </div>
          <button onClick={() => exportXlsx("ALL")}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg font-medium text-white"
            style={{ background: "#003E8E" }}>
            ⬇ ดาวน์โหลด Excel (.xlsx)
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr style={{ background: "#F8FAFF" }}>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 w-40">นักศึกษาฝึกงาน</th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500">บันทึก</th>
                {SCORE_CRITERIA.map((c, i) => (
                  <th key={c.key} className="px-3 py-3 text-center text-xs font-semibold text-gray-500">{CRITERIA_SHORT[i]}</th>
                ))}
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500">เฉลี่ยรวม</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {studentStats.map(({ student: s, mine, criteria, overall }, rank) => {
                const { bg: overallBg, fg: overallFg } = ScoreColor(overall);
                return (
                  <tr key={s.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-300 w-4">#{rank + 1}</span>
                        <div>
                          <div className="font-semibold text-gray-800 text-sm">{s.name}</div>
                          {s.nickname && <div className="text-xs text-gray-400">({s.nickname})</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center text-gray-500 text-sm">{mine.length}</td>
                    {SCORE_CRITERIA.map(c => {
                      const v = criteria[c.key] ?? null;
                      const { bg, fg } = ScoreColor(v);
                      return (
                        <td key={c.key} className="px-3 py-3 text-center">
                          {v != null ? (
                            <div className="flex flex-col items-center gap-1">
                              <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: bg, color: fg }}>
                                {v.toFixed(1)}
                              </span>
                              <div className="w-10 h-1 rounded-full bg-gray-100 overflow-hidden">
                                <div className="h-full rounded-full" style={{ width: `${(v / 5) * 100}%`, background: fg }} />
                              </div>
                            </div>
                          ) : <span className="text-gray-200 text-xs">—</span>}
                        </td>
                      );
                    })}
                    <td className="px-4 py-3 text-center">
                      {overall != null ? (
                        <span className="font-bold text-sm px-2.5 py-1 rounded-full" style={{ background: overallBg, color: overallFg }}>
                          {overall.toFixed(2)}
                        </span>
                      ) : <span className="text-gray-200">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Export ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <h2 className="text-base font-bold mb-1" style={{ color: "#003E8E" }}>ดาวน์โหลดข้อมูล</h2>
        <p className="text-xs text-gray-400 mb-4">ไฟล์ Excel 2 sheets — ผลการประเมินรายบุคคล + รายการบันทึกฝึกงาน (จัดหมวดตามนักศึกษา)</p>
        <div className="flex flex-wrap items-center gap-3">
          <select value={selectedStudentId} onChange={e => setSelectedStudentId(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white flex-1 min-w-[180px]">
            <option value="ALL">ทุกคน (รวมทั้งหมด)</option>
            {students.map(s => <option key={s.id} value={s.id}>{s.name}{s.nickname ? ` (${s.nickname})` : ""}</option>)}
          </select>
          <button onClick={() => exportXlsx(selectedStudentId)}
            className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg font-medium text-white whitespace-nowrap"
            style={{ background: "#059669" }}>
            ⬇ ดาวน์โหลด Excel (.xlsx)
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-3">เปิดด้วย Microsoft Excel — Sheet 1: สรุปคะแนน · Sheet 2: รายการบันทึกทั้งหมด</p>
      </div>
    </div>
  );
}

// ─── Users Tab ────────────────────────────────────────────────────────────────

const ROLE_ORDER = ["ADMIN", "MENTOR", "STUDENT", "EXECUTIVE"] as const;
const ROLE_SECTION_LABEL: Record<string, string> = { ADMIN: "ผู้ดูแลระบบ", MENTOR: "พี่เลี้ยง", STUDENT: "นักศึกษาฝึกงาน", EXECUTIVE: "ผู้สังเกตการณ์" };
const ROLE_SECTION_COLOR: Record<string, string> = { ADMIN: "#7C3AED", MENTOR: "#003E8E", STUDENT: "#059669", EXECUTIVE: "#B45309" };

function UsersTab({ users, readOnly, onSetRole, onDetail }: { users: U[]; readOnly: boolean; onSetRole: (id: string, role: string) => void; onDetail: (u: U) => void }) {
  const grouped = ROLE_ORDER.map(role => ({ role, list: users.filter(u => u.role === role) })).filter(g => g.list.length > 0);

  return (
    <div>
      <h1 className="text-xl font-bold mb-1" style={{ color: "#003E8E" }}>ผู้ใช้งาน</h1>
      <p className="text-sm text-gray-500 mb-6">คลิกชื่อเพื่อดูรายละเอียด</p>

      <div className="space-y-6">
        {grouped.map(({ role, list }) => (
          <div key={role}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full text-white" style={{ background: ROLE_SECTION_COLOR[role] }}>
                {ROLE_SECTION_LABEL[role]}
              </span>
              <span className="text-xs text-gray-400">{list.length} คน</span>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
              <table className="w-full text-sm">
                <thead style={{ background: "#F4F6FB" }}>
                  <tr><Th>ชื่อ</Th><Th>ชื่อเล่น</Th><Th>อีเมล</Th><Th>ระดับ</Th><Th>สถานศึกษา</Th><Th>สิทธิ์</Th></tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {list.map(u => (
                    <tr key={u.id} className="hover:bg-blue-50 cursor-pointer" onClick={() => onDetail(u)}>
                      <Td>
                        <div className="flex items-center gap-2">
                          {u.image ? <img src={u.image} className="w-6 h-6 rounded-full" alt="" /> : <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs text-gray-500">{u.name?.[0]}</div>}
                          <span className="font-medium text-gray-800 hover:underline">{u.name}</span>
                        </div>
                      </Td>
                      <Td className="text-gray-500">{u.nickname ?? <span className="text-gray-300">—</span>}</Td>
                      <Td className="text-gray-500 text-xs">{u.email}</Td>
                      <Td>{u.level ? LEVEL_LABEL[u.level] : <span className="text-gray-300">—</span>}</Td>
                      <Td>{u.school ?? <span className="text-gray-300">—</span>}</Td>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        {readOnly
                          ? <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "#EEF2FF", color: "#003E8E" }}>{ROLE_LABEL[u.role]}</span>
                          : (
                            <select value={u.role} onChange={e => onSetRole(u.id, e.target.value)} className="border border-gray-200 rounded-lg px-2 py-1 text-xs bg-white">
                              {Object.entries(ROLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                            </select>
                          )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── User Detail Modal ────────────────────────────────────────────────────────

function UserDetailModal({ user: u, reports, onClose }: { user: U; reports: Rep[]; onClose: () => void }) {
  const mine = reports.filter(r => r.user.id === u.id);
  const allEvals = mine.flatMap(r => r.evaluations);
  const avg = overallAvg(allEvals);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="px-6 pt-6 pb-4" style={{ background: "linear-gradient(135deg, #003E8E, #002d7a)" }}>
          <div className="flex items-center gap-4">
            {u.image ? <img src={u.image} className="w-16 h-16 rounded-full ring-2 ring-white/30" alt="" />
              : <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-white text-2xl font-bold">{u.name?.[0]}</div>}
            <div>
              <p className="text-white font-bold text-lg">{u.name}</p>
              {u.nickname && <p className="text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>"{u.nickname}"</p>}
              <span className="text-xs px-2 py-0.5 rounded-full font-medium mt-1 inline-block" style={{ background: "rgba(255,192,0,0.25)", color: "#FFC000" }}>{ROLE_LABEL[u.role]}</span>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-3 text-sm">
          <DR label="อีเมล" value={u.email} />
          {u.level && <DR label="ระดับ" value={LEVEL_LABEL[u.level]} />}
          {u.school && <DR label="สถานศึกษา" value={u.school} />}
          {u.advisor && <DR label="อ.นิเทศ" value={u.advisor} />}
          {u.startDate && <DR label="เริ่มฝึก" value={new Date(u.startDate).toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" })} />}
          {u.endDate && <DR label="สิ้นสุด" value={new Date(u.endDate).toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" })} />}

          <div className="grid grid-cols-3 gap-3 pt-3" style={{ borderTop: "1px solid #f3f4f6" }}>
            <StatCard label="รายงาน" value={mine.length} />
            <StatCard label="ถูกประเมิน" value={allEvals.length + " ครั้ง"} />
            <StatCard label="คะแนนเฉลี่ย" value={avg != null ? avg.toFixed(2) : "—"} />
          </div>
        </div>

        <div className="px-6 pb-6">
          <button onClick={onClose} className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl font-medium">ปิด</button>
        </div>
      </div>
    </div>
  );
}

// ─── Eval Modal ───────────────────────────────────────────────────────────────

function EvalModal({ report, myExisting, onClose, onDone }: {
  report: Rep; myExisting: EvalRecord | null;
  onClose: () => void; onDone: (reportId: string, ev: EvalRecord) => void;
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
        <p className="text-xs text-gray-400 mb-4">{report.date.slice(0, 10)}</p>

        {/* Report details */}
        <div className="rounded-xl border border-blue-100 mb-5 overflow-hidden text-sm">
          <div className="px-4 py-3" style={{ background: "linear-gradient(135deg,#003E8E,#0052b4)" }}>
            <p className="font-bold text-white text-base leading-snug">{report.title}</p>
            {report.location && <p className="text-blue-200 text-xs mt-0.5">📍 {report.location}</p>}
          </div>
          <div className="divide-y divide-gray-100">
            <RDa label="รายละเอียดงาน" icon="📋">{report.description}</RDa>
            {report.learned && <RDa label="ปัญหาที่พบ" icon="⚠️">{report.learned}</RDa>}
            {report.solution && <RDa label="วิธีแก้ปัญหา" icon="🔧">{report.solution}</RDa>}
            {report.result && <RDa label="ผลลัพธ์และสิ่งที่ได้รับ" icon="✅">{report.result}</RDa>}
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
                    style={scores[c.key] === v ? { background: "#003E8E", color: "#fff" } : { background: "#F4F6FB", color: "#6b7280" }}>
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
          <button disabled={busy} onClick={onClose} className="px-5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium">ปิด</button>
        </div>
      </div>
    </div>
  );
}

function RDa({ label, icon, children }: { label: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="px-4 py-3 bg-white">
      <p className="text-xs font-semibold text-gray-500 mb-1">{icon} {label}</p>
      <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{children as string}</p>
    </div>
  );
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function DR({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex gap-2">
      <span className="text-gray-400 w-24 shrink-0">{label}</span>
      <span className="text-gray-800 font-medium">{value}</span>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number | string; accent?: boolean }) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      <div className="text-2xl font-bold" style={{ color: accent ? "#FFC000" : "#003E8E" }}>{value}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) { return <th className="text-left text-xs font-semibold text-gray-500 px-4 py-2.5 whitespace-nowrap">{children}</th>; }
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) { return <td className={`px-4 py-2.5 ${className}`}>{children}</td>; }
