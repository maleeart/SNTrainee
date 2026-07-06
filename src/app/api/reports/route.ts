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

  const body = await req.json();
  const { date, title, description, tasks } = body;

  const report = await prisma.report.upsert({
    where: { userId_date: { userId: session.user.id, date: new Date(date) } },
    update: { title, description, tasks },
    create: { userId: session.user.id, date: new Date(date), title, description, tasks },
  });
  return NextResponse.json(report);
}
