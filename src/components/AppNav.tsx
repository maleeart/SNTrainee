"use client";

import Image from "next/image";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { LEVEL_LABEL, ROLE_LABEL } from "@/lib/labels";

type Props = {
  name?: string | null;
  nickname?: string | null;
  email?: string | null;
  image?: string | null;
  role?: string;
  level?: string | null;
  school?: string | null;
  advisor?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  profileHref?: string;
};

export default function AppNav({ name, nickname, email, image, role, level, school, advisor, startDate, endDate, profileHref }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <nav style={{ background: "#003E8E" }} className="shadow-lg">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div style={{ borderRadius: 8, overflow: "hidden", flexShrink: 0 }}>
            <Image src="/logi.png" alt="กบห-ธ." width={36} height={36} style={{ objectFit: "cover", display: "block" }} />
          </div>
          <div className="leading-tight">
            <span className="font-black italic text-white text-base tracking-wide" style={{ fontFamily: "'Arial Black', sans-serif" }}>กบห-ธ.</span>
            <span className="hidden sm:inline text-xs ml-1.5 font-normal" style={{ color: "rgba(255,255,255,0.5)" }}>กฟผ. สนง.ไทรน้อย</span>
          </div>
          {role && (
            <span className="hidden sm:inline text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ background: "rgba(255,192,0,0.18)", color: "#FFC000", border: "1px solid rgba(255,192,0,0.3)" }}>
              {ROLE_LABEL[role] ?? role}
            </span>
          )}
        </div>

        {/* Avatar + dropdown */}
        <div className="relative" ref={ref}>
          <button onClick={() => setOpen(o => !o)}
            className="flex items-center gap-2 rounded-xl px-2 py-1 transition-colors hover:bg-white/10">
            {image
              ? <img src={image} className="w-8 h-8 rounded-full ring-2 ring-white/20" alt="" />
              : <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-sm font-bold">{name?.[0] ?? "?"}</div>}
            <div className="hidden md:block text-left leading-tight">
              <p className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.9)" }}>{nickname || name}</p>
              {nickname && <p className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>{name}</p>}
            </div>
            <svg className="w-3.5 h-3.5" style={{ color: "rgba(255,255,255,0.4)" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m6 9 6 6 6-6"/></svg>
          </button>

          {open && (
            <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
              {/* Header gradient */}
              <div className="px-5 pt-5 pb-4" style={{ background: "linear-gradient(135deg, #003E8E, #002d7a)" }}>
                <div className="flex items-center gap-3">
                  {image
                    ? <img src={image} className="w-12 h-12 rounded-full ring-2 ring-white/30 shrink-0" alt="" />
                    : <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-white text-xl font-bold shrink-0">{name?.[0] ?? "?"}</div>}
                  <div className="min-w-0">
                    <p className="font-bold text-white truncate">{name}</p>
                    {nickname && <p className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>"{nickname}"</p>}
                    <span className="text-xs px-2 py-0.5 rounded-full mt-1 inline-block font-medium"
                      style={{ background: "rgba(255,192,0,0.25)", color: "#FFC000" }}>
                      {ROLE_LABEL[role ?? ""] ?? role}
                    </span>
                  </div>
                </div>
              </div>

              {/* Info rows */}
              <div className="px-5 py-3 space-y-2">
                {email && <InfoRow label="อีเมล" value={email} />}
                {level && <InfoRow label="ระดับ" value={LEVEL_LABEL[level] ?? level} />}
                {school && <InfoRow label="สถานศึกษา" value={school} />}
                {advisor && <InfoRow label="อ.นิเทศ" value={advisor} />}
                {startDate && <InfoRow label="เริ่มฝึก" value={fmtDate(startDate)} />}
                {endDate && <InfoRow label="สิ้นสุด" value={fmtDate(endDate)} />}
              </div>

              {/* Actions */}
              <div className="px-3 pb-3 space-y-0.5" style={{ borderTop: "1px solid #f3f4f6" }}>
                {profileHref && (
                  <Link href={profileHref} onClick={() => setOpen(false)}
                    className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">
                    ✏️ แก้ไขประวัติ
                  </Link>
                )}
                <button onClick={() => signOut({ callbackUrl: "/" })}
                  className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50">
                  ออกจากระบบ
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2 text-sm">
      <span className="text-gray-400 shrink-0 w-20">{label}</span>
      <span className="text-gray-700 font-medium truncate">{value}</span>
    </div>
  );
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" });
}
