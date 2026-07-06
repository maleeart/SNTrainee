import { requireUser } from "@/lib/guards";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Dashboard from "@/components/Dashboard";

export default async function DashboardPage() {
  const u = await requireUser(["STUDENT"]);
  if (!u.profileDone) redirect("/profile");

  const reports = await prisma.report.findMany({
    where: { userId: u.id },
    orderBy: { date: "desc" },
  });

  return <Dashboard user={u} initialReports={reports} />;
}
