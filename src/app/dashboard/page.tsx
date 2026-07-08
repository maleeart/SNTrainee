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
    include: { evaluations: { select: { scores: true, comment: true, mentor: { select: { name: true, nickname: true } } } } },
  });

  const reports = rawReports.map(r => {
    const evals = r.evaluations as { scores: Record<string, number>; comment: string | null; mentor: { name: string | null; nickname: string | null } }[];
    const evalSummary = {
      count: evals.length,
      comments: evals.filter(e => e.comment?.trim()).map(e => ({
        mentor: e.mentor.nickname ?? e.mentor.name ?? "พี่เลี้ยง",
        comment: e.comment!,
      })),
    };
    const { evaluations: _, ...rest } = r;
    return { ...rest, evalSummary };
  });

  // Aggregate scores
  const allEvalScores = rawReports.flatMap(r =>
    (r.evaluations as { scores: Record<string, number> }[])
  );
  const criteriaKeys = ["skill", "safety", "responsibility", "quality", "report"];
  const myCriteria: Record<string, number> = {};
  if (allEvalScores.length > 0) {
    for (const key of criteriaKeys) {
      const vals = allEvalScores.map(e => e.scores[key] ?? 0).filter(v => v > 0);
      if (vals.length) myCriteria[key] = vals.reduce((a, b) => a + b, 0) / vals.length;
    }
  }
  const allNums = allEvalScores.flatMap(e => Object.values(e.scores).filter(Boolean) as number[]);
  const myOverall = allNums.length ? allNums.reduce((a, b) => a + b, 0) / allNums.length : null;

  return <Dashboard
    user={{ ...u, ...me, startDate: me.startDate?.toISOString() ?? null, endDate: me.endDate?.toISOString() ?? null }}
    initialReports={JSON.parse(JSON.stringify(reports))}
    myStats={{ totalReports: reports.length, scoredReports: reports.filter(r => r.status === "SCORED").length, criteria: myCriteria, overall: myOverall }}
  />;
}
