-- CreateTable
CREATE TABLE "logistic" (
    "id" SERIAL NOT NULL,
    "name" TEXT,

    CONSTRAINT "logistic_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "logistic_name_key" ON "logistic"("name");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_logisticId_fkey" FOREIGN KEY ("logisticId") REFERENCES "logistic"("id") ON DELETE SET NULL ON UPDATE CASCADE;
