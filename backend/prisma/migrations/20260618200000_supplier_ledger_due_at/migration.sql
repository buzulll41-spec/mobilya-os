ALTER TABLE "supplier_ledger_entries"
  ADD COLUMN IF NOT EXISTS "dueAt" DATE;
