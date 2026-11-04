using System.Text.Json;

namespace NexusOMS.OrderingAndFinance;

internal static class OrderCreationPayload
{
    public static string Serialize(CreateOrderRequest request)
    {
        var payload = new
        {
            request.OrderNumber,
            request.CustomerId,
            request.WarehouseId,
            request.Tax,
            request.ShippingFee,
            Items = request.Items
                .OrderBy(item => item.ProductId)
                .Select(item => new
                {
                    item.ProductId,
                    item.Quantity,
                    item.UnitPrice
                })
                .ToArray()
        };

        return JsonSerializer.Serialize(payload);
    }
}
