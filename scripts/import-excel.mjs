// One-time import script: for one time import.xlsx → DB
// Run: node scripts/import-excel.mjs

import { createRequire } from "module";
const require = createRequire(import.meta.url);
const XLSX = require("../node_modules/xlsx/xlsx.js");
const { neon } = require("@neondatabase/serverless");
const { config } = require("dotenv");

config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL);

// name → userId mapping (including forced AO NG → พรพิพัฒน์ ขาวกมล)
const FORCED = { "AO NG": "พรพิพัฒน์ ขาวกมล" };

function normalize(s) {
  return (s ?? "")
    .replace(/[​‌‍﻿]/g, "") // strip zero-width chars
    .replace(/^(นาย|นางสาว|นาง|ด\.ช\.|ด\.ญ\.)\s*/u, "")
    .replace(/\s+/g, " ")
    .trim();
}

function excelDateToISO(serial) {
  return new Date(Math.round((serial - 25569) * 86400 * 1000)).toISOString().slice(0, 10);
}

async function main() {
  // 1. Load users
  const users = await sql`SELECT id, name FROM "User" WHERE role = 'STUDENT'`;
  // Apply forced mapping
  const nameToId = {};
  for (const u of users) {
    const displayName = FORCED[u.name] ?? u.name;
    nameToId[normalize(displayName)] = u.id;
    // also index original name
    nameToId[normalize(u.name)] = u.id;
  }

  console.log("Users in DB:", users.map(u => u.name));
  console.log("Name index:", Object.keys(nameToId));

  // 2. Load Excel
  const wb = XLSX.readFile("for one time import.xlsx");
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }).slice(1); // skip header

  let ok = 0, skip = 0;
  for (const row of rows) {
    const [timestamp, nameRaw, , , , title, col_g, col_h, col_i, col_j, col_k] = row;
    if (!timestamp || !nameRaw) continue;

    const date = excelDateToISO(timestamp);
    const normName = normalize(nameRaw);
    const userId = nameToId[normName];

    if (!userId) {
      console.warn(`⚠ ไม่พบผู้ใช้สำหรับ: "${nameRaw}" (normalized: "${normName}")`);
      skip++;
      continue;
    }

    const titleStr = (title ?? col_g ?? "").toString().slice(0, 200);
    const description = col_g ?? "";
    const learned = col_h ?? null;
    const solution = [col_i, col_j].filter(Boolean).join("\n") || null;
    const result = col_k ?? null;

    try {
      await sql`
        INSERT INTO "Report" (
          id, date, title, description, tasks, "jobType", "systemCategory",
          location, tools, ppe, learned, solution, result, images, "editReason",
          "userId", "assignedMentorId", status,
          "mentorComment", scores, "evaluatedAt", "createdAt", "updatedAt"
        ) VALUES (
          gen_random_uuid()::text,
          ${date}::date,
          ${titleStr},
          ${description.toString()},
          '{}', NULL, NULL, NULL, '{}', '{}',
          ${learned ? learned.toString() : null},
          ${solution},
          ${result ? result.toString() : null},
          '{}', NULL,
          ${userId},
          NULL,
          'PENDING_ASSIGN',
          NULL, NULL, NULL,
          NOW(), NOW()
        )
        ON CONFLICT ("userId", date) DO UPDATE SET
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          learned = EXCLUDED.learned,
          solution = EXCLUDED.solution,
          result = EXCLUDED.result,
          "updatedAt" = NOW()
      `;
      console.log(`✓ ${nameRaw} | ${date} | ${title}`);
      ok++;
    } catch (e) {
      console.error(`✗ ${nameRaw} | ${date}: ${e.message}`);
      skip++;
    }
  }

  console.log(`\nเสร็จ: ${ok} รายการ, ข้าม: ${skip} รายการ`);
}

main().catch(console.error);
