# Inventory handoff required for Day 3 and Day 4

Current main d316e0c contains IInventoryContract declarations only; no implementation or DI registration exists. OrderingAndFinance must not update inventory tables directly.

Dev 1 needs to deliver ReserveAsync, ReleaseAsync, CommitOutboundAsync and ReturnInboundAsync with durable idempotency, inventory checks and stock transaction recording. The existing shared contract must remain compatible or be versioned jointly. Resolve SKU/event DTO is also required for the Day 4 webhook integration.

Before wiring commands, agree how one database transaction covers order header/items/status/audit and inventory effects. The interface currently takes no shared transaction context. Calling inventory before or after a separate order commit can leave an order without stock or a reservation without an order. Do not present such a dual write as atomic. Agree a shared unit-of-work boundary with Dev 1 before implementation; document the API and rollback tests. No distributed queue or saga is needed merely to share a local PostgreSQL transaction.

Acceptance: insufficient stock or an injected exception leaves both order and stock unchanged; same key/same payload returns the existing result; same key/different payload conflicts; cancel cannot release twice; return cannot restock twice. Two order lines must either both reserve or neither reserve. CancellationToken and authenticated actor must propagate through the boundary.

Dev 2 can independently prepare return/fee schema, read models, validation and endpoints; inventory mutation integration and its acceptance remain pending the above handoff.
