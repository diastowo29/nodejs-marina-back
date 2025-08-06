/*
  Warnings:

  - You are about to drop the column `name` on the `clients` table. All the data in the column will be lost.
  - You are about to drop the column `origin_id` on the `clients` table. All the data in the column will be lost.
  - You are about to drop the `channel` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `credent` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `customers` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `integration` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `logistic` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `omnichat` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `omnichat_line` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `omnichat_user` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `omnicrm` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `order_items` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `orders` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `products` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `products_img` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `return_line_item` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `return_refund` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `store` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `zdconnector` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[org_id]` on the table `clients` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[store_id]` on the table `clients` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `store_id` to the `clients` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "channel" DROP CONSTRAINT "channel_clientsId_fkey";

-- DropForeignKey
ALTER TABLE "credent" DROP CONSTRAINT "credent_integrationId_fkey";

-- DropForeignKey
ALTER TABLE "customers" DROP CONSTRAINT "customers_clientsId_fkey";

-- DropForeignKey
ALTER TABLE "integration" DROP CONSTRAINT "integration_clientsId_fkey";

-- DropForeignKey
ALTER TABLE "omnichat" DROP CONSTRAINT "omnichat_clientsId_fkey";

-- DropForeignKey
ALTER TABLE "omnichat" DROP CONSTRAINT "omnichat_omnichat_userId_fkey";

-- DropForeignKey
ALTER TABLE "omnichat" DROP CONSTRAINT "omnichat_storeId_fkey";

-- DropForeignKey
ALTER TABLE "omnichat_line" DROP CONSTRAINT "omnichat_line_omnichatId_fkey";

-- DropForeignKey
ALTER TABLE "omnichat_line" DROP CONSTRAINT "omnichat_line_omnichat_userId_fkey";

-- DropForeignKey
ALTER TABLE "omnichat_user" DROP CONSTRAINT "omnichat_user_clientsId_fkey";

-- DropForeignKey
ALTER TABLE "order_items" DROP CONSTRAINT "order_items_ordersId_fkey";

-- DropForeignKey
ALTER TABLE "order_items" DROP CONSTRAINT "order_items_productsId_fkey";

-- DropForeignKey
ALTER TABLE "orders" DROP CONSTRAINT "orders_clientsId_fkey";

-- DropForeignKey
ALTER TABLE "orders" DROP CONSTRAINT "orders_customersId_fkey";

-- DropForeignKey
ALTER TABLE "orders" DROP CONSTRAINT "orders_logisticId_fkey";

-- DropForeignKey
ALTER TABLE "orders" DROP CONSTRAINT "orders_storeId_fkey";

-- DropForeignKey
ALTER TABLE "products" DROP CONSTRAINT "products_clientsId_fkey";

-- DropForeignKey
ALTER TABLE "products" DROP CONSTRAINT "products_storeId_fkey";

-- DropForeignKey
ALTER TABLE "products_img" DROP CONSTRAINT "products_img_productsId_fkey";

-- DropForeignKey
ALTER TABLE "return_line_item" DROP CONSTRAINT "return_line_item_order_itemsId_fkey";

-- DropForeignKey
ALTER TABLE "return_line_item" DROP CONSTRAINT "return_line_item_return_refundId_fkey";

-- DropForeignKey
ALTER TABLE "return_refund" DROP CONSTRAINT "return_refund_ordersId_fkey";

-- DropForeignKey
ALTER TABLE "store" DROP CONSTRAINT "store_channelId_fkey";

-- DropForeignKey
ALTER TABLE "zdconnector" DROP CONSTRAINT "zdconnector_clientsId_fkey";

-- DropIndex
DROP INDEX "clients_origin_id_key";

-- AlterTable
ALTER TABLE "clients" DROP COLUMN "name",
DROP COLUMN "origin_id",
ADD COLUMN     "db_pass" TEXT,
ADD COLUMN     "db_user" TEXT,
ADD COLUMN     "org_id" TEXT,
ADD COLUMN     "store_id" TEXT NOT NULL;

-- DropTable
DROP TABLE "channel";

-- DropTable
DROP TABLE "credent";

-- DropTable
DROP TABLE "customers";

-- DropTable
DROP TABLE "integration";

-- DropTable
DROP TABLE "logistic";

-- DropTable
DROP TABLE "omnichat";

-- DropTable
DROP TABLE "omnichat_line";

-- DropTable
DROP TABLE "omnichat_user";

-- DropTable
DROP TABLE "omnicrm";

-- DropTable
DROP TABLE "order_items";

-- DropTable
DROP TABLE "orders";

-- DropTable
DROP TABLE "products";

-- DropTable
DROP TABLE "products_img";

-- DropTable
DROP TABLE "return_line_item";

-- DropTable
DROP TABLE "return_refund";

-- DropTable
DROP TABLE "store";

-- DropTable
DROP TABLE "zdconnector";

-- CreateIndex
CREATE UNIQUE INDEX "clients_org_id_key" ON "clients"("org_id");

-- CreateIndex
CREATE UNIQUE INDEX "clients_store_id_key" ON "clients"("store_id");
