-- CreateTable
CREATE TABLE "zdconnector" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "host" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "suncoAppId" TEXT NOT NULL,
    "suncoAppKey" TEXT NOT NULL,
    "suncoAppSecret" TEXT NOT NULL,
    "zdAPIToken" TEXT NOT NULL,
    "resource" TEXT,

    CONSTRAINT "zdconnector_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "omnicrm" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT,
    "type" TEXT,

    CONSTRAINT "omnicrm_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "zdconnector_host_key" ON "zdconnector"("host");
