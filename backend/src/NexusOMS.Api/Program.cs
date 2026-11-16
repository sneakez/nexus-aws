using Amazon;
using Amazon.SQS;
using NexusOMS.Api.Authorization;
using NexusOMS.Api.Integration;
using NexusOMS.InventoryAndChannels;
using NexusOMS.OrderingAndFinance;
using Npgsql;

var builder = WebApplication.CreateBuilder(args);

builder.Services
    .AddControllers()
    .AddApplicationPart(typeof(Program).Assembly);
builder.Services.AddOpenApi();
builder.Services.AddProblemDetails();
builder.Services.AddScoped<NexusOMS.Api.Infrastructure.OrderWorkflowExceptionFilter>();
builder.Services.AddScoped<WebhookSimulatorService>();
builder.Services.AddScoped<WebhookDispatchService>();
builder.Services.AddScoped<WebhookDemoService>();
var webhookQueueMode = WebhookQueueSettings.GetMode(builder.Configuration);
if (webhookQueueMode == WebhookQueueMode.Sqs)
{
    var region = builder.Configuration["AWS:Region"]
        ?? Environment.GetEnvironmentVariable("AWS_REGION")
        ?? Environment.GetEnvironmentVariable("AWS_DEFAULT_REGION")
        ?? "ap-southeast-1";
    builder.Services.AddSingleton<IAmazonSQS>(_ =>
        new AmazonSQSClient(RegionEndpoint.GetBySystemName(region)));
    builder.Services.AddHostedService<WebhookQueueWorker>();
}
else
{
    builder.Services.AddHostedService<WebhookRetryWorker>();
}
builder.Services.AddNexusAuthorization(builder.Configuration);
var postgresConnectionString = builder.Configuration.GetConnectionString("Postgres")
    ?? throw new InvalidOperationException("ConnectionStrings:Postgres must be configured.");
builder.Services.AddSingleton(_ => NpgsqlDataSource.Create(postgresConnectionString));
builder.Services.AddInventoryAndChannelsModule();
builder.Services.AddOrderingAndFinanceModule();

builder.Services.AddScoped<NexusOMS.Api.Authorization.IProfileRoleReader,
    NexusOMS.Api.Infrastructure.PostgresProfileRoleReader>();
builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
    {
        var origin = builder.Configuration["Frontend:Origin"];

        if (!string.IsNullOrWhiteSpace(origin))
        {
            policy.WithOrigins(origin)
                .AllowAnyHeader()
                .AllowAnyMethod();
        }
    });
});
var app = builder.Build();

app.UseExceptionHandler();
app.UseRouting();
app.UseCors("Frontend");
app.MapOpenApi();
app.MapGet("/health", () => Results.Ok(new { status = "ok" })).AllowAnonymous();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();

public partial class Program;
