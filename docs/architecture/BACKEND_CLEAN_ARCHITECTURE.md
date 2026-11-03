# Backend module architecture

The backend remains one deployable modular monolith. InventoryAndChannels belongs to Dev 1; OrderingAndFinance belongs to Dev 2. Each module has independently compiled Domain, Application and Infrastructure projects; the original module project is the DI composition facade.

```text
API controllers -> Application services -> repository interfaces
                         |                       ^
                         v                       |
                       Domain             Infrastructure (Npgsql)
```

Domain references no database/framework packages. Application references Domain and shared Contracts, never Infrastructure. Infrastructure implements the Application repository interfaces. The module facade registers services/repositories. API Program composes the facades and the authentication profile adapter. No event handler, queue, email or refund integration is introduced until an actual use case needs it.

Public namespaces and HTTP routes/JSON remain compatible. Existing OrderSummary/OrderDetail are read models, not a completed Order aggregate. Create/cancel order, stock transaction coordination and domain state transitions are still Day 3 work. IInventoryContract is unchanged.

Find Customers in OrderingAndFinance/Domain/CustomerModels.cs, Application/CustomerService.cs and Infrastructure/PostgresCustomerRepository.cs. Orders and Brands follow the same layout. CustomerName enforces the name rule even when services are called outside HTTP. Controllers retain HTTP input/error handling.

Authentication stays in API/Authorization. IProfileRoleReader separates claims transformation from its PostgreSQL adapter in API/Infrastructure; this cross-cutting host concern is not owned by either business module. Never move credentials into source; existing User Secrets configuration still applies.

Open backend/NexusOMS.slnx in Visual Studio and reload projects. Run dotnet test backend/tests/NexusOMS.ApiTests/NexusOMS.ApiTests.csproj. Build Docker from backend/; Dockerfile includes all layer projects. No SQL migration is needed for this structural change. Live authenticated HTTP checks must be rerun after starting the new build; unit tests do not prove database connectivity.
