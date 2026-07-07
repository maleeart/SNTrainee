import { requireUser, isProfileComplete } from "@/lib/guards";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Dashboard from "@/components/Dashboard";

export default async function DashboardPage() {
  const u = await requireUser(["STUDENT"]);

  const me = await prisma.user.findUnique({
    where: { id: u.id },
    select: { name: true, nickname: true, email: true, image: true, role: true, level: true, school: true, advisor: true, startDate: true, endDate: true, profileDone: true },
  });

  if (!me || !me.profileDone || !isProfileComplete(me)) redirect("/profile");

  const rawReports = await prisma.report.findMany({
    where: { userId: u.id },
    orderBy: { date: "desc" },
    include: { evaluations: { select: { scores: true } } },
  });

  const reports = rawReports.map(r => {
    const evals = r.evaluations as { scores: Record<string, number> }[];
    const evalSummary = { count: evals.length };
    const { evaluations: _, ...rest } = r;
    return { ...rest, evalSummary };
  });

  return <Dashboard user={{ ...u, ...me, startDate: me.startDate?.toISOString() ?? null, endDate: me.endDate?.toISOString() ?? null }} initialReports={JSON.parse(JSON.stringify(reports))} />;
}
