/*
  Warnings:

  - You are about to drop the column `db_pass` on the `clients` table. All the data in the column will be lost.
  - You are about to drop the column `db_user` on the `clients` table. All the data in the column will be lost.
  - You are about to drop the column `org_id` on the `clients` table. All the data in the column will be lost.
  - You are about to drop the `stores` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[origin_id]` on the table `clients` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `name` to the `clients` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "stores" DROP CONSTRAINT "stores_clientsId_fkey";

-- DropIndex
DROP INDEX "clients_org_id_key";

-- AlterTable
ALTER TABLE "clients" DROP COLUMN "db_pass",
DROP COLUMN "db_user",
DROP COLUMN "org_id",
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "origin_id" TEXT;

-- DropTable
DROP TABLE "stores";

-- CreateTable
CREATE TABLE "customers" (
    "id" SERIAL NOT NULL,
    "name" TEXT,
    "origin_id" TEXT,
    "phone" TEXT,
    "email" TEXT,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products_img" (
    "id" SERIAL NOT NULL,
    "origin_id" TEXT,
    "filename" TEXT,
    "status" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "originalUrl" TEXT,
    "thumbnailUrl" TEXT,
    "productsId" INTEGER,

    CONSTRAINT "products_img_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "channel" (
    "id" SERIAL NOT NULL,
    "name" TEXT,
    "clientsId" INTEGER,

    CONSTRAINT "channel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store" (
    "id" SERIAL NOT NULL,
    "name" TEXT,
    "origin_id" TEXT,
    "channelId" INTEGER,
    "refresh_token" TEXT,
    "token" TEXT,
    "secondary_refresh_token" TEXT,
    "secondary_token" TEXT,
    "url" TEXT,
    "status" TEXT,

    CONSTRAINT "store_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" SERIAL NOT NULL,
    "origin_id" TEXT,
    "status" TEXT,
    "name" TEXT,
    "condition" INTEGER,
    "desc" TEXT,
    "category" INTEGER,
    "price" INTEGER,
    "currency" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "weight" INTEGER,
    "stock" INTEGER,
    "sku" TEXT,
    "storeId" INTEGER,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "qty" INTEGER NOT NULL,
    "package_id" TEXT,
    "invoice" TEXT,
    "total_price" INTEGER NOT NULL,
    "notes" TEXT,
    "ordersId" INTEGER,
    "productsId" INTEGER,
    "origin_id" TEXT,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "logistic" (
    "id" SERIAL NOT NULL,
    "name" TEXT,
    "type" TEXT,

    CONSTRAINT "logistic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT,
    "shop_id" TEXT,
    "payment_id" TEXT,
    "temp_id" TEXT,
    "origin_id" TEXT,
    "package_id" TEXT,
    "invoice" TEXT,
    "recp_name" TEXT,
    "recp_phone" TEXT,
    "recp_addr_full" TEXT,
    "recp_addr_district" TEXT,
    "recp_addr_city" TEXT,
    "recp_addr_province" TEXT,
    "recp_addr_country" TEXT,
    "recp_addr_postal_code" TEXT,
    "recp_addr_district_id" TEXT,
    "recp_addr_city_id" TEXT,
    "tracking_number" TEXT,
    "ship_document_url" TEXT,
    "recp_addr_province_id" TEXT,
    "recp_addr_geo" TEXT,
    "logistic_service" TEXT,
    "origin_createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accept_partial" BOOLEAN,
    "device" TEXT,
    "storeId" INTEGER,
    "customersId" INTEGER,
    "logisticId" INTEGER,
    "total_product_price" INTEGER,
    "shipping_price" INTEGER,
    "total_amount" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "omnichat_user" (
    "id" SERIAL NOT NULL,
    "username" TEXT,
    "thumbnailUrl" TEXT,
    "origin_id" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "externalId" TEXT,

    CONSTRAINT "omnichat_user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "omnichat" (
    "id" SERIAL NOT NULL,
    "origin_id" TEXT,
    "last_message" TEXT NOT NULL,
    "last_messageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "storeId" INTEGER,
    "omnichat_userId" INTEGER,
    "externalId" TEXT,

    CONSTRAINT "omnichat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "omnichat_line" (
    "id" SERIAL NOT NULL,
    "origin_id" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "line_text" TEXT NOT NULL,
    "omnichatId" INTEGER,
    "author" TEXT,
    "omnichat_userId" INTEGER,
    "chat_type" TEXT,

    CONSTRAINT "omnichat_line_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zdconnector" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "host" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "suncoAppId" TEXT NOT NULL,
    "suncoAppKey" TEXT NOT NULL,
    "suncoAppSecret" TEXT NOT NULL,
    "zdAPIToken" TEXT NOT NULL,
    "resource" TEXT,
    "clientsId" INTEGER,

    CONSTRAINT "zdconnector_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "omnicrm" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT,
    "type" TEXT,

    CONSTRAINT "omnicrm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credent" (
    "id" SERIAL NOT NULL,
    "key" TEXT,
    "value" TEXT,
    "integrationId" INTEGER,

    CONSTRAINT "credent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration" (
    "id" SERIAL NOT NULL,
    "name" TEXT,
    "baseUrl" TEXT,
    "f_chat" BOOLEAN,
    "f_review" BOOLEAN,
    "f_cancel" BOOLEAN,
    "f_rr" BOOLEAN,
    "clientsId" INTEGER,

    CONSTRAINT "integration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "return_line_item" (
    "id" SERIAL NOT NULL,
    "origin_id" TEXT,
    "refund_service_fee" INTEGER NOT NULL,
    "currency" TEXT,
    "refund_subtotal" INTEGER NOT NULL,
    "refund_total" INTEGER NOT NULL,
    "order_itemsId" INTEGER NOT NULL,
    "return_refundId" INTEGER,

    CONSTRAINT "return_line_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "return_refund" (
    "id" SERIAL NOT NULL,
    "origin_id" TEXT,
    "status" TEXT,
    "total_amount" INTEGER NOT NULL,
    "return_type" TEXT,
    "return_reason" TEXT,
    "ordersId" INTEGER NOT NULL,

    CONSTRAINT "return_refund_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "customers_origin_id_key" ON "customers"("origin_id");

-- CreateIndex
CREATE UNIQUE INDEX "products_img_origin_id_key" ON "products_img"("origin_id");

-- CreateIndex
CREATE UNIQUE INDEX "channel_name_key" ON "channel"("name");

-- CreateIndex
CREATE UNIQUE INDEX "store_origin_id_key" ON "store"("origin_id");

-- CreateIndex
CREATE UNIQUE INDEX "products_origin_id_key" ON "products"("origin_id");

-- CreateIndex
CREATE UNIQUE INDEX "order_items_origin_id_key" ON "order_items"("origin_id");

-- CreateIndex
CREATE UNIQUE INDEX "logistic_name_key" ON "logistic"("name");

-- CreateIndex
CREATE UNIQUE INDEX "orders_origin_id_key" ON "orders"("origin_id");

-- CreateIndex
CREATE UNIQUE INDEX "omnichat_user_origin_id_key" ON "omnichat_user"("origin_id");

-- CreateIndex
CREATE UNIQUE INDEX "omnichat_origin_id_key" ON "omnichat"("origin_id");

-- CreateIndex
CREATE UNIQUE INDEX "omnichat_line_origin_id_key" ON "omnichat_line"("origin_id");

-- CreateIndex
CREATE UNIQUE INDEX "zdconnector_host_key" ON "zdconnector"("host");

-- CreateIndex
CREATE UNIQUE INDEX "integration_baseUrl_key" ON "integration"("baseUrl");

-- CreateIndex
CREATE UNIQUE INDEX "return_line_item_origin_id_key" ON "return_line_item"("origin_id");

-- CreateIndex
CREATE UNIQUE INDEX "return_refund_origin_id_key" ON "return_refund"("origin_id");

-- CreateIndex
CREATE UNIQUE INDEX "return_refund_ordersId_key" ON "return_refund"("ordersId");

-- CreateIndex
CREATE UNIQUE INDEX "clients_origin_id_key" ON "clients"("origin_id");

-- AddForeignKey
ALTER TABLE "products_img" ADD CONSTRAINT "products_img_productsId_fkey" FOREIGN KEY ("productsId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "channel" ADD CONSTRAINT "channel_clientsId_fkey" FOREIGN KEY ("clientsId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store" ADD CONSTRAINT "store_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "channel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "store"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_ordersId_fkey" FOREIGN KEY ("ordersId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_productsId_fkey" FOREIGN KEY ("productsId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_customersId_fkey" FOREIGN KEY ("customersId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_logisticId_fkey" FOREIGN KEY ("logisticId") REFERENCES "logistic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "store"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "omnichat" ADD CONSTRAINT "omnichat_omnichat_userId_fkey" FOREIGN KEY ("omnichat_userId") REFERENCES "omnichat_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "omnichat" ADD CONSTRAINT "omnichat_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "store"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "omnichat_line" ADD CONSTRAINT "omnichat_line_omnichatId_fkey" FOREIGN KEY ("omnichatId") REFERENCES "omnichat"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "omnichat_line" ADD CONSTRAINT "omnichat_line_omnichat_userId_fkey" FOREIGN KEY ("omnichat_userId") REFERENCES "omnichat_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credent" ADD CONSTRAINT "credent_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "integration"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration" ADD CONSTRAINT "integration_clientsId_fkey" FOREIGN KEY ("clientsId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_line_item" ADD CONSTRAINT "return_line_item_order_itemsId_fkey" FOREIGN KEY ("order_itemsId") REFERENCES "order_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_line_item" ADD CONSTRAINT "return_line_item_return_refundId_fkey" FOREIGN KEY ("return_refundId") REFERENCES "return_refund"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_refund" ADD CONSTRAINT "return_refund_ordersId_fkey" FOREIGN KEY ("ordersId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
