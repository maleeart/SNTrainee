// Test creating an evaluation directly via Prisma
// Run: node scripts/test-eval.mjs
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { config } = require("dotenv");
config({ path: ".env.local" });

// Use neon directly to avoid Prisma issues
const { neon } = require("@neondatabase/serverless");
const sql = neon(process.env.DATABASE_URL);

async function run() {
  // Find a real reportId and mentorId to test with
  const reports = await sql`SELECT id, "userId", status FROM "Report" LIMIT 3`;
  console.log("Reports:", reports);

  const mentors = await sql`SELECT id, name, role FROM "User" WHERE role IN ('MENTOR','ADMIN') LIMIT 3`;
  console.log("Mentors:", mentors);

  if (!reports.length || !mentors.length) {
    console.log("No test data available");
    return;
  }

  const reportId = reports[0].id;
  const mentorId = mentors[0].id;
  console.log(`\nTesting insert eval: reportId=${reportId} mentorId=${mentorId}`);

  const evalId = `test_${Date.now()}`;
  const scores = { skill: 4, safety: 4, responsibility: 4, quality: 4, report: 4 };

  try {
    // Test plain INSERT
    const res = await sql`
      INSERT INTO "Evaluation" (id, "reportId", "mentorId", scores, comment, "createdAt", "updatedAt")
      VALUES (${evalId}, ${reportId}, ${mentorId}, ${JSON.stringify(scores)}, null, NOW(), NOW())
      ON CONFLICT ("reportId", "mentorId") DO UPDATE SET scores = EXCLUDED.scores, "updatedAt" = NOW()
      RETURNING id
    `;
    console.log("INSERT OK:", res);

    // Clean up
    await sql`DELETE FROM "Evaluation" WHERE id = ${evalId}`;
    console.log("Cleanup OK");
  } catch (e) {
    console.error("INSERT error:", e.message);
  }
}

run().catch(e => { console.error(e); process.exit(1); });
