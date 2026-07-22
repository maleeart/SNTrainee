-- ขออนุมัติสิทธิ์: ผู้ใช้ใหม่เข้าไม่ได้จนกว่าแอดมินจะอนุมัติ
-- เพิ่มด้วย DEFAULT true ก่อน เพื่อให้แถวเดิมได้ true ทันที (ไม่ล็อกคนเดิมออกจากระบบ)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "approved" BOOLEAN NOT NULL DEFAULT true;
-- แล้วค่อยพลิก default ให้คนใหม่เป็น false
ALTER TABLE "User" ALTER COLUMN "approved" SET DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "requestedRole" "Role";
UPDATE "User" SET "approved" = true WHERE role = 'ADMIN';
