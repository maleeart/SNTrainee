// Run: node scripts/apply-eval-migration.mjs
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { neon } = require("@neondatabase/serverless");
const { config } = require("dotenv");

config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL);

async function run() {
  console.log("Applying evaluation table migration...");

  // Check if table already exists
  const exists = await sql`
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'Evaluation'
  `;
  console.log("Evaluation table exists:", exists.length > 0);

  // Create table
  await sql`
    CREATE TABLE IF NOT EXISTS "Evaluation" (
      "id" TEXT NOT NULL,
      "reportId" TEXT NOT NULL,
      "mentorId" TEXT NOT NULL,
      "scores" JSONB NOT NULL,
      "comment" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Evaluation_pkey" PRIMARY KEY ("id")
    )
  `;
  console.log("Table created (or already existed)");

  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "Evaluation_reportId_mentorId_key"
    ON "Evaluation"("reportId", "mentorId")
  `;
  console.log("Unique index OK");

  // Foreign keys — ignore if already exist
  try {
    await sql`
      ALTER TABLE "Evaluation" ADD CONSTRAINT "Evaluation_reportId_fkey"
      FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE
    `;
    console.log("FK reportId added");
  } catch (e) { console.log("FK reportId already exists"); }

  try {
    await sql`
      ALTER TABLE "Evaluation" ADD CONSTRAINT "Evaluation_mentorId_fkey"
      FOREIGN KEY ("mentorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
    `;
    console.log("FK mentorId added");
  } catch (e) { console.log("FK mentorId already exists"); }

  // Remove old columns from Report if they exist
  for (const col of ["assignedMentorId", "mentorComment", "scores", "evaluatedAt"]) {
    try {
      await sql`ALTER TABLE "Report" DROP COLUMN IF EXISTS ${sql.unsafe(`"${col}"`)}`;
      console.log(`Dropped column Report.${col}`);
    } catch (e) { console.log(`Col ${col}:`, e.message); }
  }

  // Fix old status values
  try {
    await sql`UPDATE "Report" SET "status" = 'PENDING' WHERE "status"::text IN ('PENDING_ASSIGN','PENDING_APPROVAL')`;
    await sql`UPDATE "Report" SET "status" = 'SCORED'  WHERE "status"::text = 'APPROVED'`;
    console.log("Status values updated");
  } catch (e) { console.log("Status update:", e.message); }

  // Verify
  const cols = await sql`
    SELECT column_name FROM information_schema.columns WHERE table_name = 'Evaluation'
  `;
  console.log("Evaluation columns:", cols.map(c => c.column_name));
  console.log("Done!");
}

run().catch(e => { console.error(e); process.exit(1); });
