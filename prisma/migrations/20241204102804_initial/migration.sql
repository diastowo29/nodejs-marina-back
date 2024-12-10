-- CreateTable
CREATE TABLE "channel" (
    "id" SERIAL NOT NULL,
    "name" TEXT,

    CONSTRAINT "channel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cred_channel" (
    "id" SERIAL NOT NULL,
    "clientId" TEXT,
    "clientSecret" TEXT,
    "accToken" TEXT,
    "appId" TEXT,
    "tokenType" TEXT,
    "channelId" INTEGER,

    CONSTRAINT "cred_channel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("provider","providerAccountId")
);

-- CreateTable
CREATE TABLE "Session" (
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VerificationToken_pkey" PRIMARY KEY ("identifier","token")
);

-- CreateTable
CREATE TABLE "Authenticator" (
    "credentialID" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "credentialPublicKey" TEXT NOT NULL,
    "counter" INTEGER NOT NULL,
    "credentialDeviceType" TEXT NOT NULL,
    "credentialBackedUp" BOOLEAN NOT NULL,
    "transports" TEXT,

    CONSTRAINT "Authenticator_pkey" PRIMARY KEY ("userId","credentialID")
);

-- CreateTable
CREATE TABLE "store" (
    "id" SERIAL NOT NULL,
    "name" TEXT,
    "identifier" TEXT,
    "origin_id" TEXT,
    "status" TEXT,
    "channelId" INTEGER,
    "userId" TEXT,

    CONSTRAINT "store_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" SERIAL NOT NULL,
    "name" TEXT,
    "origin_id" TEXT,
    "phone" TEXT,
    "email" TEXT,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

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
    "main_productsId" INTEGER,

    CONSTRAINT "products_img_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "main_products" (
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
    "storeId" INTEGER,

    CONSTRAINT "main_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ord_products" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "qty" INTEGER NOT NULL,
    "invoice" TEXT,
    "total_price" INTEGER NOT NULL,
    "notes" TEXT,
    "ordersId" INTEGER,
    "main_productsId" INTEGER,

    CONSTRAINT "ord_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "logistic" (
    "id" SERIAL NOT NULL,
    "name" TEXT,

    CONSTRAINT "logistic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voucher" (
    "id" SERIAL NOT NULL,
    "type" TEXT,
    "code" TEXT,

    CONSTRAINT "voucher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT,
    "shop_id" TEXT,
    "payment_id" TEXT,
    "origin_id" TEXT,
    "invoice" TEXT,
    "recp_name" TEXT,
    "recp_phone" TEXT,
    "recp_addr_full" TEXT,
    "recp_addr_district" TEXT,
    "recp_addr_city" TEXT,
    "recp_addr_province" TEXT,
    "recp_addr_country" TEXT,
    "recp_addr_postal_code" TEXT,
    "recp_addr_district_id" TEXT,
    "recp_addr_city_id" TEXT,
    "recp_addr_province_id" TEXT,
    "recp_addr_geo" TEXT,
    "logistic_service" TEXT,
    "origin_createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accept_partial" BOOLEAN NOT NULL,
    "device" TEXT,
    "storeId" INTEGER,
    "customersId" INTEGER,
    "logisticId" INTEGER,
    "total_product_price" INTEGER,
    "shipping_price" INTEGER,
    "total_amount" INTEGER,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat" (
    "id" SERIAL NOT NULL,
    "origin_id" TEXT,
    "storeId" INTEGER,

    CONSTRAINT "chat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_user" (
    "id" SERIAL NOT NULL,
    "username" TEXT,
    "thumbnailUrl" TEXT,
    "origin_id" TEXT,

    CONSTRAINT "chat_user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_line" (
    "id" SERIAL NOT NULL,
    "origin_id" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "line_text" TEXT NOT NULL,
    "chat_userId" INTEGER,
    "chatId" INTEGER,
    "omnichat_userId" INTEGER,

    CONSTRAINT "chat_line_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "omnichat_user" (
    "id" SERIAL NOT NULL,
    "username" TEXT,
    "thumbnailUrl" TEXT,
    "origin_id" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "omnichat_user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "omnichat" (
    "id" SERIAL NOT NULL,
    "origin_id" TEXT,
    "last_message" TEXT NOT NULL,
    "last_messageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "storeId" INTEGER,
    "omnichat_userId" INTEGER,

    CONSTRAINT "omnichat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "omnichat_line" (
    "id" SERIAL NOT NULL,
    "origin_id" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "line_text" TEXT NOT NULL,
    "omnichatId" INTEGER,
    "author" TEXT,
    "omnichat_userId" INTEGER,

    CONSTRAINT "omnichat_line_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "channel_name_key" ON "channel"("name");

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "Authenticator_credentialID_key" ON "Authenticator"("credentialID");

-- CreateIndex
CREATE UNIQUE INDEX "store_identifier_key" ON "store"("identifier");

-- CreateIndex
CREATE UNIQUE INDEX "store_origin_id_key" ON "store"("origin_id");

-- CreateIndex
CREATE UNIQUE INDEX "customers_origin_id_key" ON "customers"("origin_id");

-- CreateIndex
CREATE UNIQUE INDEX "main_products_origin_id_key" ON "main_products"("origin_id");

-- CreateIndex
CREATE UNIQUE INDEX "logistic_name_key" ON "logistic"("name");

-- CreateIndex
CREATE UNIQUE INDEX "chat_origin_id_key" ON "chat"("origin_id");

-- CreateIndex
CREATE UNIQUE INDEX "chat_user_origin_id_key" ON "chat_user"("origin_id");

-- CreateIndex
CREATE UNIQUE INDEX "chat_line_origin_id_key" ON "chat_line"("origin_id");

-- CreateIndex
CREATE UNIQUE INDEX "omnichat_user_origin_id_key" ON "omnichat_user"("origin_id");

-- CreateIndex
CREATE UNIQUE INDEX "omnichat_origin_id_key" ON "omnichat"("origin_id");

-- CreateIndex
CREATE UNIQUE INDEX "omnichat_line_origin_id_key" ON "omnichat_line"("origin_id");

-- AddForeignKey
ALTER TABLE "cred_channel" ADD CONSTRAINT "cred_channel_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "channel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Authenticator" ADD CONSTRAINT "Authenticator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store" ADD CONSTRAINT "store_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "channel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store" ADD CONSTRAINT "store_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products_img" ADD CONSTRAINT "products_img_main_productsId_fkey" FOREIGN KEY ("main_productsId") REFERENCES "main_products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "main_products" ADD CONSTRAINT "main_products_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "store"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ord_products" ADD CONSTRAINT "ord_products_main_productsId_fkey" FOREIGN KEY ("main_productsId") REFERENCES "main_products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ord_products" ADD CONSTRAINT "ord_products_ordersId_fkey" FOREIGN KEY ("ordersId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "store"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_customersId_fkey" FOREIGN KEY ("customersId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_logisticId_fkey" FOREIGN KEY ("logisticId") REFERENCES "logistic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat" ADD CONSTRAINT "chat_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "store"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_line" ADD CONSTRAINT "chat_line_chat_userId_fkey" FOREIGN KEY ("chat_userId") REFERENCES "chat_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_line" ADD CONSTRAINT "chat_line_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "chat"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_line" ADD CONSTRAINT "chat_line_omnichat_userId_fkey" FOREIGN KEY ("omnichat_userId") REFERENCES "omnichat_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "omnichat" ADD CONSTRAINT "omnichat_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "store"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "omnichat" ADD CONSTRAINT "omnichat_omnichat_userId_fkey" FOREIGN KEY ("omnichat_userId") REFERENCES "omnichat_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "omnichat_line" ADD CONSTRAINT "omnichat_line_omnichatId_fkey" FOREIGN KEY ("omnichatId") REFERENCES "omnichat"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "omnichat_line" ADD CONSTRAINT "omnichat_line_omnichat_userId_fkey" FOREIGN KEY ("omnichat_userId") REFERENCES "omnichat_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
