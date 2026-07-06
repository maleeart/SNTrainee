import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// admin: มอบหมายพี่เลี้ยง หรือ เปลี่ยน role
export async function POST(req: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const b = await req.json();

  if (b.op === "assign") {
    const report = await prisma.report.update({
      where: { id: b.reportId },
      data: {
        assignedMentorId: b.mentorId || null,
        status: b.mentorId ? "PENDING_APPROVAL" : "PENDING_ASSIGN",
      },
    });
    return NextResponse.json(report);
  }

  if (b.op === "role") {
    const user = await prisma.user.update({
      where: { id: b.userId },
      data: { role: b.role },
    });
    return NextResponse.json({ id: user.id, role: user.role });
  }

  return NextResponse.json({ error: "op ไม่ถูกต้อง" }, { status: 400 });
}
