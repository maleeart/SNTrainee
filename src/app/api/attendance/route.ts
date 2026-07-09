import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

function thaiToday() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });
}

// GET /api/attendance?date=YYYY-MM-DD  (admin/exec only)
// Returns { students: [{ id, name, nickname, checkIn, leaveToday, status }], leaves: LeaveRequest[] }
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = session.user.role ?? "";
  if (role !== "ADMIN" && role !== "EXECUTIVE")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const dateStr = req.nextUrl.searchParams.get("date") ?? thaiToday();
  const date = new Date(dateStr);

  const [students, checkIns, leaves, allLeaves] = await Promise.all([
    prisma.user.findMany({
      where: { role: "STUDENT" },
      select: { id: true, name: true, nickname: true, startDate: true, endDate: true },
      orderBy: { startDate: "asc" },
    }),
    prisma.checkIn.findMany({ where: { date } }),
    prisma.leaveRequest.findMany({ where: { startDate: { lte: date }, endDate: { gte: date } } }),
    prisma.leaveRequest.findMany({
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
      id: s.id,
      name: s.name,
      nickname: s.nickname,
      startDate: s.startDate,
      endDate: s.endDate,
      checkedIn: !!ci,
      checkInTime: ci?.createdAt ?? null,
      onLeave,
      status: onLeave ? "ลา" : ci ? "มา" : "ขาด",
    };
  });

  return NextResponse.json({ students: rows, leaves: allLeaves });
}
