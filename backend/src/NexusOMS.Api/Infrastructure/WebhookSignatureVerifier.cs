using System.Security.Cryptography;
using System.Text;

namespace NexusOMS.Api.Infrastructure;

public static class WebhookSignatureVerifier
{
    public static bool IsValid(string rawBody, string? suppliedSignature, string secret)
    {
        if (string.IsNullOrWhiteSpace(suppliedSignature)
            || string.IsNullOrWhiteSpace(secret))
            return false;

        var supplied = suppliedSignature.StartsWith("sha256=", StringComparison.OrdinalIgnoreCase)
            ? suppliedSignature[7..] : suppliedSignature;
        var expected = HMACSHA256.HashData(Encoding.UTF8.GetBytes(secret), Encoding.UTF8.GetBytes(rawBody));
        try
        {
            return CryptographicOperations.FixedTimeEquals(Convert.FromHexString(supplied), expected);
        }
        catch (FormatException)
        {
            return false;
        }
    }
}
