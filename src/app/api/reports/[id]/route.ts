import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const report = await prisma.report.findUnique({ where: { id } });
  if (!report) return NextResponse.json({ error: "ไม่พบรายงาน" }, { status: 404 });

  if (session.user.role !== "ADMIN") {
    if (report.userId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (report.status === "SCORED") return NextResponse.json({ error: "รายงานที่ประเมินแล้วลบไม่ได้" }, { status: 400 });
  }
  await prisma.report.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
