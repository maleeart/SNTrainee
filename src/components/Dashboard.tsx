"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import type { Report } from "@prisma/client";

type User = { id?: string; name?: string | null; email?: string | null; image?: string | null };

export default function Dashboard({ user, initialReports }: { user: User; initialReports: Report[] }) {
  const [reports, setReports] = useState<Report[]>(initialReports);
  const [editing, setEditing] = useState<Report | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [taskInput, setTaskInput] = useState("");

  const today = new Date().toISOString().slice(0, 10);

  const openNew = () => {
    setEditing({ id: "", date: new Date(today), title: "", description: "", tasks: [], userId: user.id ?? "", createdAt: new Date(), updatedAt: new Date() });
    setTaskInput("");
    setShowForm(true);
  };

  const openEdit = (r: Report) => {
    setEditing(r);
    setTaskInput("");
    setShowForm(true);
  };

  const save = async () => {
    if (!editing) return;
    const dateStr = editing.date instanceof Date ? editing.date.toISOString().slice(0, 10) : String(editing.date).slice(0, 10);
    const res = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: dateStr, title: editing.title, description: editing.description, tasks: editing.tasks }),
    });
    const saved: Report = await res.json();
    setReports(prev => {
      const idx = prev.findIndex(r => r.id === saved.id || (r.date && String(r.date).slice(0, 10) === dateStr));
      if (idx >= 0) { const next = [...prev]; next[idx] = saved; return next; }
      return [saved, ...prev];
    });
    setShowForm(false);
    setEditing(null);
  };

  const del = async (id: string) => {
    if (!confirm("ลบรายการนี้?")) return;
    await fetch(`/api/reports/${id}`, { method: "DELETE" });
    setReports(prev => prev.filter(r => r.id !== id));
  };

  const addTask = () => {
    if (!taskInput.trim() || !editing) return;
    setEditing({ ...editing, tasks: [...(editing.tasks as string[]), taskInput.trim()] });
    setTaskInput("");
  };

  const removeTask = (i: number) => {
    if (!editing) return;
    const tasks = [...(editing.tasks as string[])];
    tasks.splice(i, 1);
    setEditing({ ...editing, tasks });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-blue-950 text-white shadow-lg">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div>
            <span className="font-bold text-yellow-400 text-lg">SNTrainee</span>
            <span className="text-blue-300 text-xs ml-2 hidden sm:inline">กฟผ. สนง.ไทรน้อย</span>
          </div>
          <div className="flex items-center gap-3">
            {user.image && <img src={user.image} className="w-7 h-7 rounded-full" alt="" />}
            <span className="text-sm text-blue-200 hidden sm:inline">{user.name}</span>
            <button onClick={() => signOut({ callbackUrl: "/" })} className="text-xs text-blue-300 hover:text-white px-2 py-1 rounded hover:bg-blue-800 transition-colors">
              ออกจากระบบ
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">บันทึกการฝึกงาน</h1>
            <p className="text-gray-500 text-sm mt-0.5">รายงานประจำวันของ {user.name}</p>
          </div>
          <button
            onClick={openNew}
            className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-xl font-medium text-sm transition-colors shadow"
          >
            <span className="text-lg leading-none">+</span> บันทึกวันใหม่
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
          <Stat label="รายการทั้งหมด" value={reports.length} />
          <Stat label="เดือนนี้" value={reports.filter(r => new Date(r.date).getMonth() === new Date().getMonth()).length} />
          <Stat label="สัปดาห์นี้" value={reports.filter(r => {
            const d = new Date(r.date); const now = new Date();
            const diff = (now.getTime() - d.getTime()) / 86400000;
            return diff >= 0 && diff < 7;
          }).length} />
        </div>

        {/* List */}
        {reports.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <div className="text-5xl mb-3">📋</div>
            <p>ยังไม่มีรายการ กดปุ่ม &quot;บันทึกวันใหม่&quot; เพื่อเริ่มต้น</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map(r => (
              <div key={r.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                        {formatDate(r.date)}
                      </span>
                    </div>
                    <h3 className="font-semibold text-gray-800 truncate">{r.title}</h3>
                    <p className="text-gray-500 text-sm mt-1 line-clamp-2">{r.description}</p>
                    {(r.tasks as string[]).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {(r.tasks as string[]).map((t, i) => (
                          <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{t}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => openEdit(r)} className="text-sm text-blue-600 hover:text-blue-800 font-medium">แก้ไข</button>
                    <button onClick={() => del(r.id)} className="text-sm text-red-400 hover:text-red-600">ลบ</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modal */}
      {showForm && editing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4">
                {editing.id ? "แก้ไขรายการ" : "บันทึกวันใหม่"}
              </h2>

              <div className="space-y-4">
                <Field label="วันที่">
                  <input
                    type="date"
                    value={editing.date instanceof Date ? editing.date.toISOString().slice(0, 10) : String(editing.date).slice(0, 10)}
                    onChange={e => setEditing({ ...editing, date: new Date(e.target.value) })}
                    className="input"
                  />
                </Field>

                <Field label="หัวข้อ / งานหลักวันนี้">
                  <input
                    type="text"
                    placeholder="เช่น ศึกษาระบบบัญชี และจัดเอกสาร"
                    value={editing.title}
                    onChange={e => setEditing({ ...editing, title: e.target.value })}
                    className="input"
                  />
                </Field>

                <Field label="รายละเอียดงานที่ทำ">
                  <textarea
                    rows={4}
                    placeholder="อธิบายงานที่ได้ทำในวันนี้โดยละเอียด..."
                    value={editing.description}
                    onChange={e => setEditing({ ...editing, description: e.target.value })}
                    className="input resize-none"
                  />
                </Field>

                <Field label="รายการงาน (Tasks)">
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      placeholder="เพิ่มรายการงาน..."
                      value={taskInput}
                      onChange={e => setTaskInput(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addTask())}
                      className="input flex-1"
                    />
                    <button onClick={addTask} className="bg-blue-100 text-blue-700 px-3 rounded-lg hover:bg-blue-200 text-sm font-medium">เพิ่ม</button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {(editing.tasks as string[]).map((t, i) => (
                      <span key={i} className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full">
                        {t}
                        <button onClick={() => removeTask(i)} className="text-blue-400 hover:text-red-500 ml-0.5">×</button>
                      </span>
                    ))}
                  </div>
                </Field>
              </div>

              <div className="flex gap-3 mt-6">
                <button onClick={save} className="flex-1 bg-blue-700 hover:bg-blue-800 text-white py-2.5 rounded-xl font-medium transition-colors">
                  บันทึก
                </button>
                <button onClick={() => setShowForm(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl font-medium transition-colors">
                  ยกเลิก
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .input { width: 100%; border: 1px solid #e5e7eb; border-radius: 0.5rem; padding: 0.5rem 0.75rem; font-size: 0.875rem; outline: none; transition: border-color 0.15s; }
        .input:focus { border-color: #3b82f6; box-shadow: 0 0 0 2px #bfdbfe; }
      `}</style>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      <div className="text-2xl font-bold text-blue-700">{value}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  );
}

function formatDate(date: Date | string) {
  const d = new Date(date);
  return d.toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric", weekday: "short" });
}
