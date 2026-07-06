import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  // นักศึกษาลบของตัวเอง / admin ลบได้ทุกอัน
  const where = session.user.role === "ADMIN" ? { id } : { id, userId: session.user.id };
  await prisma.report.deleteMany({ where });
  return NextResponse.json({ ok: true });
}

// พี่เลี้ยงอนุมัติ/ตีกลับ + ให้คะแนน (เฉพาะงานที่ถูกมอบหมายให้ตัวเอง)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "MENTOR" && session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const report = await prisma.report.findUnique({ where: { id } });
  if (!report || report.assignedMentorId !== session.user.id) {
    return NextResponse.json({ error: "ไม่ได้รับมอบหมายงานนี้" }, { status: 403 });
  }

  const { action, scores, comment } = await req.json();
  if (action !== "approve" && action !== "reject") {
    return NextResponse.json({ error: "action ไม่ถูกต้อง" }, { status: 400 });
  }

  const updated = await prisma.report.update({
    where: { id },
    data: {
      status: action === "approve" ? "APPROVED" : "REJECTED",
      mentorComment: comment || null,
      scores: action === "approve" ? scores : undefined,
      evaluatedAt: action === "approve" ? new Date() : null,
    },
  });
  return NextResponse.json(updated);
}
