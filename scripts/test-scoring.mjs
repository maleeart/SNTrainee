// เช็คตรรกะคะแนน — รัน: node scripts/test-scoring.mjs
// กันสูตรพังเงียบๆ เวลามีคนไปปรับ SCORE_WEIGHT / QUIZ_BONUS_MAX
import assert from "node:assert/strict";
import { weightedScore, passBar, withQuizBonus, quizAvgFor, quizBonus, SCORE_WEIGHT } from "../src/lib/labels.ts";

const nMax = 25;
const near = (a, b) => Math.abs(a - b) < 1e-9;

// ── เส้นผ่าน = 80% ของคนส่งสูงสุด ──────────────────────────────────────────
assert.equal(passBar(25), 20);
assert.equal(passBar(23), 19); // ปัดขึ้น
assert.equal(passBar(0), 0);

// ── ปัญหาตั้งต้น: คนส่ง 2 ฉบับได้ 4.8 ต้องแพ้คนส่ง 25 ฉบับได้ 4.2 ──────────
const few = weightedScore(4.8, 2, nMax);
const many = weightedScore(4.2, 25, nMax);
assert.ok(many > few, `คนส่งเยอะต้องชนะ: ${many} vs ${few}`);

// ── ส่งถึงเส้นผ่าน (20) ได้ volume factor เต็มเท่าคนส่งสูงสุด (25) ──────────
// ที่คะแนนดิบเท่ากัน ส่วนต่างต้องมาจาก shrinkage เท่านั้น ไม่ใช่ vf
const atBar = weightedScore(4.0, 20, nMax);
const atMax = weightedScore(4.0, 25, nMax);
const shrunk = (n, avg) => (n * avg + SCORE_WEIGHT.k * SCORE_WEIGHT.prior) / (n + SCORE_WEIGHT.k);
assert.ok(near(atBar, shrunk(20, 4.0)), "ถึงเส้นผ่านแล้ว vf ต้องเป็น 1.0");
assert.ok(near(atMax, shrunk(25, 4.0)), "เกินเส้นผ่าน vf ต้องยังเป็น 1.0 ไม่เกิน");

// ── ถ่วงน้ำหนักต้องไม่เคยพองเกินคะแนนดิบ (ปั่นรายงานไม่ทำให้คะแนนเฟ้อ) ────
for (const n of [1, 5, 20, 25, 100]) {
  assert.ok(weightedScore(4.5, n, nMax) <= 4.5 + 1e-9, `n=${n} ห้ามเกินคะแนนดิบ`);
}

// ── โบนัส quiz: บวกได้อย่างเดียว ไม่มีทางติดลบ ─────────────────────────────
assert.equal(withQuizBonus(4.0, null), 4.0, "ไม่มีโจทย์ = ไม่กระทบ");
assert.equal(withQuizBonus(4.0, 0), 4.0, "มีโจทย์แต่ไม่ทำ = ไม่โดนลงโทษ");
assert.ok(near(withQuizBonus(4.0, 100), 4.5), "quiz เต็ม = +0.5");
assert.ok(near(withQuizBonus(4.0, 50), 4.25), "quiz ครึ่ง = +0.25");
assert.equal(withQuizBonus(4.8, 100), 5.0, "ต้องตัดที่ 5.00");
assert.equal(withQuizBonus(null, 100), null, "ยังไม่ถูกประเมิน = ไม่มีคะแนน");

// ทำ quiz ห่วยยังไงก็ต้องไม่แย่กว่าไม่ทำ — ตัวกันไม่ให้เด็กเลี่ยงทำ
for (const q of [0, 10, 40, 70, 100]) {
  assert.ok(withQuizBonus(4.0, q) >= withQuizBonus(4.0, 0), `quiz=${q} ต้องไม่แย่กว่าไม่ทำ`);
}

// ── quizAvgFor: ทำข้อเดียวต้องไม่ได้โบนัสเยอะกว่าทำครบ ────────────────────
// ตัวหาร = โจทย์ทั้งหมด ไม่ใช่ข้อที่ทำ ถ้ามีคนแก้เป็นเฉลี่ยเฉพาะข้อที่ทำ เทสต์ชุดนี้ต้องแดง
const S = "stu1";
const win = { startDate: "2026-01-01", endDate: "2026-12-31" };
const mk = (day, scores) => ({ createdAt: `2026-03-${day}T00:00:00.000Z`, firstScores: scores });

const oneOnly    = [mk("01", { [S]: 100 }), mk("02", {}), mk("03", {})];          // ทำข้อเดียว เต็ม
const allMedium  = [mk("01", { [S]: 100 }), mk("02", { [S]: 40 }), mk("03", { [S]: 40 })];
const allPerfect = [mk("01", { [S]: 100 }), mk("02", { [S]: 100 }), mk("03", { [S]: 100 })];
const allBadTail = [mk("01", { [S]: 100 }), mk("02", { [S]: 0 }), mk("03", { [S]: 0 })];

const avgOf = qs => quizAvgFor(S, win.startDate, win.endDate, qs);
assert.ok(near(avgOf(oneOnly), 100 / 3), "ทำข้อเดียว: ตัวหารต้องเป็น 3 ไม่ใช่ 1");
assert.equal(avgOf(allPerfect), 100);
assert.equal(avgOf(allMedium), 60);

assert.ok(quizBonus(avgOf(oneOnly)) < quizBonus(avgOf(allMedium)),
  "ทำข้อเดียวเต็ม ต้องได้โบนัสน้อยกว่าทำครบแบบกลางๆ");
assert.ok(quizBonus(avgOf(oneOnly)) < quizBonus(avgOf(allPerfect)),
  "ทำข้อเดียว ต้องได้โบนัสน้อยกว่าทำครบ");
assert.ok(near(quizBonus(avgOf(allBadTail)), quizBonus(avgOf(oneOnly))),
  "ทำเพิ่มแล้วผิดหมด ต้องไม่แย่กว่าไม่ทำ (เท่ากันพอดี)");

// นับเฉพาะโจทย์ที่ตั้งในช่วงที่เขาฝึกอยู่
assert.equal(quizAvgFor(S, "2026-06-01", "2026-12-31", oneOnly), null, "โจทย์ก่อนเขาเข้ามา ต้องไม่นับ");
assert.equal(quizAvgFor(S, null, null, []), null, "ไม่มีโจทย์เลย = ไม่มีโบนัส");
assert.equal(withQuizBonus(4.0, quizAvgFor(S, "2026-06-01", "2026-12-31", oneOnly)), 4.0,
  "ไม่มีโจทย์ในช่วงของเขา → คะแนนเท่าเดิมเป๊ะ");

console.log("✅ ตรรกะคะแนนผ่านทั้งหมด");
