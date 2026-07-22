import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session.user.approved) return NextResponse.json({ error: "รอผู้ดูแลอนุมัติสิทธิ์" }, { status: 403 });
  const uid = session.user.id;

  const courses = await prisma.course.findMany({
    orderBy: { order: "asc" },
    include: {
      lessons: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          progress: { where: { userId: uid }, select: { completedAt: true } },
          quiz: {
            select: {
              attempts: { where: { userId: uid }, orderBy: { score: "desc" }, take: 1, select: { passed: true } }
            }
          }
        }
      }
    }
  });

  return NextResponse.json(courses.map(c => ({
    id: c.id, title: c.title, description: c.description, emoji: c.emoji, order: c.order,
    totalLessons: c.lessons.length,
    completedLessons: c.lessons.filter(l => l.progress.length > 0 || (l.quiz?.attempts[0]?.passed ?? false)).length,
  })));
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const b = await req.json();
  if (!b.title?.trim()) return NextResponse.json({ error: "กรุณากรอกชื่อ" }, { status: 400 });

  const course = await prisma.course.create({
    data: { title: b.title.trim(), description: b.description?.trim() || null, emoji: b.emoji?.trim() || "📋", createdById: session.user.id }
  });
  return NextResponse.json(course);
}
