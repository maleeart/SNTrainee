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
// k    = ยิ่งมาก คนส่งน้อยยิ่งถูกดึงเข้าค่ากลางแรงขึ้น (ความน่าเชื่อถือ)
// floor= พื้นน้ำหนักปริมาณงาน 0.6 = "ปานกลาง" (ต่ำกว่านี้ปริมาณกลบคุณภาพ, สูงกว่านี้ปริมาณแทบไม่มีผล)
// prior= ค่ากลางที่ดึงเข้าหา (กึ่งกลางสเกล 1-5)
// ponytail: ค่าปรับจูน — ปรับตามข้อมูลจริงหลังใช้งาน
export const SCORE_WEIGHT = { k: 5, floor: 0.6, prior: 3.0 };

// คะแนนถ่วงน้ำหนัก = shrinkage (ความน่าเชื่อถือ) × volume factor (ความขยัน เทียบคนส่งสูงสุด)
export function weightedScore(avg: number | null, n: number, nMax: number): number | null {
  if (avg == null || n <= 0) return null;
  const { k, floor, prior } = SCORE_WEIGHT;
  const shrunk = (n * avg + k * prior) / (n + k);
  const vf = floor + (1 - floor) * (nMax > 0 ? Math.min(1, n / nMax) : 1);
  return shrunk * vf;
}

// เกณฑ์ประเมิน 1-5 ต่อหัวข้อ
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
