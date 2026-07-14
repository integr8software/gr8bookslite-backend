DO $$
BEGIN
  IF to_regclass(
    'public.billing_payment_attempts_subscription_invoice_id_attempt_number'
  ) IS NOT NULL
  AND to_regclass(
    'public.billing_payment_attempts_subscription_invoice_id_attempt_nu_key'
  ) IS NULL
  THEN
    ALTER INDEX
      "billing_payment_attempts_subscription_invoice_id_attempt_number"
    RENAME TO
      "billing_payment_attempts_subscription_invoice_id_attempt_nu_key";
  END IF;
END
$$;
