-- Create Evaluation table if it doesn't already exist
CREATE TABLE IF NOT EXISTS "Evaluation" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "mentorId" TEXT NOT NULL,
    "scores" JSONB NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Evaluation_pkey" PRIMARY KEY ("id")
);

-- Unique constraint one eval per mentor per report
CREATE UNIQUE INDEX IF NOT EXISTS "Evaluation_reportId_mentorId_key" ON "Evaluation"("reportId", "mentorId");

-- Foreign keys
DO $$ BEGIN
    ALTER TABLE "Evaluation" ADD CONSTRAINT "Evaluation_reportId_fkey"
        FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "Evaluation" ADD CONSTRAINT "Evaluation_mentorId_fkey"
        FOREIGN KEY ("mentorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Remove old assignment/approval columns from Report if they exist
ALTER TABLE "Report" DROP COLUMN IF EXISTS "assignedMentorId";
ALTER TABLE "Report" DROP COLUMN IF EXISTS "mentorComment";
ALTER TABLE "Report" DROP COLUMN IF EXISTS "scores";
ALTER TABLE "Report" DROP COLUMN IF EXISTS "evaluatedAt";

-- Remove old enum values by renaming old statuses to PENDING if they exist
UPDATE "Report" SET "status" = 'PENDING'::"ReportStatus" WHERE "status"::text IN ('PENDING_ASSIGN', 'PENDING_APPROVAL');
UPDATE "Report" SET "status" = 'SCORED'::"ReportStatus" WHERE "status"::text = 'APPROVED';
