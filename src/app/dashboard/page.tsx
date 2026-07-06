import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Dashboard from "@/components/Dashboard";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const reports = await prisma.report.findMany({
    where: { userId: session.user.id },
    orderBy: { date: "desc" },
  });

  return <Dashboard user={session.user} initialReports={reports} />;
}
