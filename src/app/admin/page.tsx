import { requireUser } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import AdminView from "@/components/AdminView";

export default async function AdminPage() {
  const u = await requireUser(["ADMIN", "EXECUTIVE"]);

  const [users, reports] = await Promise.all([
    prisma.user.findMany({ orderBy: { role: "asc" }, select: { id: true, name: true, email: true, image: true, role: true, level: true, school: true } }),
    prisma.report.findMany({
      orderBy: [{ status: "asc" }, { date: "desc" }],
      include: {
        user: { select: { name: true, level: true, school: true } },
        assignedMentor: { select: { name: true } },
      },
    }),
  ]);

  return (
    <AdminView
      readOnly={u.role === "EXECUTIVE"}
      meName={u.name ?? ""}
      users={JSON.parse(JSON.stringify(users))}
      reports={JSON.parse(JSON.stringify(reports))}
    />
  );
}
