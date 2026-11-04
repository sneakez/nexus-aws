using Npgsql;
using NexusOMS.Contracts;
using NexusOMS.InventoryAndChannels;
using NexusOMS.OrderingAndFinance;

// Explicit Docker-lab checks, not part of the unit-test suite or production DI.
internal static class OrderInventoryIntegrationChecks
{
    private sealed record Fixture(Guid OrderId, Guid WarehouseId, Guid ProductId, decimal Quantity);

    public static async Task RunAsync(NpgsqlDataSource source, Guid actorId)
    {
        var inventory = new PostgresInventoryContract();
        var cancellation = new PostgresOrderCancellationRepository(source, inventory);
        var shipping = new PostgresOrderShippingRepository(source, inventory);
        var fixtures = new List<Fixture>();
        var run = Guid.NewGuid().ToString("N");

        async Task Execute(string sql, params (string Name, object Value)[] parameters)
        {
            await using var command = source.CreateCommand(sql);
            foreach (var (name, value) in parameters) command.Parameters.AddWithValue(name, value);
            await command.ExecuteNonQueryAsync();
        }

        async Task<long> Count(string sql, params (string Name, object Value)[] parameters)
        {
            await using var command = source.CreateCommand(sql);
            foreach (var (name, value) in parameters) command.Parameters.AddWithValue(name, value);
            return Convert.ToInt64(await command.ExecuteScalarAsync());
        }

        async Task<Fixture> Create(string status = "processing", decimal stock = 10m, decimal quantity = 2m)
        {
            var f = new Fixture(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), quantity);
            fixtures.Add(f);
            await Execute("""
                insert into public.warehouses(id, code, name) values (@warehouse, @code, 'Integration lab');
                insert into public.products(id, sku, name, cost_price) values (@product, @sku, 'Integration lab', 60000);
                insert into public.inventory_items(warehouse_id, product_id, stock) values (@warehouse, @product, @stock);
                insert into public.orders(id, assigned_warehouse_id, order_number, status, subtotal, total)
                    values (@order, @warehouse, @number, @status::public.order_status, 200000, 200000);
                insert into public.order_items(order_id, product_id, product_name, quantity, unit_price, unit_cost, line_total)
                    values (@order, @product, 'Integration lab', @quantity, 100000, 60000, 200000);
                """, ("warehouse", f.WarehouseId), ("product", f.ProductId), ("order", f.OrderId),
                ("code", $"IT-{f.WarehouseId:N}"), ("sku", $"IT-{f.ProductId:N}"),
                ("number", $"IT-{f.OrderId:N}"), ("status", status), ("stock", stock), ("quantity", quantity));
            return f;
        }

        InventoryReservationRequest ReserveRequest(Fixture f) => new(
            f.ProductId, f.WarehouseId, f.Quantity, $"reserve:{f.OrderId:N}:{f.ProductId:N}", f.OrderId);

        async Task Reserve(Fixture f, InventoryReservationRequest? request = null)
        {
            await using var connection = await source.OpenConnectionAsync();
            await using var transaction = await connection.BeginTransactionAsync();
            var result = await inventory.ReserveAsync(request ?? ReserveRequest(f), new(transaction));
            Require(result.ReservedQuantity == (request ?? ReserveRequest(f)).Quantity, "reserve quantity");
            await transaction.CommitAsync();
        }

        async Task State(Fixture f, string status, decimal stock, decimal reserved, string reservation)
        {
            await using var command = source.CreateCommand("""
                select o.status::text, i.stock, i.reserved, r.state
                from public.orders o
                join public.inventory_items i on i.warehouse_id = @warehouse and i.product_id = @product
                join public.inventory_reservations r on r.order_id = o.id and r.product_id = i.product_id
                where o.id = @order
                """);
            command.Parameters.AddWithValue("warehouse", f.WarehouseId);
            command.Parameters.AddWithValue("product", f.ProductId);
            command.Parameters.AddWithValue("order", f.OrderId);
            await using var reader = await command.ExecuteReaderAsync();
            Require(await reader.ReadAsync(), "state exists");
            Require(reader.GetString(0) == status && reader.GetDecimal(1) == stock
                && reader.GetDecimal(2) == reserved && reader.GetString(3) == reservation, $"state {status}/{reservation}");
        }

        async Task ReceiptCount(Fixture f, long count) => Require(await Count(
            "select count(*) from public.order_operation_receipts where order_id = @order", ("order", f.OrderId)) == count,
            "order operation receipt count");

        try
        {
            var cancel = await Create("pending");
            var catalog = new PostgresProductCatalogContract(source);
            var products = await catalog.GetActiveProductsAsync([cancel.ProductId, Guid.NewGuid()]);
            Require(products.Count == 1 && products[0].UnitCost == 60000m, "real catalog snapshot");
            await Execute("update public.products set is_active = false where id = @id", ("id", cancel.ProductId));
            Require((await catalog.GetActiveProductsAsync([cancel.ProductId])).Count == 0, "inactive product omitted");
            await Execute("update public.products set is_active = true where id = @id", ("id", cancel.ProductId));
            Console.WriteLine("PASS: real catalog returns active products and cost snapshots.");

            await Reserve(cancel);
            await Reserve(cancel);
            await State(cancel, "pending", 10m, 2m, "reserved");
            await Expect<InventoryOperationConflictException>(() => Reserve(cancel, ReserveRequest(cancel) with { Quantity = 3m }));
            Require(await Count("select count(*) from public.stock_transactions where reference_id = @id", ("id", cancel.OrderId)) == 1,
                "reserve replay writes ledger once");
            Console.WriteLine("PASS: real reserve, replay and changed-payload conflict.");

            var cancelRequest = new CancelOrderRequest($"{run}:cancel", "Integration lab");
            var cancelled = await cancellation.CancelAsync(cancel.OrderId, cancelRequest, actorId);
            Require(cancelled is { Replayed: false, Status: "cancelled" }, "cancel fresh");
            Require((await cancellation.CancelAsync(cancel.OrderId, cancelRequest, actorId)) is { Replayed: true }, "cancel replay");
            await Expect<OrderTransitionConflictException>(() => cancellation.CancelAsync(cancel.OrderId,
                cancelRequest with { Reason = "Different reason" }, actorId));
            await State(cancel, "cancelled", 10m, 0m, "released");
            await ReceiptCount(cancel, 1);
            Console.WriteLine("PASS: Order cancellation releases real inventory once; replay/conflict verified.");

            var ship = await Create();
            await Reserve(ship);
            var shipRequest = new ShipOrderRequest($"{run}:ship");
            Require((await shipping.ShipAsync(ship.OrderId, shipRequest, actorId)) is { Replayed: false, Status: "shipped" }, "ship fresh");
            Require((await shipping.ShipAsync(ship.OrderId, shipRequest, actorId)) is { Replayed: true }, "ship replay");
            await Expect<OrderTransitionConflictException>(() => cancellation.CancelAsync(ship.OrderId,
                new($"{run}:cancel-shipped", "Too late"), actorId));
            await Expect<OrderTransitionConflictException>(() => shipping.ShipAsync(ship.OrderId,
                new($"{run}:ship-again"), actorId));
            await State(ship, "shipped", 8m, 0m, "committed");
            await ReceiptCount(ship, 1);
            Console.WriteLine("PASS: shipment commits real stock once and rejects invalid transitions.");

            foreach (var operation in new[] { "cancel", "ship" })
            {
                var rollback = await Create();
                await Reserve(rollback);
                var key = $"{run}:rollback:{operation}";
                await Expect<PostgresException>(async () =>
                {
                    if (operation == "cancel")
                        await cancellation.CancelAsync(rollback.OrderId, new(key, "Rollback"), Guid.Empty);
                    else
                        await shipping.ShipAsync(rollback.OrderId, new(key), Guid.Empty);
                }, ex => ex.SqlState == PostgresErrorCodes.ForeignKeyViolation
                    && ex.ConstraintName == "order_status_log_created_by_fkey");
                await State(rollback, "processing", 10m, 2m, "reserved");
                await ReceiptCount(rollback, 0);
                Require(await Count("select count(*) from public.stock_transactions where reference_id = @id", ("id", rollback.OrderId)) == 1,
                    "rolled-back operation leaves only reserve ledger");
                Require(await Count("select count(*) from public.inventory_operation_receipts where payload ->> 'OrderId' = @id",
                    ("id", rollback.OrderId.ToString())) == 1, "inventory receipt rolled back");
                if (operation == "cancel")
                    await cancellation.CancelAsync(rollback.OrderId, new(key, "Rollback"), actorId);
                else
                    await shipping.ShipAsync(rollback.OrderId, new(key), actorId);
                await State(rollback, operation == "cancel" ? "cancelled" : "shipped",
                    operation == "cancel" ? 10m : 8m, 0m, operation == "cancel" ? "released" : "committed");
                Console.WriteLine($"PASS: {operation} failure after inventory mutation rolls back Order/stock/ledger/receipts; retry succeeds.");
            }

            var same = await Create();
            await Reserve(same);
            var sameRequest = new CancelOrderRequest($"{run}:same-key", "Concurrent");
            var sameResults = await Task.WhenAll(Enumerable.Range(0, 8)
                .Select(_ => cancellation.CancelAsync(same.OrderId, sameRequest, actorId)));
            Require(sameResults.Count(x => x is { Replayed: false }) == 1
                && sameResults.Count(x => x is { Replayed: true }) == 7, "concurrent cancel 1+7");
            await State(same, "cancelled", 10m, 0m, "released");
            await ReceiptCount(same, 1);
            Console.WriteLine("PASS: 8 concurrent cancellations produce one release and seven replays.");

            var race = await Create();
            await Reserve(race);
            async Task<bool> Attempt(Func<Task> action)
            {
                try { await action(); return true; }
                catch (OrderTransitionConflictException) { return false; }
            }
            var races = await Task.WhenAll(
                Attempt(async () => { await cancellation.CancelAsync(race.OrderId, new($"{run}:race-cancel", "Race"), actorId); }),
                Attempt(async () => { await shipping.ShipAsync(race.OrderId, new($"{run}:race-ship"), actorId); }));
            Require(races.Count(x => x) == 1, "cancel/ship only one winner");
            var raceShipped = await Count("select count(*) from public.orders where id = @id and status = 'shipped'", ("id", race.OrderId)) == 1;
            await State(race, raceShipped ? "shipped" : "cancelled", raceShipped ? 8m : 10m, 0m, raceShipped ? "committed" : "released");
            await ReceiptCount(race, 1);
            Console.WriteLine("PASS: concurrent cancel versus ship has one winner and consistent stock.");

            var last = await Create(stock: 1m, quantity: 1m);
            var other = new Fixture(Guid.NewGuid(), last.WarehouseId, last.ProductId, 1m);
            fixtures.Add(other);
            await Execute("insert into public.orders(id, order_number) values (@id, @number)",
                ("id", other.OrderId), ("number", $"IT-{other.OrderId:N}"));
            async Task<bool> TryReserve(Fixture fixture)
            {
                try { await Reserve(fixture); return true; }
                catch (InsufficientStockException) { return false; }
            }
            var reserveRace = await Task.WhenAll(TryReserve(last), TryReserve(other));
            Require(reserveRace.Count(x => x) == 1, "only one reserves last unit");
            Require(await Count("select reserved::bigint from public.inventory_items where product_id = @id", ("id", last.ProductId)) == 1,
                "last-unit reserved amount");
            Console.WriteLine("PASS: two orders competing for the last unit cannot oversell.");
        }
        finally
        {
            if (fixtures.Count > 0)
            {
                await using var connection = await source.OpenConnectionAsync();
                await using var transaction = await connection.BeginTransactionAsync();
                await using var cleanup = new NpgsqlCommand("""
                    delete from public.inventory_operation_receipts where payload ->> 'OrderId' = any(@orderTexts);
                    delete from public.stock_transactions where reference_type = 'order' and reference_id = any(@orders);
                    delete from public.audit_logs where entity_type = 'orders' and entity_id = any(@orders);
                    delete from public.orders where id = any(@orders);
                    delete from public.inventory_items where product_id = any(@products) and warehouse_id = any(@warehouses);
                    delete from public.products where id = any(@products);
                    delete from public.warehouses where id = any(@warehouses);
                    """, connection, transaction);
                cleanup.Parameters.AddWithValue("orders", fixtures.Select(f => f.OrderId).ToArray());
                cleanup.Parameters.AddWithValue("orderTexts", fixtures.Select(f => f.OrderId.ToString()).ToArray());
                cleanup.Parameters.AddWithValue("products", fixtures.Select(f => f.ProductId).Distinct().ToArray());
                cleanup.Parameters.AddWithValue("warehouses", fixtures.Select(f => f.WarehouseId).Distinct().ToArray());
                await cleanup.ExecuteNonQueryAsync();
                await transaction.CommitAsync();
                Console.WriteLine("PASS: integration fixtures cleaned up by exact IDs.");
            }
        }
    }

    private static void Require(bool condition, string message)
    {
        if (!condition) throw new InvalidOperationException($"FAIL: {message}");
    }

    private static async Task Expect<T>(Func<Task> action, Func<T, bool>? predicate = null) where T : Exception
    {
        try { await action(); }
        catch (T exception) when (predicate is null || predicate(exception)) { return; }
        throw new InvalidOperationException($"Expected {typeof(T).Name}.");
    }
}
