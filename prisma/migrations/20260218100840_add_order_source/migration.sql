-- CreateEnum
CREATE TYPE "OrderSource" AS ENUM ('WEBSITE', 'POS', 'MOBILE');

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "source" "OrderSource" NOT NULL DEFAULT 'POS';
