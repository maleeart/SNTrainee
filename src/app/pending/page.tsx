import { requireUser } from "@/lib/guards";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ROLE_LABEL } from "@/lib/labels";
import Image from "next/image";
import SignOutButton from "@/components/SignOutButton";

// หน้ารออนุมัติสิทธิ์ — ผู้ใช้ใหม่จะค้างอยู่ที่นี่จนกว่าแอดมินจะกดอนุมัติ
export default async function PendingPage() {
  const u = await requireUser(undefined, { allowUnapproved: true });
  if (u.approved) redirect("/"); // อนุมัติแล้ว ไม่ต้องอยู่หน้านี้

  const me = await prisma.user.findUnique({
    where: { id: u.id },
    select: { name: true, nickname: true, requestedRole: true, profileDone: true, rejected: true },
  });

  // ยังไม่ได้กรอกข้อมูล → กลับไปกรอกก่อน
  if (!me?.profileDone) redirect("/profile");

  const rejected = me.rejected;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ background: "#F4F6FB" }}>
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-6">
          <div style={{ borderRadius: 20, overflow: "hidden", boxShadow: "0 8px 24px rgba(0,62,142,0.2)" }}>
            <Image src="/logi.png" alt="กบห-ธ." width={72} height={72} style={{ objectFit: "cover", display: "block" }} />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center"
            style={{ background: rejected ? "#FEE2E2" : "#FFFBEB" }}>
            <span className="text-3xl">{rejected ? "⛔" : "⏳"}</span>
          </div>

          {rejected ? (
            <>
              <h1 className="text-lg font-bold mb-2" style={{ color: "#DC2626" }}>คำขอสิทธิ์ถูกปฏิเสธ</h1>
              <p className="text-sm text-gray-500 leading-relaxed mb-6">
                ผู้ดูแลระบบไม่อนุมัติคำขอใช้งานของคุณ
                <br /><span className="font-semibold text-gray-700">กรุณาติดต่อผู้ดูแลระบบ</span>
              </p>
            </>
          ) : (
            <>
              <h1 className="text-lg font-bold mb-2" style={{ color: "#003E8E" }}>รอผู้ดูแลอนุมัติสิทธิ์</h1>
              <p className="text-sm text-gray-500 leading-relaxed mb-6">
                บันทึกข้อมูลเรียบร้อยแล้ว ขณะนี้คำขอของคุณอยู่ระหว่างรอผู้ดูแลระบบตรวจสอบ
                <br />เมื่อได้รับอนุมัติจะสามารถเข้าใช้งานได้ทันที
              </p>
            </>
          )}

          <div className="rounded-xl px-4 py-3 mb-6 text-left space-y-2" style={{ background: "#F4F6FB" }}>
            <Row label="ชื่อ" value={me.name ?? "—"} />
            {me.nickname && <Row label="ชื่อเล่น" value={me.nickname} />}
            {!rejected && <Row label="สิทธิ์ที่ขอ" value={me.requestedRole ? ROLE_LABEL[me.requestedRole] : "—"} />}
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-gray-400">สถานะ</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={rejected
                  ? { background: "#FEE2E2", color: "#DC2626" }
                  : { background: "#FEF3C7", color: "#92400E" }}>
                {rejected ? "ถูกปฏิเสธ" : "รออนุมัติ"}
              </span>
            </div>
          </div>

          <p className="text-xs text-gray-400 mb-4">
            {rejected ? "หากคิดว่าเป็นความผิดพลาด กรุณาติดต่อผู้ดูแลระบบเพื่อขอสิทธิ์อีกครั้ง" : "หากรอนานผิดปกติ กรุณาติดต่อผู้ดูแลระบบโดยตรง"}
          </p>

          <div className="flex gap-2">
            {/* ถูกปฏิเสธแล้วไม่ให้แก้ข้อมูลยื่นใหม่เอง — ต้องให้แอดมินเป็นคนกด ไม่งั้นการปฏิเสธไม่มีความหมาย */}
            {!rejected && (
              <a href="/profile"
                className="flex-1 py-2.5 rounded-xl font-semibold text-sm border border-gray-200 text-gray-600 hover:bg-gray-50">
                แก้ไขข้อมูล
              </a>
            )}
            <SignOutButton />
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-gray-400 flex-shrink-0">{label}</span>
      <span className="text-xs font-medium text-gray-700 text-right truncate">{value}</span>
    </div>
  );
}
