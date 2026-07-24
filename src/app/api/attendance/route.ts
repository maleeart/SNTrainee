import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { isWeekend } from "@/lib/labels";

function thaiToday() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });
}

function requireAdmin(role: string) {
  return role === "ADMIN" || role === "EXECUTIVE" || role === "ADVISOR";
}

// GET /api/attendance?date=YYYY-MM-DD  — daily view
// GET /api/attendance?month=YYYY-MM   — monthly view
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session.user.approved) return NextResponse.json({ error: "รอผู้ดูแลอนุมัติสิทธิ์" }, { status: 403 });
  if (!requireAdmin(session.user.role ?? "")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const month = req.nextUrl.searchParams.get("month");

  const students = await prisma.user.findMany({
    where: {
      role: "STUDENT",
      ...(session.user.role === "ADVISOR" ? { school: session.user.school } : {}),
    },
    select: { id: true, name: true, nickname: true, startDate: true, endDate: true },
    orderBy: { startDate: "asc" },
  });

  if (month) {
    // Monthly mode: return all check-ins and leaves for the month
    const start = new Date(`${month}-01`);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);

    const [checkIns, leaves] = await Promise.all([
      prisma.checkIn.findMany({
        where: {
          date: { gte: start, lt: end },
          ...(session.user.role === "ADVISOR" ? { user: { school: session.user.school } } : {}),
        }
      }),
      prisma.leaveRequest.findMany({
        where: {
          startDate: { lt: end },
          endDate: { gte: start },
          ...(session.user.role === "ADVISOR" ? { user: { school: session.user.school } } : {}),
        },
        include: { user: { select: { id: true, name: true, nickname: true } } },
      }),
    ]);

    return NextResponse.json({ students, checkIns, leaves });
  }

  // Daily mode
  const dateStr = req.nextUrl.searchParams.get("date") ?? thaiToday();
  const date = new Date(dateStr);

  const [checkIns, leaves, allLeaves] = await Promise.all([
    prisma.checkIn.findMany({
      where: {
        date,
        ...(session.user.role === "ADVISOR" ? { user: { school: session.user.school } } : {}),
      }
    }),
    prisma.leaveRequest.findMany({
      where: {
        startDate: { lte: date },
        endDate: { gte: date },
        ...(session.user.role === "ADVISOR" ? { user: { school: session.user.school } } : {}),
      }
    }),
    prisma.leaveRequest.findMany({
      where: session.user.role === "ADVISOR" ? { user: { school: session.user.school } } : {},
      orderBy: { startDate: "desc" },
      include: { user: { select: { id: true, name: true, nickname: true } } },
    }),
  ]);

  const checkInMap = new Map(checkIns.map(c => [c.userId, c]));
  const leaveSet = new Set(leaves.map(l => l.userId));

  const rows = students.map(s => {
    const ci = checkInMap.get(s.id);
    const onLeave = leaveSet.has(s.id);
    return {
      id: s.id, name: s.name, nickname: s.nickname, startDate: s.startDate, endDate: s.endDate,
      checkedIn: !!ci, checkInTime: ci?.createdAt ?? null, onLeave,
      // ลงเวลาวันหยุดยังนับ "มา" — เสาร์-อาทิตย์ที่ไม่ได้ลงเวลาถึงเป็น "หยุด" ไม่ใช่ความผิดเด็ก
      status: onLeave ? "ลา" : ci ? "มา" : isWeekend(dateStr) ? "หยุด" : "ขาด",
    };
  });

  return NextResponse.json({ students: rows, leaves: allLeaves });
}

// PATCH /api/attendance — admin manually set check-in status for a user+date
// body: { userId, date: "YYYY-MM-DD", action: "checkin" | "uncheckin" }
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session.user.approved) return NextResponse.json({ error: "รอผู้ดูแลอนุมัติสิทธิ์" }, { status: 403 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { userId, date: dateStr, action } = await req.json();
  if (!userId || !dateStr || !action) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const date = new Date(dateStr);

  if (action === "checkin") {
    const existing = await prisma.checkIn.findUnique({ where: { userId_date: { userId, date } } });
    if (!existing) await prisma.checkIn.create({ data: { userId, date } });
  } else if (action === "uncheckin") {
    await prisma.checkIn.deleteMany({ where: { userId, date } });
  } else {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
