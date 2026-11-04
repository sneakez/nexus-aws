namespace NexusOMS.InventoryAndChannels;

public sealed class InventoryOperationConflictException(string message) : Exception(message);
public sealed class InventoryReservationNotFoundException(string message) : Exception(message);
