using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using NexusOMS.Api.Controllers;
using NexusOMS.Api.Integration;
using NexusOMS.OrderingAndFinance;
using Npgsql;

namespace NexusOMS.ApiLab;

internal static class ApiLabProgram
{
    private const string ConnectionString = "Host=127.0.0.1;Port=25439;Database=nexus_lab;Username=postgres;Password=nexus-lab-only";
    private static int assertions;
    private static void Check(bool condition, string name)
    {
        if (!condition) throw new InvalidOperationException($"FAIL: {name}");
        assertions++;
    }

    public static async Task Main(string[] args)
    {
        var root = FindRoot();
        var run = "http-" + Guid.NewGuid().ToString("N");
        var adminId = Guid.NewGuid(); var managerId = Guid.NewGuid(); var warehouseUserId = Guid.NewGuid(); var inactiveId = Guid.NewGuid();
        var warehouseId = Guid.NewGuid(); var productId = Guid.NewGuid();
        var webhookProductId = Guid.NewGuid(); var channelConnectionId = Guid.NewGuid();
        var pair = new[] { Guid.NewGuid(), Guid.NewGuid() }.Order().ToArray();
        var firstProduct = pair[0]; var emptyProduct = pair[1];
        var lastProduct = Guid.NewGuid();
        var legacyId = Guid.NewGuid();
        var journalId = Guid.NewGuid();
        var debitAccountId = Guid.NewGuid();
        var creditAccountId = Guid.NewGuid();
        var users = new[] { adminId, managerId, warehouseUserId, inactiveId };
        var products = new[] { productId, firstProduct, emptyProduct, lastProduct, webhookProductId };
        var signingKey = new SymmetricSecurityKey(RandomNumberGenerator.GetBytes(64));
        string Token(Guid id, string? issuer = null, bool expired = false) => new JwtSecurityTokenHandler().WriteToken(
            new JwtSecurityToken(issuer ?? LabApiFactory.Issuer, "authenticated",
                [new Claim("sub", id.ToString()), new Claim("app_role", "admin")],
                DateTime.UtcNow.AddHours(-2), expired ? DateTime.UtcNow.AddHours(-1) : DateTime.UtcNow.AddHours(1),
                new SigningCredentials(signingKey, SecurityAlgorithms.HmacSha256)));
        var manager = Token(managerId); var worker = Token(warehouseUserId);
        await using var source = NpgsqlDataSource.Create(ConnectionString);
        await using var factory = new LabApiFactory(root, ConnectionString, signingKey, managerId);
        using var client = factory.CreateClient();

        async Task Exec(string sql, params (string Name, object Value)[] parameters)
        {
            await using var command = source.CreateCommand(sql);
            foreach (var (name, value) in parameters) command.Parameters.AddWithValue(name, value);
            await command.ExecuteNonQueryAsync();
        }
        async Task<decimal> Number(string sql, params (string Name, object Value)[] parameters)
        {
            await using var command = source.CreateCommand(sql);
            foreach (var (name, value) in parameters) command.Parameters.AddWithValue(name, value);
            return Convert.ToDecimal(await command.ExecuteScalarAsync());
        }
        async Task<JsonElement> Send(HttpMethod method, string path, object? body, string? token, int expected)
        {
            using var request = new HttpRequestMessage(method, path);
            if (body is not null) request.Content = JsonContent.Create(body);
            if (token is not null) request.Headers.Authorization = new("Bearer", token);
            using var response = await client.SendAsync(request);
            var text = await response.Content.ReadAsStringAsync();
            Check((int)response.StatusCode == expected, $"{method} {path}: expected {expected}, got {(int)response.StatusCode}: {text}");
            if (expected == 500)
                Check(!text.Contains("lab injected") && !text.Contains("Npgsql"), "500 response hides internal exception details");
            if (expected == 201 && path == "/api/v1/orders")
                Check(response.Headers.Location is not null, "created order has Location header");
            if (string.IsNullOrWhiteSpace(text)) return default;
            using var document = JsonDocument.Parse(text);
            return document.RootElement.Clone();
        }
        Task<JsonElement> Post(string path, object body, int status = 200, string? token = null) =>
            Send(HttpMethod.Post, path, body, token ?? manager, status);
        async Task<(int Status, string Body)> SendWebhook(string json)
        {
            using var request = new HttpRequestMessage(HttpMethod.Post, $"/api/v1/webhooks/simulator/{channelConnectionId}")
            { Content = new StringContent(json, Encoding.UTF8, "application/json") };
            var hash = HMACSHA256.HashData(Encoding.UTF8.GetBytes("api-lab-webhook-secret"), Encoding.UTF8.GetBytes(json));
            request.Headers.Add("X-Nexus-Signature", "sha256=" + Convert.ToHexString(hash).ToLowerInvariant());
            using var response = await client.SendAsync(request);
            return ((int)response.StatusCode, await response.Content.ReadAsStringAsync());
        }
        CreateOrderRequest Request(string suffix, decimal quantity = 2m, Guid? product = null) => new(
            $"{run}:{suffix}", $"{run}-{suffix}", null, warehouseId, 10000m, 30000m,
            [new(product ?? productId, quantity, 100000m)]);
        async Task State(Guid id, string status, decimal stock, decimal reserved, Guid? product = null)
        {
            var json = await Send(HttpMethod.Get, $"/api/v1/orders/{id}", null, manager, 200);
            Check(json.GetProperty("status").GetString() == status, $"state {status}");
            Check(await Number("select stock from public.inventory_items where warehouse_id=@w and product_id=@p", ("w", warehouseId), ("p", product ?? productId)) == stock, "physical stock");
            Check(await Number("select reserved from public.inventory_items where warehouse_id=@w and product_id=@p", ("w", warehouseId), ("p", product ?? productId)) == reserved, "reserved stock");
        }
        async Task FailAudit(string action, string orderNumber, Func<Task> test)
        {
            var name = "lab_audit_" + Guid.NewGuid().ToString("N");
            // Names and comparison values are generated by this executable, never external input.
            await Exec($$"""
                create function public.{{name}}() returns trigger language plpgsql as $lab$
                begin
                  if new.action = '{{action}}' and exists (
                    select 1 from public.orders where (id = new.entity_id or id::text = new.metadata ->> 'orderId') and order_number = '{{orderNumber}}') then
                    raise exception 'lab injected audit failure';
                  end if;
                  return new;
                end; $lab$;
                create trigger {{name}} before insert on public.audit_logs for each row execute function public.{{name}}();
                """);
            try { await test(); }
            finally { await Exec($"drop trigger if exists {name} on public.audit_logs; drop function if exists public.{name}();"); }
        }
        async Task FailAuditAction(string action, Func<Task> test)
        {
            var name = "lab_audit_" + Guid.NewGuid().ToString("N");
            await Exec($$"""
                create function public.{{name}}() returns trigger language plpgsql as $lab$
                begin
                  if new.action = '{{action}}' then raise exception 'lab injected audit failure'; end if;
                  return new;
                end; $lab$;
                create trigger {{name}} before insert on public.audit_logs for each row execute function public.{{name}}();
                """);
            try { await test(); }
            finally { await Exec($"drop trigger if exists {name} on public.audit_logs; drop function if exists public.{name}();"); }
        }

        try
        {
            foreach (var (id, role, active) in new[] { (adminId, "admin", true), (managerId, "manager", true), (warehouseUserId, "warehouse", true), (inactiveId, "manager", false) })
                await Exec("""
                    insert into auth.users(id, email, raw_user_meta_data) values (@id, @email, '{}'::jsonb);
                    update public.profiles set role=@role::public.user_role, is_active=@active where id=@id;
                    """, ("id", id), ("email", $"{id:N}@lab.example"), ("role", role), ("active", active));
            await Exec("insert into public.warehouses(id,code,name) values(@id,@code,'HTTP lab')", ("id", warehouseId), ("code", run));
            foreach (var id in products)
                await Exec("""
                    insert into public.products(id,sku,name,cost_price) values(@id,@sku,'HTTP lab',60000);
                    insert into public.inventory_items(warehouse_id,product_id,stock) values(@warehouse,@id,@stock);
                    """, ("id", id), ("sku", $"HTTP-{id:N}"), ("warehouse", warehouseId),
                    ("stock", id == emptyProduct ? 0m : id == lastProduct ? 1m : 100m));
            await Exec("update public.inventory_items set stock=101 where warehouse_id=@warehouse and product_id=@product", ("warehouse", warehouseId), ("product", webhookProductId));
            await Exec("insert into public.channel_connections(id,type,account_name,status) values(@id,'shopee',@name,'connected')", ("id", channelConnectionId), ("name", run));
            await Exec("insert into public.channel_sku_mappings(channel_connection_id,product_id,channel_sku) values(@connection,@product,@sku)", ("connection", channelConnectionId), ("product", webhookProductId), ("sku", $"WEBHOOK-{run}"));

            var create = Request("main");
            await Send(HttpMethod.Post, "/api/v1/orders", create, null, 401);
            await Send(HttpMethod.Post, "/api/v1/orders", create, "invalid", 401);
            await Send(HttpMethod.Post, "/api/v1/orders", create, Token(managerId, "wrong-issuer"), 401);
            await Send(HttpMethod.Post, "/api/v1/orders", create, Token(managerId, expired: true), 401);
            await Send(HttpMethod.Post, "/api/v1/orders", create, Token(inactiveId), 403);
            await Post("/api/v1/orders", create, 403, worker);
            Console.WriteLine("PASS HTTP: JWT validation, inactive profile and warehouse create denial (401/403).");

            var created = await Post("/api/v1/orders", create, 201);
            var orderId = created.GetProperty("id").GetGuid();
            var itemId = created.GetProperty("items")[0].GetProperty("id").GetGuid();
            Check(created.GetProperty("total").GetDecimal() == 240000m, "calculated order total");
            Check(created.GetProperty("items")[0].GetProperty("unitCost").GetDecimal() == 60000m, "catalog cost snapshot");
            await State(orderId, "pending", 100m, 2m);
            await Exec("update public.products set is_active=false,cost_price=90000 where id=@id", ("id", productId));
            var replay = await Post("/api/v1/orders", create);
            Check(replay.GetProperty("id").GetGuid() == orderId && replay.GetProperty("items")[0].GetProperty("unitCost").GetDecimal() == 60000m, "replay bypasses changed/inactive catalog");
            await Exec("update public.products set is_active=true,cost_price=60000 where id=@id", ("id", productId));
            await Post("/api/v1/orders", create with { ShippingFee = 1m }, 409);
            await Post("/api/v1/orders", create with { IdempotencyKey = $"{run}:duplicate-number" }, 409);
            await Post("/api/v1/orders", Request("unknown-product", product: Guid.NewGuid()), 400);
            await Post("/api/v1/orders", Request("bad-warehouse") with { WarehouseId = Guid.NewGuid() }, 400);
            await Post("/api/v1/orders", Request("bad-customer") with { CustomerId = Guid.NewGuid() }, 400);
            await Post("/api/v1/orders", Request("null-items") with { Items = null! }, 400);
            await Post("/api/v1/orders", Request("negative", -1m), 400);
            Console.WriteLine("PASS HTTP: atomic create/reserve, stable replay/snapshot and invalid input/reference handling.");

            var receiptRequest = new InventoryChangeRequest(warehouseId, firstProduct, 5m, $"{run}:receipt");
            var receipt = await Post("/api/v1/inventory/receipts", receiptRequest, token: worker);
            var receiptTransactionId = receipt.GetProperty("transactionId").GetGuid();
            Check(await Number("select stock from public.inventory_items where warehouse_id=@warehouse and product_id=@product", ("warehouse", warehouseId), ("product", firstProduct)) == 105m, "receipt changes stock");
            Check(await Number("select count(*) from public.audit_logs where action='inventory.received' and entity_id=@id and actor_id=@actor", ("id", receiptTransactionId), ("actor", warehouseUserId)) == 1, "receipt creates warehouse audit");
            await Post("/api/v1/inventory/receipts", receiptRequest, 409, worker);
            Check(await Number("select count(*) from public.stock_transactions where idempotency_key=@key", ("key", receiptRequest.IdempotencyKey!)) == 1, "receipt replay writes one ledger row");
            var adjustmentRequest = new InventoryChangeRequest(warehouseId, firstProduct, -3m, $"{run}:adjustment");
            var adjustment = await Post("/api/v1/inventory/adjustments", adjustmentRequest, token: worker);
            var adjustmentTransactionId = adjustment.GetProperty("transactionId").GetGuid();
            Check(await Number("select count(*) from public.audit_logs where action='inventory.adjusted' and entity_id=@id and actor_id=@actor", ("id", adjustmentTransactionId), ("actor", warehouseUserId)) == 1, "adjustment creates warehouse audit");
            var failedReceipt = new InventoryChangeRequest(warehouseId, firstProduct, 1m, $"{run}:receipt-audit-fail");
            await FailAuditAction("inventory.received", async () => { await Post("/api/v1/inventory/receipts", failedReceipt, 500, worker); });
            Check(await Number("select stock from public.inventory_items where warehouse_id=@warehouse and product_id=@product", ("warehouse", warehouseId), ("product", firstProduct)) == 102m, "receipt audit failure rolls back stock");
            Check(await Number("select count(*) from public.stock_transactions where idempotency_key=@key", ("key", failedReceipt.IdempotencyKey!)) == 0, "receipt audit failure rolls back ledger");
            Console.WriteLine("PASS HTTP day 5: manual receipt/adjustment audit, replay and rollback.");

            var shortage = Request("partial-shortage") with { Items = [new(firstProduct, 1m, 100m), new(emptyProduct, 1m, 100m)] };
            await Post("/api/v1/orders", shortage, 409);
            Check(await Number("select reserved from public.inventory_items where product_id=@id", ("id", firstProduct)) == 0, "partial reserve rolled back");
            Check(await Number("select count(*) from public.orders where idempotency_key=@key", ("key", shortage.IdempotencyKey)) == 0, "shortage order rolled back");
            Check(await Number("select count(*) from public.inventory_reservations where product_id=@id", ("id", firstProduct)) == 0, "shortage reservation rolled back");
            Check(await Number("select count(*) from public.stock_transactions where product_id=@id and reference_type='order'", ("id", firstProduct)) == 0, "shortage order ledger rolled back");
            var auditRequest = Request("audit-fail");
            await FailAudit("order.created", auditRequest.OrderNumber,
                async () => { await Post("/api/v1/orders", auditRequest, 500); });
            Check(await Number("select reserved from public.inventory_items where product_id=@id", ("id", productId)) == 2, "audit failure restores reserve");
            Check(await Number("select count(*) from public.orders where idempotency_key=@key", ("key", auditRequest.IdempotencyKey)) == 0, "audit failure removes new order");
            var auditRetry = await Post("/api/v1/orders", auditRequest, 201);
            await Post($"/api/v1/orders/{auditRetry.GetProperty("id").GetGuid()}/cancel", new CancelOrderRequest($"{run}:audit-clean", "Cleanup"));
            Console.WriteLine("PASS HTTP: later-line shortage and audit failure roll back create/reserve; retry succeeds.");

            await Post($"/api/v1/orders/{orderId}/ship", new ShipOrderRequest($"{run}:early-ship"), 409, worker);
            await Post($"/api/v1/orders/{orderId}/process", new OrderProgressRequest($"{run}:early-process"), 409, worker);
            var confirm = new OrderProgressRequest($"{run}:confirm");
            await Post($"/api/v1/orders/{orderId}/confirm", confirm, 403, worker);
            await Post($"/api/v1/orders/{orderId}/confirm", confirm);
            Check((await Post($"/api/v1/orders/{orderId}/confirm", confirm)).GetProperty("replayed").GetBoolean(), "confirm replay");
            var process = new OrderProgressRequest($"{run}:process");
            await Post($"/api/v1/orders/{orderId}/process", process, token: worker);
            Check((await Post($"/api/v1/orders/{orderId}/process", process, token: worker)).GetProperty("replayed").GetBoolean(), "process replay");
            var ship = new ShipOrderRequest($"{run}:ship");
            await FailAudit("order.shipped", create.OrderNumber,
                async () => { await Post($"/api/v1/orders/{orderId}/ship", ship, 500, worker); });
            await State(orderId, "processing", 100m, 2m);
            await Post($"/api/v1/orders/{orderId}/ship", ship, token: worker);
            Check((await Post($"/api/v1/orders/{orderId}/ship", ship, token: worker)).GetProperty("replayed").GetBoolean(), "ship replay");
            await State(orderId, "shipped", 98m, 0m);
            var warehouseDetail = await Send(HttpMethod.Get, $"/api/v1/orders/{orderId}", null, worker, 200);
            Check(warehouseDetail.GetProperty("items")[0].GetProperty("unitCost").ValueKind == JsonValueKind.Null, "warehouse order response hides unit cost");
            await Post($"/api/v1/orders/{orderId}/cancel", new CancelOrderRequest($"{run}:late-cancel", "Too late"), 409);
            Console.WriteLine("PASS HTTP: confirm/process/ship lifecycle, transition replay, role checks and cost redaction.");

            var cancelBody = Request("cancel", 3m);
            var toCancel = (await Post("/api/v1/orders", cancelBody, 201)).GetProperty("id").GetGuid();
            var cancel = new CancelOrderRequest($"{run}:cancel", "Customer changed mind");
            await Post($"/api/v1/orders/{toCancel}/cancel", cancel, 403, worker);
            await FailAudit("order.cancelled", cancelBody.OrderNumber,
                async () => { await Post($"/api/v1/orders/{toCancel}/cancel", cancel, 500); });
            await State(toCancel, "pending", 98m, 3m);
            await Post($"/api/v1/orders/{toCancel}/cancel", cancel);
            Check((await Post($"/api/v1/orders/{toCancel}/cancel", cancel)).GetProperty("replayed").GetBoolean(), "cancel replay");
            await Post($"/api/v1/orders/{toCancel}/cancel", cancel with { Reason = "Different" }, 409);
            await State(toCancel, "cancelled", 98m, 0m);
            await Exec("insert into public.orders(id,order_number,status) values(@id,@number,'pending')", ("id", legacyId), ("number", $"{run}-legacy"));
            await Post($"/api/v1/orders/{legacyId}/cancel", new CancelOrderRequest($"{run}:legacy", "Legacy order"));
            Check(await Number("select count(*) from public.stock_transactions where reference_id=@id", ("id", legacyId)) == 0, "legacy cancel does not fabricate stock mutation");
            Console.WriteLine("PASS HTTP: cancel/release rollback and retry; legacy pending cancellation leaves stock untouched.");

            var concurrentBody = Request("concurrent", 1m);
            var concurrent = await Task.WhenAll(Enumerable.Range(0, 8).Select(async _ =>
            {
                using var message = new HttpRequestMessage(HttpMethod.Post, "/api/v1/orders") { Content = JsonContent.Create(concurrentBody) };
                message.Headers.Authorization = new("Bearer", manager);
                using var response = await client.SendAsync(message);
                var json = await response.Content.ReadFromJsonAsync<JsonElement>();
                return (Status: (int)response.StatusCode, Id: json.GetProperty("id").GetGuid());
            }));
            Check(concurrent.Count(x => x.Status == 201) == 1 && concurrent.Count(x => x.Status == 200) == 7, "8 creates produce 1+7");
            Check(concurrent.Select(x => x.Id).Distinct().Count() == 1, "same order returned concurrently");
            var secondId = concurrent[0].Id;
            await Post($"/api/v1/orders/{secondId}/confirm", new OrderProgressRequest($"{run}:second-confirm"));
            await Post($"/api/v1/orders/{secondId}/process", new OrderProgressRequest($"{run}:second-process"), token: worker);
            await Post($"/api/v1/orders/{secondId}/ship", new ShipOrderRequest($"{run}:second-ship"), token: worker);
            var raceBodies = new[] { Request("last-a", 1m, lastProduct), Request("last-b", 1m, lastProduct) };
            var raceStatuses = await Task.WhenAll(raceBodies.Select(async body =>
            {
                using var message = new HttpRequestMessage(HttpMethod.Post, "/api/v1/orders") { Content = JsonContent.Create(body) };
                message.Headers.Authorization = new("Bearer", manager);
                using var response = await client.SendAsync(message);
                return (int)response.StatusCode;
            }));
            Check(raceStatuses.Count(x => x == 201) == 1 && raceStatuses.Count(x => x == 409) == 1, "last-unit HTTP race");
            Check(await Number("select reserved from public.inventory_items where product_id=@id", ("id", lastProduct)) == 1, "no oversell");
            Console.WriteLine("PASS HTTP: concurrent create idempotency and two orders racing for last unit.");

            string WebhookBody(int number) => JsonSerializer.Serialize(new
            {
                eventId = $"{run}-webhook-{number}", eventType = "order.ready_to_ship",
                externalOrderId = $"{run}-webhook-order-{number}", warehouseId,
                tax = 0m, shippingFee = 0m,
                items = new[] { new { channelSku = $"WEBHOOK-{run}", quantity = 1m, unitPrice = 100000m } }
            }, new JsonSerializerOptions(JsonSerializerDefaults.Web));
            var webhookBodies = Enumerable.Range(1, 100).Select(WebhookBody).ToArray();
            var webhookResults = new List<(int Status, string Body)>();
            foreach (var body in webhookBodies) webhookResults.Add(await SendWebhook(body));
            var webhookFailures = string.Join("; ", webhookResults.Where(x => x.Status != 202).Take(3).Select(x => $"{x.Status}:{x.Body}"));
            Check(webhookResults.All(x => x.Status == 202), $"100 valid HMAC webhooks accepted without oversell ({webhookFailures})");
            var webhookOrderCount = await Number("select count(*) from public.orders where order_number like @prefix", ("prefix", run + "-webhook-order-%"));
            Check(webhookOrderCount == 100, $"100 webhook events create 100 orders (orders={webhookOrderCount})");
            Check(await Number("select reserved from public.inventory_items where warehouse_id=@warehouse and product_id=@product", ("warehouse", warehouseId), ("product", webhookProductId)) == 100, "100 webhook reservations never exceed stock");
            var replayWebhook = await SendWebhook(webhookBodies[0]);
            Check(replayWebhook.Status == 200, "webhook replay returns stable result");
            Check(await Number("select count(*) from public.orders where order_number like @prefix", ("prefix", run + "-webhook-order-%")) == 100, "webhook replay creates no duplicate order");

            var retryBody = WebhookBody(101);
            await Exec("""
                insert into public.webhook_delivery_logs(channel_connection_id,event_type,idempotency_key,payload,status,retry_count,retryable,next_retry_at)
                values(@connection,'order.ready_to_ship',@key,@payload::jsonb,'failed',1,true,now())
                """, ("connection", channelConnectionId), ("key", $"webhook:{channelConnectionId:N}:{run}-webhook-101"), ("payload", retryBody));
            using (var scope = factory.Services.CreateScope())
                await scope.ServiceProvider.GetRequiredService<WebhookSimulatorService>().RetryDueAsync();
            Check(await Number("select count(*) from public.orders where order_number like @prefix", ("prefix", run + "-webhook-order-%")) == 101, "retry worker processes due webhook once");
            Check(await Number("select count(*) from public.webhook_delivery_logs where channel_connection_id=@connection and status='processed'", ("connection", channelConnectionId)) == 101, "retry worker marks delivery processed");
            Console.WriteLine("PASS HTTP day 5: 100 HMAC webhooks, replay safety, no oversell and retry worker.");

            var returnId = Guid.NewGuid();
            var returnBody = new CreateReturnRequest(returnId, orderId, "Damaged", [new(itemId, 1m)]);
            await Post("/api/v1/returns", returnBody, 403, worker);
            await FailAudit("return.requested", create.OrderNumber,
                async () => { await Post("/api/v1/returns", returnBody, 500); });
            Check(await Number("select count(*) from public.return_requests where id=@id", ("id", returnId)) == 0, "return audit failure rolls back header");
            Check(await Number("select count(*) from public.return_items where return_request_id=@id", ("id", returnId)) == 0, "return audit failure rolls back lines");
            await Post("/api/v1/returns", returnBody, 201);
            await Post("/api/v1/returns", returnBody);
            await Send(HttpMethod.Get, $"/api/v1/returns/{returnId}", null, worker, 200);
            await Post("/api/v1/returns", returnBody with { Reason = "Changed" }, 409);
            await Post("/api/v1/returns", returnBody with { Id = Guid.NewGuid(), Items = [new(itemId, 2m)] }, 409);
            await Post("/api/v1/returns", returnBody with { Id = Guid.NewGuid(), Items = [new(itemId, 0m)] }, 400);
            await Post("/api/v1/returns", returnBody with { Id = Guid.NewGuid(), OrderId = toCancel }, 409);
            var secondDetail = await Send(HttpMethod.Get, $"/api/v1/orders/{secondId}", null, manager, 200);
            var secondItem = secondDetail.GetProperty("items")[0].GetProperty("id").GetGuid();
            var returnRaces = await Task.WhenAll(Enumerable.Range(0, 2).Select(async _ =>
            {
                using var message = new HttpRequestMessage(HttpMethod.Post, "/api/v1/returns")
                { Content = JsonContent.Create(new CreateReturnRequest(Guid.NewGuid(), secondId, "Race", [new(secondItem, 1m)])) };
                message.Headers.Authorization = new("Bearer", manager);
                using var response = await client.SendAsync(message);
                return (int)response.StatusCode;
            }));
            Check(returnRaces.Count(x => x == 201) == 1 && returnRaces.Count(x => x == 409) == 1, "return race respects remaining quantity");
            Console.WriteLine("PASS HTTP day 4: return request/read/replay/role/quantity and concurrent over-return prevention.");

            var feeId = Guid.NewGuid();
            var fee = new { id = feeId, feeType = "commission", amount = 10000m };
            await Post($"/api/v1/orders/{orderId}/fees", fee, 403, worker);
            await Send(HttpMethod.Get, $"/api/v1/orders/{orderId}/fees", null, worker, 403);
            await FailAudit("fee.created", create.OrderNumber,
                async () => { await Post($"/api/v1/orders/{orderId}/fees", fee, 500); });
            Check(await Number("select count(*) from public.order_fee_breakdowns where id=@id", ("id", feeId)) == 0, "fee audit failure rolls back fee");
            await Post($"/api/v1/orders/{orderId}/fees", fee, 201);
            await Post($"/api/v1/orders/{orderId}/fees", fee, 409);
            var fees = await Send(HttpMethod.Get, $"/api/v1/orders/{orderId}/fees", null, manager, 200);
            Check(fees.GetArrayLength() == 1 && fees[0].GetProperty("amount").GetDecimal() == 10000m, "fee read and no duplicate");
            await Post($"/api/v1/orders/{orderId}/fees", new { id=Guid.NewGuid(), feeType="unknown", amount=1m }, 400);
            await Post($"/api/v1/orders/{orderId}/fees", new { id=Guid.NewGuid(), feeType="ads", amount=-1m }, 400);
            var profit = await Send(HttpMethod.Get, $"/api/v1/orders/{orderId}/profit-estimate", null, manager, 200);
            Check(profit.GetProperty("estimatedProfit").GetDecimal() == 100000m, "estimate 230000 - 120000 - 10000");
            await Send(HttpMethod.Get, $"/api/v1/orders/{orderId}/profit-estimate", null, worker, 403);
            await Send(HttpMethod.Get, $"/api/v1/orders/{orderId}/profit-estimate", null, Token(adminId), 200);
            var missing = Guid.NewGuid();
            await Send(HttpMethod.Get, $"/api/v1/orders/{missing}/fees", null, manager, 404);
            await Post($"/api/v1/orders/{missing}/fees", new { id=Guid.NewGuid(), feeType="ads", amount=1m }, 404);
            await Post($"/api/v1/orders/{missing}/cancel", new CancelOrderRequest($"{run}:missing-cancel", "Missing"), 404);
            await Post($"/api/v1/orders/{missing}/ship", new ShipOrderRequest($"{run}:missing-ship"), 404, worker);
            await Post("/api/v1/returns", returnBody with { Id=Guid.NewGuid(), OrderId=missing }, 404);
            Check(await Number("select count(*) from public.audit_logs where entity_id=@id and action='fee.created'", ("id", feeId)) == 1, "fee audit once");
            Console.WriteLine("PASS HTTP day 4: fee validation/read/audit/conflict, finance role and missing resources.");
            await Post(
    $"/api/v1/orders/{orderId}/fees",
    new
    {
        id = Guid.NewGuid(),
        feeType = "ads",
        amount = 20000m
    },
    201);

            var contribution = await Send(
                HttpMethod.Get,
                $"/api/v1/orders/{orderId}/contribution",
                null,
                manager,
                200);

            Check(
                contribution.GetProperty("cm1").GetDecimal() == 110000m,
                "CM1: revenue minus cost");

            Check(
                contribution.GetProperty("cm2").GetDecimal() == 100000m,
                "CM2: subtract operating fees");

            Check(
                contribution.GetProperty("cm3").GetDecimal() == 80000m,
                "CM3: subtract ads once");

            await Send(
                HttpMethod.Get,
                $"/api/v1/orders/{orderId}/contribution",
                null,
                worker,
                403);

            await Send(
                HttpMethod.Get,
                $"/api/v1/orders/{missing}/contribution",
                null,
                manager,
                404);

            Console.WriteLine(
                "PASS HTTP day 5: CM1-CM3, advertising allocation and role.");
            try
            {
                await Exec(
                    "update public.order_items set unit_cost = null where id = @id",
                    ("id", itemId));

                var incomplete = await Send(
                    HttpMethod.Get,
                    $"/api/v1/orders/{orderId}/contribution",
                    null,
                    manager,
                    200);

                Check(
                    !incomplete.GetProperty("hasCompleteCost").GetBoolean(),
                    "Missing cost is reported");

                foreach (var field in new[] { "costOfGoods", "cm1", "cm2", "cm3" })
                {
                    Check(
                        incomplete.GetProperty(field).ValueKind == JsonValueKind.Null,
                        $"Missing cost returns null for {field}");
                }
            }
            finally
            {
                await Exec(
                    "update public.order_items set unit_cost = 60000 where id = @id",
                    ("id", itemId));
            }

            Console.WriteLine(
                "PASS HTTP day 5: incomplete cost returns null contribution.");
            await Exec(
    """
    insert into public.ledger_accounts(id, code, name)
    values
        (@debitId, @debitCode, 'Lab debit account'),
        (@creditId, @creditCode, 'Lab credit account');
    """,
    ("debitId", debitAccountId),
    ("debitCode", $"DEBIT-{run}"),
    ("creditId", creditAccountId),
    ("creditCode", $"CREDIT-{run}"));

            var journalRequest = new CreateJournalRequest(
                journalId,
                $"JOURNAL-{run}",
                "manual",
                null,
                [
                    new JournalLine(debitAccountId, 100000m, 0m),
        new JournalLine(creditAccountId, 0m, 100000m)
                ]);

            var journalCreated = await Post(
                "/api/v1/journals",
                journalRequest,
                201);

            Check(
                journalCreated.GetProperty("id").GetGuid() == journalId,
                "Created journal ID");

            Check(
                journalCreated.GetProperty("lines").GetArrayLength() == 2,
                "Created journal has two lines");

            Console.WriteLine(
                "PASS HTTP day 5: balanced journal creation.");
            var journalReplay = await Post(
    "/api/v1/journals",
    journalRequest,
    200);

            Check(
                journalReplay.GetProperty("id").GetGuid() == journalId,
                "Journal replay keeps the same ID");

            Check(
                journalReplay.GetProperty("postedAt").GetString()
                    == journalCreated.GetProperty("postedAt").GetString(),
                "Journal replay keeps postedAt");

            Check(
                await Number(
                    "select count(*) from public.journal_entries where id=@id",
                    ("id", journalId)) == 1,
                "Journal header is written once");

            Check(
                await Number(
                    "select count(*) from public.journal_lines where journal_entry_id=@id",
                    ("id", journalId)) == 2,
                "Journal lines are written once");

            Check(
                await Number(
                    """
        select count(*) from public.audit_logs
        where entity_id=@id
          and entity_type='journal_entries'
          and action='journal.posted'
        """,
                    ("id", journalId)) == 1,
                "Journal audit is written once");

            Console.WriteLine(
                "PASS HTTP day 5: journal replay does not duplicate data.");
            var changedJournal = journalRequest with
            {
                Lines =
    [
        new JournalLine(debitAccountId, 120000m, 0m),
        new JournalLine(creditAccountId, 0m, 120000m)
    ]
            };

            await Post("/api/v1/journals", changedJournal, 409);

            var unbalancedJournal = journalRequest with
            {
                Lines =
                [
                    new JournalLine(debitAccountId, 100000m, 0m),
        new JournalLine(creditAccountId, 0m, 90000m)
                ]
            };

            await Post("/api/v1/journals", unbalancedJournal, 400);

            await Post(
                "/api/v1/journals",
                journalRequest,
                403,
                worker);

            await Send(
                HttpMethod.Get,
                $"/api/v1/journals/{journalId}",
                null,
                worker,
                403);

            var journalRead = await Send(
                HttpMethod.Get,
                $"/api/v1/journals/{journalId}",
                null,
                manager,
                200);

            Check(
                journalRead.GetProperty("lines")[0]
                    .GetProperty("debitAmount").GetDecimal()
                    + journalRead.GetProperty("lines")[1]
                    .GetProperty("debitAmount").GetDecimal() == 100000m,
                "Conflicting request does not change journal amounts");

            await Send(
                HttpMethod.Get,
                $"/api/v1/journals/{Guid.NewGuid()}",
                null,
                manager,
                404);

            Console.WriteLine(
                "PASS HTTP day 5: journal conflict, validation and authorization.");
            await Exec(
    """
    delete from public.audit_logs
    where entity_id=@id
      and entity_type='journal_entries'
      and action='journal.posted';

    delete from public.journal_entries where id=@id;
    """,
    ("id", journalId));

            await FailAuditAction(
                "journal.posted",
                async () =>
                {
                    await Post("/api/v1/journals", journalRequest, 500);
                });

            Check(
                await Number(
                    "select count(*) from public.journal_entries where id=@id",
                    ("id", journalId)) == 0,
                "Audit failure rolls back journal header");

            Check(
                await Number(
                    "select count(*) from public.journal_lines where journal_entry_id=@id",
                    ("id", journalId)) == 0,
                "Audit failure rolls back journal lines");

            Check(
                await Number(
                    """
        select count(*) from public.audit_logs
        where entity_id=@id
          and entity_type='journal_entries'
          and action='journal.posted'
        """,
                    ("id", journalId)) == 0,
                "Failed journal has no audit");

            await Post("/api/v1/journals", journalRequest, 201);

            Console.WriteLine(
                "PASS HTTP day 5: journal audit failure rolls back; retry succeeds.");
            await Exec(
    """
    delete from public.audit_logs
    where entity_id=@id
      and entity_type='journal_entries'
      and action='journal.posted';

    delete from public.journal_entries where id=@id;
    """,
    ("id", journalId));

            var journalResponses = await Task.WhenAll(
                Enumerable.Range(0, 2).Select(async _ =>
                {
                    using var message = new HttpRequestMessage(
                        HttpMethod.Post,
                        "/api/v1/journals")
                    {
                        Content = JsonContent.Create(journalRequest)
                    };

                    message.Headers.Authorization =
                        new AuthenticationHeaderValue("Bearer", manager);

                    using var response = await client.SendAsync(message);

                    return (
                        Status: (int)response.StatusCode,
                        Body: await response.Content
                            .ReadFromJsonAsync<JsonElement>());
                }));

            Check(
                journalResponses.Count(result => result.Status == 201) == 1
                    && journalResponses.Count(result => result.Status == 200) == 1,
                "Concurrent journal requests produce one create and one replay");

            Check(
                journalResponses.All(result =>
                    result.Body.GetProperty("id").GetGuid() == journalId),
                "Concurrent journal requests return the same ID");

            Check(
                await Number(
                    "select count(*) from public.journal_entries where id=@id",
                    ("id", journalId)) == 1,
                "Concurrent journal has one header");

            Check(
                await Number(
                    "select count(*) from public.journal_lines where journal_entry_id=@id",
                    ("id", journalId)) == 2,
                "Concurrent journal has two lines");

            Check(
                await Number(
                    """
        select count(*) from public.audit_logs
        where entity_id=@id
          and entity_type='journal_entries'
          and action='journal.posted'
        """,
                    ("id", journalId)) == 1,
                "Concurrent journal has one audit");

            Console.WriteLine(
                "PASS HTTP day 5: concurrent journal requests do not duplicate data.");
            if (args.Contains("--postman"))
                await PostmanLabRunner.RunAsync(root, client, manager, worker, warehouseId, productId, run);
            Console.WriteLine($"PASS HTTP TOTAL: {assertions} assertions; real ASP.NET pipeline/JWT/profile/database, local lab signing key only.");
        }
        finally
        {
            await using var connection = await source.OpenConnectionAsync();
            await using var transaction = await connection.BeginTransactionAsync();
            await using var cleanup = new NpgsqlCommand("""
                create temporary table lab_products_to_remove on commit drop as
                    select product_id from public.inventory_items where warehouse_id=@warehouse;
                create temporary table lab_orders_to_remove on commit drop as
                    select id from public.orders where assigned_warehouse_id=@warehouse or id=@legacy;
                delete from public.inventory_operation_receipts
                    where payload ->> 'OrderId' in (select id::text from lab_orders_to_remove);
                delete from public.webhook_delivery_logs where channel_connection_id=@channelConnection;
                delete from public.channel_connections where id=@channelConnection;
                delete from public.stock_transactions where product_id in (select product_id from lab_products_to_remove);
                delete from public.audit_logs where entity_id in (select id from lab_orders_to_remove) or actor_id=any(@users);
                delete from public.journal_entries where id=@journalId;
                delete from public.ledger_accounts
                where id in (@debitAccountId, @creditAccountId);
                delete from public.return_requests where order_id in (select id from lab_orders_to_remove);
                delete from public.orders where id in (select id from lab_orders_to_remove);
                delete from public.inventory_items where product_id in (select product_id from lab_products_to_remove);
                delete from public.products where id in (select product_id from lab_products_to_remove);
                delete from public.warehouses where id=@warehouse;
                delete from auth.users where id=any(@users);
                """, connection, transaction);
            cleanup.Parameters.AddWithValue("legacy", legacyId);
            cleanup.Parameters.AddWithValue("users", users);
            cleanup.Parameters.AddWithValue("products", products);
            cleanup.Parameters.AddWithValue("warehouse", warehouseId);
            cleanup.Parameters.AddWithValue("channelConnection", channelConnectionId);
            cleanup.Parameters.AddWithValue("journalId", journalId);
            cleanup.Parameters.AddWithValue("debitAccountId", debitAccountId);
            cleanup.Parameters.AddWithValue("creditAccountId", creditAccountId);
            await cleanup.ExecuteNonQueryAsync();
            await transaction.CommitAsync();
            Console.WriteLine("PASS: HTTP lab fixtures cleaned up.");
        }
    }

    private static string FindRoot()
    {
        for (var directory = new DirectoryInfo(AppContext.BaseDirectory); directory is not null; directory = directory.Parent)
            if (File.Exists(Path.Combine(directory.FullName, "backend", "NexusOMS.slnx"))) return directory.FullName;
        throw new InvalidOperationException("Cannot find repository root.");
    }
}
