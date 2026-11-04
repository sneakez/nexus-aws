using Npgsql;
using NexusOMS.OrderingAndFinance;

const string connectionString =
    "Host=127.0.0.1;Port=25439;Database=nexus_lab;" +
    "Username=postgres;Password=nexus-lab-only";

var actorId = Guid.Parse(
    "0b2b7cf0-0b67-4b12-a673-e7eb359dd654");

await using var dataSource =
    NpgsqlDataSource.Create(connectionString);

await using var command = dataSource.CreateCommand("""
    select exists (
        select 1
        from public.profiles
        where id = @actorId and is_active = true
    );
    """);

command.Parameters.AddWithValue("actorId", actorId);

var actorExists = (bool)(await command.ExecuteScalarAsync())!;

if (!actorExists)
    throw new InvalidOperationException(
        "Lab chưa có profile Dev 2 đang hoạt động.");

Console.WriteLine("PASS: kết nối database lab và tìm thấy profile Dev 2.");
await OrderInventoryIntegrationChecks.RunAsync(dataSource, actorId);
var productId = Guid.NewGuid();
var warehouseId = Guid.NewGuid();
var suffix = Guid.NewGuid().ToString("N");

await using (var seed = dataSource.CreateCommand("""
    insert into public.warehouses (id, code, name)
    values (@warehouseId, @warehouseCode, 'Kho lab tạo đơn');

    insert into public.products (id, sku, name, cost_price)
    values (@productId, @sku, 'Sản phẩm lab tạo đơn', 60000);
    """))
{
    seed.Parameters.AddWithValue("warehouseId", warehouseId);
    seed.Parameters.AddWithValue("warehouseCode", $"LAB-{suffix}");
    seed.Parameters.AddWithValue("productId", productId);
    seed.Parameters.AddWithValue("sku", $"SKU-{suffix}");

    await seed.ExecuteNonQueryAsync();
}

var request = new CreateOrderRequest(
    $"create-{suffix}",
    $"ORDER-{suffix}",
    null,
    warehouseId,
    10000m,
    30000m,
    [new CreateOrderLineRequest(productId, 2m, 100000m)]);

var prepared = new PreparedOrder(
    200000m,
    10000m,
    30000m,
    240000m,
    [
        new PreparedOrderLine(
            productId,
            $"SKU-{suffix}",
            "Sản phẩm lab tạo đơn",
            2m,
            100000m,
            60000m,
            200000m)
    ]);

var orders = new PostgresOrderRepository(dataSource);
var repository = new PostgresOrderCreationRepository(dataSource, orders);

var created = await repository.CreateAsync(
    request, prepared, actorId);

if (created.Replayed
    || created.Order.Total != 240000m
    || created.Order.Items.Count != 1
    || created.Order.Items[0].UnitCost != 60000m)
{
    throw new InvalidOperationException(
        "Kết quả tạo đơn không đúng mong đợi.");
}

Console.WriteLine($"PASS: tạo đơn {created.Order.Id}");
Console.WriteLine("Tổng tiền: 240000; giá vốn đơn vị: 60000.");
var replay = await repository.CreateAsync(
    request, prepared, actorId);

if (!replay.Replayed || replay.Order.Id != created.Order.Id)
{
    throw new InvalidOperationException(
        "Gửi lại request phải trả đúng đơn đã tạo.");
}

await using (var verify = dataSource.CreateCommand("""
    select
        (select count(*) from public.orders
         where idempotency_key = @key),
        (select count(*) from public.order_items
         where order_id = @orderId),
        (select count(*) from public.order_status_log
         where order_id = @orderId),
        (select count(*) from public.audit_logs
         where entity_id = @orderId
           and entity_type = 'orders'
           and action = 'order.created');
    """))
{
    verify.Parameters.AddWithValue("key", request.IdempotencyKey);
    verify.Parameters.AddWithValue("orderId", created.Order.Id);

    await using var reader = await verify.ExecuteReaderAsync();
    await reader.ReadAsync();

    for (var index = 0; index < 4; index++)
    {
        if (reader.GetInt64(index) != 1)
            throw new InvalidOperationException(
                "Số bản ghi không đúng: dự kiến mỗi loại có 1.");
    }
}

Console.WriteLine(
    "PASS: gửi lại trả đơn cũ; đơn/dòng hàng/lịch sử/audit đều chỉ có 1.");
var changedRequest = request with
{
    ShippingFee = request.ShippingFee + 1000m
};

var changedPrepared = prepared with
{
    ShippingFee = prepared.ShippingFee + 1000m,
    Total = prepared.Total + 1000m
};

var conflictDetected = false;

try
{
    await repository.CreateAsync(
        changedRequest, changedPrepared, actorId);
}
catch (OrderCreationConflictException)
{
    conflictDetected = true;
}

if (!conflictDetected)
    throw new InvalidOperationException(
        "Cùng khóa nhưng khác nội dung phải bị từ chối.");

var unchanged = await orders.GetAsync(created.Order.Id);

if (unchanged is null
    || unchanged.ShippingFee != 30000m
    || unchanged.Total != 240000m)
{
    throw new InvalidOperationException(
        "Request bị từ chối đã làm thay đổi đơn cũ.");
}

Console.WriteLine(
    "PASS: cùng khóa khác nội dung bị từ chối; đơn cũ giữ nguyên.");
var rollbackRequest = request with
{
    IdempotencyKey = $"rollback-{suffix}",
    OrderNumber = $"ROLLBACK-{suffix}"
};

var rollbackFailureDetected = false;

try
{
    await repository.CreateAsync(
        rollbackRequest,
        prepared,
        Guid.Empty);
}
catch (PostgresException exception) when (
    exception.SqlState == PostgresErrorCodes.ForeignKeyViolation
    && exception.ConstraintName == "order_status_log_created_by_fkey")
{
    rollbackFailureDetected = true;
}

if (!rollbackFailureDetected)
    throw new InvalidOperationException(
        "Chưa gặp lỗi khóa ngoại lịch sử như dự kiến.");

await using (var verifyRollback = dataSource.CreateCommand("""
    select
        (select count(*) from public.orders
         where idempotency_key = @key),
        (select count(*) from public.order_items
         where product_id = @productId);
    """))
{
    verifyRollback.Parameters.AddWithValue(
        "key", rollbackRequest.IdempotencyKey);
    verifyRollback.Parameters.AddWithValue(
        "productId", productId);

    await using var reader =
        await verifyRollback.ExecuteReaderAsync();

    await reader.ReadAsync();

    if (reader.GetInt64(0) != 0 || reader.GetInt64(1) != 1)
        throw new InvalidOperationException(
            "Rollback không đúng: đơn lỗi hoặc dòng hàng còn tồn tại.");
}

Console.WriteLine(
    "PASS: lỗi ghi lịch sử rollback đơn và dòng hàng.");
var concurrentRequest = request with
{
    IdempotencyKey = $"concurrent-{suffix}",
    OrderNumber = $"CONCURRENT-{suffix}"
};

var tasks = Enumerable.Range(0, 8)
    .Select(_ => repository.CreateAsync(
        concurrentRequest, prepared, actorId))
    .ToArray();

var results = await Task.WhenAll(tasks);

var distinctOrderIds = results
    .Select(result => result.Order.Id)
    .Distinct()
    .Count();

var createdCount = results.Count(result => !result.Replayed);
var replayCount = results.Count(result => result.Replayed);

if (distinctOrderIds != 1 || createdCount != 1 || replayCount != 7)
    throw new InvalidOperationException(
        "Request đồng thời chưa được xử lý chống trùng đúng.");

var concurrentOrderId = results[0].Order.Id;

await using (var verifyConcurrent = dataSource.CreateCommand("""
    select
        (select count(*) from public.orders
         where idempotency_key = @key),
        (select count(*) from public.order_items
         where order_id = @orderId),
        (select count(*) from public.order_status_log
         where order_id = @orderId),
        (select count(*) from public.audit_logs
         where entity_id = @orderId
           and entity_type = 'orders'
           and action = 'order.created');
    """))
{
    verifyConcurrent.Parameters.AddWithValue(
        "key", concurrentRequest.IdempotencyKey);
    verifyConcurrent.Parameters.AddWithValue(
        "orderId", concurrentOrderId);

    await using var reader =
        await verifyConcurrent.ExecuteReaderAsync();

    await reader.ReadAsync();

    for (var index = 0; index < 4; index++)
    {
        if (reader.GetInt64(index) != 1)
            throw new InvalidOperationException(
                "Request đồng thời đã ghi thừa bản ghi.");
    }
}

Console.WriteLine(
    "PASS: 8 request đồng thời → 1 tạo mới, 7 replay; không ghi trùng.");
await using (var connection = await dataSource.OpenConnectionAsync())
{
    await using var transaction =
        await connection.BeginTransactionAsync();

    await using var cleanup = new NpgsqlCommand("""
        delete from public.audit_logs
        where entity_type = 'orders'
          and action = 'order.created'
          and entity_id = any(@orderIds);

        delete from public.orders
        where id = any(@orderIds);

        delete from public.products
        where id = @productId;

        delete from public.warehouses
        where id = @warehouseId;
        """, connection, transaction);

    cleanup.Parameters.AddWithValue(
        "orderIds", new[] { created.Order.Id, concurrentOrderId });
    cleanup.Parameters.AddWithValue("productId", productId);
    cleanup.Parameters.AddWithValue("warehouseId", warehouseId);

    await cleanup.ExecuteNonQueryAsync();
    await transaction.CommitAsync();
}

Console.WriteLine("PASS: đã dọn dữ liệu của lần chạy lab này.");
