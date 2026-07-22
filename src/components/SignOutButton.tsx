"use client";

import { signOut } from "next-auth/react";

export default function SignOutButton() {
  return (
    <button onClick={() => signOut({ callbackUrl: "/?relogin=1" })}
      className="flex-1 py-2.5 rounded-xl font-semibold text-sm text-white hover:opacity-90"
      style={{ background: "#003E8E" }}>
      ออกจากระบบ
    </button>
  );
}
