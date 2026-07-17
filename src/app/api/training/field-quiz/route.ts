import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type QuizQ = { q: string; options: string[]; answer: number };

// POST /api/training/field-quiz — ตั้งโจทย์หน้างานคลิกเดียว (พี่เลี้ยง/แอดมิน)
// หา-หรือ-สร้างคอร์ส "โจทย์หน้างาน" → สร้างบทเรียน → ใส่ข้อสอบ
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.role !== "MENTOR" && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const b = await req.json();
    const title: string = b.title?.trim() ?? "";
    const questions: QuizQ[] = b.questions;

    if (!title) return NextResponse.json({ error: "กรุณากรอกชื่อโจทย์" }, { status: 400 });
    if (!Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json({ error: "ต้องมีอย่างน้อย 1 ข้อ" }, { status: 400 });
    }
    // กันข้อสอบพัง: ทุกข้อต้องมีคำถาม 4 ตัวเลือกครบ และเฉลยชี้ตัวเลือกที่มีจริง
    const bad = questions.some(q =>
      !q?.q?.trim()
      || !Array.isArray(q.options) || q.options.length !== 4 || q.options.some(o => !o?.trim())
      || !Number.isInteger(q.answer) || q.answer < 0 || q.answer > 3
    );
    if (bad) return NextResponse.json({ error: "ทุกข้อต้องมีคำถาม ตัวเลือกครบ 4 ข้อ และเลือกเฉลย" }, { status: 400 });

    const passScore = Number.isInteger(b.passScore) ? Math.min(100, Math.max(50, b.passScore)) : 70;

    let course = await prisma.course.findFirst({ where: { fieldQuiz: true } });
    if (!course) {
      course = await prisma.course.create({
        data: {
          title: "โจทย์หน้างาน",
          description: "โจทย์ที่พี่เลี้ยงตั้งจากงานจริงระหว่างวัน",
          emoji: "📍",
          order: 999,
          fieldQuiz: true,
          createdById: session.user.id,
        },
      });
    }

    const maxOrder = await prisma.courseLesson.findFirst({
      where: { courseId: course.id }, orderBy: { order: "desc" }, select: { order: true },
    });

    // แยกเป็น 2 คำสั่ง — nested create จะถูก Prisma ห่อเป็น transaction
    // ซึ่ง Neon HTTP mode ไม่รองรับ (ดู comment ที่ api/evaluations/route.ts)
    const lesson = await prisma.courseLesson.create({
      data: {
        courseId: course.id,
        title,
        order: (maxOrder?.order ?? -1) + 1,
        createdById: session.user.id,
      },
    });

    let quiz;
    try {
      quiz = await prisma.lessonQuiz.create({ data: { lessonId: lesson.id, passScore, questions } });
    } catch (e) {
      // ไม่มี transaction ให้ rollback — เก็บกวาดเองกันบทเรียนเปล่าค้างให้เด็กเห็น
      await prisma.courseLesson.delete({ where: { id: lesson.id } }).catch(() => {});
      throw e;
    }

    return NextResponse.json({ courseId: course.id, lesson: { ...lesson, quiz } });
  } catch (e: unknown) {
    console.error("field-quiz POST error:", e);
    const msg = e instanceof Error ? e.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
