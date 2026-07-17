-- DropIndex
DROP INDEX "Snapshot_assetId_capturedAt_idx";

-- AlterTable
ALTER TABLE "Alert" ADD COLUMN     "sourceUrl" TEXT;

-- AlterTable
ALTER TABLE "Snapshot" ADD COLUMN     "sourceUrl" TEXT;

-- CreateIndex
CREATE INDEX "Snapshot_assetId_sourceUrl_capturedAt_idx" ON "Snapshot"("assetId", "sourceUrl", "capturedAt");
