# Real API HTTP lab

```powershell
# From repository root; Docker lab must be running and migrations applied.
dotnet run --project backend/tools/NexusOMS.ApiLab/NexusOMS.ApiLab.csproj
# Also run the reusable Postman collection (Postman CLI must be installed):
dotnet run --project backend/tools/NexusOMS.ApiLab/NexusOMS.ApiLab.csproj -- --postman
```

This executable pins its database to 127.0.0.1:25439/nexus_lab. It creates temporary
products/warehouse/profile fixtures, hosts the actual API Program with
WebApplicationFactory, and uses its real controllers, DI, JWT bearer middleware,
ProfileClaimsTransformation and PostgreSQL repositories/Inventory implementation.
Only the JWT issuer/signing key are overridden INSIDE THIS TEST EXECUTABLE. Keys
are generated per run, never printed/committed and never accepted by the normal
API. The inactive/warehouse tokens intentionally include a false admin claim to
prove the database profile controls authorization.

With --postman, a loopback-only Kestrel bridge forwards to the same API pipeline;
it does not fabricate responses. A temporary environment contains only ephemeral
lab tokens and generated fixture IDs. It is deleted in finally; --no-report-events
prevents cloud reporting. The installed CLI can warn about being signed out while
still returning exit 0 for a fully passing local run.

Tests include create/reserve atomicity, partial shortage, stable replay despite
catalog changes, duplicate keys/numbers, references, transitions, role gates,
malformed/expired/wrong-issuer JWT, inactive profile, legacy pending cancellation,
concurrent create/last-unit race, return requests/over-return race, fee/audit and
profit estimate. Scoped temporary triggers force real audit-write failures for
create/cancel/ship/return/fee; rollback and retries are checked. All triggers and
fixtures are cleaned by generated IDs, including on failure.

Fresh CI uses tools/lab-auth-bootstrap.sql BEFORE migrations. That stub is strictly
for a fresh local nexus_lab database, never an actual Supabase database. The normal
API is not configured with a fake authentication handler.
