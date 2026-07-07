"use client";

import { useState } from "react";
import Image from "next/image";
import AppNav from "./AppNav";
import {
  ROLE_LABEL, LEVEL_LABEL, STATUS_LABEL, STATUS_COLOR, SCORE_CRITERIA,
} from "@/lib/labels";

type U = { id: string; name: string | null; nickname: string | null; email: string | null; image: string | null; role: string; level: string | null; school: string | null; advisor: string | null; startDate: string | null; endDate: string | null; profileDone: boolean };
type Rep = {
  id: string; date: string; title: string; description: string; location: string | null;
  jobType: string | null; systemCategory: string | null; status: string; result: string | null;
  assignedMentorId: string | null; scores: Record<string, number> | null;
  mentorComment: string | null;
  user: { name: string | null; level: string | null; school: string | null };
  assignedMentor: { name: string | null } | null;
};

type Tab = "overview" | "reports" | "users";

export default function AdminView({ readOnly, meId, meName, meNickname, meEmail, meImage, users: initUsers, reports: initReports }: {
  readOnly: boolean; meId: string; meName: string; meNickname?: string | null; meEmail?: string | null; meImage?: string | null; users: U[]; reports: Rep[];
}) {
  const [users, setUsers] = useState<U[]>(initUsers);
  const [reports, setReports] = useState<Rep[]>(initReports);
  const [tab, setTab] = useState<Tab>("overview");
  const [sideOpen, setSideOpen] = useState(false);
  const [evalTarget, setEvalTarget] = useState<Rep | null>(null);
  const [detailUser, setDetailUser] = useState<U | null>(null);

  // admin + mentor can both be assigned as mentor
  const mentors = users.filter(u => u.role === "MENTOR" || u.role === "ADMIN");
  const students = users.filter(u => u.role === "STUDENT");
  const pending = reports.filter(r => r.status === "PENDING_ASSIGN").length;

  const setRole = async (userId: string, role: string) => {
    const res = await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ op: "role", userId, role }) });
    if (res.ok) setUsers(prev => prev.map(u => (u.id === userId ? { ...u, role } : u)));
    else alert("เปลี่ยนสิทธิ์ไม่สำเร็จ");
  };

  const onEvalDone = (updated: Rep) => {
    setReports(prev => prev.map(r => (r.id === updated.id ? { ...r, ...updated } : r)));
    setEvalTarget(null);
  };

  const assign = async (reportId: string, mentorId: string) => {
    const res = await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ op: "assign", reportId, mentorId }) });
    if (res.ok) {
      const mName = mentors.find(m => m.id === mentorId)?.name ?? null;
      setReports(prev => prev.map(r => (r.id === reportId ? { ...r, assignedMentorId: mentorId || null, assignedMentor: mentorId ? { name: mName } : null, status: mentorId ? "PENDING_APPROVAL" : "PENDING_ASSIGN" } : r)));
    } else alert("มอบหมายไม่สำเร็จ");
  };

  const exportCsv = () => {
    const head = ["วันที่", "นักศึกษา", "ระดับ", "สถานศึกษา", "สถานที่", "หัวข้อ", "พี่เลี้ยง", "สถานะ", ...SCORE_CRITERIA.map(c => c.label), "เฉลี่ย"];
    const rows = reports.map(r => {
      const sc = r.scores;
      const vals = SCORE_CRITERIA.map(c => (sc ? sc[c.key] ?? "" : ""));
      const avg = sc ? (Object.values(sc).reduce((a, b) => a + b, 0) / Object.values(sc).length).toFixed(2) : "";
      return [r.date.slice(0, 10), r.user.name ?? "", r.user.level ? LEVEL_LABEL[r.user.level] : "", r.user.school ?? "", r.location ?? "", r.title, r.assignedMentor?.name ?? "", STATUS_LABEL[r.status], ...vals, avg];
    });
    const csv = [head, ...rows].map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `SNTrainee_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
  };

  const NAV: { id: Tab; label: string; badge?: number }[] = [
    { id: "overview", label: "ภาพรวม" },
    { id: "reports", label: "รายงาน", badge: pending },
    { id: "users", label: "ผู้ใช้งาน" },
  ];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#F4F6FB" }}>
      {/* Hamburger row (mobile only) */}
      <div style={{ background: "#003E8E" }} className="md:hidden flex items-center px-3 h-10 relative z-10">
        <button className="text-white/70 hover:text-white p-1" onClick={() => setSideOpen(o => !o)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </button>
      </div>
      <div className="flex-shrink-0">
        <AppNav name={meName} nickname={meNickname} email={meEmail} image={meImage} role={readOnly ? "EXECUTIVE" : "ADMIN"} profileHref="/profile" />
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar overlay (mobile) */}
        {sideOpen && <div className="fixed inset-0 bg-black/40 z-20 md:hidden" onClick={() => setSideOpen(false)} />}

        {/* Sidebar */}
        <aside className={`
          fixed md:static inset-y-0 left-0 z-30 md:z-auto
          w-56 flex-shrink-0 flex flex-col
          transition-transform duration-200
          ${sideOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `} style={{ background: "#002d7a", top: 0, paddingTop: "3.5rem" }}>
          <div className="flex flex-col flex-1 py-4 px-3">
            {NAV.map(n => (
              <button key={n.id} onClick={() => { setTab(n.id); setSideOpen(false); }}
                className="flex items-center justify-between w-full px-3 py-2.5 rounded-xl text-sm font-medium mb-1 transition-colors text-left"
                style={tab === n.id
                  ? { background: "#FFC000", color: "#002d7a" }
                  : { color: "rgba(255,255,255,0.65)" }}>
                <span>{n.label}</span>
                {n.badge ? <span className="text-xs font-bold px-1.5 py-0.5 rounded-full" style={{ background: tab === n.id ? "#002d7a" : "#FFC000", color: tab === n.id ? "#FFC000" : "#002d7a" }}>{n.badge}</span> : null}
              </button>
            ))}

            <div className="mt-auto pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}>
              <button onClick={exportCsv}
                className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-colors"
                style={{ color: "rgba(255,255,255,0.65)" }}>
                ⬇ โหลดรายงาน (CSV)
              </button>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-auto p-6">
          {tab === "overview" && <OverviewTab reports={reports} students={students} mentors={mentors} />}
          {tab === "reports" && <ReportsTab reports={reports} mentors={mentors} readOnly={readOnly} meId={meId} onAssign={assign} onEval={setEvalTarget} />}
          {tab === "users" && <UsersTab users={users} readOnly={readOnly} onSetRole={setRole} onDetail={setDetailUser} />}
        </main>
      </div>
      {evalTarget && <EvalModal report={evalTarget} onClose={() => setEvalTarget(null)} onDone={onEvalDone} />}
      {detailUser && <UserDetailModal user={detailUser} reports={reports} onClose={() => setDetailUser(null)} />}
    </div>
  );
}

function OverviewTab({ reports, students, mentors }: { reports: Rep[]; students: U[]; mentors: U[] }) {
  const approved = reports.filter(r => r.status === "APPROVED");
  const avgScore = approved.length
    ? (approved.reduce((s, r) => { const v = Object.values(r.scores ?? {}); return s + (v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0); }, 0) / approved.length).toFixed(1)
    : "-";

  return (
    <div>
      <h1 className="text-xl font-bold mb-1" style={{ color: "#003E8E" }}>ภาพรวม</h1>
      <p className="text-sm text-gray-500 mb-6">สรุปข้อมูลการฝึกงาน</p>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="นักศึกษา" value={students.length} />
        <StatCard label="พี่เลี้ยง" value={mentors.length} />
        <StatCard label="รายงานทั้งหมด" value={reports.length} />
        <StatCard label="รอมอบหมาย" value={reports.filter(r => r.status === "PENDING_ASSIGN").length} accent />
        <StatCard label="อนุมัติแล้ว" value={approved.length} />
        <StatCard label="ตีกลับ" value={reports.filter(r => r.status === "REJECTED").length} />
        <StatCard label="คะแนนเฉลี่ย" value={avgScore} />
        <StatCard label="รออนุมัติ" value={reports.filter(r => r.status === "PENDING_APPROVAL").length} />
      </div>

      <h2 className="text-base font-semibold mb-3" style={{ color: "#003E8E" }}>สรุปรายนักศึกษา</h2>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead style={{ background: "#F4F6FB" }}>
            <tr><Th>ชื่อ</Th><Th>ระดับ</Th><Th>รายงาน</Th><Th>อนุมัติ</Th><Th>คะแนนเฉลี่ย</Th></tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {students.map(s => {
              const mine = reports.filter(r => r.user.name === s.name);
              const mineApproved = mine.filter(r => r.scores);
              const avg = mineApproved.length
                ? (mineApproved.reduce((sum, r) => { const v = Object.values(r.scores!); return sum + v.reduce((a, b) => a + b, 0) / v.length; }, 0) / mineApproved.length).toFixed(1)
                : "-";
              return (
                <tr key={s.id} className="hover:bg-gray-50">
                  <Td><span className="font-medium text-gray-800">{s.name}</span></Td>
                  <Td>{s.level ? LEVEL_LABEL[s.level] : "-"}</Td>
                  <Td>{mine.length}</Td>
                  <Td>{mine.filter(r => r.status === "APPROVED").length}</Td>
                  <Td><span className="font-semibold" style={{ color: "#003E8E" }}>{avg}</span></Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ReportsTab({ reports, mentors, readOnly, meId, onAssign, onEval }: { reports: Rep[]; mentors: U[]; readOnly: boolean; meId: string; onAssign: (id: string, mentorId: string) => void; onEval: (r: Rep) => void }) {
  const [filter, setFilter] = useState("ALL");
  const filtered = filter === "ALL" ? reports : reports.filter(r => r.status === filter);

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "#003E8E" }}>รายงาน</h1>
          <p className="text-sm text-gray-500">จัดการและมอบหมายพี่เลี้ยง</p>
        </div>
        <select value={filter} onChange={e => setFilter(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white">
          <option value="ALL">ทั้งหมด</option>
          <option value="PENDING_ASSIGN">รอมอบหมาย</option>
          <option value="PENDING_APPROVAL">รออนุมัติ</option>
          <option value="APPROVED">อนุมัติแล้ว</option>
          <option value="REJECTED">ตีกลับ</option>
        </select>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead style={{ background: "#F4F6FB" }}>
            <tr><Th>วันที่</Th><Th>นักศึกษา</Th><Th>หัวข้องาน</Th><Th>สถานะ</Th><Th>พี่เลี้ยง</Th><Th>คะแนน</Th><Th> </Th></tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map(r => (
              <tr key={r.id} className="hover:bg-gray-50">
                <Td className="whitespace-nowrap text-gray-500">{r.date.slice(0, 10)}</Td>
                <Td><span className="font-medium text-gray-800">{r.user.name}</span>{r.user.level && <span className="text-xs text-gray-400 ml-1">{LEVEL_LABEL[r.user.level]}</span>}</Td>
                <Td><span className="font-medium">{r.title}</span>{r.location && <div className="text-xs text-gray-400">📍 {r.location}</div>}</Td>
                <Td><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[r.status]}`}>{STATUS_LABEL[r.status]}</span></Td>
                <Td>
                  {readOnly ? (r.assignedMentor?.name ?? "-") : (
                    <select value={r.assignedMentorId ?? ""} onChange={e => onAssign(r.id, e.target.value)}
                      className="border border-gray-200 rounded-lg px-2 py-1 text-xs bg-white max-w-[140px]">
                      <option value="">— มอบหมาย —</option>
                      {mentors.map(m => <option key={m.id} value={m.id}>{m.name}{m.role === "ADMIN" ? " (Admin)" : ""}</option>)}
                    </select>
                  )}
                </Td>
                <Td className="text-center">
                  {r.scores ? <span className="font-semibold" style={{ color: "#003E8E" }}>{(Object.values(r.scores).reduce((a, b) => a + b, 0) / Object.values(r.scores).length).toFixed(1)}</span> : <span className="text-gray-300">—</span>}
                </Td>
                <Td>
                  {!readOnly && r.assignedMentorId === meId && r.status === "PENDING_APPROVAL" && (
                    <button onClick={() => onEval(r)} className="text-xs px-2.5 py-1 rounded-lg font-medium text-white" style={{ background: "#003E8E" }}>ตรวจงาน</button>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UsersTab({ users, readOnly, onSetRole, onDetail }: { users: U[]; readOnly: boolean; onSetRole: (id: string, role: string) => void; onDetail: (u: U) => void }) {
  return (
    <div>
      <h1 className="text-xl font-bold mb-1" style={{ color: "#003E8E" }}>ผู้ใช้งาน</h1>
      <p className="text-sm text-gray-500 mb-6">คลิกชื่อเพื่อดูรายละเอียด</p>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead style={{ background: "#F4F6FB" }}>
            <tr><Th>ชื่อ</Th><Th>ชื่อเล่น</Th><Th>อีเมล</Th><Th>ระดับ</Th><Th>สถานศึกษา</Th><Th>สิทธิ์</Th><Th>สถานะ</Th></tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map(u => (
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
                      <select value={u.role} onChange={e => onSetRole(u.id, e.target.value)}
                        className="border border-gray-200 rounded-lg px-2 py-1 text-xs bg-white">
                        {Object.entries(ROLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    )}
                </td>
                <Td>
                  {u.profileDone
                    ? <span className="text-xs text-green-600">✓ ครบ</span>
                    : <span className="text-xs text-amber-500">⚠ ไม่ครบ</span>}
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UserDetailModal({ user: u, reports, onClose }: { user: U; reports: Rep[]; onClose: () => void }) {
  const mine = reports.filter(r => r.user.name === u.name);
  const approved = mine.filter(r => r.status === "APPROVED");
  const avgScore = approved.length
    ? (approved.reduce((s, r) => { const v = Object.values(r.scores ?? {}); return s + (v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0); }, 0) / approved.length).toFixed(1)
    : "-";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
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
            <StatCard label="อนุมัติ" value={approved.length} />
            <StatCard label="คะแนนเฉลี่ย" value={avgScore} />
          </div>
        </div>

        <div className="px-6 pb-6">
          <button onClick={onClose} className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl font-medium">ปิด</button>
        </div>
      </div>
    </div>
  );
}

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
    onDone({ ...report, ...(await res.json()) });
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
              <div className="flex justify-between text-sm mb-1"><span className="text-gray-600">{c.label}</span><span className="font-medium" style={{ color: "#003E8E" }}>{scores[c.key]}</span></div>
              <input type="range" min={1} max={5} value={scores[c.key]} onChange={e => setScores({ ...scores, [c.key]: +e.target.value })} className="w-full" style={{ accentColor: "#003E8E" }} />
            </div>
          ))}
        </div>
        <label className="block text-sm font-medium text-gray-700 mb-1">ความเห็น</label>
        <textarea rows={3} value={comment} onChange={e => setComment(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none resize-none mb-4" placeholder="ข้อเสนอแนะ / เหตุผลที่ตีกลับ" />
        <div className="flex gap-3">
          <button disabled={busy} onClick={() => submit("approve")} className="flex-1 text-white py-2.5 rounded-xl font-medium" style={{ background: "#16a34a" }}>อนุมัติ</button>
          <button disabled={busy} onClick={() => submit("reject")} className="flex-1 text-white py-2.5 rounded-xl font-medium" style={{ background: "#ef4444" }}>ตีกลับ</button>
          <button disabled={busy} onClick={onClose} className="px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium">ปิด</button>
        </div>
      </div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) { return <th className="text-left text-xs font-semibold text-gray-500 px-4 py-2.5 whitespace-nowrap">{children}</th>; }
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) { return <td className={`px-4 py-2.5 ${className}`}>{children}</td>; }
