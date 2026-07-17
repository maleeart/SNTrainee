import { requireUser } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import TrainingView from "@/components/TrainingView";

export default async function TrainingPage({ searchParams }: {
  searchParams: Promise<{ lesson?: string }>;
}) {
  const u = await requireUser();
  const uid = u.id;
  const { lesson: openLessonId } = await searchParams; // ?lesson=<id> → เปิดโจทย์นั้นเลย

  const courses = await prisma.course.findMany({
    orderBy: { order: "asc" },
    include: {
      lessons: {
        orderBy: { order: "asc" },
        include: {
          progress: { where: { userId: uid } },
          quiz: { include: { attempts: { where: { userId: uid }, orderBy: { score: "desc" }, take: 1 } } }
        }
      }
    }
  });

  // พี่เลี้ยงตั้งโจทย์เองได้ จึงต้องเห็นเฉลย — นักศึกษาห้ามเห็นเด็ดขาด
  const canSeeAnswers = u.role === "ADMIN" || u.role === "MENTOR";

  const data = courses.map(c => ({
    id: c.id, title: c.title, description: c.description, emoji: c.emoji, order: c.order,
    fieldQuiz: c.fieldQuiz,
    lessons: c.lessons.map(l => ({
      id: l.id, title: l.title, order: l.order,
      videoUrl: l.videoUrl, fileUrl: l.fileUrl, fileName: l.fileName,
      completed: l.progress.length > 0 || (l.quiz?.attempts[0]?.passed ?? false),
      quiz: l.quiz ? {
        id: l.quiz.id, passScore: l.quiz.passScore,
        questions: (l.quiz.questions as { q: string; options: string[]; answer: number }[]).map(
          ({ q, options, answer }) => canSeeAnswers ? { q, options, answer } : { q, options }
        ),
        bestScore: l.quiz.attempts[0]?.score ?? null,
        passed: l.quiz.attempts[0]?.passed ?? false,
      } : null
    }))
  }));

  return <TrainingView initCourses={data} meId={uid} meRole={u.role} meName={u.name ?? ""} meImage={u.image ?? null} openLessonId={openLessonId ?? null} />;
}
