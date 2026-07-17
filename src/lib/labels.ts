export const ROLE_LABEL: Record<string, string> = {
  STUDENT: "นักศึกษาฝึกงาน",
  MENTOR: "พี่เลี้ยง",
  ADMIN: "ผู้ดูแลระบบ",
  EXECUTIVE: "ผู้สังเกตการณ์",
};

export const LEVEL_LABEL: Record<string, string> = {
  PVC: "ปวช.",
  PVS: "ปวส.",
};

export const JOB_TYPE_LABEL: Record<string, string> = {
  INSPECT: "ตรวจสอบ",
  REPAIR: "ซ่อมบำรุง",
  INSTALL: "ติดตั้ง",
  WIRING: "เดินสาย",
  OTHER: "อื่นๆ",
};

export const SYSTEM_LABEL: Record<string, string> = {
  LIGHTING: "ระบบแสงสว่าง",
  OUTLET: "เต้ารับ/ปลั๊ก",
  CONTROL_PANEL: "ตู้ควบคุม (MDB/DB)",
  AIRCON: "เครื่องปรับอากาศ",
  BACKUP_POWER: "ระบบสำรองไฟ",
  OTHER: "อื่นๆ",
};

export const STATUS_LABEL: Record<string, string> = {
  PENDING: "รอประเมิน",
  SCORED:  "ประเมินแล้ว",
};

export const STATUS_COLOR: Record<string, string> = {
  PENDING: "bg-gray-100 text-gray-600",
  SCORED:  "bg-blue-100 text-blue-700",
};

// ปุ่มปรับจูนการถ่วงน้ำหนักคะแนนตามจำนวนรายงาน (ใช้เฉพาะตาราง/กราฟจัดอันดับ Admin)
// k        = ยิ่งมาก คนส่งน้อยยิ่งถูกดึงเข้าค่ากลางแรงขึ้น (ความน่าเชื่อถือ)
// floor    = พื้นน้ำหนักปริมาณงาน 0.6 = "ปานกลาง" (ต่ำกว่านี้ปริมาณกลบคุณภาพ, สูงกว่านี้ปริมาณแทบไม่มีผล)
// prior    = ค่ากลางที่ดึงเข้าหา (กึ่งกลางสเกล 1-5)
// passRatio= เกณฑ์ผ่าน = 80% ของจำนวนรายงานสูงสุดในกลุ่ม
// ponytail: ค่าปรับจูน — ปรับตามข้อมูลจริงหลังใช้งาน
export const SCORE_WEIGHT = { k: 5, floor: 0.6, prior: 3.0, passRatio: 0.8 };

// เส้นผ่าน = 80% ของคนที่ส่งรายงานสูงสุด (ปัดขึ้น)
export function passBar(nMax: number): number {
  return Math.ceil(SCORE_WEIGHT.passRatio * Math.max(0, nMax));
}

// คะแนนถ่วงน้ำหนัก = shrinkage (ความน่าเชื่อถือ) × volume factor (ความขยัน)
// volume factor เต็ม 1.0 เมื่อส่งถึง "เส้นผ่าน" — ไม่ต้องไล่ตามคนที่ส่งสูงสุด
// และส่งเกินเส้นไม่ได้แต้มเพิ่ม → ปั่นรายงานขยะเพื่อไต่อันดับไม่ได้
export function weightedScore(avg: number | null, n: number, nMax: number): number | null {
  if (avg == null || n <= 0) return null;
  const { k, floor, prior } = SCORE_WEIGHT;
  const shrunk = (n * avg + k * prior) / (n + k);
  const bar = passBar(nMax);
  const vf = floor + (1 - floor) * (bar > 0 ? Math.min(1, n / bar) : 1);
  return shrunk * vf;
}

// โบนัส quiz "โจทย์หน้างาน" — เสริมทับคะแนนพี่เลี้ยง บวกได้อย่างเดียว ไม่มีทางติดลบ
// ไม่มีโจทย์ในช่วงที่เขาฝึก → null → คะแนนเท่าเดิมเป๊ะ
// มีโจทย์แต่ไม่ทำ → นับ 0 (ได้โบนัสน้อยลง แต่ไม่ต่ำกว่าที่พี่เลี้ยงให้)
export const QUIZ_BONUS_MAX = 0.5;

export type FieldQuizScore = { createdAt: string; firstScores: Record<string, number> };

// เฉลี่ยคะแนน "ครั้งแรก" 0-100 ของโจทย์ที่ตั้งช่วงที่นักศึกษาคนนี้ฝึกอยู่
// ⚠️ ตัวหาร = โจทย์ทั้งหมดที่นับ ไม่ใช่จำนวนข้อที่ทำ — ห้ามเปลี่ยนเป็นเฉลี่ยเฉพาะข้อที่ทำ
//    ไม่งั้นเด็กทำข้อง่ายข้อเดียวได้ 100% แล้วรับโบนัสเต็ม (ทำข้อเดียวจะชนะทำครบ)
export function quizAvgFor(
  studentId: string, startDate: string | null | undefined, endDate: string | null | undefined,
  quizzes: FieldQuizScore[],
): number | null {
  const from = startDate?.slice(0, 10);
  const to = endDate?.slice(0, 10);
  const mine = quizzes.filter(q => {
    const d = q.createdAt.slice(0, 10);
    return (!from || d >= from) && (!to || d <= to);
  });
  if (!mine.length) return null; // ไม่มีโจทย์ในช่วงของเขา → ไม่มีโบนัส ไม่กระทบ
  return mine.reduce((sum, q) => sum + (q.firstScores[studentId] ?? 0), 0) / mine.length;
}

export function quizBonus(quizAvg: number | null): number {
  if (quizAvg == null) return 0;
  return (Math.min(100, Math.max(0, quizAvg)) / 100) * QUIZ_BONUS_MAX;
}

// คะแนนดิบหลังเสริม quiz — ตัดที่ 5.00 เพื่อคงสเกล 1-5
export function withQuizBonus(mentorAvg: number | null, quizAvg: number | null): number | null {
  if (mentorAvg == null) return null;
  return Math.min(5, mentorAvg + quizBonus(quizAvg));
}

// เกณฑ์ประเมิน 1-5 ต่อหัวข้อ
// ⚠️ array นี้สร้างฟอร์มให้พี่เลี้ยงกรอกคะแนน — ห้ามเติม "ความรู้/quiz" เข้ามา
// เพราะ quiz มาจากระบบอัตโนมัติ ไม่ใช่สิ่งที่พี่เลี้ยงนั่งให้คะแนนเอง
export const SCORE_CRITERIA: { key: string; label: string }[] = [
  { key: "skill", label: "ความรู้/ทักษะวิชาชีพ" },
  { key: "safety", label: "ความปลอดภัย (PPE/ขั้นตอน)" },
  { key: "responsibility", label: "ความรับผิดชอบ/ตรงเวลา" },
  { key: "quality", label: "คุณภาพงาน" },
  { key: "report", label: "คุณภาพการรายงาน" },
];

export const PPE_OPTIONS = [
  "สวมอุปกรณ์ป้องกัน (ถุงมือ/แว่น/รองเท้า)",
  "ตัดเบรกเกอร์ก่อนปฏิบัติงาน",
  "ตรวจสอบไฟดับด้วยเครื่องมือ",
  "ติดป้ายเตือน/ล็อกเอาต์",
  "มีผู้ควบคุมดูแล",
];
