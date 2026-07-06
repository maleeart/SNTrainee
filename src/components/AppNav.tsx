"use client";

import Image from "next/image";
import { signOut } from "next-auth/react";
import Link from "next/link";

type Props = {
  name?: string | null;
  image?: string | null;
  role?: string;
  profileHref?: string;
};

export default function AppNav({ name, image, role, profileHref }: Props) {
  return (
    <nav style={{ background: "#003E8E" }} className="shadow-lg">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo + name */}
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
              {ROLE_TH[role] ?? role}
            </span>
          )}
        </div>

        {/* Right */}
        <div className="flex items-center gap-3">
          {profileHref && (
            <Link href={profileHref} className="text-xs font-medium hidden sm:block"
              style={{ color: "rgba(255,255,255,0.6)" }}>
              โปรไฟล์
            </Link>
          )}
          {image && <img src={image} className="w-7 h-7 rounded-full ring-1 ring-white/20" alt="" />}
          {name && <span className="text-sm font-medium hidden md:block" style={{ color: "rgba(255,255,255,0.85)" }}>{name}</span>}
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="text-xs px-2.5 py-1.5 rounded-lg transition-colors"
            style={{ color: "rgba(255,255,255,0.55)", background: "rgba(255,255,255,0.07)" }}
          >
            ออกจากระบบ
          </button>
        </div>
      </div>
    </nav>
  );
}

const ROLE_TH: Record<string, string> = {
  STUDENT: "นักศึกษา", MENTOR: "พี่เลี้ยง", ADMIN: "ผู้ดูแลระบบ", EXECUTIVE: "ผู้บริหาร",
};
