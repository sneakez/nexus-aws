namespace NexusOMS.Api.Authorization;

public interface IProfileRoleReader
{
    Task<string?> GetActiveRoleAsync(Guid userId, CancellationToken cancellationToken = default);
}
