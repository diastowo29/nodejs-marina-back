/*
  Warnings:

  - A unique constraint covering the columns `[ordersId]` on the table `return_refund` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "return_refund_ordersId_key" ON "return_refund"("ordersId");
