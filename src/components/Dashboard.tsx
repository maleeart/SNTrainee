"use client";

import { useState, useRef } from "react";
import type { Report } from "@prisma/client";
import {
  STATUS_LABEL, STATUS_COLOR, SCORE_CRITERIA,
} from "@/lib/labels";
import AppNav from "./AppNav";

type User = { id?: string; name?: string | null; nickname?: string | null; email?: string | null; image?: string | null; role?: string; level?: string | null; school?: string | null; advisor?: string | null; startDate?: string | null; endDate?: string | null };
type Scores = Record<string, number>;
type ReportEx = Report & { images: string[]; editReason: string | null; solution: string | null; result: string | null };

const iso = (d: Date | string) => (d instanceof Date ? d : new Date(d)).toISOString().slice(0, 10);

// compress image with Canvas before upload — target ≤ 800px, quality 0.75 JPEG (like Squoosh default)
async function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 1200;
      let { width, height } = img;
      if (width > MAX || height > MAX) {
        if (width > height) { height = Math.round(height * MAX / width); width = MAX; }
        else { width = Math.round(width * MAX / height); height = MAX; }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
      canvas.toBlob(b => { URL.revokeObjectURL(url); b ? resolve(b) : reject(new Error("compress failed")); }, "image/jpeg", 0.75);
    };
    img.onerror = reject;
    img.src = url;
  });
}

export default function Dashboard({ user, initialReports }: { user: User; initialReports: ReportEx[] }) {
  const [reports, setReports] = useState<ReportEx[]>(initialReports);
  const [editing, setEditing] = useState<ReportEx | null>(null);
  const [toolInput, setToolInput] = useState("");
  const [ppeInput, setPpeInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [reasonPopup, setReasonPopup] = useState(false);
  const [editReason, setEditReason] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const today = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; })();

  const blank = (): ReportEx => ({
    id: "", date: new Date(today), title: "", description: "", tasks: [],
    jobType: null, systemCategory: null, location: null, tools: [], ppe: [], learned: null, solution: null, result: null,
    images: [], editReason: null,
    userId: user.id ?? "", assignedMentorId: null, status: "PENDING_ASSIGN",
    mentorComment: null, scores: null, evaluatedAt: null,
    createdAt: new Date(), updatedAt: new Date(),
  });

  const save = async (reason?: string) => {
    if (!editing) return;
    if (!editing.title.trim()) return alert("กรุณากรอกหัวข้องาน");
    // ถ้าแก้ไข และยังไม่มี reason → เปิด popup
    if (editing.id && !reason) { setEditReason(""); setReasonPopup(true); return; }
    const res = await fetch("/api/reports", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...editing, date: iso(editing.date), editReason: reason ?? null }),
    });
    if (!res.ok) return alert((await res.json()).error ?? "บันทึกไม่สำเร็จ");
    const saved: ReportEx = await res.json();
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

  const set = (patch: Partial<ReportEx>) => setEditing(e => (e ? { ...e, ...patch } : e));

  const handleImagePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length || !editing) return;
    if ((editing.images?.length ?? 0) + files.length > 5) return alert("แนบรูปได้สูงสุด 5 รูปต่อรายงาน");
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const file of files) {
        const compressed = await compressImage(file);
        const form = new FormData();
        form.append("file", compressed, file.name.replace(/\.[^.]+$/, ".jpg"));
        const res = await fetch("/api/upload", { method: "POST", body: form });
        if (!res.ok) { alert("อัพโหลดรูปไม่สำเร็จ"); break; }
        urls.push((await res.json()).url);
      }
      set({ images: [...(editing.images ?? []), ...urls] });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const scored = reports.filter(r => r.scores);
  const avg = scored.length
    ? (scored.reduce((s, r) => {
        const v = Object.values(r.scores as Scores);
        return s + v.reduce((a, b) => a + b, 0) / v.length;
      }, 0) / scored.length).toFixed(1)
    : "-";

  return (
    <div className="min-h-screen" style={{ background: "#F4F6FB" }}>
      <AppNav name={user.name} nickname={user.nickname} email={user.email} image={user.image} role={user.role ?? "STUDENT"} level={user.level} school={user.school} advisor={user.advisor} startDate={user.startDate} endDate={user.endDate} profileHref="/profile" />

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">บันทึกการฝึกงาน</h1>
            <p className="text-gray-500 text-sm mt-0.5">งานช่างไฟฟ้า อาคารและบริเวณ</p>
          </div>
          {(() => {
            const todayApproved = reports.find(r => iso(r.date) === today && r.status === "APPROVED");
            return todayApproved ? (
              <div className="text-right">
                <button disabled className="flex items-center gap-2 text-white px-4 py-2 rounded-xl font-medium text-sm opacity-40 cursor-not-allowed" style={{ background: "#003E8E" }}>
                  <span className="text-lg leading-none">+</span> บันทึกวันใหม่
                </button>
                <p className="text-xs text-green-600 mt-1">✓ วันนี้อนุมัติแล้ว</p>
              </div>
            ) : (
              <button onClick={() => { setEditing(blank()); setToolInput(""); setPpeInput(""); }}
                className="flex items-center gap-2 text-white px-4 py-2 rounded-xl font-medium text-sm shadow transition-opacity hover:opacity-90"
                style={{ background: "#003E8E" }}>
                <span className="text-lg leading-none">+</span> บันทึกวันใหม่
              </button>
            );
          })()}
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

                    </div>
                    <h3 className="font-semibold text-gray-800 truncate">{r.title}</h3>
                    {r.location && <p className="text-xs text-gray-400 mt-0.5">📍 {r.location}</p>}
                    <p className="text-gray-500 text-sm mt-1 line-clamp-2">{r.description}</p>
                    {(r.learned || r.solution) && (
                      <div className="mt-2 space-y-1">
                        {r.learned && <p className="text-xs text-gray-500"><span className="font-medium text-gray-600">ปัญหาที่พบ:</span> {r.learned}</p>}
                        {r.solution && <p className="text-xs text-gray-500"><span className="font-medium text-gray-600">วิธีแก้:</span> {r.solution}</p>}
                        {r.result && <p className="text-xs text-gray-500"><span className="font-medium text-gray-600">ผลลัพธ์:</span> {r.result}</p>}
                      </div>
                    )}
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
                    {r.images?.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {r.images.map((url, i) => (
                          <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                            <img src={url} alt="" className="h-16 w-16 object-cover rounded-lg border border-gray-200 hover:opacity-80 transition-opacity" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    {r.status !== "APPROVED" && (
                      <button onClick={() => { setEditing({ ...r }); setToolInput(""); setPpeInput(""); }} className="text-sm font-medium" style={{ color: "#003E8E" }}>แก้ไข</button>
                    )}
                    {r.status !== "APPROVED" && (
                      <button onClick={() => del(r.id)} className="text-sm text-red-400 hover:text-red-600">ลบ</button>
                    )}
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
                <F label="อุปกรณ์ป้องกันที่ใช้">
                  <ChipInput value={ppeInput} setValue={setPpeInput} items={editing.ppe} onAdd={t => set({ ppe: [...editing.ppe, t] })} onRemove={i => set({ ppe: editing.ppe.filter((_, x) => x !== i) })} placeholder="เช่น หมวกนิรภัย, ถุงมือยาง..." />
                </F>
                <F label="ปัญหาที่พบ">
                  <textarea rows={2} className="input resize-none" value={editing.learned ?? ""} onChange={e => set({ learned: e.target.value })} placeholder="ระบุปัญหาหรืออุปสรรคที่พบ..." />
                </F>
                <F label="วิธีการแก้ปัญหา">
                  <textarea rows={2} className="input resize-none" value={editing.solution ?? ""} onChange={e => set({ solution: e.target.value })} placeholder="วิธีที่ใช้แก้ไขหรือแนวทางที่ใช้..." />
                </F>
                <F label="ผลลัพธ์และสิ่งที่ได้รับ">
                  <textarea rows={2} className="input resize-none" value={editing.result ?? ""} onChange={e => set({ result: e.target.value })} placeholder="ผลลัพธ์จากงานและสิ่งที่ได้เรียนรู้..." />
                </F>

                {/* Image upload */}
                <F label="รูปภาพประกอบ (สูงสุด 5 รูป)">
                  <div className="space-y-2">
                    {editing.images?.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {editing.images.map((url, i) => (
                          <div key={i} className="relative group">
                            <img src={url} alt="" className="h-20 w-20 object-cover rounded-lg border border-gray-200" />
                            <button onClick={() => set({ images: editing.images.filter((_, x) => x !== i) })}
                              className="absolute top-0.5 right-0.5 bg-black/60 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImagePick} />
                    <button type="button" disabled={uploading || (editing.images?.length ?? 0) >= 5}
                      onClick={() => fileRef.current?.click()}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-gray-300 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors disabled:opacity-50">
                      {uploading ? "กำลังบีบอัดและอัพโหลด..." : "📷 เพิ่มรูปภาพ"}
                    </button>
                    <p className="text-xs text-gray-400">รูปจะถูกบีบอัดอัตโนมัติก่อนอัพโหลด</p>
                  </div>
                </F>

              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => save()} disabled={uploading} className="flex-1 text-white py-2.5 rounded-xl font-medium disabled:opacity-50" style={{ background: "#003E8E" }}>บันทึก</button>
                <button onClick={() => setEditing(null)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl font-medium">ยกเลิก</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {reasonPopup && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="font-bold text-gray-800 mb-1">ระบุเหตุผลที่แก้ไข</h3>
            <p className="text-xs text-gray-400 mb-3">จำเป็นต้องระบุเพื่อให้พี่เลี้ยงทราบสาเหตุ</p>
            <textarea rows={3} autoFocus className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none resize-none focus:border-amber-400"
              value={editReason} onChange={e => setEditReason(e.target.value)}
              placeholder="เช่น แก้ไขรายละเอียดงานที่บันทึกผิด..." />
            <div className="flex gap-3 mt-4">
              <button disabled={!editReason.trim() || uploading}
                onClick={() => { setReasonPopup(false); save(editReason); }}
                className="flex-1 text-white py-2.5 rounded-xl font-medium disabled:opacity-40"
                style={{ background: "#003E8E" }}>ยืนยัน</button>
              <button onClick={() => setReasonPopup(false)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl font-medium">ยกเลิก</button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .input { width: 100%; border: 1px solid #e5e7eb; border-radius: 0.5rem; padding: 0.5rem 0.75rem; font-size: 0.875rem; outline: none; }
        .input:focus { border-color: #003E8E; box-shadow: 0 0 0 2px rgba(0,62,142,0.15); }
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
        <button onClick={add} className="px-3 rounded-lg text-sm font-medium" style={{ background: "#EEF2FF", color: "#003E8E" }}>เพิ่ม</button>
      </div>
      <div className="flex flex-wrap gap-1">
        {items.map((t, i) => (
          <span key={i} className="flex items-center gap-1 text-xs px-2 py-1 rounded-full" style={{ background: "#EEF2FF", color: "#003E8E" }}>
            {t}<button onClick={() => onRemove(i)} className="hover:text-red-500 ml-0.5">×</button>
          </span>
        ))}
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      <div className="text-2xl font-bold" style={{ color: "#003E8E" }}>{value}</div>
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
