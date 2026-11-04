using System.Security.Cryptography;
using System.Text;
using NexusOMS.Api.Infrastructure;

namespace NexusOMS.ApiTests;

public class WebhookSignatureVerifierTests
{
    [Fact]
    public void Accepts_matching_hmac_and_rejects_changed_body()
    {
        const string secret = "webhook-test-secret";
        const string body = "{\"eventId\":\"evt-001\"}";
        var signature = "sha256=" + Convert.ToHexString(HMACSHA256.HashData(Encoding.UTF8.GetBytes(secret), Encoding.UTF8.GetBytes(body))).ToLowerInvariant();

        Assert.True(WebhookSignatureVerifier.IsValid(body, signature, secret));
        Assert.False(WebhookSignatureVerifier.IsValid("{\"eventId\":\"evt-002\"}", signature, secret));
    }
}
