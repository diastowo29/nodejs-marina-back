/*
  Warnings:

  - You are about to drop the column `productsId` on the `varian` table. All the data in the column will be lost.
  - Added the required column `productsOriginId` to the `varian` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."varian" DROP CONSTRAINT "varian_productsId_fkey";

-- AlterTable
ALTER TABLE "public"."varian" DROP COLUMN "productsId",
ADD COLUMN     "productsOriginId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."varian" ADD CONSTRAINT "varian_productsOriginId_fkey" FOREIGN KEY ("productsOriginId") REFERENCES "public"."products"("origin_id") ON DELETE RESTRICT ON UPDATE CASCADE;
