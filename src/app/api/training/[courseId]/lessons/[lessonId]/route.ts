import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ lessonId: string }> }) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { lessonId } = await params;
  const b = await req.json();
  const lesson = await prisma.courseLesson.update({
    where: { id: lessonId },
    data: {
      title: b.title?.trim() || undefined,
      videoUrl: "videoUrl" in b ? (b.videoUrl?.trim() || null) : undefined,
      fileUrl: "fileUrl" in b ? (b.fileUrl?.trim() || null) : undefined,
      fileName: "fileName" in b ? (b.fileName?.trim() || null) : undefined,
    }
  });
  return NextResponse.json(lesson);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ lessonId: string }> }) {
  const session = await auth();
  const uid = session?.user?.id;
  const role = session?.user?.role;
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { lessonId } = await params;

  // แอดมินลบได้ทุกอย่าง — พี่เลี้ยงลบได้เฉพาะ "โจทย์หน้างานที่ตัวเองตั้ง"
  if (role !== "ADMIN") {
    if (role !== "MENTOR") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const l = await prisma.courseLesson.findUnique({
      where: { id: lessonId },
      select: { createdById: true, course: { select: { fieldQuiz: true } } },
    });
    if (!l?.course.fieldQuiz || l.createdById !== uid) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  await prisma.courseLesson.delete({ where: { id: lessonId } });
  return NextResponse.json({ ok: true });
}
