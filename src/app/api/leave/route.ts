import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET — list own leave requests
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const leaves = await prisma.leaveRequest.findMany({
    where: { userId: session.user.id },
    orderBy: { startDate: "desc" },
  });
  return NextResponse.json(leaves);
}

// POST — create leave request
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "STUDENT") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { startDate, endDate, reason } = await req.json();
  if (!startDate || !endDate || !reason?.trim())
    return NextResponse.json({ error: "กรุณากรอกข้อมูลให้ครบ" }, { status: 400 });
  if (new Date(startDate) > new Date(endDate))
    return NextResponse.json({ error: "วันที่ไม่ถูกต้อง" }, { status: 400 });

  const leave = await prisma.leaveRequest.create({
    data: { userId: session.user.id, startDate: new Date(startDate), endDate: new Date(endDate), reason: reason.trim() },
  });
  return NextResponse.json(leave);
}
