"use client";

import { signIn } from "next-auth/react";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: "linear-gradient(160deg, #001340 0%, #002B80 45%, #001a5e 100%)" }}>

      {/* Decorative arcs */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }} preserveAspectRatio="xMidYMid slice">
        <ellipse cx="50%" cy="115%" rx="68%" ry="52%" fill="none" stroke="#1a4db3" strokeWidth="1" opacity="0.5"/>
        <ellipse cx="50%" cy="112%" rx="58%" ry="44%" fill="none" stroke="#F5C518" strokeWidth="1" opacity="0.18"/>
        <ellipse cx="50%" cy="109%" rx="46%" ry="36%" fill="none" stroke="#1a4db3" strokeWidth="1" opacity="0.35"/>
      </svg>

      <div className="relative w-full max-w-xs flex flex-col items-center" style={{ zIndex: 1 }}>

        {/* SVG Logo */}
        <div className="w-52 h-52 mb-2 drop-shadow-2xl">
          <AppIcon />
        </div>

        {/* Brand text */}
        <div className="text-center mb-6 w-full">
          <div className="flex items-center gap-2 justify-center mb-1.5">
            <span style={{ flex: 1, height: 1.5, background: "linear-gradient(to right, transparent, #F5C518)" }}/>
            <span className="text-xs font-bold tracking-widest uppercase" style={{ color: "#F5C518" }}>ระบบบันทึกการฝึกงาน</span>
            <span style={{ flex: 1, height: 1.5, background: "linear-gradient(to left, transparent, #F5C518)" }}/>
          </div>
          <p className="text-sm font-medium" style={{ color: "#a8c4ff" }}>กองบริหาร การไฟฟ้าฝ่ายผลิตแห่งประเทศไทย</p>
          <p className="text-xs mt-0.5" style={{ color: "#7aa0e0" }}>สำนักงานไทรน้อย</p>
        </div>

        {/* Card */}
        <div className="w-full rounded-2xl overflow-hidden"
          style={{
            background: "rgba(255,255,255,0.07)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(255,255,255,0.15)",
            boxShadow: "0 8px 40px rgba(0,0,0,0.4)"
          }}>

          <div className="px-6 pt-6 pb-5">
            <p className="text-center text-sm font-semibold mb-4" style={{ color: "rgba(255,255,255,0.9)" }}>เข้าสู่ระบบ</p>
            <button
              onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
              className="w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-150 hover:opacity-90 active:scale-95"
              style={{ background: "white", color: "#1a1a1a", boxShadow: "0 2px 12px rgba(0,0,0,0.25)" }}>
              <GoogleIcon />
              เข้าสู่ระบบด้วย Google
            </button>
          </div>

          {/* Admin strip */}
          <div className="px-5 py-3 text-center"
            style={{ background: "rgba(0,0,0,0.25)", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
            <p className="text-xs font-bold mb-0.5" style={{ color: "#F5C518" }}>ผู้ดูแลระบบ</p>
            <p className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.85)" }}>นายตวงเพชร ชัยยานนท์ วศ.4</p>
            <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.5)" }}>หบอว-ธ. &nbsp;·&nbsp; กบห-ธ. &nbsp;·&nbsp; ชธธ.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function AppIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
      <defs>
        <clipPath id="cc">
          <circle cx="256" cy="218" r="165"/>
        </clipPath>
      </defs>
      <rect width="512" height="512" rx="100" fill="#002B80"/>
      <circle cx="256" cy="218" r="160" fill="none" stroke="#1a4db3" stroke-width="7" opacity="0.6"/>
      <circle cx="256" cy="218" r="152" fill="none" stroke="#F5C518" stroke-width="1.5" opacity="0.3"/>

      {/* Plant silhouette */}
      <g clipPath="url(#cc)" fill="#1a4db3">
        <rect x="100" y="270" width="84" height="68" rx="2"/>
        <rect x="92" y="258" width="100" height="17" rx="2"/>
        <rect x="88" y="330" width="108" height="16" rx="0" opacity="0.45"/>
        <rect x="196" y="246" width="55" height="100" rx="2"/>
        <rect x="184" y="234" width="79" height="19" rx="2"/>
        <rect x="200" y="202" width="13" height="38"/>
        <rect x="224" y="212" width="11" height="29"/>
        <polygon points="295,355 311,208 327,355"/>
        <rect x="295" y="355" width="32" height="6" rx="1"/>
        <rect x="299" y="292" width="24" height="4" rx="1"/>
        <rect x="302" y="258" width="18" height="3" rx="1"/>
      </g>

      {/* Lightning bolt */}
      <polygon points="280,62 248,215 270,215 226,368 308,186 278,186 322,62" fill="#F5C518"/>
      <polygon points="280,78 260,202 274,202 244,342 300,192 272,192 314,78" fill="#FFE066" opacity="0.4"/>

      {/* Bottom arc */}
      <path d="M 90 385 Q 256 428 422 385" stroke="#F5C518" stroke-width="4" fill="none" stroke-linecap="round"/>
      <path d="M 102 396 Q 256 438 410 396" stroke="#F5C518" stroke-width="1.5" fill="none" stroke-linecap="round" opacity="0.35"/>

      {/* Text */}
      <text x="256" y="444" textAnchor="middle"
        fontFamily="'Arial Black','Helvetica Neue',sans-serif"
        fontSize="64" fontWeight="900" fontStyle="italic"
        stroke="#001a5e" strokeWidth="5" paintOrder="stroke" fill="white">กบห-ธ.</text>
      <text x="256" y="480" textAnchor="middle"
        fontFamily="Arial,sans-serif" fontSize="20" fontWeight="700" fill="#F5C518">กฟผ. สนง.ไทรน้อย</text>
    </svg>
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
