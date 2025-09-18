/*
  Warnings:

  - You are about to drop the column `status_category` on the `return_refund` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."return_refund" DROP COLUMN "status_category",
ADD COLUMN     "system_status" TEXT;
