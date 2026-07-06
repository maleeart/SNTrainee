"use client";

import { signIn } from "next-auth/react";

// concept.png = 1254×1254px
// Dark blue app icon area ≈ x:450-800, y:680-1120 (350×440px)
// Scale by icon width to fill 180px: 180/350 = 0.514 → scaled image = 645px
// offset-x: -(450×0.514) = -231px  offset-y: -(680×0.514) = -350px
const ICON_STYLE: React.CSSProperties = {
  width: 180,
  height: 180,
  overflow: "hidden",
  borderRadius: 32,
  backgroundImage: "url('/concept.png')",
  backgroundSize: "645px",
  backgroundPosition: "-231px -350px",
  backgroundRepeat: "no-repeat",
  flexShrink: 0,
};

export default function LoginPage() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ background: "#003E8E" }}
    >
      <div className="w-full max-w-xs flex flex-col items-center gap-6">

        {/* Logo — cropped from concept.png */}
        <div style={ICON_STYLE} />

        {/* Brand text */}
        <div className="text-center">
          <p className="text-xs tracking-[0.18em] font-semibold mb-1"
            style={{ color: "#FFC000" }}>
            ระบบบันทึกการฝึกงาน
          </p>
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.55)" }}>
            กองบริหาร การไฟฟ้าฝ่ายผลิตแห่งประเทศไทย สำนักงานไทรน้อย
          </p>
        </div>

        {/* Login card */}
        <div
          className="w-full rounded-2xl overflow-hidden"
          style={{
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.14)",
          }}
        >
          <div className="px-6 py-5">
            <button
              onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
              className="w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all hover:opacity-90 active:scale-95"
              style={{ background: "white", color: "#1a1a1a" }}
            >
              <GoogleIcon />
              เข้าสู่ระบบด้วย Google
            </button>
          </div>

          {/* Admin — one line, very subtle */}
          <p
            className="text-center text-xs pb-4 px-4"
            style={{ color: "rgba(255,255,255,0.28)" }}
          >
            ผู้ดูแล: นายตวงเพชร ชัยยานนท์ วศ.4 · หบอว-ธ. กบห-ธ. ชธธ.
          </p>
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
