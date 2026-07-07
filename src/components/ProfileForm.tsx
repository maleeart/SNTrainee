"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import type { User } from "@prisma/client";

const iso = (d: Date | null) => (d ? new Date(d).toISOString().slice(0, 10) : "");

type PickedRole = "STUDENT" | "MENTOR" | "EXECUTIVE";

const ROLE_OPTIONS: { role: PickedRole; label: string; sub: string; icon: string }[] = [
  { role: "STUDENT", label: "นักศึกษาฝึกงาน", sub: "บันทึกรายงานประจำวันและติดตามการประเมิน", icon: "🎓" },
  { role: "MENTOR", label: "พี่เลี้ยง", sub: "ตรวจสอบและประเมินผลงานนักศึกษา", icon: "👷" },
  { role: "EXECUTIVE", label: "ผู้สังเกตการณ์", sub: "ดูภาพรวมและโหลดรายงาน ไม่สามารถแก้ไขได้", icon: "👁️" },
];

export default function ProfileForm({ user }: { user: User & { nickname?: string | null } }) {
  const router = useRouter();
  const isAdmin = user.role === "ADMIN";

  // skip step 1 if already admin (role locked) or already profileDone (editing)
  const [step, setStep] = useState<1 | 2>(isAdmin || user.profileDone ? 2 : 1);
  const [pickedRole, setPickedRole] = useState<PickedRole>(
    (["STUDENT", "MENTOR", "EXECUTIVE"].includes(user.role) ? user.role : "STUDENT") as PickedRole
  );

  const [form, setForm] = useState({
    name: user.name ?? "",
    nickname: user.nickname ?? "",
    level: user.level ?? "PVS",
    school: user.school ?? "",
    advisor: user.advisor ?? "",
    startDate: iso(user.startDate),
    endDate: iso(user.endDate),
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const save = async () => {
    setErr("");
    if (!form.name.trim()) return setErr("กรุณากรอกชื่อ-นามสกุล");
    setSaving(true);
    const res = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, role: isAdmin ? "ADMIN" : pickedRole }),
    });
    setSaving(false);
    if (!res.ok) return setErr((await res.json()).error ?? "เกิดข้อผิดพลาด");
    const { role } = await res.json();
    // redirect ตาม role
    const dest = role === "STUDENT" ? "/dashboard" : role === "MENTOR" ? "/mentor" : "/admin";
    router.push(dest);
    router.refresh();
  };

  /* ───── Step 1: เลือกสิทธิ์ ───── */
  if (step === 1) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ background: "#F4F6FB" }}>
        <div className="w-full max-w-md">
          <div className="flex justify-center mb-6">
            <div style={{ borderRadius: 20, overflow: "hidden", boxShadow: "0 8px 24px rgba(0,62,142,0.2)" }}>
              <Image src="/logi.png" alt="กบห-ธ." width={72} height={72} style={{ objectFit: "cover", display: "block" }} />
            </div>
          </div>
          <h1 className="text-xl font-bold text-center mb-1" style={{ color: "#003E8E" }}>ยินดีต้อนรับ</h1>
          <p className="text-sm text-gray-500 text-center mb-8">เลือกประเภทผู้ใช้งานของคุณ</p>

          <div className="space-y-3">
            {ROLE_OPTIONS.map(opt => (
              <button key={opt.role} onClick={() => setPickedRole(opt.role)}
                className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left"
                style={pickedRole === opt.role
                  ? { borderColor: "#003E8E", background: "rgba(0,62,142,0.06)" }
                  : { borderColor: "#e5e7eb", background: "white" }}>
                <span className="text-3xl">{opt.icon}</span>
                <div className="flex-1">
                  <p className="font-semibold" style={{ color: pickedRole === opt.role ? "#003E8E" : "#1f2937" }}>{opt.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{opt.sub}</p>
                </div>
                <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                  style={{ borderColor: pickedRole === opt.role ? "#003E8E" : "#d1d5db" }}>
                  {pickedRole === opt.role && <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#003E8E" }} />}
                </div>
              </button>
            ))}
          </div>

          <button onClick={() => setStep(2)}
            className="w-full mt-6 text-white py-3 rounded-2xl font-semibold text-sm transition-opacity hover:opacity-90"
            style={{ background: "#003E8E" }}>
            ถัดไป →
          </button>
        </div>
      </div>
    );
  }

  /* ───── Step 2: กรอกข้อมูลส่วนตัว ───── */
  const isStudent = pickedRole === "STUDENT";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ background: "#F4F6FB" }}>
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        {!isAdmin && !user.profileDone && (
          <button onClick={() => setStep(1)} className="text-xs text-gray-400 hover:text-gray-600 mb-4 flex items-center gap-1">
            ← เปลี่ยนประเภท
          </button>
        )}

        <div className="flex items-center gap-3 mb-6">
          <span className="text-3xl">{ROLE_OPTIONS.find(r => r.role === pickedRole)?.icon ?? "🔧"}</span>
          <div>
            <h1 className="text-lg font-bold" style={{ color: "#003E8E" }}>ข้อมูลส่วนตัว</h1>
            <p className="text-xs text-gray-400">{ROLE_OPTIONS.find(r => r.role === pickedRole)?.label ?? "ผู้ดูแลระบบ"}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <F label="ชื่อ-นามสกุล *">
                <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="นาย / นางสาว ..." />
              </F>
            </div>
            <div className="col-span-2">
              <F label="ชื่อเล่น">
                <input className="input" value={form.nickname} onChange={e => setForm({ ...form, nickname: e.target.value })} placeholder="ชื่อที่ใช้เรียก" />
              </F>
            </div>
          </div>

          {isStudent && (
            <>
              <div className="pt-1 pb-0.5" style={{ borderTop: "1px dashed #e5e7eb" }}>
                <p className="text-xs text-gray-400 mb-3">ข้อมูลการศึกษา</p>
              </div>
              <F label="ระดับชั้น *">
                <select className="input" value={form.level} onChange={e => setForm({ ...form, level: e.target.value as "PVC" | "PVS" })}>
                  <option value="PVC">ปวช.</option>
                  <option value="PVS">ปวส.</option>
                </select>
              </F>
              <F label="สถานศึกษา *">
                <input className="input" value={form.school} onChange={e => setForm({ ...form, school: e.target.value })} placeholder="เช่น วิทยาลัยเทคนิคนนทบุรี" />
              </F>
              <F label="อาจารย์นิเทศ">
                <input className="input" value={form.advisor} onChange={e => setForm({ ...form, advisor: e.target.value })} placeholder="ชื่ออาจารย์ที่ดูแล" />
              </F>
              <div className="grid grid-cols-2 gap-3">
                <F label="วันเริ่มฝึก">
                  <input type="date" className="input" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} />
                </F>
                <F label="วันสิ้นสุด">
                  <input type="date" className="input" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} />
                </F>
              </div>
            </>
          )}
        </div>

        {err && <p className="text-red-500 text-sm mt-4">{err}</p>}

        <button onClick={save} disabled={saving}
          className="w-full mt-6 text-white py-3 rounded-2xl font-semibold text-sm transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ background: "#003E8E" }}>
          {saving ? "กำลังบันทึก..." : "บันทึกและเข้าสู่ระบบ"}
        </button>
      </div>

      <style jsx global>{`
        .input { width: 100%; border: 1px solid #e5e7eb; border-radius: 0.5rem; padding: 0.5rem 0.75rem; font-size: 0.875rem; outline: none; }
        .input:focus { border-color: #003E8E; box-shadow: 0 0 0 2px rgba(0,62,142,0.15); }
      `}</style>
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
