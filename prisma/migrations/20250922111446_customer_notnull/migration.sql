-- DropForeignKey
ALTER TABLE "public"."omnichat" DROP CONSTRAINT "omnichat_customersId_fkey";

-- AlterTable
ALTER TABLE "public"."omnichat" ALTER COLUMN "customersId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."omnichat" ADD CONSTRAINT "omnichat_customersId_fkey" FOREIGN KEY ("customersId") REFERENCES "public"."customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
