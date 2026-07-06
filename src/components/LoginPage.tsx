"use client";

import { signIn } from "next-auth/react";
import Image from "next/image";

export default function LoginPage() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ background: "linear-gradient(175deg, #002d7a 0%, #003E8E 50%, #002060 100%)" }}
    >
      {/* Subtle background glow */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: "radial-gradient(ellipse 70% 50% at 50% 30%, rgba(255,192,0,0.06) 0%, transparent 70%)",
      }} />

      <div className="relative w-full max-w-xs flex flex-col items-center gap-6">

        {/* Icon */}
        <div style={{
          borderRadius: 36,
          overflow: "hidden",
          boxShadow: "0 12px 40px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,192,0,0.15)",
          width: 200,
          height: 200,
          flexShrink: 0,
        }}>
          <Image
            src="/logi.png"
            alt="กบห-ธ. กฟผ."
            width={200}
            height={200}
            style={{ objectFit: "cover", display: "block" }}
            priority
          />
        </div>

        {/* Brand */}
        <div className="text-center -mt-2">
          <div className="flex items-center justify-center gap-2 mb-1">
            <span style={{ flex: 1, height: 1, background: "linear-gradient(to right, transparent, rgba(255,192,0,0.5))" }} />
            <span className="text-xs font-semibold tracking-widest" style={{ color: "#FFC000" }}>
              ระบบบันทึกการฝึกงาน
            </span>
            <span style={{ flex: 1, height: 1, background: "linear-gradient(to left, transparent, rgba(255,192,0,0.5))" }} />
          </div>
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>
            กองบริหาร กฟผ. สำนักงานไทรน้อย
          </p>
        </div>

        {/* Login card */}
        <div className="w-full rounded-2xl overflow-hidden" style={{
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.12)",
          backdropFilter: "blur(12px)",
        }}>
          <div className="px-6 pt-5 pb-4">
            <button
              onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
              className="w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all hover:opacity-90 active:scale-95"
              style={{ background: "white", color: "#111" }}
            >
              <GoogleIcon />
              เข้าสู่ระบบด้วย Google
            </button>
          </div>

          {/* Admin — one line, very faint */}
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
            <p className="text-center text-xs py-3 px-4" style={{ color: "rgba(255,255,255,0.25)" }}>
              ผู้ดูแล: นายตวงเพชร ชัยยานนท์ วศ.4 · หบอว-ธ. กบห-ธ. ชธธ.
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
