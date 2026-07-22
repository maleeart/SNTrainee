import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_: NextRequest, { params }: { params: Promise<{ courseId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session.user.approved) return NextResponse.json({ error: "รอผู้ดูแลอนุมัติสิทธิ์" }, { status: 403 });
  const uid = session.user.id;
  const { courseId } = await params;

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      lessons: {
        orderBy: { order: "asc" },
        include: {
          progress: { where: { userId: uid } },
          quiz: { include: { attempts: { where: { userId: uid }, orderBy: { score: "desc" }, take: 1 } } }
        }
      }
    }
  });

  if (!course) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    id: course.id, title: course.title, description: course.description, emoji: course.emoji, order: course.order,
    lessons: course.lessons.map(l => ({
      id: l.id, title: l.title, order: l.order,
      videoUrl: l.videoUrl, fileUrl: l.fileUrl, fileName: l.fileName,
      completed: l.progress.length > 0 || (l.quiz?.attempts[0]?.passed ?? false),
      quiz: l.quiz ? {
        id: l.quiz.id, passScore: l.quiz.passScore, questions: l.quiz.questions,
        bestScore: l.quiz.attempts[0]?.score ?? null, passed: l.quiz.attempts[0]?.passed ?? false,
      } : null
    }))
  });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ courseId: string }> }) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { courseId } = await params;
  const b = await req.json();
  const course = await prisma.course.update({
    where: { id: courseId },
    data: { title: b.title?.trim() || undefined, description: b.description?.trim() || null, emoji: b.emoji?.trim() || undefined }
  });
  return NextResponse.json(course);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ courseId: string }> }) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { courseId } = await params;
  await prisma.course.delete({ where: { id: courseId } });
  return NextResponse.json({ ok: true });
}
