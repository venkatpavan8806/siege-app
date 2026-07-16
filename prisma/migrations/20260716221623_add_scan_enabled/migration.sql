/*
  Warnings:

  - You are about to drop the column `campaignNote` on the `Alert` table. All the data in the column will be lost.
  - You are about to drop the column `isCampaign` on the `Alert` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Alert" DROP COLUMN "campaignNote",
DROP COLUMN "isCampaign";

-- AlterTable
ALTER TABLE "Asset" ADD COLUMN     "scanEnabled" BOOLEAN NOT NULL DEFAULT true;
