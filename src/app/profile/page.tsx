import { requireUser } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import ProfileForm from "@/components/ProfileForm";

export default async function ProfilePage() {
  const u = await requireUser();
  const me = await prisma.user.findUnique({ where: { id: u.id } });
  return <ProfileForm user={me!} />;
}
