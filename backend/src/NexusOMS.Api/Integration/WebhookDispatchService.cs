using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Amazon.SQS;
using Amazon.SQS.Model;

namespace NexusOMS.Api.Integration;

public enum WebhookQueueMode { Direct, Sqs }

public static class WebhookQueueSettings
{
    public static WebhookQueueMode GetMode(IConfiguration configuration)
    {
        var value = configuration["WebhookQueue:Mode"] ?? "Direct";
        return Enum.TryParse<WebhookQueueMode>(value, true, out var mode)
            ? mode
            : throw new InvalidOperationException("WebhookQueue:Mode phải là Direct hoặc Sqs.");
    }

    public static string GetQueueUrl(IConfiguration configuration)
    {
        var queueUrl = configuration["WebhookQueue:QueueUrl"]?.Trim();
        if (string.IsNullOrWhiteSpace(queueUrl) || !queueUrl.EndsWith(".fifo", StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("WebhookQueue:QueueUrl phải là URL của SQS FIFO queue.");
        return queueUrl;
    }
}

public sealed record WebhookQueueEnvelope(Guid ConnectionId, WebhookSimulatorPayload Payload);

public sealed class WebhookDispatchService(
    WebhookSimulatorService simulator,
    IConfiguration configuration,
    IServiceProvider services)
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public async Task<WebhookSimulatorResult> DispatchExternalAsync(
        Guid connectionId, string rawBody, string? signature, CancellationToken cancellationToken)
    {
        if (WebhookQueueSettings.GetMode(configuration) == WebhookQueueMode.Direct)
            return await simulator.ProcessAsync(connectionId, rawBody, signature, cancellationToken);

        var payload = simulator.ParseExternal(rawBody, signature) with { DemoBatchId = null };
        return await EnqueueAsync(connectionId, payload, cancellationToken);
    }

    public async Task<WebhookSimulatorResult> DispatchTrustedAsync(
        Guid connectionId, WebhookSimulatorPayload payload, CancellationToken cancellationToken)
    {
        if (WebhookQueueSettings.GetMode(configuration) == WebhookQueueMode.Direct)
            return await simulator.ProcessTrustedAsync(connectionId, payload, cancellationToken);

        WebhookSimulatorService.ValidateTrusted(payload);
        return await EnqueueAsync(connectionId, payload, cancellationToken);
    }

    private async Task<WebhookSimulatorResult> EnqueueAsync(
        Guid connectionId, WebhookSimulatorPayload payload, CancellationToken cancellationToken)
    {
        var sqs = services.GetRequiredService<IAmazonSQS>();
        var eventId = payload.EventId!.Trim();
        var orderId = payload.ExternalOrderId!.Trim();
        await sqs.SendMessageAsync(new SendMessageRequest
        {
            QueueUrl = WebhookQueueSettings.GetQueueUrl(configuration),
            MessageBody = JsonSerializer.Serialize(new WebhookQueueEnvelope(connectionId, payload), JsonOptions),
            MessageGroupId = Hash($"{connectionId:N}:{orderId}"),
            MessageDeduplicationId = Hash($"{connectionId:N}:{eventId}")
        }, cancellationToken);
        return new WebhookSimulatorResult(null, false, "queued");
    }

    private static string Hash(string value) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(value)));
}
