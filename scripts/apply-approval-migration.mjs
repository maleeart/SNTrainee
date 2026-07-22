// Run: node scripts/apply-approval-migration.mjs
// Additive ล้วน + idempotent — รันซ้ำได้ ไม่กระทบข้อมูลเดิม
//
// ⚠️ สำคัญ: ผู้ใช้ที่มีอยู่แล้วต้องถูกตั้ง approved = true ทั้งหมด
// ไม่งั้นทุกคน (รวมแอดมินเอง) จะโดนล็อกออกจากระบบทันทีที่ deploy
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { neon } = require("@neondatabase/serverless");
const { config } = require("dotenv");

config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL);

async function run() {
  console.log("Applying approval migration...");

  // เพิ่มแบบ DEFAULT true ก่อน เพื่อให้แถวเดิมทุกแถวได้ true ทันทีในคำสั่งเดียว
  // (ถ้า default false แล้วค่อย UPDATE จะมีช่วงที่ทุกคนโดนล็อกอยู่กลางคัน)
  await sql`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "approved" BOOLEAN NOT NULL DEFAULT true`;
  console.log("User.approved added (existing rows = true)");

  // แล้วค่อยเปลี่ยน default ให้ผู้ใช้ "ใหม่" เป็น false
  await sql`ALTER TABLE "User" ALTER COLUMN "approved" SET DEFAULT false`;
  console.log("User.approved default flipped to false for new signups");

  await sql`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "requestedRole" "Role"`;
  console.log("User.requestedRole OK");

  // กันเหนียว: แอดมินต้อง approved เสมอ
  await sql`UPDATE "User" SET "approved" = true WHERE role = 'ADMIN'`;

  const [{ total, pending }] = await sql`
    SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE NOT "approved")::int AS pending FROM "User"
  `;
  console.log(`Verified: ${total} users, ${pending} pending approval`);
  console.log("Done!");
}

run().catch(e => { console.error(e); process.exit(1); });
