-- CreateTable
CREATE TABLE "integration" (
    "id" SERIAL NOT NULL,
    "name" TEXT,
    "baseUrl" TEXT,
    "f_chat" BOOLEAN,
    "f_review" BOOLEAN,
    "f_cancel" BOOLEAN,
    "f_rr" BOOLEAN,
    "clientsId" INTEGER,

    CONSTRAINT "integration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credent" (
    "id" SERIAL NOT NULL,
    "key" TEXT,
    "value" TEXT,
    "integrationId" INTEGER,

    CONSTRAINT "credent_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "integration" ADD CONSTRAINT "integration_clientsId_fkey" FOREIGN KEY ("clientsId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credent" ADD CONSTRAINT "credent_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "integration"("id") ON DELETE SET NULL ON UPDATE CASCADE;
