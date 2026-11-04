# Order creation and inventory integration lab

Run explicitly against the local Docker lab, not a shared Supabase database:

```powershell
dotnet run --project backend/tools/NexusOMS.OrderCreationLab/NexusOMS.OrderCreationLab.csproj
```

The existing Program.cs pins the target to localhost:25439 / nexus_lab and requires
an active Dev 2 profile. Start the existing nexus-dev2-returns-lab container first.
Apply the repository migrations to the lab before running; these checks do not
apply migrations or create the profile automatically.

## Checks using the real Inventory implementation

- Catalog returns active products and stored cost snapshots.
- Reserve persists once, replays without additional stock/ledger writes, and
  rejects a changed quantity with the same key.
- Order cancellation releases the reservation and saves status/history/audit/receipt.
- Shipping commits physical/reserved stock once and rejects invalid transitions.
- A history-write failure AFTER release/outbound rolls back Order, inventory,
  ledger, reservation state and both operation receipts. Retrying succeeds.
- Eight concurrent cancellations produce one fresh result and seven replays.
- Concurrent cancel and ship have exactly one winner with consistent inventory.
- Two orders competing for the last unit cannot both reserve it.

Integration fixtures are isolated with generated IDs and cleaned in finally.
The original order-only checks still run afterwards and clean their own fixtures
on success. Historical fixtures from older lab runs are not deleted.

## Limits

This is a repository/contract integration lab, not an HTTP or frontend E2E test.
Fixture orders are seeded before ReserveAsync is invoked. Production order creation now invokes reserve in its transaction. The separate
NexusOMS.ApiLab runs HTTP lifecycle, partial-shortage/audit rollback and role checks.
The old merge-only limits below are superseded by docs/guides/DEV2_NGAY3_4_HOC_LAI.md.

Pending legacy orders with creation_request NULL and no reservation history can
now cancel without modifying stock; missing holds on modern orders still fail. ReturnInbound quantity limits and the monetary-rounding policy
remain separate work.

## Migration ordering

Inventory reservations use version 20261104020000. Order operation receipts were
renamed to 20261104030000 to avoid a duplicate migration version; the SQL is
unchanged. The order-receipt migration had only been run manually in the lab.
Version 20261104040000 enables RLS on the new internal Inventory tables.
Shared/deployed databases were not migrated by these checks.
