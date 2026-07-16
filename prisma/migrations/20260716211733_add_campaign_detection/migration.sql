-- AlterTable
ALTER TABLE "Alert" ADD COLUMN     "campaignNote" TEXT,
ADD COLUMN     "isCampaign" BOOLEAN NOT NULL DEFAULT false;
