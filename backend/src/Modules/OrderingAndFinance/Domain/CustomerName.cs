namespace NexusOMS.OrderingAndFinance;

public static class CustomerName
{
    public static string Normalize(string? value)
    {
        var name = value?.Trim() ?? string.Empty;
        if (name.Length is 0 or > 120) throw new ArgumentException("Tên khách hàng phải có từ 1 đến 120 ký tự.");
        return name;
    }
}
