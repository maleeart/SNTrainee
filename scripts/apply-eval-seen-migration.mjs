// Run: node scripts/apply-eval-seen-migration.mjs
// Additive ล้วน + idempotent — รันซ้ำได้ ไม่กระทบข้อมูลเดิม
// DEFAULT CURRENT_TIMESTAMP ทำให้ user เดิมเริ่มนับจาก "ตอนนี้" ไม่เด้งผลประเมินเก่าย้อนหลังทั้งกอง
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { neon } = require("@neondatabase/serverless");
const { config } = require("dotenv");

config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL);

async function run() {
  console.log("Applying eval-seen migration...");

  await sql`
    ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "reportsSeenAt"
    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  `;
  console.log("User.reportsSeenAt OK");

  const cols = await sql`
    SELECT column_name, data_type, is_nullable FROM information_schema.columns
    WHERE table_name = 'User' AND column_name = 'reportsSeenAt'
  `;
  console.log("Verified:", cols);
  console.log("Done!");
}

run().catch(e => { console.error(e); process.exit(1); });
