import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const b = await req.json();
  if (!b.lessonId) return NextResponse.json({ error: "lessonId required" }, { status: 400 });
  if (!Array.isArray(b.questions) || b.questions.length === 0) return NextResponse.json({ error: "ต้องมีอย่างน้อย 1 ข้อ" }, { status: 400 });

  const quiz = await prisma.lessonQuiz.upsert({
    where: { lessonId: b.lessonId },
    create: { lessonId: b.lessonId, passScore: b.passScore ?? 70, questions: b.questions },
    update: { passScore: b.passScore ?? 70, questions: b.questions }
  });
  return NextResponse.json(quiz);
}
