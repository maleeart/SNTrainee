import { requireUser } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { schoolOptions } from "@/lib/labels";
import ProfileForm from "@/components/ProfileForm";

export default async function ProfilePage() {
  // ยังไม่อนุมัติก็เข้าหน้านี้ได้ — ต้องกรอกข้อมูลก่อนถึงจะขออนุมัติได้
  const u = await requireUser(undefined, { allowUnapproved: true });
  const me = await prisma.user.findUnique({ where: { id: u.id } });

  // รายการสถานศึกษาที่เคยมีคนกรอก — "อื่นๆ" ของคนก่อนหน้าจะโผล่เป็นตัวเลือกให้คนถัดไปเอง
  const used = await prisma.user.findMany({
    where: { school: { not: null } },
    select: { school: true },
    distinct: ["school"],
  });

  return <ProfileForm user={me!} schools={schoolOptions(used.map(s => s.school))} />;
}
