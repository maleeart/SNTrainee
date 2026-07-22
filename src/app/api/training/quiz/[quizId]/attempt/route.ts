import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ quizId: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!session.user.approved) return NextResponse.json({ error: "รอผู้ดูแลอนุมัติสิทธิ์" }, { status: 403 });
    const uid = session.user.id;
    const { quizId } = await params;

    const quiz = await prisma.lessonQuiz.findUnique({ where: { id: quizId } });
    if (!quiz) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const { answers }: { answers: number[] } = await req.json();
    const questions = quiz.questions as { q: string; options: string[]; answer: number }[];
    const correct = questions.filter((q, i) => answers[i] === q.answer).length;
    const score = Math.round((correct / questions.length) * 100);
    const passed = score >= quiz.passScore;

    await prisma.quizAttempt.create({ data: { userId: uid, quizId, score, passed, answers } });

    if (passed) {
      // upsert บน compound unique จะถูก Prisma ห่อเป็น transaction ซึ่ง Neon HTTP mode ไม่รองรับ
      // (upsert บน unique เดี่ยวไม่มีปัญหา — Prisma แปลงเป็น ON CONFLICT ให้เอง)
      await prisma.$executeRaw`
        INSERT INTO "LessonProgress" ("userId", "lessonId", "completedAt")
        VALUES (${uid}, ${quiz.lessonId}, NOW())
        ON CONFLICT ("userId", "lessonId") DO NOTHING
      `;
    }

    return NextResponse.json({ score, passed, correct, total: questions.length });
  } catch (e: unknown) {
    console.error("quiz attempt POST error:", e);
    const msg = e instanceof Error ? e.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
