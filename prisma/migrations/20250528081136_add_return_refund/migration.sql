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
CREATE UNIQUE INDEX "return_line_item_origin_id_key" ON "return_line_item"("origin_id");

-- CreateIndex
CREATE UNIQUE INDEX "return_refund_origin_id_key" ON "return_refund"("origin_id");

-- AddForeignKey
ALTER TABLE "return_line_item" ADD CONSTRAINT "return_line_item_order_itemsId_fkey" FOREIGN KEY ("order_itemsId") REFERENCES "order_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_line_item" ADD CONSTRAINT "return_line_item_return_refundId_fkey" FOREIGN KEY ("return_refundId") REFERENCES "return_refund"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_refund" ADD CONSTRAINT "return_refund_ordersId_fkey" FOREIGN KEY ("ordersId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
