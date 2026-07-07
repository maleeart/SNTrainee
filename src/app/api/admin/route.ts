import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// admin: มอบหมายพี่เลี้ยง หรือ เปลี่ยน role; mentor: รับงานตัวเอง
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = session.user.role;
  if (role !== "ADMIN" && role !== "MENTOR") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const b = await req.json();

  if (b.op === "assign") {
    // MENTOR ทำได้เฉพาะ assign ตัวเอง
    if (role === "MENTOR" && b.mentorId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const target = await prisma.report.findUnique({ where: { id: b.reportId } });
    if (!target) return NextResponse.json({ error: "ไม่พบรายงาน" }, { status: 404 });
    if (target.status === "APPROVED") return NextResponse.json({ error: "รายงานที่อนุมัติแล้วเปลี่ยนพี่เลี้ยงไม่ได้" }, { status: 400 });
    const report = await prisma.report.update({
      where: { id: b.reportId },
      data: {
        assignedMentorId: b.mentorId || null,
        status: b.mentorId ? "PENDING_APPROVAL" : "PENDING_ASSIGN",
      },
    });
    return NextResponse.json(report);
  }

  // role change — ADMIN only
  if (role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (b.op === "role") {
    const user = await prisma.user.update({
      where: { id: b.userId },
      data: { role: b.role },
    });
    return NextResponse.json({ id: user.id, role: user.role });
  }

  return NextResponse.json({ error: "op ไม่ถูกต้อง" }, { status: 400 });
}
