using NexusOMS.Api.Authorization;
using NexusOMS.InventoryAndChannels;
using NexusOMS.OrderingAndFinance;

var builder = WebApplication.CreateBuilder(args);

builder.Services
    .AddControllers()
    .AddApplicationPart(typeof(Program).Assembly);
builder.Services.AddOpenApi();
builder.Services.AddNexusAuthorization(builder.Configuration);
builder.Services.AddInventoryAndChannelsModule();
builder.Services.AddOrderingAndFinanceModule();

var app = builder.Build();

app.MapOpenApi();
app.MapGet("/health", () => Results.Ok(new { status = "ok" })).AllowAnonymous();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();

public partial class Program;
