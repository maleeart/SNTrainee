import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const uid = session.user.id;
  const role = session.user.role as string;
  const isAdmin = role === "ADMIN" || role === "EXECUTIVE";

  const courseId = req.nextUrl.searchParams.get("courseId") ?? undefined;

  const attempts = await prisma.quizAttempt.findMany({
    where: {
      ...(isAdmin ? {} : { userId: uid }),
      ...(courseId ? { quiz: { lesson: { courseId } } } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { id: true, name: true, nickname: true } },
      quiz: {
        select: {
          questions: true,
          lesson: { select: { title: true, course: { select: { title: true } } } },
        },
      },
    },
  });

  const rows = attempts.map(a => {
    const questions = a.quiz.questions as { answer: number }[];
    const answers = a.answers as number[];
    const total = questions.length;
    const correct = questions.filter((q, i) => answers[i] === q.answer).length;
    return {
      id: a.id,
      score: a.score,
      passed: a.passed,
      correct,
      total,
      createdAt: a.createdAt,
      user: a.user,
      quiz: { lesson: a.quiz.lesson },
    };
  });

  return NextResponse.json(rows);
}
