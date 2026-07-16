// Run: node scripts/apply-field-quiz-migration.mjs
// Additive ล้วน + idempotent — รันซ้ำได้ ไม่กระทบข้อมูลเดิม
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { neon } = require("@neondatabase/serverless");
const { config } = require("dotenv");

config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL);

async function run() {
  console.log("Applying field-quiz migration...");

  await sql`ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "fieldQuiz" BOOLEAN NOT NULL DEFAULT false`;
  console.log("Course.fieldQuiz OK");

  await sql`ALTER TABLE "CourseLesson" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP`;
  await sql`ALTER TABLE "CourseLesson" ADD COLUMN IF NOT EXISTS "createdById" TEXT`;
  console.log("CourseLesson.createdAt / createdById OK");

  try {
    await sql`
      ALTER TABLE "CourseLesson" ADD CONSTRAINT "CourseLesson_createdById_fkey"
      FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
    `;
    console.log("FK createdById added");
  } catch { console.log("FK createdById already exists"); }

  // คอร์ส "โจทย์หน้างาน" มีได้อันเดียว
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS "Course_fieldQuiz_key" ON "Course" ("fieldQuiz") WHERE "fieldQuiz" = true`;
  console.log("Partial unique index OK");

  const cols = await sql`
    SELECT table_name, column_name FROM information_schema.columns
    WHERE (table_name = 'Course' AND column_name = 'fieldQuiz')
       OR (table_name = 'CourseLesson' AND column_name IN ('createdAt','createdById'))
    ORDER BY table_name, column_name
  `;
  console.log("Verified:", cols.map(c => `${c.table_name}.${c.column_name}`));
  console.log("Done!");
}

run().catch(e => { console.error(e); process.exit(1); });
