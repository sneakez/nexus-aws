using Microsoft.Extensions.Configuration;
using NexusOMS.Api.Integration;

namespace NexusOMS.ApiTests;

public sealed class WebhookQueueSettingsTests
{
    [Fact]
    public void Defaults_to_direct_so_local_backend_does_not_require_aws()
    {
        var configuration = new ConfigurationBuilder().Build();

        Assert.Equal(WebhookQueueMode.Direct, WebhookQueueSettings.GetMode(configuration));
    }

    [Fact]
    public void Accepts_sqs_mode_and_requires_a_fifo_queue()
    {
        var configuration = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["WebhookQueue:Mode"] = "Sqs",
            ["WebhookQueue:QueueUrl"] = "https://sqs.ap-southeast-1.amazonaws.com/123/nexusoms-demo-webhook-queue.fifo"
        }).Build();

        Assert.Equal(WebhookQueueMode.Sqs, WebhookQueueSettings.GetMode(configuration));
        Assert.EndsWith(".fifo", WebhookQueueSettings.GetQueueUrl(configuration));
    }
}

public sealed class WebhookSimulatorPayloadTests
{
    [Fact]
    public void Marketplace_cancellation_does_not_require_order_creation_fields()
    {
        var payload = new WebhookSimulatorPayload(
            "cancel-event-1",
            "order.cancelled",
            "marketplace-order-1",
            Guid.Empty,
            0,
            0,
            null,
            "Buyer cancelled");

        WebhookSimulatorService.ValidateTrusted(payload);
    }

    [Fact]
    public void Rejects_empty_demo_batch_id()
    {
        var payload = new WebhookSimulatorPayload(
            "demo-event-1", "order.created", "DEMO-001", Guid.NewGuid(), 0, 0,
            [new WebhookSimulatorItem("SKU-1", 1, 100)], DemoBatchId: Guid.Empty);

        Assert.Throws<ArgumentException>(() => WebhookSimulatorService.ValidateTrusted(payload));
    }
}
