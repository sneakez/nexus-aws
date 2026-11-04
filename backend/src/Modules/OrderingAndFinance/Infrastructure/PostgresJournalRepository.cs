using Npgsql;
using NpgsqlTypes;
namespace NexusOMS.OrderingAndFinance;

public sealed class PostgresJournalRepository(
    NpgsqlDataSource dataSource) : IJournalRepository
{
    public async Task<JournalDetail?> GetAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        await using var connection =
            await dataSource.OpenConnectionAsync(cancellationToken);

        return await ReadAsync(
            connection, null, id, cancellationToken);
    }

    private static async Task<JournalDetail?> ReadAsync(
        NpgsqlConnection connection,
        NpgsqlTransaction? transaction,
        Guid id,
        CancellationToken cancellationToken)
    {
        const string sql = """
            select id, entry_number, event_source,
                   reference_id, posted_at
            from public.journal_entries
            where id = @id;

            select account_id, debit_amount, credit_amount
            from public.journal_lines
            where journal_entry_id = @id
            order by account_id, debit_amount, credit_amount, id;
            """;

        await using var command =
            new NpgsqlCommand(sql, connection, transaction);

        command.Parameters.AddWithValue("id", id);

        await using var reader =
            await command.ExecuteReaderAsync(cancellationToken);

        if (!await reader.ReadAsync(cancellationToken))
            return null;

        var lines = new List<JournalLine>();

        var journal = new JournalDetail(
            reader.GetGuid(0),
            reader.GetString(1),
            reader.IsDBNull(2) ? null : reader.GetString(2),
            reader.IsDBNull(3) ? null : reader.GetGuid(3),
            reader.GetFieldValue<DateTimeOffset>(4),
            lines);

        await reader.NextResultAsync(cancellationToken);

        while (await reader.ReadAsync(cancellationToken))
        {
            lines.Add(new JournalLine(
                reader.GetGuid(0),
                reader.GetDecimal(1),
                reader.GetDecimal(2)));
        }

        return journal;
    }
    private static async Task LockJournalAsync(
    NpgsqlConnection connection,
    NpgsqlTransaction transaction,
    Guid journalId,
    CancellationToken cancellationToken)
    {
        const string sql = """
        select pg_advisory_xact_lock(
            hashtextextended(@key, 0));
        """;

        await using var command =
            new NpgsqlCommand(sql, connection, transaction);

        command.Parameters.AddWithValue(
            "key", $"journal-create:{journalId:N}");

        await command.ExecuteNonQueryAsync(cancellationToken);
    }
    private static async Task<CreateJournalResult?> ReadReplayAsync(
    NpgsqlConnection connection,
    NpgsqlTransaction transaction,
    CreateJournalRequest request,
    CancellationToken cancellationToken)
    {
        var existing = await ReadAsync(
            connection, transaction, request.Id, cancellationToken);

        if (existing is null)
            return null;

        var existingLines = existing.Lines
            .OrderBy(line => line.AccountId)
            .ThenBy(line => line.DebitAmount)
            .ThenBy(line => line.CreditAmount);

        var requestedLines = request.Lines
            .OrderBy(line => line.AccountId)
            .ThenBy(line => line.DebitAmount)
            .ThenBy(line => line.CreditAmount);

        var sameRequest =
            existing.EntryNumber == request.EntryNumber
            && existing.EventSource == request.EventSource
            && existing.ReferenceId == request.ReferenceId
            && existingLines.SequenceEqual(requestedLines);

        if (!sameRequest)
            throw new JournalConflictException(
                "Mã journal đã được dùng với nội dung khác.");

        return new CreateJournalResult(existing, true);
    }
    private static async Task InsertJournalAsync(
    NpgsqlConnection connection,
    NpgsqlTransaction transaction,
    CreateJournalRequest request,
    CancellationToken cancellationToken)
    {
        const string headerSql = """
        insert into public.journal_entries (
            id, entry_number, event_source, reference_id)
        values (
            @id, @entryNumber, @eventSource, @referenceId);
        """;

        await using (var command =
            new NpgsqlCommand(headerSql, connection, transaction))
        {
            command.Parameters.AddWithValue("id", request.Id);
            command.Parameters.AddWithValue(
                "entryNumber", request.EntryNumber);
            command.Parameters.AddWithValue(
                "eventSource", request.EventSource);

            command.Parameters.Add(
                "referenceId", NpgsqlDbType.Uuid).Value =
                (object?)request.ReferenceId ?? DBNull.Value;

            await command.ExecuteNonQueryAsync(cancellationToken);
        }

        const string lineSql = """
        insert into public.journal_lines (
            journal_entry_id, account_id,
            debit_amount, credit_amount)
        values (
            @journalId, @accountId, @debit, @credit);
        """;

        foreach (var line in request.Lines)
        {
            await using var command =
                new NpgsqlCommand(lineSql, connection, transaction);

            command.Parameters.AddWithValue("journalId", request.Id);
            command.Parameters.AddWithValue("accountId", line.AccountId);
            command.Parameters.AddWithValue("debit", line.DebitAmount);
            command.Parameters.AddWithValue("credit", line.CreditAmount);

            await command.ExecuteNonQueryAsync(cancellationToken);
        }
    }
    private static async Task InsertAuditAsync(
    NpgsqlConnection connection,
    NpgsqlTransaction transaction,
    CreateJournalRequest request,
    Guid actorId,
    CancellationToken cancellationToken)
    {
        const string sql = """
        insert into public.audit_logs (
            actor_id, action, entity_type, entity_id, metadata)
        values (
            @actorId, 'journal.posted', 'journal_entries', @journalId,
            jsonb_build_object(
                'entryNumber', @entryNumber::text,
                'totalDebit', @totalDebit::numeric,
                'totalCredit', @totalCredit::numeric,
                'lineCount', @lineCount::integer));
        """;

        await using var command =
            new NpgsqlCommand(sql, connection, transaction);

        command.Parameters.AddWithValue("actorId", actorId);
        command.Parameters.AddWithValue("journalId", request.Id);
        command.Parameters.AddWithValue(
            "entryNumber", request.EntryNumber);
        command.Parameters.AddWithValue(
            "totalDebit", request.Lines.Sum(line => line.DebitAmount));
        command.Parameters.AddWithValue(
            "totalCredit", request.Lines.Sum(line => line.CreditAmount));
        command.Parameters.AddWithValue(
            "lineCount", request.Lines.Count);

        await command.ExecuteNonQueryAsync(cancellationToken);
    }
    public async Task<CreateJournalResult> CreateAsync(
    CreateJournalRequest request,
    Guid actorId,
    CancellationToken cancellationToken = default)
    {
        JournalRules.Validate(request.Lines);

        await using var connection =
            await dataSource.OpenConnectionAsync(cancellationToken);

        await using var transaction =
            await connection.BeginTransactionAsync(cancellationToken);

        await LockJournalAsync(
            connection, transaction, request.Id, cancellationToken);

        var replay = await ReadReplayAsync(
            connection, transaction, request, cancellationToken);

        if (replay is not null)
            return replay;

        try
        {
            await InsertJournalAsync(
                connection, transaction, request, cancellationToken);

            await InsertAuditAsync(
                connection, transaction, request,
                actorId, cancellationToken);

            var created = await ReadAsync(
                connection, transaction, request.Id, cancellationToken)
                ?? throw new InvalidOperationException(
                    "Không đọc được journal vừa tạo.");

            await transaction.CommitAsync(cancellationToken);

            return new CreateJournalResult(created, false);
        }
        catch (PostgresException exception) when (
            exception.SqlState == PostgresErrorCodes.UniqueViolation
            && exception.ConstraintName is
                "journal_entries_pkey" or "journal_entries_entry_number_key")
        {
            throw new JournalConflictException(
                "Mã journal hoặc số chứng từ đã tồn tại.");
        }
        catch (PostgresException exception) when (
            exception.SqlState == PostgresErrorCodes.ForeignKeyViolation
            && exception.ConstraintName == "journal_lines_account_id_fkey")
        {
            throw new ArgumentException(
                "Tài khoản kế toán không tồn tại.");
        }
    }
}
