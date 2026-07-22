import { requireUser } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { SCHOOL_PRESETS } from "@/lib/labels";
import AdminView from "@/components/AdminView";

export default async function AdminPage() {
  const u = await requireUser(["ADMIN", "EXECUTIVE"]);

  const me = await prisma.user.findUnique({
    where: { id: u.id },
    select: { nickname: true, email: true },
  });

  const [users, reports, fieldLessons] = await Promise.all([
    prisma.user.findMany({
      orderBy: { role: "asc" },
      select: { id: true, name: true, nickname: true, email: true, image: true, role: true, level: true, school: true, advisor: true, startDate: true, endDate: true, profileDone: true, approved: true, requestedRole: true, rejected: true },
    }),
    prisma.report.findMany({
      orderBy: [{ status: "asc" }, { date: "desc" }],
      include: {
        user: { select: { id: true, name: true, nickname: true, level: true, school: true } },
        evaluations: { include: { mentor: { select: { id: true, name: true, nickname: true } } } },
      },
    }),
    // โจทย์หน้างาน + ความพยายาม "ครั้งแรก" ของแต่ละคน (ครั้งหลังไม่นับคะแนน)
    prisma.courseLesson.findMany({
      where: { course: { fieldQuiz: true }, quiz: { isNot: null } },
      select: {
        id: true, title: true, createdAt: true,
        quiz: { select: { attempts: { orderBy: { createdAt: "asc" }, select: { userId: true, score: true, createdAt: true } } } },
      },
    }),
  ]);

  // เก็บเฉพาะครั้งแรกต่อคนต่อโจทย์
  const quizzes = fieldLessons.map(l => {
    const first: Record<string, number> = {};
    for (const a of l.quiz?.attempts ?? []) if (!(a.userId in first)) first[a.userId] = a.score;
    return { id: l.id, title: l.title, createdAt: l.createdAt.toISOString(), firstScores: first };
  });

  return (
    <AdminView
      readOnly={u.role === "EXECUTIVE"}
      meId={u.id}
      meName={u.name ?? ""}
      meNickname={me?.nickname}
      meEmail={me?.email}
      meImage={u.image}
      users={JSON.parse(JSON.stringify(users))}
      reports={JSON.parse(JSON.stringify(reports))}
      quizzes={JSON.parse(JSON.stringify(quizzes))}
      schools={SCHOOL_PRESETS}
    />
  );
}
