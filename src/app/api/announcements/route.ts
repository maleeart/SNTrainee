import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET — list announcements for the current user
// ?markread=1 also persists all as read in one transaction
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role ?? "STUDENT";
  const userId = session.user.id;
  const markRead = new URL(req.url).searchParams.get("markread") === "1";

  const announcements = await prisma.announcement.findMany({
    where: { OR: [{ target: "ALL" }, { target: role }] },
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
    include: {
      createdBy: { select: { name: true, nickname: true } },
      reads: { where: { userId }, select: { readAt: true } },
    },
  });

  if (markRead && announcements.length > 0) {
    // $transaction and upsert don't work with Neon HTTP driver — use raw INSERT ON CONFLICT instead
    await prisma.$executeRaw`
      INSERT INTO "AnnouncementRead" ("announcementId", "userId")
      SELECT a.id, ${userId}
      FROM "Announcement" a
      WHERE a.id = ANY(${announcements.map(a => a.id)}::text[])
      ON CONFLICT DO NOTHING
    `;
  }

  return NextResponse.json(announcements.map(a => ({
    id: a.id,
    title: a.title,
    body: a.body,
    target: a.target,
    pinned: a.pinned,
    createdAt: a.createdAt,
    author: a.createdBy.nickname ?? a.createdBy.name ?? "Admin",
    read: markRead ? true : a.reads.length > 0,
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
