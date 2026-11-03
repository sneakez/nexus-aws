using Npgsql;
using NexusOMS.Api.Authorization;

namespace NexusOMS.Api.Infrastructure;

public sealed class PostgresProfileRoleReader(NpgsqlDataSource dataSource) : IProfileRoleReader
{
    public async Task<string?> GetActiveRoleAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        await using var command = dataSource.CreateCommand(
            "select role::text from public.profiles where id = @id and is_active = true");
        command.Parameters.AddWithValue("id", userId);
        return await command.ExecuteScalarAsync(cancellationToken) as string;
    }
}
