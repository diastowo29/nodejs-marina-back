/*
  Warnings:

  - A unique constraint covering the columns `[origin_id]` on the table `clients` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "clients" ADD COLUMN     "origin_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "clients_origin_id_key" ON "clients"("origin_id");
