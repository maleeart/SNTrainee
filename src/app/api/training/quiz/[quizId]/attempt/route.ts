import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ quizId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    await prisma.lessonProgress.upsert({
      where: { userId_lessonId: { userId: uid, lessonId: quiz.lessonId } },
      create: { userId: uid, lessonId: quiz.lessonId },
      update: {}
    });
  }

  return NextResponse.json({ score, passed, correct, total: questions.length });
}
