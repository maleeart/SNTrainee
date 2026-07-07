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
