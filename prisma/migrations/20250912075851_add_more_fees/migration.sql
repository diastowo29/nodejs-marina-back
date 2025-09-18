-- AlterTable
ALTER TABLE "public"."orders" ADD COLUMN     "buyer_service_fee" INTEGER,
ADD COLUMN     "handling_fee" INTEGER,
ADD COLUMN     "item_insurance_fee" INTEGER,
ADD COLUMN     "platform_discount" INTEGER,
ADD COLUMN     "shipping_insurance_fee" INTEGER,
ADD COLUMN     "shipping_platform_discount" INTEGER,
ADD COLUMN     "shipping_seller_discount" INTEGER;
