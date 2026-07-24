import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, nickname, role, level, school, advisor, startDate, endDate } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "กรุณากรอกชื่อ" }, { status: 400 });

  const isStudent = role === "STUDENT";
  const isAdvisor = role === "ADVISOR";
  if (isStudent && (!level || !school?.trim())) {
    return NextResponse.json({ error: "กรุณากรอกระดับชั้นและสถานศึกษา" }, { status: 400 });
  }
  if (isAdvisor && !school?.trim()) {
    return NextResponse.json({ error: "กรุณาเลือกหรือกรอกสถานศึกษา" }, { status: 400 });
  }

  // ⚠️ role ที่ผู้ใช้เลือกเป็นแค่ "คำขอ" — ห้ามเขียนลง user.role เด็ดขาด
  // ไม่งั้นใครก็ตั้งสิทธิ์ตัวเองเป็นผู้สังเกตการณ์แล้วเห็นข้อมูลเด็กทุกคนได้ทันที
  const allowedRoles = ["STUDENT", "MENTOR", "EXECUTIVE", "ADVISOR"];
  const wanted = allowedRoles.includes(role) ? role : undefined;
  const isAdmin = session.user.role === "ADMIN";

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name: name.trim(),
      nickname: nickname?.trim() || null,
      // แอดมินแก้โปรไฟล์ตัวเองไม่ต้องขออนุมัติ ส่วนคนอื่นบันทึกเป็นคำขอไว้รอแอดมินกด
      ...(isAdmin ? {} : { requestedRole: wanted }),
      level: isStudent ? level : null,
      school: (isStudent || isAdvisor) ? school.trim() : null,
      advisor: isStudent ? (advisor?.trim() || null) : null,
      startDate: isStudent && startDate ? new Date(startDate) : null,
      endDate: isStudent && startDate ? new Date(endDate) : null,
      profileDone: true,
    },
  });

  // ยังไม่อนุมัติ → ให้ frontend พาไปหน้ารออนุมัติ ไม่ใช่หน้าตาม role ที่ขอ
  return NextResponse.json({ ok: true, approved: session.user.approved, role: session.user.role });
}
