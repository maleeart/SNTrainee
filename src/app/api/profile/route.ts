import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, level, school, advisor, startDate, endDate } = await req.json();
  if (!name || !level || !school) {
    return NextResponse.json({ error: "กรุณากรอกข้อมูลที่จำเป็น" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name,
      level,
      school,
      advisor: advisor || null,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      profileDone: true,
    },
  });
  return NextResponse.json({ ok: true });
}
