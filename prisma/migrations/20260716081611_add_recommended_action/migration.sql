-- AlterTable
ALTER TABLE "Alert" ADD COLUMN     "recommendedAction" TEXT NOT NULL DEFAULT 'Not assessed — generated before this field existed';
