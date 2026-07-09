import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const uid = session.user.id;
  const { lessonId } = await req.json();
  if (!lessonId) return NextResponse.json({ error: "lessonId required" }, { status: 400 });

  await prisma.lessonProgress.upsert({
    where: { userId_lessonId: { userId: uid, lessonId } },
    create: { userId: uid, lessonId },
    update: {}
  });
  return NextResponse.json({ ok: true });
}
