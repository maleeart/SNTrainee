import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { homeFor } from "@/lib/guards";
import LoginPage from "@/components/LoginPage";
import { Suspense } from "react";

export default async function Home() {
  const session = await auth();
  if (session?.user) {
    if (!session.user.profileDone) redirect("/profile");
    // กรอกข้อมูลแล้วแต่แอดมินยังไม่อนุมัติ — ค้างที่หน้ารออนุมัติ ห้ามหลุดเข้าหน้าอื่น
    if (!session.user.approved) redirect("/pending");
    redirect(homeFor(session.user.role));
  }
  return <Suspense><LoginPage /></Suspense>;
}
