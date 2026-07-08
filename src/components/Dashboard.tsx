"use client";

import { useState, useRef } from "react";
import type { Report } from "@prisma/client";
import { STATUS_LABEL, STATUS_COLOR } from "@/lib/labels";
import { exportPptx } from "@/lib/exportPptx";
import AppNav from "./AppNav";

type User = { id?: string; name?: string | null; nickname?: string | null; email?: string | null; image?: string | null; role?: string; level?: string | null; school?: string | null; advisor?: string | null; startDate?: string | null; endDate?: string | null };
type ReportEx = Report & { images: string[]; editReason: string | null; solution: string | null; result: string | null; evalSummary?: { count: number } };
type MyStats = { totalReports: number; scoredReports: number; criteria: Record<string, number>; overall: number | null };

const iso = (d: Date | string) => (d instanceof Date ? d : new Date(d)).toISOString().slice(0, 10);

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

export default function Dashboard({ user, initialReports, myStats }: { user: User; initialReports: ReportEx[]; myStats: MyStats }) {
  const [reports, setReports] = useState<ReportEx[]>(initialReports);
  const [editing, setEditing] = useState<ReportEx | null>(null);
  const [toolInput, setToolInput] = useState("");
  const [ppeInput, setPpeInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [reasonPopup, setReasonPopup] = useState(false);
  const [showEditReason, setShowEditReason] = useState<string | null>(null);
  const [editReason, setEditReason] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const today = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; })();

  const blank = (): ReportEx => ({
    id: "", date: new Date(today), title: "", description: "", tasks: [],
    jobType: null, systemCategory: null,
    location: null, tools: [], ppe: [], learned: null, solution: null, result: null,
    images: [], editReason: null,
    userId: user.id ?? "", status: "PENDING",
    createdAt: new Date(), updatedAt: new Date(),
  });

  const save = async (reason?: string) => {
    if (!editing) return;
    if (!editing.title.trim()) return alert("กรุณากรอกหัวข้องาน");
    if (editing.id && !reason) { setEditReason(""); setReasonPopup(true); return; }
    // flush any uncommitted chip text before saving
    const tools = toolInput.trim() ? [...editing.tools, toolInput.trim()] : editing.tools;
    const ppe   = ppeInput.trim()  ? [...editing.ppe,   ppeInput.trim()]  : editing.ppe;
    const res = await fetch("/api/reports", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...editing, tools, ppe, date: iso(editing.date), editReason: reason ?? null }),
    });
    if (!res.ok) return alert((await res.json()).error ?? "บันทึกไม่สำเร็จ");
    const saved: ReportEx = await res.json();
    setReports(prev => {
      const i = prev.findIndex(r => r.id === saved.id);
      if (i >= 0) { const n = [...prev]; n[i] = saved; return n; }
      return [saved, ...prev].sort((a, b) => iso(b.date).localeCompare(iso(a.date)) || iso(b.createdAt).localeCompare(iso(a.createdAt)));
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

  const handleExport = async () => {
    if (!user.id || reports.length === 0) return;
    setExporting(true);
    try {
      const reps = reports.map(r => ({
        ...r,
        date: r.date instanceof Date ? r.date.toISOString() : String(r.date),
        user: { id: user.id!, name: user.name ?? null, nickname: user.nickname ?? null, level: user.level ?? null, school: user.school ?? null },
        evaluations: [],
      }));
      await exportPptx(user.id, reps, [{ id: user.id!, name: user.name ?? null, nickname: user.nickname ?? null, level: user.level ?? null, school: user.school ?? null }]);
    } catch (e) {
      alert("Export ไม่สำเร็จ: " + (e instanceof Error ? e.message : e));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: "#F4F6FB" }}>
      <AppNav name={user.name} nickname={user.nickname} email={user.email} image={user.image} role={user.role ?? "STUDENT"} level={user.level} school={user.school} advisor={user.advisor} startDate={user.startDate} endDate={user.endDate} profileHref="/profile" />

      <main className="max-w-5xl mx-auto px-4 py-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-5 gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-gray-800 leading-tight">บันทึกการฝึกงาน</h1>
            <p className="text-gray-400 text-xs mt-0.5">งานช่างไฟฟ้า อาคารและบริเวณ</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {/* Secondary: Export */}
            <button onClick={handleExport} disabled={exporting || reports.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-colors disabled:opacity-40"
              style={{ borderColor: "#003E8E", color: "#003E8E", background: "transparent" }}>
              {exporting
                ? <><span className="inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" /> Export...</>
                : <>⬇ Export PPTX</>}
            </button>
            {/* Primary: New report */}
            <button onClick={() => { setEditing(blank()); setToolInput(""); setPpeInput(""); }}
              className="flex items-center gap-1.5 text-white px-4 py-2.5 rounded-xl font-semibold text-sm shadow-md transition-all hover:shadow-lg active:scale-95"
              style={{ background: "linear-gradient(135deg,#1a56c4,#003E8E)" }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/></svg>
              บันทึกรายงาน
            </button>
          </div>
        </div>

        {/* Stat row */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: "ทั้งหมด", value: myStats.totalReports, color: "#003E8E", bg: "#EEF4FF" },
            { label: "ประเมินแล้ว", value: myStats.scoredReports, color: "#059669", bg: "#ECFDF5" },
            { label: "รอประเมิน", value: myStats.totalReports - myStats.scoredReports, color: "#D97706", bg: "#FFFBEB" },
          ].map(({ label, value, color, bg }) => (
            <div key={label} className="rounded-xl p-3 text-center shadow-sm border border-gray-100" style={{ background: bg }}>
              <div className="text-xl font-bold" style={{ color }}>{value}</div>
              <div className="text-xs mt-0.5" style={{ color }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Report list */}
        {reports.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <div className="text-5xl mb-3">🔌</div>
            <p>ยังไม่มีรายการ กด &quot;+ บันทึกรายงาน&quot; เพื่อเริ่มต้น</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map(r => (
              <div key={r.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 mb-1">
                      <span className="text-xs font-medium bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{formatDate(r.date)}</span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLOR[r.status]}`}>{STATUS_LABEL[r.status]}</span>
                      {r.editReason && (
                        <button onClick={() => setShowEditReason(r.editReason!)}
                          className="text-xs px-1.5 py-0.5 rounded-full font-medium hover:opacity-80 transition-opacity"
                          style={{ background: "#FEF3C7", color: "#92400E" }}>
                          ✏️ แก้ไขแล้ว
                        </button>
                      )}
                    </div>
                    <h3 className="font-semibold text-gray-800 truncate text-sm">{r.title}</h3>
                    {r.location && <p className="text-xs text-gray-400 mt-0.5">📍 {r.location}</p>}
                    <p className="text-gray-500 text-xs mt-1">{r.description}</p>
                    {(r.learned || r.solution || r.result) && (
                      <div className="mt-1.5 space-y-0.5">
                        {r.learned && <p className="text-xs text-gray-500"><span className="font-medium text-gray-600">ปัญหา:</span> {r.learned}</p>}
                        {r.solution && <p className="text-xs text-gray-500"><span className="font-medium text-gray-600">วิธีแก้:</span> {r.solution}</p>}
                        {r.result && <p className="text-xs text-gray-500"><span className="font-medium text-gray-600">ผลลัพธ์:</span> {r.result}</p>}
                      </div>
                    )}
                    {((r.tools as string[] | null)?.length ?? 0) > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {(r.tools as string[]).map((t, i) => (
                          <span key={i} className="text-xs px-2 py-0.5 rounded-full" style={{ background: "#EEF4FF", color: "#003E8E" }}>🔧 {t}</span>
                        ))}
                      </div>
                    )}
                    {((r.ppe as string[] | null)?.length ?? 0) > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {(r.ppe as string[]).map((t, i) => (
                          <span key={i} className="text-xs px-2 py-0.5 rounded-full" style={{ background: "#F0FDF4", color: "#059669" }}>🦺 {t}</span>
                        ))}
                      </div>
                    )}
                    {r.evalSummary && r.evalSummary.count > 0 && (
                      <div className="mt-2 inline-flex text-xs bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-lg">
                        👥 พี่เลี้ยงประเมินแล้ว {r.evalSummary.count} คน
                      </div>
                    )}
                    {r.images?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {r.images.map((url, i) => (
                          <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                            <img src={url} alt="" className="h-14 w-14 object-cover rounded-lg border border-gray-200 hover:opacity-80 transition-opacity" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    {r.status !== "SCORED" && (
                      <button onClick={() => { setEditing({ ...r }); setToolInput(""); setPpeInput(""); }}
                        className="text-xs font-medium px-2.5 py-1 rounded-lg border transition-colors"
                        style={{ borderColor: "#003E8E", color: "#003E8E" }}>แก้ไข</button>
                    )}
                    {r.status !== "SCORED" && (
                      <button onClick={() => del(r.id)} className="text-xs text-red-400 hover:text-red-600 px-2.5 py-1 rounded-lg border border-red-100 hover:border-red-300 transition-colors">ลบ</button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Edit / New modal — compact for mobile */}
      {editing && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md max-h-[92vh] overflow-y-auto">
            {/* Drag handle on mobile */}
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>
            <div className="px-4 pb-6 pt-2 sm:p-5">
              <h2 className="text-base font-bold text-gray-800 mb-3"
                style={{ color: "#003E8E" }}>{editing.id ? "แก้ไขรายการ" : "บันทึกรายงาน"}</h2>
              <div className="space-y-3">
                {/* Date + Location in one row */}
                <div className="grid grid-cols-2 gap-2">
                  <F label="วันที่">
                    <input type="date" value={iso(editing.date)} onChange={e => set({ date: new Date(e.target.value) })} className="input" />
                  </F>
                  <F label="สถานที่">
                    <input className="input" value={editing.location ?? ""} onChange={e => set({ location: e.target.value })} placeholder="อาคาร / ชั้น" />
                  </F>
                </div>
                <F label="หัวข้อ / งานหลักวันนี้ *">
                  <input className="input" value={editing.title} onChange={e => set({ title: e.target.value })} placeholder="เช่น เปลี่ยนหลอดไฟและตรวจเต้ารับ" />
                </F>
                <F label="รายละเอียดงานที่ทำ">
                  <textarea rows={2} className="input resize-none" value={editing.description} onChange={e => set({ description: e.target.value })} placeholder="อธิบายงานโดยละเอียด..." />
                </F>
                <F label="เครื่องมือ/อุปกรณ์ที่ใช้">
                  <ChipInput value={toolInput} setValue={setToolInput} items={editing.tools} onAdd={t => set({ tools: [...editing.tools, t] })} onRemove={i => set({ tools: editing.tools.filter((_, x) => x !== i) })} placeholder="เพิ่มเครื่องมือ..." />
                </F>
                <F label="อุปกรณ์ป้องกันที่ใช้">
                  <ChipInput value={ppeInput} setValue={setPpeInput} items={editing.ppe} onAdd={t => set({ ppe: [...editing.ppe, t] })} onRemove={i => set({ ppe: editing.ppe.filter((_, x) => x !== i) })} placeholder="เช่น ถุงมือ, หมวก..." />
                </F>
                {/* Problem / Solution / Result in compact grid */}
                <div className="grid grid-cols-1 gap-2">
                  <F label="ปัญหาที่พบ">
                    <textarea rows={1} className="input resize-none" value={editing.learned ?? ""} onChange={e => set({ learned: e.target.value })} placeholder="ปัญหา / อุปสรรค..." />
                  </F>
                  <F label="วิธีแก้ปัญหา">
                    <textarea rows={1} className="input resize-none" value={editing.solution ?? ""} onChange={e => set({ solution: e.target.value })} placeholder="วิธีที่ใช้แก้ไข..." />
                  </F>
                  <F label="ผลลัพธ์">
                    <textarea rows={1} className="input resize-none" value={editing.result ?? ""} onChange={e => set({ result: e.target.value })} placeholder="ผลลัพธ์ / สิ่งที่ได้เรียนรู้..." />
                  </F>
                </div>
                <F label="รูปภาพประกอบ (สูงสุด 5 รูป)">
                  <div className="space-y-2">
                    {editing.images?.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {editing.images.map((url, i) => (
                          <div key={i} className="relative group">
                            <img src={url} alt="" className="h-16 w-16 object-cover rounded-lg border border-gray-200" />
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
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-dashed border-gray-300 text-xs text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors disabled:opacity-50">
                      {uploading ? "กำลังอัพโหลด..." : "📷 เพิ่มรูปภาพ"}
                    </button>
                  </div>
                </F>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={() => save()} disabled={uploading}
                  className="flex-1 text-white py-2.5 rounded-xl font-semibold text-sm disabled:opacity-50 shadow-md"
                  style={{ background: "linear-gradient(135deg,#1a56c4,#003E8E)" }}>บันทึก</button>
                <button onClick={() => setEditing(null)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 py-2.5 rounded-xl font-medium text-sm">ยกเลิก</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit reason popup */}
      {reasonPopup && (
        <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-[60]">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-sm px-4 pt-4 pb-6 sm:p-5">
            <div className="flex justify-center pt-0 pb-2 sm:hidden">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>
            <h3 className="font-bold text-gray-800 mb-0.5 text-sm">ระบุเหตุผลที่แก้ไข</h3>
            <p className="text-xs text-gray-400 mb-2">จำเป็นต้องระบุเพื่อให้พี่เลี้ยงทราบสาเหตุ</p>
            <textarea rows={3} autoFocus className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none resize-none focus:border-amber-400"
              value={editReason} onChange={e => setEditReason(e.target.value)}
              placeholder="เช่น แก้ไขรายละเอียดงานที่บันทึกผิด..." />
            <div className="flex gap-2 mt-3">
              <button disabled={!editReason.trim() || uploading}
                onClick={() => { setReasonPopup(false); save(editReason); }}
                className="flex-1 text-white py-2.5 rounded-xl font-semibold text-sm disabled:opacity-40 shadow-md"
                style={{ background: "linear-gradient(135deg,#1a56c4,#003E8E)" }}>ยืนยัน</button>
              <button onClick={() => setReasonPopup(false)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 py-2.5 rounded-xl font-medium text-sm">ยกเลิก</button>
            </div>
          </div>
        </div>
      )}

      {showEditReason && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowEditReason(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">✏️</span>
              <h3 className="font-bold text-gray-800 text-sm">เหตุผลที่แก้ไขรายงาน</h3>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed bg-amber-50 rounded-xl px-4 py-3 border border-amber-100">{showEditReason}</p>
            <button onClick={() => setShowEditReason(null)}
              className="mt-4 w-full py-2.5 rounded-xl font-semibold text-sm text-white"
              style={{ background: "linear-gradient(135deg,#1a56c4,#003E8E)" }}>ปิด</button>
          </div>
        </div>
      )}

      <style jsx global>{`
        .input { width: 100%; border: 1px solid #e5e7eb; border-radius: 0.5rem; padding: 0.4rem 0.65rem; font-size: 0.875rem; outline: none; }
        .input:focus { border-color: #003E8E; box-shadow: 0 0 0 2px rgba(0,62,142,0.12); }
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
      <div className="mb-1.5">
        <input className="input" value={value} placeholder={placeholder}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => e.key === "Enter" && (e.preventDefault(), add())}
          onBlur={add} />
      </div>
      <div className="flex flex-wrap gap-1">
        {items.map((t, i) => (
          <span key={i} className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full" style={{ background: "#EEF4FF", color: "#003E8E" }}>
            {t}<button onClick={() => onRemove(i)} className="hover:text-red-500 ml-0.5">×</button>
          </span>
        ))}
      </div>
    </>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 mb-0.5 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric", weekday: "short" });
}
