-- AlterTable
ALTER TABLE "public"."products" ADD COLUMN     "pre_order" BOOLEAN;

-- CreateTable
CREATE TABLE "public"."varian" (
    "id" SERIAL NOT NULL,
    "origin_id" TEXT,
    "price" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT,
    "stock" INTEGER,
    "status" TEXT,
    "pre_order" BOOLEAN,
    "productsId" INTEGER NOT NULL,

    CONSTRAINT "varian_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "varian_origin_id_key" ON "public"."varian"("origin_id");

-- AddForeignKey
ALTER TABLE "public"."varian" ADD CONSTRAINT "varian_productsId_fkey" FOREIGN KEY ("productsId") REFERENCES "public"."products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
