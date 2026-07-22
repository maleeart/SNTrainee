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
  if (!session.user.approved) return NextResponse.json({ error: "รอผู้ดูแลอนุมัติสิทธิ์" }, { status: 403 });
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
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!session.user.approved) return NextResponse.json({ error: "รอผู้ดูแลอนุมัติสิทธิ์" }, { status: 403 });
    if (session.user.role !== "STUDENT") return NextResponse.json({ error: `Forbidden: role=${session.user.role}` }, { status: 403 });

    const userId = session.user.id;
    const today = thaiToday();
    const todayDate = new Date(today);

    const onLeave = await prisma.leaveRequest.findFirst({
      where: { userId, startDate: { lte: todayDate }, endDate: { gte: todayDate } },
    });
    if (onLeave) return NextResponse.json({ error: "กำลังลาในวันนี้" }, { status: 400 });

    // upsert uses internal transaction which Neon HTTP driver doesn't support
    // use create + catch unique constraint instead
    let checkIn = await prisma.checkIn.findUnique({
      where: { userId_date: { userId, date: todayDate } },
    });
    if (!checkIn) {
      checkIn = await prisma.checkIn.create({ data: { userId, date: todayDate } });
    }

    return NextResponse.json({ checkInTime: checkIn.createdAt });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("checkin POST error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
