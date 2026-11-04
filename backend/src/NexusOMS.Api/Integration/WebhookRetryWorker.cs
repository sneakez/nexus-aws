namespace NexusOMS.Api.Integration;

public sealed class WebhookRetryWorker(
    IServiceScopeFactory scopeFactory,
    IConfiguration configuration,
    ILogger<WebhookRetryWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var interval = TimeSpan.FromSeconds(Math.Max(5, configuration.GetValue("WebhookSimulator:RetryIntervalSeconds", 30)));
        using var timer = new PeriodicTimer(interval);
        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            try
            {
                using var scope = scopeFactory.CreateScope();
                await scope.ServiceProvider.GetRequiredService<WebhookSimulatorService>()
                    .RetryDueAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { }
            catch (Exception exception) { logger.LogError(exception, "Webhook retry worker failed."); }
        }
    }
}
