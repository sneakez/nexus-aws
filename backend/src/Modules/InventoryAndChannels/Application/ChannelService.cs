namespace NexusOMS.InventoryAndChannels;

public sealed class ChannelService(IChannelRepository repository)
{
    public Task<IReadOnlyList<ChannelConnection>> ListConnectionsAsync(CancellationToken cancellationToken = default) => repository.ListConnectionsAsync(cancellationToken);
    public Task<ChannelConnection?> GetConnectionAsync(Guid id, CancellationToken cancellationToken = default) => repository.GetConnectionAsync(id, cancellationToken);
    public Task<ChannelConnection> CreateConnectionAsync(ChannelConnectionInput input, CancellationToken cancellationToken = default) => repository.CreateConnectionAsync(ChannelConnectionInput.Normalize(input.Type, input.AccountName, input.Status), cancellationToken);
    public Task<ChannelConnection?> UpdateConnectionAsync(Guid id, ChannelConnectionInput input, CancellationToken cancellationToken = default) => repository.UpdateConnectionAsync(id, ChannelConnectionInput.Normalize(input.Type, input.AccountName, input.Status), cancellationToken);
    public Task<bool> DeleteConnectionAsync(Guid id, CancellationToken cancellationToken = default) => repository.DeleteConnectionAsync(id, cancellationToken);
    public Task<IReadOnlyList<ChannelSkuMapping>> ListMappingsAsync(Guid connectionId, CancellationToken cancellationToken = default) => repository.ListMappingsAsync(connectionId, cancellationToken);
    public Task<ChannelSkuMapping> CreateMappingAsync(Guid connectionId, ChannelSkuMappingInput input, CancellationToken cancellationToken = default) => repository.CreateMappingAsync(connectionId, ChannelSkuMappingInput.Normalize(input.ProductId, input.ChannelSku), cancellationToken);
    public Task<bool> DeleteMappingAsync(Guid connectionId, Guid id, CancellationToken cancellationToken = default) => repository.DeleteMappingAsync(connectionId, id, cancellationToken);
}
