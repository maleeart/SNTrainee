import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { homeFor } from "@/lib/guards";
import LoginPage from "@/components/LoginPage";
import { Suspense } from "react";

export default async function Home() {
  const session = await auth();
  if (session?.user) {
    // ผู้ใช้ใหม่เท่านั้นที่ถูกบังคับ: กรอกข้อมูลให้ครบ แล้วไปค้างที่หน้ารออนุมัติ
    // ⚠️ ห้ามเช็ค !profileDone กับทุกคน — ผู้ใช้เดิม (แอดมิน/ผู้สังเกตการณ์) หลายคน
    //    profileDone = false เพราะไม่เคยผ่านฟอร์มนี้ จะโดนเด้งเข้าหน้ากรอกข้อมูลทั้งที่ใช้งานได้อยู่
    if (!session.user.approved) redirect(session.user.profileDone ? "/pending" : "/profile");
    if (session.user.role === "STUDENT" && !session.user.profileDone) redirect("/profile");
    redirect(homeFor(session.user.role));
  }
  return <Suspense><LoginPage /></Suspense>;
}
