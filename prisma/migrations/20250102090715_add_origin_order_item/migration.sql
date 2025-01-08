/*
  Warnings:

  - A unique constraint covering the columns `[origin_id]` on the table `order_items` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "origin_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "order_items_origin_id_key" ON "order_items"("origin_id");
