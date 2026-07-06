"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@prisma/client";

const iso = (d: Date | null) => (d ? new Date(d).toISOString().slice(0, 10) : "");

export default function ProfileForm({ user }: { user: User }) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: user.name ?? "",
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
    if (!form.name || !form.school) return setErr("กรุณากรอกชื่อและสถานศึกษา");
    setSaving(true);
    const res = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (res.ok) {
      router.push("/dashboard");
      router.refresh();
    } else {
      setErr((await res.json()).error ?? "เกิดข้อผิดพลาด");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-lg p-8">
        <h1 className="text-xl font-bold text-gray-800 mb-1">ข้อมูลนักศึกษาฝึกงาน</h1>
        <p className="text-gray-500 text-sm mb-6">กรอกข้อมูลก่อนเริ่มใช้งานระบบ</p>

        <div className="space-y-4">
          <F label="ชื่อ-นามสกุล *">
            <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </F>
          <F label="ระดับชั้น *">
            <select className="input" value={form.level} onChange={e => setForm({ ...form, level: e.target.value as "PVC" | "PVS" })}>
              <option value="PVC">ปวช.</option>
              <option value="PVS">ปวส.</option>
            </select>
          </F>
          <F label="สถานศึกษา *">
            <input className="input" value={form.school} onChange={e => setForm({ ...form, school: e.target.value })} placeholder="เช่น วิทยาลัยเทคนิค..." />
          </F>
          <F label="อาจารย์นิเทศ">
            <input className="input" value={form.advisor} onChange={e => setForm({ ...form, advisor: e.target.value })} />
          </F>
          <div className="grid grid-cols-2 gap-4">
            <F label="วันเริ่มฝึก">
              <input type="date" className="input" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} />
            </F>
            <F label="วันสิ้นสุด">
              <input type="date" className="input" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} />
            </F>
          </div>
        </div>

        {err && <p className="text-red-500 text-sm mt-4">{err}</p>}

        <button onClick={save} disabled={saving} className="w-full mt-6 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white py-2.5 rounded-xl font-medium transition-colors">
          {saving ? "กำลังบันทึก..." : "บันทึกและเริ่มใช้งาน"}
        </button>
      </div>

      <style jsx global>{`
        .input { width: 100%; border: 1px solid #e5e7eb; border-radius: 0.5rem; padding: 0.5rem 0.75rem; font-size: 0.875rem; outline: none; }
        .input:focus { border-color: #3b82f6; box-shadow: 0 0 0 2px #bfdbfe; }
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
