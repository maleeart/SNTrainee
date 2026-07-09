import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });
  if (file.size > 20 * 1024 * 1024) return NextResponse.json({ error: "ไฟล์ใหญ่เกิน 20MB" }, { status: 400 });

  const safeName = file.name.replace(/[^a-z0-9._-]/gi, "_");
  const blob = await put(`training/${Date.now()}-${safeName}`, file, { access: "public" });
  return NextResponse.json({ url: blob.url, name: file.name });
}
