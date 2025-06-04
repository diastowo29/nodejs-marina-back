-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "package_id" TEXT;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "package_id" TEXT;
