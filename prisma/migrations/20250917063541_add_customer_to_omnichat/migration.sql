/*
  Warnings:

  - You are about to drop the column `omnichat_userId` on the `omnichat` table. All the data in the column will be lost.
  - You are about to drop the column `omnichat_userId` on the `omnichat_line` table. All the data in the column will be lost.
  - You are about to drop the `omnichat_user` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `customersId` to the `omnichat` table without a default value. This is not possible if the table is not empty.
  - Added the required column `customersId` to the `omnichat_line` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."omnichat" DROP CONSTRAINT "omnichat_omnichat_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."omnichat_line" DROP CONSTRAINT "omnichat_line_omnichat_userId_fkey";

-- AlterTable
ALTER TABLE "public"."omnichat" DROP COLUMN "omnichat_userId",
ADD COLUMN     "customersId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "public"."omnichat_line" DROP COLUMN "omnichat_userId",
ADD COLUMN     "customersId" INTEGER NOT NULL;

-- DropTable
DROP TABLE "public"."omnichat_user";

-- AddForeignKey
ALTER TABLE "public"."omnichat" ADD CONSTRAINT "omnichat_customersId_fkey" FOREIGN KEY ("customersId") REFERENCES "public"."customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."omnichat_line" ADD CONSTRAINT "omnichat_line_customersId_fkey" FOREIGN KEY ("customersId") REFERENCES "public"."customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
