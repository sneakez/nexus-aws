# NexusOMS day 3–4 API collection

Import collections/NexusOMS-Day3-Day4.postman_collection.json (v2.1) and the example
environment. Fill tokens privately and choose real lab product/warehouse IDs with
stock and a unit cost of 60000. Use new runPrefix, feeId and returnId for each fresh
run. The collection performs actual writes; target the lab.

Automatic isolated fixture run from repository root:

```powershell
dotnet run --project backend/tools/NexusOMS.ApiLab/NexusOMS.ApiLab.csproj -- --postman
```

Manual CLI example with a private, uncommitted environment:

```powershell
postman collection run postman/collections/NexusOMS-Day3-Day4.postman_collection.json -e PATH_TO_PRIVATE_ENVIRONMENT --no-report-events
```

No passwords, API secrets or tokens are committed. The lab environment is temporary
and uses an ephemeral JWT key accepted only by the test host. CLI 1.73.0 runs these
v2.1 collections locally; `postman status` is unavailable in that installed version.
Cloud sign-in warnings do not prevent a passing local run; no cloud upload is used.

22 requests / 31 assertions were exercised against the real API pipeline through a
loopback bridge, not a mock response server. See docs/guides/DEMO_NGAY3_4_POSTMAN.md.
