using System.Text.Json;
using Amazon.SQS;
using Amazon.SQS.Model;

namespace NexusOMS.Api.Integration;

public sealed class WebhookQueueWorker(
    IServiceScopeFactory scopeFactory,
    IAmazonSQS sqs,
    IConfiguration configuration,
    ILogger<WebhookQueueWorker> logger) : BackgroundService
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var queueUrl = WebhookQueueSettings.GetQueueUrl(configuration);
        var waitTime = Math.Clamp(configuration.GetValue("WebhookQueue:WaitTimeSeconds", 20), 1, 20);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                var response = await sqs.ReceiveMessageAsync(new ReceiveMessageRequest
                {
                    QueueUrl = queueUrl,
                    MaxNumberOfMessages = 10,
                    WaitTimeSeconds = waitTime
                }, stoppingToken);

                foreach (var message in MessagesOrEmpty(response))
                    await ProcessAsync(queueUrl, message, stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { }
            catch (Exception exception)
            {
                logger.LogError(exception, "Webhook SQS worker failed.");
                await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);
            }
        }
    }

    internal static IReadOnlyList<Message> MessagesOrEmpty(ReceiveMessageResponse response) =>
        response.Messages ?? [];

    private async Task ProcessAsync(string queueUrl, Message message, CancellationToken cancellationToken)
    {
        try
        {
            var envelope = JsonSerializer.Deserialize<WebhookQueueEnvelope>(message.Body, JsonOptions)
                ?? throw new ArgumentException("SQS webhook message không hợp lệ.");
            using var scope = scopeFactory.CreateScope();
            await scope.ServiceProvider.GetRequiredService<WebhookSimulatorService>()
                .ProcessTrustedAsync(envelope.ConnectionId, envelope.Payload, cancellationToken);
            await sqs.DeleteMessageAsync(queueUrl, message.ReceiptHandle, cancellationToken);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested) { throw; }
        catch (Exception exception)
        {
            logger.LogWarning(exception, "Webhook message {MessageId} failed and will be retried by SQS.", message.MessageId);
        }
    }
}
