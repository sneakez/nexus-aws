using NexusOMS.Contracts;

namespace NexusOMS.OrderingAndFinance;

public sealed class OrderPreparationService(
    IProductCatalogContract catalog)
{
    public async Task<PreparedOrder> PrepareAsync(
    CreateOrderRequest request,
    CancellationToken cancellationToken = default)
    {
        CreateOrderValidator.Validate(request);

        var productIds = request.Items
            .Select(item => item.ProductId)
            .ToArray();

        var products = await catalog.GetActiveProductsAsync(
            productIds, cancellationToken);

        var productsById = products.ToDictionary(product => product.Id);
        var lines = new List<PreparedOrderLine>();

        foreach (var item in request.Items)
        {
            if (!productsById.TryGetValue(item.ProductId, out var product))
                throw new ArgumentException(
                    $"Sản phẩm {item.ProductId} không tồn tại hoặc đã ngừng hoạt động.");

            var lineTotal = item.Quantity * item.UnitPrice;

            if (lineTotal > 999999999999.99m)
                throw new ArgumentException(
                    "Thành tiền dòng hàng vượt giới hạn cho phép.");

            lines.Add(new PreparedOrderLine(
                product.Id,
                product.Sku,
                product.Name,
                item.Quantity,
                item.UnitPrice,
                product.UnitCost,
                lineTotal));
        }
        var subtotal = lines.Sum(line => line.LineTotal);
        var total = subtotal + request.Tax + request.ShippingFee;

        if (subtotal > 999999999999.99m || total > 999999999999.99m)
            throw new ArgumentException(
                "Tổng tiền đơn vượt giới hạn cho phép.");

        return new PreparedOrder(
            subtotal,
            request.Tax,
            request.ShippingFee,
            total,
            lines);
    }
}
