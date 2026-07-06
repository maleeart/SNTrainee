"use client";

import { signIn } from "next-auth/react";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: "#0d1b3e" }}>

      {/* Subtle radial glow behind logo */}
      <div style={{
        position: "absolute", top: "15%", left: "50%", transform: "translateX(-50%)",
        width: 320, height: 320, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(245,197,24,0.06) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      <div className="relative w-full max-w-xs flex flex-col items-center">

        {/* Minimal logo */}
        <div className="w-40 h-40 mb-5">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
            <circle cx="256" cy="210" r="168" fill="none" stroke="#F5C518" strokeWidth="1.5" opacity="0.3"/>
            <polygon points="272,58 246,188 264,188 228,335 298,170 272,170 306,58" fill="white" opacity="0.92"/>
            <polygon points="272,74 250,180 265,180 234,308 292,176 268,176 300,74" fill="#F5C518" opacity="0.5"/>
            <path d="M 90 355 Q 256 396 422 355" stroke="#F5C518" strokeWidth="1.8" fill="none" strokeLinecap="round" opacity="0.55"/>
            <text x="256" y="435" textAnchor="middle"
              fontFamily="'Arial Black','Helvetica Neue',sans-serif"
              fontSize="70" fontWeight="900" fontStyle="italic" fill="white">กบห-ธ.</text>
            <text x="256" y="478" textAnchor="middle"
              fontFamily="Arial,sans-serif" fontSize="22" fontWeight="600"
              fill="#F5C518" opacity="0.75">กฟผ. สนง.ไทรน้อย</text>
          </svg>
        </div>

        {/* Tagline */}
        <div className="text-center mb-7 w-full">
          <div className="flex items-center gap-2 justify-center mb-1">
            <span style={{ flex: 1, height: 1, background: "linear-gradient(to right, transparent, rgba(245,197,24,0.4))" }}/>
            <span className="text-xs tracking-[0.2em] uppercase"
              style={{ color: "rgba(245,197,24,0.7)", fontWeight: 600 }}>ระบบบันทึกการฝึกงาน</span>
            <span style={{ flex: 1, height: 1, background: "linear-gradient(to left, transparent, rgba(245,197,24,0.4))" }}/>
          </div>
          <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>
            การไฟฟ้าฝ่ายผลิตแห่งประเทศไทย สำนักงานไทรน้อย
          </p>
        </div>

        {/* Login card */}
        <div className="w-full rounded-2xl overflow-hidden"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}>
          <div className="px-6 py-5">
            <button
              onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
              className="w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-150 hover:opacity-90 active:scale-95"
              style={{ background: "white", color: "#1a1a1a" }}>
              <GoogleIcon />
              เข้าสู่ระบบด้วย Google
            </button>
          </div>

          {/* Admin info — subtle */}
          <div className="px-6 pb-4 text-center">
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>
              ผู้ดูแล: นายตวงเพชร ชัยยานนท์ &nbsp;·&nbsp; หบอว-ธ. กบห-ธ. ชธธ.
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
