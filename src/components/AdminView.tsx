"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import Image from "next/image";
import {
  ROLE_LABEL, LEVEL_LABEL, JOB_TYPE_LABEL, SYSTEM_LABEL, STATUS_LABEL, STATUS_COLOR, SCORE_CRITERIA,
} from "@/lib/labels";

type U = { id: string; name: string | null; email: string | null; image: string | null; role: string; level: string | null; school: string | null };
type Rep = {
  id: string; date: string; title: string; description: string; location: string | null;
  jobType: string | null; systemCategory: string | null; status: string;
  assignedMentorId: string | null; scores: Record<string, number> | null;
  user: { name: string | null; level: string | null; school: string | null };
  assignedMentor: { name: string | null } | null;
};

type Tab = "overview" | "reports" | "users";

export default function AdminView({ readOnly, meName, meImage, users: initUsers, reports: initReports }: {
  readOnly: boolean; meName: string; meImage?: string | null; users: U[]; reports: Rep[];
}) {
  const [users, setUsers] = useState<U[]>(initUsers);
  const [reports, setReports] = useState<Rep[]>(initReports);
  const [tab, setTab] = useState<Tab>("overview");
  const [sideOpen, setSideOpen] = useState(false);

  // admin + mentor can both be assigned as mentor
  const mentors = users.filter(u => u.role === "MENTOR" || u.role === "ADMIN");
  const students = users.filter(u => u.role === "STUDENT");
  const pending = reports.filter(r => r.status === "PENDING_ASSIGN").length;

  const setRole = async (userId: string, role: string) => {
    const res = await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ op: "role", userId, role }) });
    if (res.ok) setUsers(prev => prev.map(u => (u.id === userId ? { ...u, role } : u)));
    else alert("เปลี่ยนสิทธิ์ไม่สำเร็จ");
  };

  const assign = async (reportId: string, mentorId: string) => {
    const res = await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ op: "assign", reportId, mentorId }) });
    if (res.ok) {
      const mName = mentors.find(m => m.id === mentorId)?.name ?? null;
      setReports(prev => prev.map(r => (r.id === reportId ? { ...r, assignedMentorId: mentorId || null, assignedMentor: mentorId ? { name: mName } : null, status: mentorId ? "PENDING_APPROVAL" : "PENDING_ASSIGN" } : r)));
    } else alert("มอบหมายไม่สำเร็จ");
  };

  const exportCsv = () => {
    const head = ["วันที่", "นักศึกษา", "ระดับ", "สถานศึกษา", "ประเภทงาน", "หมวดระบบ", "สถานที่", "หัวข้อ", "พี่เลี้ยง", "สถานะ", ...SCORE_CRITERIA.map(c => c.label), "เฉลี่ย"];
    const rows = reports.map(r => {
      const sc = r.scores;
      const vals = SCORE_CRITERIA.map(c => (sc ? sc[c.key] ?? "" : ""));
      const avg = sc ? (Object.values(sc).reduce((a, b) => a + b, 0) / Object.values(sc).length).toFixed(2) : "";
      return [r.date.slice(0, 10), r.user.name ?? "", r.user.level ? LEVEL_LABEL[r.user.level] : "", r.user.school ?? "", r.jobType ? JOB_TYPE_LABEL[r.jobType] : "", r.systemCategory ? SYSTEM_LABEL[r.systemCategory] : "", r.location ?? "", r.title, r.assignedMentor?.name ?? "", STATUS_LABEL[r.status], ...vals, avg];
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
      {/* Top navbar */}
      <nav style={{ background: "#003E8E" }} className="shadow-lg flex-shrink-0">
        <div className="px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {/* Hamburger (mobile) */}
            <button className="md:hidden mr-1 text-white/70 hover:text-white" onClick={() => setSideOpen(o => !o)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </button>
            <div style={{ borderRadius: 8, overflow: "hidden", flexShrink: 0 }}>
              <Image src="/logi.png" alt="กบห-ธ." width={36} height={36} style={{ objectFit: "cover", display: "block" }} />
            </div>
            <div className="leading-tight">
              <span className="font-black italic text-white text-base" style={{ fontFamily: "'Arial Black', sans-serif" }}>กบห-ธ.</span>
              <span className="hidden sm:inline text-xs ml-1.5" style={{ color: "rgba(255,255,255,0.5)" }}>กฟผ. สนง.ไทรน้อย</span>
            </div>
            <span className="hidden sm:inline text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ background: "rgba(255,192,0,0.18)", color: "#FFC000", border: "1px solid rgba(255,192,0,0.3)" }}>
              {readOnly ? "ผู้บริหาร" : "ผู้ดูแลระบบ"}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {meImage && <img src={meImage} className="w-7 h-7 rounded-full ring-1 ring-white/20" alt="" />}
            <span className="text-sm hidden md:block" style={{ color: "rgba(255,255,255,0.8)" }}>{meName}</span>
            <button onClick={() => signOut({ callbackUrl: "/" })}
              className="text-xs px-2.5 py-1.5 rounded-lg"
              style={{ color: "rgba(255,255,255,0.55)", background: "rgba(255,255,255,0.07)" }}>
              ออกจากระบบ
            </button>
          </div>
        </div>
      </nav>

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
          {tab === "reports" && <ReportsTab reports={reports} mentors={mentors} readOnly={readOnly} onAssign={assign} />}
          {tab === "users" && <UsersTab users={users} readOnly={readOnly} onSetRole={setRole} />}
        </main>
      </div>
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

function ReportsTab({ reports, mentors, readOnly, onAssign }: { reports: Rep[]; mentors: U[]; readOnly: boolean; onAssign: (id: string, mentorId: string) => void }) {
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
            <tr><Th>วันที่</Th><Th>นักศึกษา</Th><Th>หัวข้องาน</Th><Th>หมวด</Th><Th>สถานะ</Th><Th>พี่เลี้ยง</Th><Th>คะแนน</Th></tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map(r => (
              <tr key={r.id} className="hover:bg-gray-50">
                <Td className="whitespace-nowrap text-gray-500">{r.date.slice(0, 10)}</Td>
                <Td><span className="font-medium text-gray-800">{r.user.name}</span>{r.user.level && <span className="text-xs text-gray-400 ml-1">{LEVEL_LABEL[r.user.level]}</span>}</Td>
                <Td><span className="font-medium">{r.title}</span>{r.location && <div className="text-xs text-gray-400">📍 {r.location}</div>}</Td>
                <Td>{r.systemCategory ? SYSTEM_LABEL[r.systemCategory] : "-"}</Td>
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UsersTab({ users, readOnly, onSetRole }: { users: U[]; readOnly: boolean; onSetRole: (id: string, role: string) => void }) {
  return (
    <div>
      <h1 className="text-xl font-bold mb-1" style={{ color: "#003E8E" }}>ผู้ใช้งาน</h1>
      <p className="text-sm text-gray-500 mb-6">จัดการสิทธิ์การเข้าถึง</p>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead style={{ background: "#F4F6FB" }}>
            <tr><Th>ชื่อ</Th><Th>อีเมล</Th><Th>ระดับ</Th><Th>สถานศึกษา</Th><Th>สิทธิ์</Th></tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-gray-50">
                <Td>
                  <div className="flex items-center gap-2">
                    {u.image && <img src={u.image} className="w-6 h-6 rounded-full" alt="" />}
                    <span className="font-medium text-gray-800">{u.name}</span>
                  </div>
                </Td>
                <Td className="text-gray-500">{u.email}</Td>
                <Td>{u.level ? LEVEL_LABEL[u.level] : <span className="text-gray-300">—</span>}</Td>
                <Td>{u.school ?? <span className="text-gray-300">—</span>}</Td>
                <Td>
                  {readOnly
                    ? <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "#EEF2FF", color: "#003E8E" }}>{ROLE_LABEL[u.role]}</span>
                    : (
                      <select value={u.role} onChange={e => onSetRole(u.id, e.target.value)}
                        className="border border-gray-200 rounded-lg px-2 py-1 text-xs bg-white">
                        {Object.entries(ROLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
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
