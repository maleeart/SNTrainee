"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
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

export default function AdminView({ readOnly, meName, users: initUsers, reports: initReports }: {
  readOnly: boolean; meName: string; users: U[]; reports: Rep[];
}) {
  const [users, setUsers] = useState<U[]>(initUsers);
  const [reports, setReports] = useState<Rep[]>(initReports);
  const [tab, setTab] = useState<"reports" | "users">("reports");

  const mentors = users.filter(u => u.role === "MENTOR");
  const students = users.filter(u => u.role === "STUDENT");

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
      return [
        r.date.slice(0, 10), r.user.name ?? "", r.user.level ? LEVEL_LABEL[r.user.level] : "", r.user.school ?? "",
        r.jobType ? JOB_TYPE_LABEL[r.jobType] : "", r.systemCategory ? SYSTEM_LABEL[r.systemCategory] : "",
        r.location ?? "", r.title, r.assignedMentor?.name ?? "", STATUS_LABEL[r.status], ...vals, avg,
      ];
    });
    const csv = [head, ...rows].map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `SNTrainee_report_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-blue-950 text-white shadow-lg">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div>
            <span className="font-bold text-yellow-400 text-lg">SNTrainee</span>
            <span className="text-blue-300 text-xs ml-2">{readOnly ? "ผู้บริหาร" : "ผู้ดูแลระบบ"}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-blue-200 hidden sm:inline">{meName}</span>
            <button onClick={() => signOut({ callbackUrl: "/" })} className="text-xs text-blue-300 hover:text-white px-2 py-1 rounded hover:bg-blue-800">ออกจากระบบ</button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <Stat label="นักศึกษา" value={students.length} />
          <Stat label="พี่เลี้ยง" value={mentors.length} />
          <Stat label="รายงานทั้งหมด" value={reports.length} />
          <Stat label="รอมอบหมาย" value={reports.filter(r => r.status === "PENDING_ASSIGN").length} />
        </div>

        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-2">
            <Tab active={tab === "reports"} onClick={() => setTab("reports")}>รายงาน</Tab>
            <Tab active={tab === "users"} onClick={() => setTab("users")}>ผู้ใช้งาน</Tab>
          </div>
          <button onClick={exportCsv} className="bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-2 rounded-lg font-medium">⬇ โหลดรายงาน (CSV)</button>
        </div>

        {tab === "reports" ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs">
                <tr>
                  <Th>วันที่</Th><Th>นักศึกษา</Th><Th>งาน</Th><Th>หมวด</Th><Th>สถานะ</Th><Th>พี่เลี้ยง</Th><Th>คะแนน</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {reports.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <Td>{r.date.slice(0, 10)}</Td>
                    <Td>{r.user.name}{r.user.level && <span className="text-xs text-gray-400 ml-1">{LEVEL_LABEL[r.user.level]}</span>}</Td>
                    <Td><span className="font-medium">{r.title}</span>{r.location && <div className="text-xs text-gray-400">📍 {r.location}</div>}</Td>
                    <Td>{r.systemCategory ? SYSTEM_LABEL[r.systemCategory] : "-"}</Td>
                    <Td><span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLOR[r.status]}`}>{STATUS_LABEL[r.status]}</span></Td>
                    <Td>
                      {readOnly ? (r.assignedMentor?.name ?? "-") : (
                        <select value={r.assignedMentorId ?? ""} onChange={e => assign(r.id, e.target.value)} className="border border-gray-200 rounded px-2 py-1 text-xs">
                          <option value="">— มอบหมาย —</option>
                          {mentors.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </select>
                      )}
                    </Td>
                    <Td>{r.scores ? (Object.values(r.scores).reduce((a, b) => a + b, 0) / Object.values(r.scores).length).toFixed(1) : "-"}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs">
                <tr><Th>ชื่อ</Th><Th>อีเมล</Th><Th>ระดับ</Th><Th>สถานศึกษา</Th><Th>สิทธิ์</Th></tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <Td>{u.name}</Td>
                    <Td className="text-gray-500">{u.email}</Td>
                    <Td>{u.level ? LEVEL_LABEL[u.level] : "-"}</Td>
                    <Td>{u.school ?? "-"}</Td>
                    <Td>
                      {readOnly ? ROLE_LABEL[u.role] : (
                        <select value={u.role} onChange={e => setRole(u.id, e.target.value)} className="border border-gray-200 rounded px-2 py-1 text-xs">
                          {Object.entries(ROLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"><div className="text-2xl font-bold text-blue-700">{value}</div><div className="text-xs text-gray-500 mt-0.5">{label}</div></div>;
}
function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} className={`px-4 py-2 rounded-lg text-sm font-medium ${active ? "bg-blue-700 text-white" : "bg-white text-gray-600 border border-gray-200"}`}>{children}</button>;
}
function Th({ children }: { children: React.ReactNode }) { return <th className="text-left font-medium px-4 py-2 whitespace-nowrap">{children}</th>; }
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) { return <td className={`px-4 py-2 whitespace-nowrap ${className}`}>{children}</td>; }
