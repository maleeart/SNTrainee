import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// admin: เปลี่ยน role
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session.user.approved) return NextResponse.json({ error: "รอผู้ดูแลอนุมัติสิทธิ์" }, { status: 403 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const b = await req.json();

  // อนุมัติคำขอสิทธิ์ — ให้ role ตามที่ผู้ใช้ขอไว้ (หรือที่แอดมินเลือกแทน)
  if (b.op === "approve") {
    const target = await prisma.user.findUnique({
      where: { id: b.userId }, select: { requestedRole: true },
    });
    if (!target) return NextResponse.json({ error: "ไม่พบผู้ใช้" }, { status: 404 });
    // ห้ามอนุมัติขึ้นเป็น ADMIN ผ่านช่องทางนี้ — ต้องไปตั้งที่ช่องสิทธิ์โดยตรง
    const granted = b.role ?? target.requestedRole ?? "EXECUTIVE";
    if (granted === "ADMIN") return NextResponse.json({ error: "อนุมัติเป็นผู้ดูแลระบบผ่านหน้านี้ไม่ได้" }, { status: 400 });

    const user = await prisma.user.update({
      where: { id: b.userId },
      data: { role: granted, approved: true, requestedRole: null },
    });
    return NextResponse.json({ id: user.id, role: user.role, approved: user.approved });
  }

  // ปฏิเสธคำขอ — ล้างคำขอทิ้ง ผู้ใช้ยังค้างหน้ารออนุมัติ เลือกสิทธิ์ใหม่ได้
  if (b.op === "reject") {
    const user = await prisma.user.update({
      where: { id: b.userId },
      data: { approved: false, requestedRole: null },
    });
    return NextResponse.json({ id: user.id, approved: user.approved });
  }

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
    // $transaction ใช้ไม่ได้บน Neon HTTP mode — แต่ SQL คำสั่งเดียวเป็น atomic ในตัวอยู่แล้ว
    // CTE นี้จึงยังการันตี all-or-nothing: ประกาศจะไม่หายถ้าลบ user ไม่สำเร็จ
    const deleted = await prisma.$executeRaw`
      WITH del_ann AS (
        DELETE FROM "Announcement" WHERE "createdById" = ${b.userId}
      )
      DELETE FROM "User" WHERE id = ${b.userId}
    `;
    if (deleted === 0) return NextResponse.json({ error: "ไม่พบผู้ใช้" }, { status: 404 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "op ไม่ถูกต้อง" }, { status: 400 });
}
