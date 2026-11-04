using NexusOMS.Contracts;

namespace NexusOMS.InventoryAndChannels;

public static class InventoryOperationRequestValidator
{
    public static void Validate(InventoryReservationRequest request)
    {
        RequireOrder(request.OrderId); RequireLocation(request.WarehouseId, request.ProductId);
        RequireQuantity(request.Quantity); RequireKey(request.IdempotencyKey);
    }

    public static void Validate(InventoryReleaseRequest request)
    {
        RequireOrder(request.OrderId); RequireKey(request.IdempotencyKey);
        if (string.IsNullOrWhiteSpace(request.Reason)) throw new ArgumentException("Lý do giải phóng tồn không được để trống.");
    }

    public static void Validate(InventoryCommitRequest request) { RequireOrder(request.OrderId); RequireKey(request.IdempotencyKey); }

    public static void Validate(InventoryReturnRequest request)
    {
        RequireOrder(request.OrderId); RequireLocation(request.WarehouseId, request.ProductId);
        RequireQuantity(request.Quantity); RequireKey(request.IdempotencyKey);
    }

    private static void RequireOrder(Guid orderId) { if (orderId == Guid.Empty) throw new ArgumentException("Đơn hàng không hợp lệ."); }
    private static void RequireLocation(Guid warehouseId, Guid productId) { if (warehouseId == Guid.Empty || productId == Guid.Empty) throw new ArgumentException("Kho hoặc sản phẩm không hợp lệ."); }
    private static void RequireQuantity(decimal quantity) { if (quantity <= 0 || decimal.Round(quantity, 3) != quantity) throw new ArgumentException("Số lượng phải dương và có tối đa 3 chữ số thập phân."); }
    private static void RequireKey(string key) { if (string.IsNullOrWhiteSpace(key) || key.Length > 200) throw new ArgumentException("Khóa chống trùng phải có từ 1 đến 200 ký tự."); }
}
