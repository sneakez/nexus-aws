# NexusOMS backend

## Start

```powershell
dotnet restore NexusOMS.slnx
dotnet run --project src/NexusOMS.Api
```

`GET /health` confirms the API host is running. OpenAPI is exposed at `/openapi/v1.json`.

## Local secrets

```powershell
dotnet user-secrets init --project src/NexusOMS.Api
dotnet user-secrets set "Supabase:Url" "https://your-project.supabase.co" --project src/NexusOMS.Api
```

Do not commit keys. The API validates Supabase JWTs when `Supabase:Url` is configured.

## Module ownership

- `InventoryAndChannels`: Dev 1. Owns stock and fake webhook ingestion.
- `OrderingAndFinance`: Dev 2. Owns orders, returns and economics.
- `NexusOMS.Contracts/IInventoryContract.cs` is the boundary between the two modules.
