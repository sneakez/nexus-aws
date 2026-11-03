namespace NexusOMS.OrderingAndFinance;

public sealed class FeeAlreadyExistsException : Exception
{
    public FeeAlreadyExistsException()
        : base("Mã khoản phí đã tồn tại.")
    {
    }
}
