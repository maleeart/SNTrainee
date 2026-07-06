-- AlterTable
ALTER TABLE "Report" ADD COLUMN     "editReason" TEXT,
ADD COLUMN     "images" TEXT[] DEFAULT ARRAY[]::TEXT[];
