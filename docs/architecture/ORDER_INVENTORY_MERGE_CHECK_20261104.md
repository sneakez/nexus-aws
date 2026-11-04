# Dev 1 / Dev 2 merge check — 2026-11-04

Merged origin/main (39b81b6, PR #33 / inventory commit 8f7dc53) into
codex/dev2-order-transitions. No source conflicts.

## Corrections

- Both branches used migration version 20261104020000. Kept the merged Inventory
  migration at that version and moved the un-deployed order receipt migration to
  20261104030000 without changing its SQL.
- Added 20261104040000 to enable RLS on inventory_reservations and
  inventory_operation_receipts, consistent with backend-only operational writes.
- Extended the explicit Docker lab with the real Inventory and catalog classes.
  No production endpoint/DI or inventory algorithms were changed.

## Evidence

- 66/66 unit tests passed in Debug and Release.
- Lab console builds and all its checks pass.
- Real catalog: active product, stored unit cost, inactive product exclusion.
- Reserve: stock held once, replay unchanged, changed payload rejected.
- Cancel: reservation released, order cancelled, replay unchanged.
- Ship: stock/reserved reduced once; invalid subsequent transitions rejected.
- Injected invalid actor after Inventory mutation: history FK failure rolls back
  order status, reservation state, stock, stock ledger and both operation receipts;
  retry with valid actor succeeds for cancel and ship.
- Eight concurrent cancellations: one fresh result and seven replays.
- Concurrent cancel vs ship: one winner, consistent stock and one order receipt.
- Two orders race for one unit: only one reserve succeeds.
- Integration data cleaned by exact generated IDs in finally.
- All six migrations applied successfully to a fresh temporary Docker database;
  all three new operational tables have RLS enabled. Temporary database removed.

Only the local Docker lab was migrated. No shared Supabase or deployed database
was changed. These are repository/contract tests, not HTTP/frontend E2E tests.

## Day 3 remaining

- Wire real reserve into production order creation transaction and verify rollback
  of all previous reservations if a later line has insufficient stock.
- Register Order services/repositories in DI and add authorized endpoints.
- Decide how to cancel legacy pending orders that have no reservation; the current
  Inventory release rejects an order with no active reservation.
- Provide/test transition into processing before exposing shipment.
- Close monetary rounding policy before enabling create-order HTTP flow.
- Run full HTTP E2E authorization, create/reserve, cancel/release and ship/outbound.

Day 3 is not complete. Day 4 returns and Day 5 financial reports are not claimed
complete by this merge.
