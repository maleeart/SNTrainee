import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const reports = await prisma.report.findMany({
    where: { userId: session.user.id },
    orderBy: { date: "desc" },
  });
  return NextResponse.json(reports);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const b = await req.json();
  const date = new Date(b.date);

  const existing = await prisma.report.findUnique({
    where: { userId_date: { userId: session.user.id, date } },
  });
  if (existing?.status === "APPROVED") {
    return NextResponse.json({ error: "รายงานนี้อนุมัติแล้ว แก้ไขไม่ได้" }, { status: 400 });
  }

  // resubmit after edit → กลับไปรอสถานะที่เหมาะสม
  const status = existing?.assignedMentorId ? "PENDING_APPROVAL" : "PENDING_ASSIGN";

  const data = {
    title: b.title,
    description: b.description,
    tasks: b.tasks ?? [],
    jobType: b.jobType || null,
    systemCategory: b.systemCategory || null,
    location: b.location || null,
    tools: b.tools ?? [],
    ppe: b.ppe ?? [],
    learned: b.learned || null,
  };

  const report = await prisma.report.upsert({
    where: { userId_date: { userId: session.user.id, date } },
    update: { ...data, status },
    create: { ...data, userId: session.user.id, date, status: "PENDING_ASSIGN" },
  });
  return NextResponse.json(report);
}
