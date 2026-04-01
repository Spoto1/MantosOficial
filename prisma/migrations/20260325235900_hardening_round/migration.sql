ALTER TABLE "MediaAsset"
ADD COLUMN     "storageProvider" TEXT NOT NULL DEFAULT 'local-public',
ADD COLUMN     "storageKey" TEXT;

UPDATE "MediaAsset"
SET "storageKey" = "fileName"
WHERE "storageKey" IS NULL;

CREATE TABLE "RateLimitBucket" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimitBucket_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RateLimitBucket_scope_identifier_windowStart_key" ON "RateLimitBucket"("scope", "identifier", "windowStart");

CREATE INDEX "RateLimitBucket_scope_identifier_expiresAt_idx" ON "RateLimitBucket"("scope", "identifier", "expiresAt");

CREATE INDEX "RateLimitBucket_expiresAt_idx" ON "RateLimitBucket"("expiresAt");
