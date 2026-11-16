using Amazon.SQS;
using Amazon.SQS.Model;
using Npgsql;
using NexusOMS.OrderingAndFinance;

namespace NexusOMS.Api.Integration;

public sealed record WebhookQueueStatus(
    string Mode,
    int Available,
    int InFlight,
    int Delayed,
    int DeadLetter);

public sealed record WebhookDemoCleanupResult(
    Guid BatchId,
    int DeletedOrders,
    int ReleasedReservations);

public sealed class WebhookDemoService(
    IConfiguration configuration,
    IServiceProvider services,
    NpgsqlDataSource dataSource,
    OrderCancellationService cancellation)
{
    private static readonly string[] QueueAttributes =
    [
        "ApproximateNumberOfMessages",
        "ApproximateNumberOfMessagesNotVisible",
        "ApproximateNumberOfMessagesDelayed"
    ];

    public async Task<WebhookQueueStatus> GetQueueStatusAsync(CancellationToken cancellationToken)
    {
        if (WebhookQueueSettings.GetMode(configuration) == WebhookQueueMode.Direct)
            return new WebhookQueueStatus("Direct", 0, 0, 0, 0);

        var sqs = services.GetRequiredService<IAmazonSQS>();
        var queue = await ReadAttributesAsync(sqs, WebhookQueueSettings.GetQueueUrl(configuration), cancellationToken);
        var deadLetterUrl = configuration["WebhookQueue:DeadLetterQueueUrl"]?.Trim();
        var deadLetter = string.IsNullOrWhiteSpace(deadLetterUrl)
            ? 0
            : (await ReadAttributesAsync(sqs, deadLetterUrl, cancellationToken)).Available;
        return queue with { DeadLetter = deadLetter };
    }

    private static async Task<WebhookQueueStatus> ReadAttributesAsync(
        IAmazonSQS sqs, string queueUrl, CancellationToken cancellationToken)
    {
        var response = await sqs.GetQueueAttributesAsync(new GetQueueAttributesRequest
        {
            QueueUrl = queueUrl,
            AttributeNames = [.. QueueAttributes]
        }, cancellationToken);
        int Read(string name) => response.Attributes.TryGetValue(name, out var value)
            && int.TryParse(value, out var number) ? number : 0;
        return new WebhookQueueStatus(
            "Sqs",
            Read("ApproximateNumberOfMessages"),
            Read("ApproximateNumberOfMessagesNotVisible"),
            Read("ApproximateNumberOfMessagesDelayed"),
            0);
    }

    public async Task<WebhookDemoCleanupResult> CleanupAsync(
        Guid batchId, Guid actorId, CancellationToken cancellationToken)
    {
        if (batchId == Guid.Empty) throw new ArgumentException("Mã batch demo không hợp lệ.");
        var orders = await ListBatchOrdersAsync(batchId, cancellationToken);
        if (orders.Any(order => order.Status is not ("pending" or "confirmed" or "processing" or "cancelled")))
            throw new InvalidOperationException("Batch có đơn đã xuất kho hoặc giao hàng nên không thể dọn tự động.");

        var released = 0;
        foreach (var order in orders.Where(order => order.Status != "cancelled"))
        {
            await cancellation.CancelAsync(
                order.Id,
                new CancelOrderRequest($"demo-cleanup:{batchId:N}:{order.Id:N}", "Kết thúc batch demo"),
                actorId,
                cancellationToken);
            released++;
        }

        if (orders.Count == 0) return new WebhookDemoCleanupResult(batchId, 0, 0);

        await using var connection = await dataSource.OpenConnectionAsync(cancellationToken);
        await using var transaction = await connection.BeginTransactionAsync(cancellationToken);
        var lockedOrders = await LockBatchAsync(connection, transaction, batchId, cancellationToken);
        if (lockedOrders.Any(order => order.Status != "cancelled"))
            throw new InvalidOperationException("Batch demo vẫn còn đơn chưa hủy.");
        const string sql = """
            delete from public.inventory_operation_receipts receipt
            using public.stock_transactions stock, public.orders demo_order
            where receipt.stock_transaction_id = stock.id
              and stock.reference_type = 'order'
              and stock.reference_id = demo_order.id
              and demo_order.is_demo and demo_order.demo_batch_id = @batchId;

            delete from public.stock_transactions stock
            using public.orders demo_order
            where stock.reference_type = 'order'
              and stock.reference_id = demo_order.id
              and demo_order.is_demo and demo_order.demo_batch_id = @batchId;

            delete from public.audit_logs audit
            using public.orders demo_order
            where audit.entity_type = 'orders'
              and audit.entity_id = demo_order.id
              and demo_order.is_demo and demo_order.demo_batch_id = @batchId;

            delete from public.webhook_delivery_logs
            where payload ->> 'demoBatchId' = @batchText;

            delete from public.orders
            where is_demo and demo_batch_id = @batchId;

            insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
            values (@actorId, 'webhook.demo.cleaned', 'webhook_demo_batch', @batchId,
                    jsonb_build_object('deletedOrders', @deletedOrders));
            """;
        await using var command = new NpgsqlCommand(sql, connection, transaction);
        command.Parameters.AddWithValue("batchId", batchId);
        command.Parameters.AddWithValue("batchText", batchId.ToString());
        command.Parameters.AddWithValue("actorId", actorId);
        command.Parameters.AddWithValue("deletedOrders", lockedOrders.Count);
        await command.ExecuteNonQueryAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return new WebhookDemoCleanupResult(batchId, lockedOrders.Count, released);
    }

    private async Task<IReadOnlyList<DemoOrder>> ListBatchOrdersAsync(
        Guid batchId, CancellationToken cancellationToken)
    {
        await using var command = dataSource.CreateCommand("""
            select id, status::text from public.orders
            where is_demo and demo_batch_id = @batchId
            order by id
            """);
        command.Parameters.AddWithValue("batchId", batchId);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        var orders = new List<DemoOrder>();
        while (await reader.ReadAsync(cancellationToken))
            orders.Add(new DemoOrder(reader.GetGuid(0), reader.GetString(1)));
        return orders;
    }

    private static async Task<IReadOnlyList<DemoOrder>> LockBatchAsync(
        NpgsqlConnection connection,
        NpgsqlTransaction transaction,
        Guid batchId,
        CancellationToken cancellationToken)
    {
        await using var command = new NpgsqlCommand("""
            select id, status::text from public.orders
            where is_demo and demo_batch_id = @batchId
            order by id for update
            """, connection, transaction);
        command.Parameters.AddWithValue("batchId", batchId);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        var orders = new List<DemoOrder>();
        while (await reader.ReadAsync(cancellationToken))
            orders.Add(new DemoOrder(reader.GetGuid(0), reader.GetString(1)));
        return orders;
    }

    private sealed record DemoOrder(Guid Id, string Status);
}
