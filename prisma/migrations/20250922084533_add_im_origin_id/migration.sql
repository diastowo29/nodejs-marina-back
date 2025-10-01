/*
  Warnings:

  - A unique constraint covering the columns `[im_origin_id]` on the table `customers` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."customers" ADD COLUMN     "im_origin_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "customers_im_origin_id_key" ON "public"."customers"("im_origin_id");
