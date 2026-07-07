import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const reports = await prisma.report.findMany({
    where: { userId: session.user.id },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });
  return NextResponse.json(reports);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const b = await req.json();
  const date = new Date(b.date);

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
    solution: b.solution || null,
    result: b.result || null,
    images: b.images ?? [],
    editReason: b.editReason || null,
  };

  // แก้ไขรายงานที่มีอยู่ (ส่ง id มา)
  if (b.id) {
    const existing = await prisma.report.findUnique({ where: { id: b.id } });
    if (!existing || existing.userId !== session.user.id) {
      return NextResponse.json({ error: "ไม่พบรายงาน" }, { status: 404 });
    }
    if (existing.status === "SCORED") {
      return NextResponse.json({ error: "รายงานที่ประเมินแล้วแก้ไขไม่ได้" }, { status: 400 });
    }
    if (!b.editReason?.trim()) {
      return NextResponse.json({ error: "กรุณาระบุเหตุผลที่แก้ไข" }, { status: 400 });
    }
    const report = await prisma.report.update({
      where: { id: b.id },
      data: { ...data, date },
    });
    return NextResponse.json(report);
  }

  // สร้างรายงานใหม่
  const report = await prisma.report.create({
    data: { ...data, userId: session.user.id, date, status: "PENDING" },
  });
  return NextResponse.json(report);
}
