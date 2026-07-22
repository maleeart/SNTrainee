import { requireUser } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { SCHOOL_PRESETS } from "@/lib/labels";
import ProfileForm from "@/components/ProfileForm";

export default async function ProfilePage() {
  // ยังไม่อนุมัติก็เข้าหน้านี้ได้ — ต้องกรอกข้อมูลก่อนถึงจะขออนุมัติได้
  const u = await requireUser(undefined, { allowUnapproved: true });
  const me = await prisma.user.findUnique({ where: { id: u.id } });

  return <ProfileForm user={me!} schools={SCHOOL_PRESETS} />;
}
