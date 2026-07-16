-- โจทย์หน้างาน (field quiz): เพิ่มคอลัมน์แบบ additive ล้วน ไม่กระทบข้อมูลเดิม

-- คอร์ส "โจทย์หน้างาน" (มีอันเดียว สร้างอัตโนมัติเมื่อมีคนตั้งโจทย์ครั้งแรก)
ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "fieldQuiz" BOOLEAN NOT NULL DEFAULT false;

-- ตั้งโจทย์เมื่อไหร่ / ใครตั้ง
ALTER TABLE "CourseLesson" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "CourseLesson" ADD COLUMN IF NOT EXISTS "createdById" TEXT;

DO $$ BEGIN
  ALTER TABLE "CourseLesson" ADD CONSTRAINT "CourseLesson_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- คอร์สโจทย์หน้างานมีได้อันเดียว
CREATE UNIQUE INDEX IF NOT EXISTS "Course_fieldQuiz_key" ON "Course" ("fieldQuiz") WHERE "fieldQuiz" = true;
