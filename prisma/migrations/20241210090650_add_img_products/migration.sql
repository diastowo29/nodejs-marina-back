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
    "storeId" TEXT,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "qty" INTEGER NOT NULL,
    "invoice" TEXT,
    "total_price" INTEGER NOT NULL,
    "notes" TEXT,
    "ordersId" INTEGER,
    "productsId" INTEGER,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "products_origin_id_key" ON "products"("origin_id");

-- AddForeignKey
ALTER TABLE "products_img" ADD CONSTRAINT "products_img_productsId_fkey" FOREIGN KEY ("productsId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_productsId_fkey" FOREIGN KEY ("productsId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_ordersId_fkey" FOREIGN KEY ("ordersId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
