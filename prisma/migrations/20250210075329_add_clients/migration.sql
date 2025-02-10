-- AlterTable
ALTER TABLE "channel" ADD COLUMN     "clientsId" INTEGER;

-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "clientsId" INTEGER;

-- AlterTable
ALTER TABLE "omnichat" ADD COLUMN     "clientsId" INTEGER;

-- AlterTable
ALTER TABLE "omnichat_user" ADD COLUMN     "clientsId" INTEGER;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "clientsId" INTEGER;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "clientsId" INTEGER;

-- AlterTable
ALTER TABLE "zdconnector" ADD COLUMN     "clientsId" INTEGER;

-- CreateTable
CREATE TABLE "clients" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_clientsId_fkey" FOREIGN KEY ("clientsId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "channel" ADD CONSTRAINT "channel_clientsId_fkey" FOREIGN KEY ("clientsId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_clientsId_fkey" FOREIGN KEY ("clientsId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_clientsId_fkey" FOREIGN KEY ("clientsId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "omnichat_user" ADD CONSTRAINT "omnichat_user_clientsId_fkey" FOREIGN KEY ("clientsId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "omnichat" ADD CONSTRAINT "omnichat_clientsId_fkey" FOREIGN KEY ("clientsId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zdconnector" ADD CONSTRAINT "zdconnector_clientsId_fkey" FOREIGN KEY ("clientsId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
