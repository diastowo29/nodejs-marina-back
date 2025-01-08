-- AlterTable
ALTER TABLE "store" ADD COLUMN     "channelId" INTEGER;

-- CreateTable
CREATE TABLE "channel" (
    "id" SERIAL NOT NULL,
    "name" TEXT,

    CONSTRAINT "channel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "channel_name_key" ON "channel"("name");

-- AddForeignKey
ALTER TABLE "store" ADD CONSTRAINT "store_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "channel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
