import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ courseId: string }> }) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { courseId } = await params;
  const b = await req.json();
  if (!b.title?.trim()) return NextResponse.json({ error: "กรุณากรอกชื่อหัวข้อ" }, { status: 400 });

  const maxOrder = await prisma.courseLesson.findFirst({ where: { courseId }, orderBy: { order: "desc" }, select: { order: true } });
  const lesson = await prisma.courseLesson.create({
    data: {
      courseId, title: b.title.trim(), order: (maxOrder?.order ?? -1) + 1,
      videoUrl: b.videoUrl?.trim() || null,
      fileUrl: b.fileUrl?.trim() || null,
      fileName: b.fileName?.trim() || null,
    }
  });
  return NextResponse.json(lesson);
}
