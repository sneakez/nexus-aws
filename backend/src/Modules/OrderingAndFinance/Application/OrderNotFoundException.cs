namespace NexusOMS.OrderingAndFinance;

public sealed class OrderNotFoundException : Exception
{
    public OrderNotFoundException()
        : base("Không tìm thấy đơn hàng.")
    {
    }
}
