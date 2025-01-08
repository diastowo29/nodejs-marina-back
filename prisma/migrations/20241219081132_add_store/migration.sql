-- AddForeignKey
ALTER TABLE "omnichat" ADD CONSTRAINT "omnichat_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "store"("id") ON DELETE SET NULL ON UPDATE CASCADE;
