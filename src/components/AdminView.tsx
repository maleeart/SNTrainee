"use client";

import { useState } from "react";
import AppNav from "./AppNav";
import { ROLE_LABEL, LEVEL_LABEL, STATUS_LABEL, STATUS_COLOR, SCORE_CRITERIA } from "@/lib/labels";

type EvalRecord = { id: string; mentorId: string; scores: Record<string, number>; comment: string | null; mentor: { id: string; name: string | null; nickname: string | null } };
type U = { id: string; name: string | null; nickname: string | null; email: string | null; image: string | null; role: string; level: string | null; school: string | null; advisor: string | null; startDate: string | null; endDate: string | null; profileDone: boolean };
type Rep = {
  id: string; date: string; title: string; description: string; location: string | null;
  learned: string | null; solution: string | null; result: string | null;
  ppe: string[]; tools: string[];
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
      <div className="flex-shrink-0">
        <AppNav name={meName} nickname={meNickname} email={meEmail} image={meImage} role={readOnly ? "EXECUTIVE" : "ADMIN"} profileHref="/profile" />
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
  const filtered = filter === "ALL" ? reports : reports.filter(r => r.status === filter);

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "#003E8E" }}>บันทึกการฝึกงาน</h1>
          <p className="text-sm text-gray-500">บันทึกการฝึกงานทั้งหมด</p>
        </div>
        <select value={filter} onChange={e => setFilter(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white">
          <option value="ALL">ทั้งหมด</option>
          <option value="PENDING">รอประเมิน</option>
          <option value="SCORED">ประเมินแล้ว</option>
        </select>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead style={{ background: "#F4F6FB" }}>
            <tr><Th>วันที่</Th><Th>นักศึกษาฝึกงาน</Th><Th>หัวข้องาน</Th><Th>สถานะ</Th><Th>ผู้ประเมิน</Th><Th>คะแนนเฉลี่ย</Th>{!readOnly && <Th> </Th>}</tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map(r => {
              const avg = overallAvg(r.evaluations);
              const myEval = r.evaluations.find(e => e.mentorId === meId);
              return (
                <tr key={r.id} className="hover:bg-gray-50">
                  <Td className="whitespace-nowrap text-gray-500">{r.date.slice(0, 10)}</Td>
                  <Td><span className="font-medium text-gray-800">{r.user.name}</span>{r.user.level && <span className="text-xs text-gray-400 ml-1">{LEVEL_LABEL[r.user.level]}</span>}</Td>
                  <Td><span className="font-medium">{r.title}</span>{r.location && <div className="text-xs text-gray-400">📍 {r.location}</div>}</Td>
                  <Td><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[r.status]}`}>{STATUS_LABEL[r.status]}</span></Td>
                  <Td className="text-center text-gray-500">{r.evaluations.length > 0 ? `${r.evaluations.length} คน` : <span className="text-gray-300">—</span>}</Td>
                  <Td className="text-center">
                    {avg != null ? <span className="font-semibold" style={{ color: "#003E8E" }}>{avg.toFixed(2)}</span> : <span className="text-gray-300">—</span>}
                  </Td>
                  {!readOnly && (
                    <Td>
                      <button onClick={() => onEval(r)} className="text-xs px-2.5 py-1 rounded-lg font-medium text-white whitespace-nowrap"
                        style={{ background: myEval ? "#6366f1" : "#003E8E" }}>
                        {myEval ? "แก้ไขคะแนน" : "ประเมิน"}
                      </button>
                    </Td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
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

function makeCsv(rows: (string | number)[][], filename: string) {
  const csv = rows.map(row => row.map(c => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
  a.download = filename; a.click();
}

function ExportTab({ reports, students }: { reports: Rep[]; students: U[] }) {
  const [selectedStudentId, setSelectedStudentId] = useState("ALL");

  // Analytics: per student × per criterion
  const studentStats = students.map(s => {
    const mine = reports.filter(r => r.user.id === s.id);
    const allEvals = mine.flatMap(r => r.evaluations);
    const criteria = avgPerCriteria(allEvals);
    const overall = overallAvg(allEvals);
    return { student: s, mine, allEvals, criteria, overall };
  });

  // Export: detail rows for one student or all
  const exportDetail = (studentId: string) => {
    const head = [
      "ชื่อ-สกุล", "ชื่อเล่น", "ระดับ", "สถานศึกษา",
      "วันที่", "หัวข้อ", "สถานที่", "รายละเอียด", "ปัญหาที่พบ", "วิธีแก้", "ผลลัพธ์",
      "อุปกรณ์ป้องกัน", "เครื่องมือ", "สถานะ",
      "จำนวนผู้ประเมิน",
      ...SCORE_CRITERIA.map(c => `เฉลี่ย: ${c.label}`),
      "คะแนนเฉลี่ยรวม",
    ];
    const filtered = studentId === "ALL" ? reports : reports.filter(r => r.user.id === studentId);
    const rows = filtered.map(r => {
      const crit = avgPerCriteria(r.evaluations);
      const overall = overallAvg(r.evaluations);
      return [
        r.user.name ?? "", r.user.nickname ?? "", r.user.level ? LEVEL_LABEL[r.user.level] : "", r.user.school ?? "",
        r.date.slice(0, 10), r.title, r.location ?? "", r.description, r.learned ?? "", r.solution ?? "", r.result ?? "",
        r.ppe.join(", "), r.tools.join(", "), STATUS_LABEL[r.status] ?? r.status,
        r.evaluations.length,
        ...SCORE_CRITERIA.map(c => crit[c.key] != null ? crit[c.key].toFixed(2) : ""),
        overall != null ? overall.toFixed(2) : "",
      ];
    });
    const name = studentId === "ALL" ? "ทั้งหมด" : (students.find(s => s.id === studentId)?.name ?? studentId);
    makeCsv([head, ...rows], `SNTrainee_${name}_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  // Export: summary one row per student
  const exportSummary = () => {
    const head = ["ชื่อ-สกุล", "ชื่อเล่น", "ระดับ", "สถานศึกษา", "จำนวนรายงาน", "จำนวนการประเมิน",
      ...SCORE_CRITERIA.map(c => c.label), "คะแนนเฉลี่ยรวม"];
    const rows = studentStats.map(({ student: s, mine, allEvals, criteria, overall }) => [
      s.name ?? "", s.nickname ?? "", s.level ? LEVEL_LABEL[s.level] : "", s.school ?? "",
      mine.length, allEvals.length,
      ...SCORE_CRITERIA.map(c => criteria[c.key] != null ? criteria[c.key].toFixed(2) : ""),
      overall != null ? overall.toFixed(2) : "",
    ]);
    makeCsv([head, ...rows], `SNTrainee_สรุป_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  return (
    <div>
      <h1 className="text-xl font-bold mb-1" style={{ color: "#003E8E" }}>รายงาน</h1>
      <p className="text-sm text-gray-500 mb-6">วิเคราะห์และดาวน์โหลดข้อมูลการฝึกงาน</p>

      {/* Analytics table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6 overflow-x-auto">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <h2 className="text-base font-bold" style={{ color: "#003E8E" }}>ผลการประเมินรายหมวด</h2>
            <p className="text-xs text-gray-400">เฉลี่ยจากทุกรายงานและทุกพี่เลี้ยง · สเกล 1–5</p>
          </div>
          <button onClick={exportSummary}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg font-medium text-white"
            style={{ background: "#003E8E" }}>
            ⬇ สรุปรายบุคคล (.csv)
          </button>
        </div>
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr style={{ background: "#F4F6FB" }}>
              <Th>ชื่อ</Th>
              <Th>รายงาน</Th>
              {SCORE_CRITERIA.map(c => <Th key={c.key}>{c.label}</Th>)}
              <Th>เฉลี่ยรวม</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {studentStats.map(({ student: s, mine, criteria, overall }) => (
              <tr key={s.id} className="hover:bg-gray-50">
                <Td>
                  <div className="font-medium text-gray-800">{s.name}</div>
                  {s.nickname && <div className="text-xs text-gray-400">({s.nickname})</div>}
                </Td>
                <Td className="text-center text-gray-500">{mine.length}</Td>
                {SCORE_CRITERIA.map(c => {
                  const v = criteria[c.key];
                  const pct = v != null ? v / 5 : 0;
                  const bg = v == null ? "#f3f4f6" : v >= 4 ? "#dcfce7" : v >= 3 ? "#fef9c3" : "#fee2e2";
                  const fg = v == null ? "#9ca3af" : v >= 4 ? "#16a34a" : v >= 3 ? "#ca8a04" : "#dc2626";
                  return (
                    <Td key={c.key} className="text-center">
                      {v != null ? (
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-xs font-semibold px-1.5 py-0.5 rounded" style={{ background: bg, color: fg }}>{v.toFixed(1)}</span>
                          <div className="w-12 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${pct * 100}%`, background: fg }} />
                          </div>
                        </div>
                      ) : <span className="text-gray-300 text-xs">—</span>}
                    </Td>
                  );
                })}
                <Td className="text-center">
                  <span className="font-bold text-base" style={{ color: "#003E8E" }}>
                    {overall != null ? overall.toFixed(2) : "—"}
                  </span>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Export detail section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <h2 className="text-base font-bold mb-1" style={{ color: "#003E8E" }}>ดาวน์โหลดข้อมูลรายละเอียด</h2>
        <p className="text-xs text-gray-400 mb-4">ส่งออกเป็น Excel (.csv) พร้อมข้อมูลทุกบันทึก คะแนนแต่ละหมวด และข้อเสนอแนะ</p>
        <div className="flex flex-wrap items-center gap-3">
          <select value={selectedStudentId} onChange={e => setSelectedStudentId(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white flex-1 min-w-[180px]">
            <option value="ALL">ทุกคน (รวมทั้งหมด)</option>
            {students.map(s => <option key={s.id} value={s.id}>{s.name}{s.nickname ? ` (${s.nickname})` : ""}</option>)}
          </select>
          <button onClick={() => exportDetail(selectedStudentId)}
            className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg font-medium text-white whitespace-nowrap"
            style={{ background: "#059669" }}>
            ⬇ ดาวน์โหลด Excel (.csv)
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-3">เปิดด้วย Microsoft Excel หรือ Google Sheets — ใช้ UTF-8 encoding</p>
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
            {report.tools.length > 0 && (
              <div className="px-4 py-3 bg-white">
                <p className="text-xs font-semibold text-gray-500 mb-2">🔩 เครื่องมือ/อุปกรณ์ที่ใช้</p>
                <div className="flex flex-wrap gap-1.5">
                  {report.tools.map((t, i) => <span key={i} className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: "#EEF2FF", color: "#003E8E" }}>{t}</span>)}
                </div>
              </div>
            )}
            {report.ppe.length > 0 && (
              <div className="px-4 py-3 bg-white">
                <p className="text-xs font-semibold text-gray-500 mb-2">🦺 อุปกรณ์ป้องกันที่ใช้</p>
                <div className="flex flex-wrap gap-1.5">
                  {report.ppe.map((t, i) => <span key={i} className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: "#FEF9C3", color: "#92400E" }}>{t}</span>)}
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
