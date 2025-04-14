-- AlterTable
ALTER TABLE "store" ADD COLUMN     "clientsId" INTEGER;

-- AddForeignKey
ALTER TABLE "store" ADD CONSTRAINT "store_clientsId_fkey" FOREIGN KEY ("clientsId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
