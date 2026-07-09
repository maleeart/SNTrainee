import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const leave = await prisma.leaveRequest.findUnique({ where: { id } });
  if (!leave) return NextResponse.json({ error: "ไม่พบรายการ" }, { status: 404 });

  const isAdmin = session.user.role === "ADMIN" || session.user.role === "EXECUTIVE";
  if (!isAdmin && leave.userId !== session.user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.leaveRequest.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
