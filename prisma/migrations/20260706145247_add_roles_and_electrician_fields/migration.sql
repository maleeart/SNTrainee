-- CreateEnum
CREATE TYPE "Role" AS ENUM ('STUDENT', 'MENTOR', 'ADMIN', 'EXECUTIVE');

-- CreateEnum
CREATE TYPE "Level" AS ENUM ('PVC', 'PVS');

-- CreateEnum
CREATE TYPE "JobType" AS ENUM ('INSPECT', 'REPAIR', 'INSTALL', 'WIRING', 'OTHER');

-- CreateEnum
CREATE TYPE "SystemCategory" AS ENUM ('LIGHTING', 'OUTLET', 'CONTROL_PANEL', 'AIRCON', 'BACKUP_POWER', 'OTHER');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('PENDING_ASSIGN', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "Report" ADD COLUMN     "assignedMentorId" TEXT,
ADD COLUMN     "evaluatedAt" TIMESTAMP(3),
ADD COLUMN     "jobType" "JobType",
ADD COLUMN     "learned" TEXT,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "mentorComment" TEXT,
ADD COLUMN     "ppe" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "scores" JSONB,
ADD COLUMN     "status" "ReportStatus" NOT NULL DEFAULT 'PENDING_ASSIGN',
ADD COLUMN     "systemCategory" "SystemCategory",
ADD COLUMN     "tools" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "advisor" TEXT,
ADD COLUMN     "endDate" DATE,
ADD COLUMN     "level" "Level",
ADD COLUMN     "profileDone" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'STUDENT',
ADD COLUMN     "school" TEXT,
ADD COLUMN     "startDate" DATE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_assignedMentorId_fkey" FOREIGN KEY ("assignedMentorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
