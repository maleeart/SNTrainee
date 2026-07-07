import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/evaluations?reportId=xxx
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const reportId = req.nextUrl.searchParams.get("reportId");
  if (!reportId) return NextResponse.json({ error: "reportId required" }, { status: 400 });

  const evals = await prisma.evaluation.findMany({
    where: { reportId },
    include: { mentor: { select: { id: true, name: true, nickname: true, image: true } } },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(evals);
}

// POST /api/evaluations — create or update (one per mentor per report)
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.role !== "MENTOR" && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { reportId, scores, comment } = await req.json();
    if (!reportId || !scores) return NextResponse.json({ error: "ข้อมูลไม่ครบ" }, { status: 400 });

    const report = await prisma.report.findUnique({ where: { id: reportId } });
    if (!report) return NextResponse.json({ error: "ไม่พบรายงาน" }, { status: 404 });

    const mentorId = session.user.id;
    const existing = await prisma.evaluation.findUnique({
      where: { reportId_mentorId: { reportId, mentorId } },
    });

    const evaluation = existing
      ? await prisma.evaluation.update({
          where: { reportId_mentorId: { reportId, mentorId } },
          data: { scores, comment: comment || null },
          include: { mentor: { select: { id: true, name: true, nickname: true } } },
        })
      : await prisma.evaluation.create({
          data: { reportId, mentorId, scores, comment: comment || null },
          include: { mentor: { select: { id: true, name: true, nickname: true } } },
        });

    if (report.status === "PENDING") {
      await prisma.report.update({ where: { id: reportId }, data: { status: "SCORED" } });
    }

    return NextResponse.json(evaluation);
  } catch (e: any) {
    console.error("evaluations POST error:", e);
    return NextResponse.json({ error: e?.message ?? "Internal server error" }, { status: 500 });
  }
}
