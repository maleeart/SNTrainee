import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const uid = session.user.id;
  const { lessonId } = await req.json();
  if (!lessonId) return NextResponse.json({ error: "lessonId required" }, { status: 400 });

  // upsert บน compound unique จะถูกห่อเป็น transaction ซึ่ง Neon HTTP mode ไม่รองรับ
  await prisma.$executeRaw`
    INSERT INTO "LessonProgress" ("userId", "lessonId", "completedAt")
    VALUES (${uid}, ${lessonId}, NOW())
    ON CONFLICT ("userId", "lessonId") DO NOTHING
  `;
  return NextResponse.json({ ok: true });
}
