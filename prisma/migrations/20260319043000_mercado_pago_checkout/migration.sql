ALTER TYPE "OrderStatus" RENAME TO "OrderStatus_old";

CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'CANCELLED', 'REFUNDED');

ALTER TABLE "Order" ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "Order"
ALTER COLUMN "status" TYPE "OrderStatus"
USING (
  CASE
    WHEN "status"::text = 'PAID' THEN 'PAID'::"OrderStatus"
    WHEN "status"::text = 'CANCELED' THEN 'CANCELLED'::"OrderStatus"
    ELSE 'PENDING'::"OrderStatus"
  END
);

DROP TYPE "OrderStatus_old";

ALTER TABLE "Order" ALTER COLUMN "status" SET DEFAULT 'PENDING';

ALTER TYPE "PaymentStatus" RENAME TO "PaymentStatus_old";

CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'AUTHORIZED', 'PAID', 'FAILED', 'CANCELLED', 'REFUNDED');

ALTER TABLE "Order" ALTER COLUMN "paymentStatus" DROP DEFAULT;

ALTER TABLE "Order"
ALTER COLUMN "paymentStatus" TYPE "PaymentStatus"
USING (
  CASE
    WHEN "paymentStatus"::text = 'AUTHORIZED' THEN 'AUTHORIZED'::"PaymentStatus"
    WHEN "paymentStatus"::text = 'PAID' THEN 'PAID'::"PaymentStatus"
    WHEN "paymentStatus"::text = 'FAILED' THEN 'FAILED'::"PaymentStatus"
    WHEN "paymentStatus"::text = 'REFUNDED' THEN 'REFUNDED'::"PaymentStatus"
    ELSE 'PENDING'::"PaymentStatus"
  END
);

DROP TYPE "PaymentStatus_old";

ALTER TABLE "Order" ALTER COLUMN "paymentStatus" SET DEFAULT 'PENDING';

ALTER TABLE "Customer" ADD COLUMN "document" TEXT;

ALTER TABLE "Order"
ADD COLUMN "checkoutUrl" TEXT,
ADD COLUMN "couponRedeemedAt" TIMESTAMP(3),
ADD COLUMN "customerDocument" TEXT,
ADD COLUMN "customerEmail" TEXT NOT NULL DEFAULT '',
ADD COLUMN "customerName" TEXT NOT NULL DEFAULT '',
ADD COLUMN "customerPhone" TEXT NOT NULL DEFAULT '',
ADD COLUMN "externalReference" TEXT,
ADD COLUMN "inventoryCommittedAt" TIMESTAMP(3),
ADD COLUMN "merchantOrderId" TEXT,
ADD COLUMN "paidAt" TIMESTAMP(3),
ADD COLUMN "paymentId" TEXT,
ADD COLUMN "paymentPreferenceId" TEXT,
ADD COLUMN "paymentProvider" TEXT NOT NULL DEFAULT 'mercado_pago',
ADD COLUMN "paymentStatusDetail" TEXT;

ALTER TABLE "Order" ALTER COLUMN "paymentMethod" SET DEFAULT 'checkout_pro';

UPDATE "Customer"
SET "document" = '12345678901'
WHERE "email" = 'cliente@orbe.local' AND "document" IS NULL;

UPDATE "Order" o
SET
  "externalReference" = COALESCE(o."externalReference", o."number"),
  "customerName" = COALESCE(
    NULLIF(o."customerName", ''),
    (SELECT COALESCE(CONCAT_WS(' ', c."firstName", c."lastName"), c."firstName") FROM "Customer" c WHERE c."id" = o."customerId"),
    (SELECT a."recipientName" FROM "Address" a WHERE a."id" = o."addressId"),
    'Cliente'
  ),
  "customerEmail" = COALESCE(
    NULLIF(o."customerEmail", ''),
    (SELECT c."email" FROM "Customer" c WHERE c."id" = o."customerId"),
    'cliente@orbe.local'
  ),
  "customerPhone" = COALESCE(
    NULLIF(o."customerPhone", ''),
    (SELECT c."phone" FROM "Customer" c WHERE c."id" = o."customerId"),
    (SELECT a."phone" FROM "Address" a WHERE a."id" = o."addressId"),
    '0000000000'
  ),
  "customerDocument" = COALESCE(
    o."customerDocument",
    (SELECT c."document" FROM "Customer" c WHERE c."id" = o."customerId")
  ),
  "paymentPreferenceId" = COALESCE(o."paymentPreferenceId", 'pref-' || o."number"),
  "paymentId" = COALESCE(o."paymentId", 'payment-' || o."number"),
  "merchantOrderId" = COALESCE(o."merchantOrderId", 'merchant-' || o."number"),
  "paymentStatusDetail" = COALESCE(
    o."paymentStatusDetail",
    CASE WHEN o."paymentStatus"::text = 'PAID' THEN 'accredited' ELSE NULL END
  ),
  "paidAt" = COALESCE(
    o."paidAt",
    CASE WHEN o."paymentStatus"::text = 'PAID' THEN o."updatedAt" ELSE NULL END
  ),
  "couponRedeemedAt" = COALESCE(
    o."couponRedeemedAt",
    CASE
      WHEN o."couponId" IS NOT NULL AND o."paymentStatus"::text = 'PAID' THEN o."updatedAt"
      ELSE NULL
    END
  ),
  "inventoryCommittedAt" = COALESCE(
    o."inventoryCommittedAt",
    CASE WHEN o."status"::text = 'PAID' THEN o."updatedAt" ELSE NULL END
  );

ALTER TABLE "Order" ALTER COLUMN "customerName" DROP DEFAULT;
ALTER TABLE "Order" ALTER COLUMN "customerEmail" DROP DEFAULT;
ALTER TABLE "Order" ALTER COLUMN "customerPhone" DROP DEFAULT;

CREATE TABLE "WebhookEvent" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "topic" TEXT NOT NULL,
  "action" TEXT,
  "resourceId" TEXT,
  "dedupeKey" TEXT NOT NULL,
  "requestId" TEXT,
  "signatureVerified" BOOLEAN NOT NULL DEFAULT false,
  "payload" JSONB NOT NULL,
  "processedAt" TIMESTAMP(3),
  "orderId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Order_externalReference_key" ON "Order"("externalReference");
CREATE INDEX "Order_paymentStatus_createdAt_idx" ON "Order"("paymentStatus", "createdAt");
CREATE UNIQUE INDEX "WebhookEvent_dedupeKey_key" ON "WebhookEvent"("dedupeKey");
CREATE INDEX "WebhookEvent_provider_topic_resourceId_idx" ON "WebhookEvent"("provider", "topic", "resourceId");
CREATE INDEX "WebhookEvent_orderId_createdAt_idx" ON "WebhookEvent"("orderId", "createdAt");

ALTER TABLE "WebhookEvent"
ADD CONSTRAINT "WebhookEvent_orderId_fkey"
FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
