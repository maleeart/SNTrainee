import { requireUser, isProfileComplete } from "@/lib/guards";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import MentorView from "@/components/MentorView";

export default async function MentorPage() {
  const u = await requireUser(["MENTOR"]);

  const me = await prisma.user.findUnique({
    where: { id: u.id },
    select: { name: true, nickname: true, email: true, image: true, role: true, level: true, school: true, advisor: true, startDate: true, endDate: true, profileDone: true },
  });

  if (!me || !me.profileDone || !isProfileComplete(me)) redirect("/profile");

  const reports = await prisma.report.findMany({
    orderBy: [{ status: "asc" }, { date: "desc" }],
    include: {
      user: { select: { name: true, image: true, level: true, school: true } },
      evaluations: {
        include: { mentor: { select: { id: true, name: true, nickname: true } } },
      },
    },
  });

  return (
    <MentorView
      meId={u.id}
      meName={me.name ?? ""}
      meNickname={me.nickname}
      meEmail={me.email}
      meImage={me.image}
      reports={JSON.parse(JSON.stringify(reports))}
    />
  );
}
