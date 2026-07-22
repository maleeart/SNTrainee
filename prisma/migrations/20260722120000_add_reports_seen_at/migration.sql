-- แจ้งเตือนผลประเมิน: เก็บแค่ timestamp เดียวต่อคน ไม่มีตาราง Notification ให้ข้อมูลบวม
-- DEFAULT CURRENT_TIMESTAMP → user เดิมเริ่มนับจากตอน migrate ไม่เด้งผลเก่าย้อนหลัง
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "reportsSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
