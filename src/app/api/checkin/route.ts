import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

function thaiToday() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });
}

// GET — returns { checkedIn, checkInTime, onLeave }
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;
  const today = thaiToday();

  const [checkIn, leave] = await Promise.all([
    prisma.checkIn.findUnique({ where: { userId_date: { userId, date: new Date(today) } } }),
    prisma.leaveRequest.findFirst({
      where: { userId, startDate: { lte: new Date(today) }, endDate: { gte: new Date(today) } },
    }),
  ]);

  return NextResponse.json({
    checkedIn: !!checkIn,
    checkInTime: checkIn?.createdAt ?? null,
    onLeave: !!leave,
    leaveReason: leave?.reason ?? null,
  });
}

// POST — create check-in for today
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "STUDENT") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const userId = session.user.id;
  const today = thaiToday();
  const todayDate = new Date(today);

  const onLeave = await prisma.leaveRequest.findFirst({
    where: { userId, startDate: { lte: todayDate }, endDate: { gte: todayDate } },
  });
  if (onLeave) return NextResponse.json({ error: "กำลังลาในวันนี้" }, { status: 400 });

  const checkIn = await prisma.checkIn.upsert({
    where: { userId_date: { userId, date: todayDate } },
    create: { userId, date: todayDate },
    update: {},
  });

  return NextResponse.json({ checkInTime: checkIn.createdAt });
}
