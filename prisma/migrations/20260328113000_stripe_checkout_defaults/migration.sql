ALTER TABLE "Order"
ALTER COLUMN "paymentProvider" SET DEFAULT 'stripe';

ALTER TABLE "Order"
ALTER COLUMN "paymentMethod" SET DEFAULT 'checkout_session';
