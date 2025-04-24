/*
  Warnings:

  - You are about to drop the column `clientsId` on the `store` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "store" DROP CONSTRAINT "store_clientsId_fkey";

-- AlterTable
ALTER TABLE "store" DROP COLUMN "clientsId",
ADD COLUMN     "status" TEXT;
