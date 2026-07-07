import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, nickname, role, level, school, advisor, startDate, endDate } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "กรุณากรอกชื่อ" }, { status: 400 });

  const isStudent = role === "STUDENT";
  if (isStudent && (!level || !school?.trim())) {
    return NextResponse.json({ error: "กรุณากรอกระดับชั้นและสถานศึกษา" }, { status: 400 });
  }

  // ไม่อนุญาตให้เปลี่ยนเป็น ADMIN ผ่าน API นี้
  const allowedRoles = ["STUDENT", "MENTOR", "EXECUTIVE"];
  const safeRole = allowedRoles.includes(role) ? role : undefined;

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name: name.trim(),
      nickname: nickname?.trim() || null,
      ...(safeRole && session.user.role !== "ADMIN" ? { role: safeRole } : {}),
      level: isStudent ? level : null,
      school: isStudent ? school.trim() : null,
      advisor: isStudent ? (advisor?.trim() || null) : null,
      startDate: isStudent && startDate ? new Date(startDate) : null,
      endDate: isStudent && startDate ? new Date(endDate) : null,
      profileDone: true,
    },
  });
  return NextResponse.json({ ok: true, role: safeRole ?? session.user.role });
}
