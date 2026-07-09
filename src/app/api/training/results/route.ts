import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  const role = session?.user?.role;
  if (!session?.user?.id || (role !== "ADMIN" && role !== "EXECUTIVE"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const attempts = await prisma.quizAttempt.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { id: true, name: true, nickname: true, role: true } },
      quiz: {
        include: {
          lesson: {
            select: { title: true, course: { select: { title: true } } }
          }
        }
      }
    }
  });

  return NextResponse.json(attempts);
}
