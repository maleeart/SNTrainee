-- แยกสถานะ "ถูกปฏิเสธ" ออกจาก "ยังไม่ได้กด" เพื่อแจ้งผู้ใช้ที่หน้ารออนุมัติ
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "rejected" BOOLEAN NOT NULL DEFAULT false;
