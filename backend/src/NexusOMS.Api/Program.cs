using NexusOMS.Api.Authorization;
using NexusOMS.InventoryAndChannels;
using NexusOMS.OrderingAndFinance;
using Npgsql;

var builder = WebApplication.CreateBuilder(args);

builder.Services
    .AddControllers()
    .AddApplicationPart(typeof(Program).Assembly);
builder.Services.AddOpenApi();
builder.Services.AddNexusAuthorization(builder.Configuration);
var postgresConnectionString = builder.Configuration.GetConnectionString("Postgres")
    ?? throw new InvalidOperationException("ConnectionStrings:Postgres must be configured.");
builder.Services.AddSingleton(_ => NpgsqlDataSource.Create(postgresConnectionString));
builder.Services.AddInventoryAndChannelsModule();
builder.Services.AddOrderingAndFinanceModule();

builder.Services.AddScoped<NexusOMS.Api.Authorization.IProfileRoleReader,
    NexusOMS.Api.Infrastructure.PostgresProfileRoleReader>();

var app = builder.Build();

app.MapOpenApi();
app.MapGet("/health", () => Results.Ok(new { status = "ok" })).AllowAnonymous();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();

public partial class Program;
