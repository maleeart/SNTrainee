"use client";

import { signIn } from "next-auth/react";
import Image from "next/image";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
      style={{ background: "linear-gradient(160deg, #001a5e 0%, #002b80 40%, #003399 70%, #001040 100%)" }}>

      {/* Background decorative arcs */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="xMidYMid slice">
        <ellipse cx="50%" cy="110%" rx="65%" ry="55%" fill="none" stroke="#1a4db3" strokeWidth="1.5" opacity="0.4"/>
        <ellipse cx="50%" cy="108%" rx="58%" ry="48%" fill="none" stroke="#F5C518" strokeWidth="1" opacity="0.2"/>
        <ellipse cx="50%" cy="106%" rx="50%" ry="40%" fill="none" stroke="#1a4db3" strokeWidth="1" opacity="0.3"/>
        {/* Top lightning hint */}
        <polygon points="78%,0 74%,18% 76%,18% 70%,38% 82%,15% 79%,15% 83%,0" fill="#F5C518" opacity="0.07"/>
      </svg>

      <div className="relative w-full max-w-sm px-6 flex flex-col items-center">

        {/* Logo */}
        <div className="mb-6 flex flex-col items-center">
          <div className="relative w-44 h-44 mb-3 drop-shadow-2xl">
            <Image src="/logo.png" alt="กบห-ธ. กฟผ. สำนักงานไทรน้อย" fill style={{ objectFit: "contain" }} priority />
          </div>
          {/* Divider line like in logo */}
          <div className="flex items-center gap-2 w-full justify-center mb-1">
            <span style={{ flex: 1, height: 1, background: "linear-gradient(to right, transparent, #F5C518)" }}/>
            <span className="text-yellow-400 text-xs font-semibold tracking-widest">ระบบบันทึกการฝึกงาน</span>
            <span style={{ flex: 1, height: 1, background: "linear-gradient(to left, transparent, #F5C518)" }}/>
          </div>
          <p className="text-blue-200 text-xs text-center">กองบริหาร การไฟฟ้าฝ่ายผลิตแห่งประเทศไทย</p>
          <p className="text-blue-300 text-xs text-center">สำนักงานไทรน้อย</p>
        </div>

        {/* Card */}
        <div className="w-full rounded-2xl shadow-2xl overflow-hidden"
          style={{ background: "rgba(255,255,255,0.06)", backdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.12)" }}>

          <div className="p-6">
            <h2 className="text-white text-base font-semibold text-center mb-1">เข้าสู่ระบบ</h2>
            <p className="text-blue-300 text-xs text-center mb-5">ใช้บัญชี Google เพื่อเข้าสู่ระบบ</p>

            <button
              onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              style={{ background: "rgba(255,255,255,0.95)", color: "#1a1a1a", boxShadow: "0 4px 20px rgba(0,0,0,0.3)" }}>
              <GoogleIcon />
              เข้าสู่ระบบด้วย Google
            </button>

            <p className="text-center text-xs mt-4" style={{ color: "rgba(255,255,255,0.4)" }}>
              ระบบจะแสดงหน้าเลือกบัญชี Google ทุกครั้ง
            </p>
          </div>

          {/* Footer strip */}
          <div className="px-6 py-3 text-center" style={{ background: "rgba(0,0,0,0.2)", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-xs font-medium" style={{ color: "#F5C518" }}>ผู้ดูแลระบบ</p>
            <p className="text-xs text-blue-200 leading-5">
              นายตวงเพชร ชัยยานนท์ วศ.4
            </p>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>
              หบอว-ธ. &nbsp;|&nbsp; กบห-ธ. &nbsp;|&nbsp; ชฌธ.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}
