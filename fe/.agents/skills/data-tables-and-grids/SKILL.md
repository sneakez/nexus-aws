---
name: test-data-grid
description: Test a data table or grid across query state, identity, keyboard access, virtualization, editing, and degraded networks.
---

# Test Data Grid

Run this procedure whenever the governed surface changes or its operational evidence becomes stale.

1. Create fixtures with stable IDs, duplicate labels, long text, empty values, mixed directions, large row counts, permissions, and concurrent versions.
2. Exercise sort, filter, page, history, selection, expansion, resize, and virtualization while requests overlap, fail, retry, and resolve out of order.
3. Run the documented keyboard model and screen-reader flow through headers, cells, editing controls, bulk actions, empty state, errors, and restored focus.
4. Race edits and bulk actions against server changes; verify conflict handling, optimistic rollback, per-record results, and no action targets a recycled row.

Record the decision, failed checks, and follow-up owner with the change. A successful run leaves reproducible evidence that another reviewer can inspect without repeating the investigation from memory.
