"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import type { Report } from "@prisma/client";
import {
  JOB_TYPE_LABEL, SYSTEM_LABEL, STATUS_LABEL, STATUS_COLOR,
  SCORE_CRITERIA, PPE_OPTIONS,
} from "@/lib/labels";

type User = { id?: string; name?: string | null; image?: string | null };
type Scores = Record<string, number>;

const iso = (d: Date | string) => (d instanceof Date ? d : new Date(d)).toISOString().slice(0, 10);

export default function Dashboard({ user, initialReports }: { user: User; initialReports: Report[] }) {
  const [reports, setReports] = useState<Report[]>(initialReports);
  const [editing, setEditing] = useState<Report | null>(null);
  const [taskInput, setTaskInput] = useState("");
  const [toolInput, setToolInput] = useState("");

  const today = new Date().toISOString().slice(0, 10);

  const blank = (): Report => ({
    id: "", date: new Date(today), title: "", description: "", tasks: [],
    jobType: null, systemCategory: null, location: null, tools: [], ppe: [], learned: null,
    userId: user.id ?? "", assignedMentorId: null, status: "PENDING_ASSIGN",
    mentorComment: null, scores: null, evaluatedAt: null,
    createdAt: new Date(), updatedAt: new Date(),
  });

  const save = async () => {
    if (!editing) return;
    if (!editing.title.trim()) return alert("กรุณากรอกหัวข้องาน");
    const res = await fetch("/api/reports", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...editing, date: iso(editing.date) }),
    });
    if (!res.ok) return alert((await res.json()).error ?? "บันทึกไม่สำเร็จ");
    const saved: Report = await res.json();
    setReports(prev => {
      const i = prev.findIndex(r => r.id === saved.id);
      if (i >= 0) { const n = [...prev]; n[i] = saved; return n; }
      return [saved, ...prev].sort((a, b) => iso(b.date).localeCompare(iso(a.date)));
    });
    setEditing(null);
  };

  const del = async (id: string) => {
    if (!confirm("ลบรายการนี้?")) return;
    await fetch(`/api/reports/${id}`, { method: "DELETE" });
    setReports(prev => prev.filter(r => r.id !== id));
  };

  const set = (patch: Partial<Report>) => setEditing(e => (e ? { ...e, ...patch } : e));

  // สรุปคะแนนเฉลี่ยจากงานที่ประเมินแล้ว
  const scored = reports.filter(r => r.scores);
  const avg = scored.length
    ? (scored.reduce((s, r) => {
        const v = Object.values(r.scores as Scores);
        return s + v.reduce((a, b) => a + b, 0) / v.length;
      }, 0) / scored.length).toFixed(1)
    : "-";

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-blue-950 text-white shadow-lg">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div>
            <span className="font-bold text-yellow-400 text-lg">SNTrainee</span>
            <span className="text-blue-300 text-xs ml-2 hidden sm:inline">กฟผ. สนง.ไทรน้อย</span>
          </div>
          <div className="flex items-center gap-3">
            <a href="/profile" className="text-xs text-blue-300 hover:text-white">โปรไฟล์</a>
            {user.image && <img src={user.image} className="w-7 h-7 rounded-full" alt="" />}
            <span className="text-sm text-blue-200 hidden sm:inline">{user.name}</span>
            <button onClick={() => signOut({ callbackUrl: "/" })} className="text-xs text-blue-300 hover:text-white px-2 py-1 rounded hover:bg-blue-800">ออกจากระบบ</button>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">บันทึกการฝึกงาน</h1>
            <p className="text-gray-500 text-sm mt-0.5">งานช่างไฟฟ้า อาคารและบริเวณ</p>
          </div>
          <button onClick={() => { setEditing(blank()); setTaskInput(""); setToolInput(""); }}
            className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-xl font-medium text-sm shadow">
            <span className="text-lg leading-none">+</span> บันทึกวันใหม่
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <Stat label="รายการทั้งหมด" value={reports.length} />
          <Stat label="อนุมัติแล้ว" value={reports.filter(r => r.status === "APPROVED").length} />
          <Stat label="รออนุมัติ" value={reports.filter(r => r.status === "PENDING_APPROVAL" || r.status === "PENDING_ASSIGN").length} />
          <Stat label="คะแนนเฉลี่ย" value={avg} />
        </div>

        {reports.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <div className="text-5xl mb-3">🔌</div>
            <p>ยังไม่มีรายการ กดปุ่ม &quot;บันทึกวันใหม่&quot; เพื่อเริ่มต้น</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map(r => (
              <div key={r.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-xs font-medium bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{formatDate(r.date)}</span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLOR[r.status]}`}>{STATUS_LABEL[r.status]}</span>
                      {r.systemCategory && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{SYSTEM_LABEL[r.systemCategory]}</span>}
                      {r.jobType && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{JOB_TYPE_LABEL[r.jobType]}</span>}
                    </div>
                    <h3 className="font-semibold text-gray-800 truncate">{r.title}</h3>
                    {r.location && <p className="text-xs text-gray-400 mt-0.5">📍 {r.location}</p>}
                    <p className="text-gray-500 text-sm mt-1 line-clamp-2">{r.description}</p>
                    {r.mentorComment && (
                      <div className="mt-2 text-sm bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 text-amber-800">
                        <span className="font-medium">พี่เลี้ยง:</span> {r.mentorComment}
                      </div>
                    )}
                    {r.scores != null && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {SCORE_CRITERIA.map(c => (
                          <span key={c.key} className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">
                            {c.label}: {(r.scores as Scores)[c.key] ?? "-"}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    {r.status !== "APPROVED" && (
                      <button onClick={() => { setEditing(r); setTaskInput(""); setToolInput(""); }} className="text-sm text-blue-600 hover:text-blue-800 font-medium">แก้ไข</button>
                    )}
                    <button onClick={() => del(r.id)} className="text-sm text-red-400 hover:text-red-600">ลบ</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {editing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4">{editing.id ? "แก้ไขรายการ" : "บันทึกวันใหม่"}</h2>
              <div className="space-y-4">
                <F label="วันที่">
                  <input type="date" value={iso(editing.date)} onChange={e => set({ date: new Date(e.target.value) })} className="input" />
                </F>
                <div className="grid grid-cols-2 gap-3">
                  <F label="ประเภทงาน">
                    <select className="input" value={editing.jobType ?? ""} onChange={e => set({ jobType: (e.target.value || null) as Report["jobType"] })}>
                      <option value="">— เลือก —</option>
                      {Object.entries(JOB_TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </F>
                  <F label="หมวดระบบ">
                    <select className="input" value={editing.systemCategory ?? ""} onChange={e => set({ systemCategory: (e.target.value || null) as Report["systemCategory"] })}>
                      <option value="">— เลือก —</option>
                      {Object.entries(SYSTEM_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </F>
                </div>
                <F label="สถานที่ (อาคาร/ชั้น/บริเวณ)">
                  <input className="input" value={editing.location ?? ""} onChange={e => set({ location: e.target.value })} placeholder="เช่น อาคาร ก. ชั้น 2" />
                </F>
                <F label="หัวข้อ / งานหลักวันนี้ *">
                  <input className="input" value={editing.title} onChange={e => set({ title: e.target.value })} placeholder="เช่น เปลี่ยนหลอดไฟและตรวจเต้ารับ" />
                </F>
                <F label="รายละเอียดงานที่ทำ">
                  <textarea rows={3} className="input resize-none" value={editing.description} onChange={e => set({ description: e.target.value })} placeholder="อธิบายงานโดยละเอียด..." />
                </F>
                <F label="เครื่องมือ/อุปกรณ์ที่ใช้">
                  <ChipInput value={toolInput} setValue={setToolInput} items={editing.tools} onAdd={t => set({ tools: [...editing.tools, t] })} onRemove={i => set({ tools: editing.tools.filter((_, x) => x !== i) })} placeholder="เพิ่มเครื่องมือ..." />
                </F>
                <F label="ความปลอดภัยที่ปฏิบัติ (PPE)">
                  <div className="space-y-1">
                    {PPE_OPTIONS.map(opt => (
                      <label key={opt} className="flex items-center gap-2 text-sm text-gray-600">
                        <input type="checkbox" checked={editing.ppe.includes(opt)}
                          onChange={e => set({ ppe: e.target.checked ? [...editing.ppe, opt] : editing.ppe.filter(p => p !== opt) })} />
                        {opt}
                      </label>
                    ))}
                  </div>
                </F>
                <F label="ปัญหา / สิ่งที่เรียนรู้">
                  <textarea rows={2} className="input resize-none" value={editing.learned ?? ""} onChange={e => set({ learned: e.target.value })} />
                </F>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={save} className="flex-1 bg-blue-700 hover:bg-blue-800 text-white py-2.5 rounded-xl font-medium">บันทึก</button>
                <button onClick={() => setEditing(null)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl font-medium">ยกเลิก</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .input { width: 100%; border: 1px solid #e5e7eb; border-radius: 0.5rem; padding: 0.5rem 0.75rem; font-size: 0.875rem; outline: none; }
        .input:focus { border-color: #3b82f6; box-shadow: 0 0 0 2px #bfdbfe; }
      `}</style>
    </div>
  );
}

function ChipInput({ value, setValue, items, onAdd, onRemove, placeholder }: {
  value: string; setValue: (s: string) => void; items: string[];
  onAdd: (t: string) => void; onRemove: (i: number) => void; placeholder: string;
}) {
  const add = () => { if (value.trim()) { onAdd(value.trim()); setValue(""); } };
  return (
    <>
      <div className="flex gap-2 mb-2">
        <input className="input flex-1" value={value} placeholder={placeholder}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => e.key === "Enter" && (e.preventDefault(), add())} />
        <button onClick={add} className="bg-blue-100 text-blue-700 px-3 rounded-lg hover:bg-blue-200 text-sm font-medium">เพิ่ม</button>
      </div>
      <div className="flex flex-wrap gap-1">
        {items.map((t, i) => (
          <span key={i} className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full">
            {t}<button onClick={() => onRemove(i)} className="text-blue-400 hover:text-red-500 ml-0.5">×</button>
          </span>
        ))}
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      <div className="text-2xl font-bold text-blue-700">{value}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
    </div>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  );
}

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric", weekday: "short" });
}
