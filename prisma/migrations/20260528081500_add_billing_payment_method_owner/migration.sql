ALTER TABLE "billing_payment_methods"
ADD COLUMN "owner_user_id" INTEGER;

UPDATE "billing_payment_methods" AS payment_method
SET "owner_user_id" = COALESCE(
    (
        SELECT billing_customer."owner_user_id"
        FROM "company_subscriptions" AS subscription
        LEFT JOIN "billing_customers" AS billing_customer
            ON billing_customer."id" = subscription."billing_customer_id"
        WHERE subscription."id" = payment_method."company_subscription_id"
        LIMIT 1
    ),
    (
        SELECT company."created_by_user_id"
        FROM "companies" AS company
        WHERE company."id" = payment_method."company_id"
        LIMIT 1
    )
)
WHERE payment_method."owner_user_id" IS NULL;

CREATE INDEX "billing_payment_methods_owner_user_id_idx"
ON "billing_payment_methods"("owner_user_id");

ALTER TABLE "billing_payment_methods"
ADD CONSTRAINT "billing_payment_methods_owner_user_id_fkey"
FOREIGN KEY ("owner_user_id") REFERENCES "users"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
