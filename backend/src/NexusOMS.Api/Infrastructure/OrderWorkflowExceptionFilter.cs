using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using NexusOMS.InventoryAndChannels;
using NexusOMS.OrderingAndFinance;

namespace NexusOMS.Api.Infrastructure;

public sealed class OrderWorkflowExceptionFilter : IExceptionFilter
{
    public void OnException(ExceptionContext context)
    {
        int? status = context.Exception switch
        {
            ArgumentException => StatusCodes.Status400BadRequest,
            OrderNotFoundException => StatusCodes.Status404NotFound,
            OrderCreationConflictException or OrderTransitionConflictException
                or InventoryOperationConflictException or InventoryReservationNotFoundException
                or InsufficientStockException => StatusCodes.Status409Conflict,
            _ => null
        };
        if (status is null) return;
        var message = context.Exception is InsufficientStockException
            ? "Không đủ tồn khả dụng để hoàn thành thao tác." : context.Exception.Message;
        context.Result = new ObjectResult(new { message }) { StatusCode = status.Value };
        context.ExceptionHandled = true;
    }
}
