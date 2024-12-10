/*
  Warnings:

  - You are about to drop the `Account` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Authenticator` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Session` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `VerificationToken` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `channel` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `chat` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `chat_line` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `chat_user` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `cred_channel` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `logistic` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `main_products` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ord_products` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `products_img` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `store` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `user` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `voucher` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Account" DROP CONSTRAINT "Account_userId_fkey";

-- DropForeignKey
ALTER TABLE "Authenticator" DROP CONSTRAINT "Authenticator_userId_fkey";

-- DropForeignKey
ALTER TABLE "Session" DROP CONSTRAINT "Session_userId_fkey";

-- DropForeignKey
ALTER TABLE "chat" DROP CONSTRAINT "chat_storeId_fkey";

-- DropForeignKey
ALTER TABLE "chat_line" DROP CONSTRAINT "chat_line_chatId_fkey";

-- DropForeignKey
ALTER TABLE "chat_line" DROP CONSTRAINT "chat_line_chat_userId_fkey";

-- DropForeignKey
ALTER TABLE "chat_line" DROP CONSTRAINT "chat_line_omnichat_userId_fkey";

-- DropForeignKey
ALTER TABLE "cred_channel" DROP CONSTRAINT "cred_channel_channelId_fkey";

-- DropForeignKey
ALTER TABLE "main_products" DROP CONSTRAINT "main_products_storeId_fkey";

-- DropForeignKey
ALTER TABLE "omnichat" DROP CONSTRAINT "omnichat_storeId_fkey";

-- DropForeignKey
ALTER TABLE "ord_products" DROP CONSTRAINT "ord_products_main_productsId_fkey";

-- DropForeignKey
ALTER TABLE "ord_products" DROP CONSTRAINT "ord_products_ordersId_fkey";

-- DropForeignKey
ALTER TABLE "orders" DROP CONSTRAINT "orders_logisticId_fkey";

-- DropForeignKey
ALTER TABLE "orders" DROP CONSTRAINT "orders_storeId_fkey";

-- DropForeignKey
ALTER TABLE "products_img" DROP CONSTRAINT "products_img_main_productsId_fkey";

-- DropForeignKey
ALTER TABLE "store" DROP CONSTRAINT "store_channelId_fkey";

-- DropForeignKey
ALTER TABLE "store" DROP CONSTRAINT "store_userId_fkey";

-- DropTable
DROP TABLE "Account";

-- DropTable
DROP TABLE "Authenticator";

-- DropTable
DROP TABLE "Session";

-- DropTable
DROP TABLE "VerificationToken";

-- DropTable
DROP TABLE "channel";

-- DropTable
DROP TABLE "chat";

-- DropTable
DROP TABLE "chat_line";

-- DropTable
DROP TABLE "chat_user";

-- DropTable
DROP TABLE "cred_channel";

-- DropTable
DROP TABLE "logistic";

-- DropTable
DROP TABLE "main_products";

-- DropTable
DROP TABLE "ord_products";

-- DropTable
DROP TABLE "products_img";

-- DropTable
DROP TABLE "store";

-- DropTable
DROP TABLE "user";

-- DropTable
DROP TABLE "voucher";
