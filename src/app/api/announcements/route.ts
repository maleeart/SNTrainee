import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET — list announcements for the current user (unread first, then read, pinned on top)
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role ?? "STUDENT";
  const userId = session.user.id;

  const announcements = await prisma.announcement.findMany({
    where: { OR: [{ target: "ALL" }, { target: role }] },
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
    include: {
      createdBy: { select: { name: true, nickname: true } },
      reads: { where: { userId }, select: { readAt: true } },
    },
  });

  return NextResponse.json(announcements.map(a => ({
    id: a.id,
    title: a.title,
    body: a.body,
    target: a.target,
    pinned: a.pinned,
    createdAt: a.createdAt,
    author: a.createdBy.nickname ?? a.createdBy.name ?? "Admin",
    read: a.reads.length > 0,
  })));
}

// POST — create announcement (ADMIN only)
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["ADMIN", "EXECUTIVE"].includes(session.user.role ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { title, body, target = "ALL", pinned = false } = await req.json();
  if (!title?.trim() || !body?.trim()) return NextResponse.json({ error: "title and body required" }, { status: 400 });

  const a = await prisma.announcement.create({
    data: { title: title.trim(), body: body.trim(), target, pinned, createdById: session.user.id },
  });

  return NextResponse.json(a);
}
