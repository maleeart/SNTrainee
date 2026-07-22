import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/evaluations?reportId=xxx
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session.user.approved) return NextResponse.json({ error: "รอผู้ดูแลอนุมัติสิทธิ์" }, { status: 403 });

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
    if (!session.user.approved) return NextResponse.json({ error: "รอผู้ดูแลอนุมัติสิทธิ์" }, { status: 403 });
    if (session.user.role !== "MENTOR" && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { reportId, scores, comment } = await req.json();
    if (!reportId || !scores) return NextResponse.json({ error: "ข้อมูลไม่ครบ" }, { status: 400 });

    const report = await prisma.report.findUnique({ where: { id: reportId } });
    if (!report) return NextResponse.json({ error: "ไม่พบรายงาน" }, { status: 404 });

    const mentorId = session.user.id;
    const scoresJson = JSON.stringify(scores);
    const evalId = `eval_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const commentVal = comment || null;

    // Use raw SQL to avoid Prisma implicit transactions (not supported in Neon HTTP mode)
    await prisma.$executeRaw`
      INSERT INTO "Evaluation" (id, "reportId", "mentorId", scores, comment, "createdAt", "updatedAt")
      VALUES (${evalId}, ${reportId}, ${mentorId}, ${scoresJson}::jsonb, ${commentVal}, NOW(), NOW())
      ON CONFLICT ("reportId", "mentorId")
      DO UPDATE SET scores = ${scoresJson}::jsonb, comment = ${commentVal}, "updatedAt" = NOW()
    `;

    if (report.status === "PENDING") {
      await prisma.$executeRaw`UPDATE "Report" SET status = 'SCORED'::"ReportStatus", "updatedAt" = NOW() WHERE id = ${reportId}`;
    }

    // Read back evaluation with mentor info
    const rows = await prisma.$queryRaw<{ id: string; reportId: string; mentorId: string; scores: Record<string,number>; comment: string | null; mentorName: string | null; mentorNickname: string | null }[]>`
      SELECT e.id, e."reportId", e."mentorId", e.scores, e.comment,
             u.name AS "mentorName", u.nickname AS "mentorNickname"
      FROM "Evaluation" e
      JOIN "User" u ON u.id = e."mentorId"
      WHERE e."reportId" = ${reportId} AND e."mentorId" = ${mentorId}
    `;

    const row = rows[0];
    return NextResponse.json({
      id: row.id,
      reportId: row.reportId,
      mentorId: row.mentorId,
      scores: row.scores,
      comment: row.comment,
      mentor: { id: row.mentorId, name: row.mentorName, nickname: row.mentorNickname },
    });
  } catch (e: any) {
    console.error("evaluations POST error:", e);
    return NextResponse.json({ error: e?.message ?? "Internal server error" }, { status: 500 });
  }
}
