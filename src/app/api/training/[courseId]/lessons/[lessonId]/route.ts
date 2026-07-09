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
  if (!session?.user?.id || session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { lessonId } = await params;
  await prisma.courseLesson.delete({ where: { id: lessonId } });
  return NextResponse.json({ ok: true });
}
