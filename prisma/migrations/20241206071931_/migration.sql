/*
  Warnings:

  - A unique constraint covering the columns `[origin_id]` on the table `orders` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "orders_origin_id_key" ON "orders"("origin_id");
