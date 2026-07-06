import { requireUser } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import MentorView from "@/components/MentorView";

export default async function MentorPage() {
  const u = await requireUser(["MENTOR"]);

  const reports = await prisma.report.findMany({
    orderBy: [{ status: "asc" }, { date: "desc" }],
    include: { user: { select: { name: true, image: true, level: true, school: true } } },
  });

  return <MentorView meId={u.id} meName={u.name ?? ""} meImage={u.image} reports={JSON.parse(JSON.stringify(reports))} />;
}
