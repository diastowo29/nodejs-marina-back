/*
  Warnings:

  - You are about to drop the column `order_itemsId` on the `return_line_item` table. All the data in the column will be lost.
  - Added the required column `order_itemsOriginId` to the `return_line_item` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."return_line_item" DROP CONSTRAINT "return_line_item_order_itemsId_fkey";

-- AlterTable
ALTER TABLE "public"."return_line_item" DROP COLUMN "order_itemsId",
ADD COLUMN     "order_itemsOriginId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."return_line_item" ADD CONSTRAINT "return_line_item_order_itemsOriginId_fkey" FOREIGN KEY ("order_itemsOriginId") REFERENCES "public"."order_items"("origin_id") ON DELETE RESTRICT ON UPDATE CASCADE;
