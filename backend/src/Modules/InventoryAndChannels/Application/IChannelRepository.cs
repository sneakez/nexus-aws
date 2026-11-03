namespace NexusOMS.InventoryAndChannels;

public interface IChannelRepository
{
    Task<IReadOnlyList<ChannelConnection>> ListConnectionsAsync(CancellationToken cancellationToken = default);
    Task<ChannelConnection?> GetConnectionAsync(Guid id, CancellationToken cancellationToken = default);
    Task<ChannelConnection> CreateConnectionAsync(ChannelConnectionInput input, CancellationToken cancellationToken = default);
    Task<ChannelConnection?> UpdateConnectionAsync(Guid id, ChannelConnectionInput input, CancellationToken cancellationToken = default);
    Task<bool> DeleteConnectionAsync(Guid id, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<ChannelSkuMapping>> ListMappingsAsync(Guid connectionId, CancellationToken cancellationToken = default);
    Task<ChannelSkuMapping> CreateMappingAsync(Guid connectionId, ChannelSkuMappingInput input, CancellationToken cancellationToken = default);
    Task<bool> DeleteMappingAsync(Guid connectionId, Guid id, CancellationToken cancellationToken = default);
}
