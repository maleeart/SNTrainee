import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/reports/seen — นักศึกษากดรับทราบว่าเห็นผลประเมินแล้ว
// เก็บแค่เวลาล่าสุด — จำนวน "ใหม่" คำนวณสดจาก Evaluation.updatedAt ตอน render
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.user.update({
    where: { id: session.user.id },
    data: { reportsSeenAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
