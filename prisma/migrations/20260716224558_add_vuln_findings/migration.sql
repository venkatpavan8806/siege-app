-- CreateTable
CREATE TABLE "VulnFinding" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "finding" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VulnFinding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VulnFinding_assetId_checkedAt_idx" ON "VulnFinding"("assetId", "checkedAt");

-- AddForeignKey
ALTER TABLE "VulnFinding" ADD CONSTRAINT "VulnFinding_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
