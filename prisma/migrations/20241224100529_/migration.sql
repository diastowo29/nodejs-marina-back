/*
  Warnings:

  - A unique constraint covering the columns `[origin_id]` on the table `products_img` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "products_img_origin_id_key" ON "products_img"("origin_id");
