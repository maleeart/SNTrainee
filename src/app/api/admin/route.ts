import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// admin: เปลี่ยน role
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const b = await req.json();
  if (b.op === "role") {
    const user = await prisma.user.update({
      where: { id: b.userId },
      data: { role: b.role },
    });
    return NextResponse.json({ id: user.id, role: user.role });
  }

  // แก้ไขข้อมูลส่วนตัวผู้ใช้
  if (b.op === "edit") {
    if (!b.name?.trim()) return NextResponse.json({ error: "กรุณากรอกชื่อ" }, { status: 400 });
    const isStudent = b.role === "STUDENT";
    const user = await prisma.user.update({
      where: { id: b.userId },
      data: {
        name: b.name.trim(),
        nickname: b.nickname?.trim() || null,
        role: b.role,
        level: isStudent ? (b.level || null) : null,
        school: isStudent ? (b.school?.trim() || null) : null,
        advisor: isStudent ? (b.advisor?.trim() || null) : null,
        startDate: isStudent && b.startDate ? new Date(b.startDate) : null,
        endDate: isStudent && b.endDate ? new Date(b.endDate) : null,
      },
    });
    return NextResponse.json({
      id: user.id, name: user.name, nickname: user.nickname, role: user.role,
      level: user.level, school: user.school, advisor: user.advisor,
      startDate: user.startDate, endDate: user.endDate,
    });
  }

  // ลบผู้ใช้ (ลบประกาศที่สร้างไว้ก่อน เพราะ FK ไม่ cascade)
  if (b.op === "delete") {
    if (b.userId === session.user.id) return NextResponse.json({ error: "ลบบัญชีตนเองไม่ได้" }, { status: 400 });
    await prisma.$transaction([
      prisma.announcement.deleteMany({ where: { createdById: b.userId } }),
      prisma.user.delete({ where: { id: b.userId } }),
    ]);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "op ไม่ถูกต้อง" }, { status: 400 });
}
