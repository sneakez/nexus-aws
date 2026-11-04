using System.Data.Common;

namespace NexusOMS.Contracts;

public sealed class InventoryTransactionContext
{
    public DbTransaction Transaction { get; }

    public DbConnection Connection =>
        Transaction.Connection
        ?? throw new InvalidOperationException(
            "Transaction không còn gắn với connection.");

    public InventoryTransactionContext(DbTransaction transaction)
    {
        ArgumentNullException.ThrowIfNull(transaction);
        Transaction = transaction;
    }
}
