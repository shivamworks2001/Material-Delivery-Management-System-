-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "number" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "legalName" TEXT NOT NULL DEFAULT '',
    "displayName" TEXT NOT NULL DEFAULT '',
    "gstin" TEXT,
    "pan" TEXT,
    "category" TEXT NOT NULL DEFAULT '',
    "industry" TEXT NOT NULL DEFAULT '',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "duplicateKey" TEXT NOT NULL,
    "group" TEXT NOT NULL DEFAULT '',
    "salesperson" TEXT NOT NULL DEFAULT '',
    "source" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerContact" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "person" TEXT NOT NULL,
    "designation" TEXT NOT NULL DEFAULT '',
    "mobile" TEXT NOT NULL,
    "alternateMobile" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "website" TEXT NOT NULL DEFAULT '',
    "landline" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "CustomerContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerAddress" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "line1" TEXT NOT NULL,
    "line2" TEXT NOT NULL DEFAULT '',
    "country" TEXT NOT NULL DEFAULT 'India',
    "state" TEXT NOT NULL DEFAULT '',
    "district" TEXT NOT NULL DEFAULT '',
    "city" TEXT NOT NULL DEFAULT '',
    "pin" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "CustomerAddress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerFinancial" (
    "customerId" TEXT NOT NULL,
    "terms" TEXT NOT NULL DEFAULT 'Cash',
    "customTerms" TEXT NOT NULL DEFAULT '',
    "creditLimit" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "creditDays" INTEGER NOT NULL DEFAULT 0,
    "openingBalance" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "balanceType" TEXT NOT NULL DEFAULT 'Receivable',
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "tds" BOOLEAN NOT NULL DEFAULT false,
    "tdsDetails" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "CustomerFinancial_pkey" PRIMARY KEY ("customerId")
);

-- CreateTable
CREATE TABLE "CustomerProject" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "CustomerProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerLocation" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "projectId" TEXT,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "person" TEXT NOT NULL DEFAULT '',
    "mobile" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "pin" TEXT NOT NULL DEFAULT '',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "removed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "CustomerLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerDocument" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "content" BYTEA NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerHistory" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerSequence" (
    "id" INTEGER NOT NULL,
    "value" INTEGER NOT NULL,

    CONSTRAINT "CustomerSequence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Customer_number_key" ON "Customer"("number");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_code_key" ON "Customer"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_gstin_key" ON "Customer"("gstin");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_duplicateKey_key" ON "Customer"("duplicateKey");

-- CreateIndex
CREATE INDEX "Customer_name_idx" ON "Customer"("name");

-- CreateIndex
CREATE INDEX "Customer_active_category_type_idx" ON "Customer"("active", "category", "type");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerContact_customerId_key" ON "CustomerContact"("customerId");

-- CreateIndex
CREATE INDEX "CustomerContact_mobile_idx" ON "CustomerContact"("mobile");

-- CreateIndex
CREATE INDEX "CustomerContact_email_idx" ON "CustomerContact"("email");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerAddress_customerId_kind_key" ON "CustomerAddress"("customerId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerProject_customerId_name_key" ON "CustomerProject"("customerId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerProject_id_customerId_key" ON "CustomerProject"("id", "customerId");

-- CreateIndex
CREATE INDEX "CustomerLocation_customerId_active_idx" ON "CustomerLocation"("customerId", "active");

-- CreateIndex
CREATE INDEX "CustomerDocument_customerId_idx" ON "CustomerDocument"("customerId");

-- CreateIndex
CREATE INDEX "CustomerHistory_customerId_createdAt_idx" ON "CustomerHistory"("customerId", "createdAt");

-- AddForeignKey
ALTER TABLE "CustomerContact" ADD CONSTRAINT "CustomerContact_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerAddress" ADD CONSTRAINT "CustomerAddress_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerFinancial" ADD CONSTRAINT "CustomerFinancial_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerProject" ADD CONSTRAINT "CustomerProject_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerLocation" ADD CONSTRAINT "CustomerLocation_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerLocation" ADD CONSTRAINT "CustomerLocation_projectId_customerId_fkey" FOREIGN KEY ("projectId", "customerId") REFERENCES "CustomerProject"("id", "customerId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerDocument" ADD CONSTRAINT "CustomerDocument_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerHistory" ADD CONSTRAINT "CustomerHistory_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Keep customer data private: only the application database role accesses it.
REVOKE ALL ON "Customer", "CustomerContact", "CustomerAddress", "CustomerFinancial", "CustomerProject", "CustomerLocation", "CustomerDocument", "CustomerHistory", "CustomerSequence" FROM PUBLIC;
