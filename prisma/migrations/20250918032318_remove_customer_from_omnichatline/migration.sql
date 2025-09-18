/*
  Warnings:

  - You are about to drop the column `customersId` on the `omnichat_line` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."omnichat_line" DROP CONSTRAINT "omnichat_line_customersId_fkey";

-- AlterTable
ALTER TABLE "public"."omnichat_line" DROP COLUMN "customersId";
