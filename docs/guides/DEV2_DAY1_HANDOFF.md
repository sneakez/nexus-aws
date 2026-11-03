# Dev 2 Day 1 handoff

API host: backend/src/NexusOMS.Api. Start NexusOMS.Api with the http launch profile (port 5145).

Configure User Secrets on NexusOMS.Api locally, never commit credentials:

```json
{
  "Supabase": { "Url": "https://YOUR_PROJECT.supabase.co" },
  "ConnectionStrings": {
    "Postgres": "Host=POOLER_HOST;Port=5432;Database=postgres;Username=POOLER_USER;Password=DATABASE_PASSWORD;SSL Mode=Require"
  }
}
```

Authentication: Supabase password login issues the JWT. API validates issuer, audience and signature. ProfileClaimsTransformation reads the authenticated UID from public.profiles and adds app_role only for an active admin, manager or warehouse. Never set application role from user-editable metadata.

Policies: Admin for configuration/users; ManagerOrAdmin for customer/finance endpoints; WarehouseOrAbove for operational reads. Dev 1 and Dev 2 are developer ownership labels, not API roles.

Endpoints: GET /health (anonymous), GET /openapi/v1.json, GET /api/v1/session/me (authenticated), GET /api/v1/customers (manager/admin, Day 2 preview).

Manual verification observed through user-run Postman requests: manager Customers and session/me returned 200 with the expected UID and manager role; no token and invalid token returned 401; active warehouse Customers returned 403; inactive warehouse Brands returned 403; reactivated warehouse Brands returned 200 with the seeded brand. The test account was isolated from developer accounts. These are manual observations, not an automated HTTP regression suite. Backend tests passed 8/8, including four policy cases.

Dev 1 can continue InventoryAndChannels and implement NexusOMS.Contracts/IInventoryContract. Keep shared contract changes coordinated; ordering must not write inventory tables directly. Module ownership stays unchanged.

Before sharing: run dotnet test; review git diff; exclude secrets.json, tokens, bin and obj. Each teammate supplies their own User Secrets and Supabase login. Never export token-bearing Postman examples into Git.
