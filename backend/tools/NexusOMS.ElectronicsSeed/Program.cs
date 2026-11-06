using System.Data;
using System.Text;
using System.Text.Json;
using Npgsql;

var mode = args.ElementAtOrDefault(0) ?? "inspect";
var connectionString = Environment.GetEnvironmentVariable("ELECTRONICS_SEED_CONNECTION")
    ?? throw new InvalidOperationException("Missing target connection.");
var config = new NpgsqlConnectionStringBuilder(connectionString);
var project = Environment.GetEnvironmentVariable("ELECTRONICS_EXPECTED_PROJECT");
var local = config.Host is "127.0.0.1" or "localhost";
if (!local && (string.IsNullOrWhiteSpace(project)
    || !(config.Host?.Contains(project, StringComparison.OrdinalIgnoreCase) == true
      || config.Username?.EndsWith("." + project, StringComparison.OrdinalIgnoreCase) == true)))
    throw new InvalidOperationException("Target project identity mismatch.");
await using var connection = new NpgsqlConnection(connectionString);
await connection.OpenAsync();
await using var transaction = await connection.BeginTransactionAsync(IsolationLevel.RepeatableRead);
async Task<string> Scalar(string sql)
{
    await using var command = new NpgsqlCommand(sql, connection, transaction) { CommandTimeout = 180 };
    return Convert.ToString(await command.ExecuteScalarAsync()) ?? "";
}
async Task Execute(string sql)
{
    await using var command = new NpgsqlCommand(sql, connection, transaction) { CommandTimeout = 180 };
    await command.ExecuteNonQueryAsync();
}
var tables = new[] {
    "return_items", "return_requests", "order_fee_breakdowns", "order_operation_receipts",
    "order_status_log", "inventory_operation_receipts", "inventory_reservations",
    "stock_transactions", "webhook_delivery_logs", "order_items", "orders",
    "fulfillment_waves", "channel_sku_mappings", "channel_connections",
    "inventory_items", "warehouse_bins", "products", "brands", "customers", "warehouses", "audit_logs"
};
if (mode == "inspect")
{
    foreach (var table in tables)
        Console.WriteLine(table + "=" + await Scalar("select count(*) from public." + table));
    Console.WriteLine("journal_entries=" + await Scalar("select count(*) from public.journal_entries"));
    Console.WriteLine("journal_references_to_orders=" + await Scalar(
        "select count(*) from public.journal_entries where reference_id in (select id from public.orders)"));
    Console.WriteLine("active_admins=" + await Scalar("select count(*) from public.profiles where role='admin' and is_active"));
    return;
}
var seedFile = Path.GetFullPath(args.ElementAtOrDefault(1) ?? throw new ArgumentException("Seed SQL path required."));
var backupDirectory = Path.GetFullPath(args.ElementAtOrDefault(2) ?? throw new ArgumentException("Backup path required."));
var lockTables = string.Join(",", tables.Select(t => "public." + t));
await Execute("set local lock_timeout='10s'; set local statement_timeout='180s'; lock table " + lockTables + " in access exclusive mode;");
if (await Scalar("select count(*) from public.journal_entries where reference_id in (select id from public.orders union select id from public.return_requests union select id from public.order_fee_breakdowns union select id from public.stock_transactions)") != "0")
    throw new InvalidOperationException("Journal references existing business data. Review references before replacement.");
if (Directory.Exists(backupDirectory) && Directory.EnumerateFileSystemEntries(backupDirectory).Any())
    throw new InvalidOperationException("Backup directory must be empty.");
Directory.CreateDirectory(backupDirectory);
var protectedSnapshot = await Scalar("""
    select jsonb_build_object(
      'profiles',(select coalesce(jsonb_agg(to_jsonb(p) order by id),'[]') from public.profiles p),
      'journals',(select coalesce(jsonb_agg(to_jsonb(j) order by id),'[]') from public.journal_entries j),
      'journal_lines',(select coalesce(jsonb_agg(to_jsonb(l) order by id),'[]') from public.journal_lines l))::text
    """);
await File.WriteAllTextAsync(Path.Combine(backupDirectory, "protected.json"), protectedSnapshot);
var restore = new StringBuilder("begin;\nset local lock_timeout='10s';\nset constraints all deferred;\n");
foreach (var table in tables)
    restore.AppendLine("delete from public." + table + ";");
var counts = new Dictionary<string, long>();
foreach (var table in tables)
{
    var json = await Scalar("select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb)::text from public." + table + " t");
    using var document = JsonDocument.Parse(json);
    counts[table] = document.RootElement.GetArrayLength();
    await File.WriteAllTextAsync(Path.Combine(backupDirectory, table + ".json"), json);
}
foreach (var table in tables.Reverse())
{
    var json = await File.ReadAllTextAsync(Path.Combine(backupDirectory, table + ".json"));
    restore.AppendLine("insert into public." + table + " select * from jsonb_populate_recordset(null::public." + table + ", '" + json.Replace("'", "''") + "'::jsonb);");
}
restore.AppendLine("commit;");
await File.WriteAllTextAsync(Path.Combine(backupDirectory, "restore.sql"), restore.ToString());
await File.WriteAllTextAsync(Path.Combine(backupDirectory, "counts.json"), JsonSerializer.Serialize(counts, new JsonSerializerOptions { WriteIndented = true }));
Console.WriteLine("Backup verified as JSON and saved at " + backupDirectory);
if (mode == "backup")
{
    await transaction.RollbackAsync();
    return;
}
if (mode != "replace")
    throw new ArgumentException("Use inspect, backup or replace.");
foreach (var table in tables)
{
    if (table == "audit_logs") continue;
    await Execute("delete from public." + table);
}
await Execute("""
    delete from public.audit_logs
    where entity_type in ('orders','order_items','order_status_log','order_operation_receipts',
      'return_requests','return_items','order_fee_breakdowns','inventory_items','inventory_reservations',
      'inventory_operation_receipts','stock_transactions','webhook_delivery_logs',
      'products','brands','warehouses','warehouse_bins','customers','channel_connections',
      'channel_sku_mappings','fulfillment_waves')
       or action like 'order.%' or action like 'fee.%' or action like 'return.%'
       or action like 'inventory.%' or action like 'webhook.%';
    """);
await Execute(await File.ReadAllTextAsync(seedFile));
var protectedAfter = await Scalar("""
    select jsonb_build_object(
      'profiles',(select coalesce(jsonb_agg(to_jsonb(p) order by id),'[]') from public.profiles p),
      'journals',(select coalesce(jsonb_agg(to_jsonb(j) order by id),'[]') from public.journal_entries j),
      'journal_lines',(select coalesce(jsonb_agg(to_jsonb(l) order by id),'[]') from public.journal_lines l))::text
    """);
if (protectedAfter != protectedSnapshot)
    throw new InvalidOperationException("Protected profiles or journal data changed.");
await transaction.CommitAsync();
Console.WriteLine("Committed electronics dataset. Login profiles and journals preserved.");
