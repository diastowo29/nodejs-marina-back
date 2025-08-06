/*
  Warnings:

  - You are about to drop the column `store_id` on the `clients` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "clients_store_id_key";

-- AlterTable
ALTER TABLE "clients" DROP COLUMN "store_id";

-- CreateTable
CREATE TABLE "stores" (
    "id" SERIAL NOT NULL,
    "origin_id" TEXT,
    "clientsId" INTEGER NOT NULL,

    CONSTRAINT "stores_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "stores_origin_id_key" ON "stores"("origin_id");

-- AddForeignKey
ALTER TABLE "stores" ADD CONSTRAINT "stores_clientsId_fkey" FOREIGN KEY ("clientsId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
