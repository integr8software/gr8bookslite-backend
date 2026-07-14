-- PostgreSQL requires newly added enum values to be committed before they are
-- used in defaults or data writes, so this must stay separate from the
-- payment-attempt migration that sets the RECEIVED default.
ALTER TYPE "WebhookProcessingStatus" ADD VALUE IF NOT EXISTS 'RECEIVED';
ALTER TYPE "WebhookProcessingStatus" ADD VALUE IF NOT EXISTS 'PROCESSING';
ALTER TYPE "WebhookProcessingStatus" ADD VALUE IF NOT EXISTS 'IGNORED';
