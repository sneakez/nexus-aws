using System.Diagnostics;
using System.Net;
using System.Text.Json;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Hosting.Server;
using Microsoft.AspNetCore.Hosting.Server.Features;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace NexusOMS.ApiLab;

internal static class PostmanLabRunner
{
    public static async Task RunAsync(string root, HttpClient upstream, string managerToken,
        string warehouseToken, Guid warehouseId, Guid productId, string run)
    {
        // Loopback-only bridge to the real API TestServer; no mocked endpoint responses.
        var builder = WebApplication.CreateSlimBuilder();
        builder.Logging.ClearProviders();
        builder.WebHost.ConfigureKestrel(options => options.Listen(IPAddress.Loopback, 0));
        await using var bridge = builder.Build();
        bridge.Run(async context =>
        {
            using var message = new HttpRequestMessage(new HttpMethod(context.Request.Method),
                context.Request.Path + context.Request.QueryString);
            if (context.Request.ContentLength > 0 || context.Request.Headers.ContainsKey("Transfer-Encoding"))
            {
                using var bytes = new MemoryStream();
                await context.Request.Body.CopyToAsync(bytes);
                message.Content = new ByteArrayContent(bytes.ToArray());
            }
            foreach (var header in context.Request.Headers)
            {
                if (header.Key.Equals("Host", StringComparison.OrdinalIgnoreCase)
                    || header.Key.Equals("Content-Length", StringComparison.OrdinalIgnoreCase)
                    || header.Key.Equals("Transfer-Encoding", StringComparison.OrdinalIgnoreCase)
                    || header.Key.Equals("Connection", StringComparison.OrdinalIgnoreCase)) continue;
                if (!message.Headers.TryAddWithoutValidation(header.Key, header.Value.ToArray()))
                    message.Content?.Headers.TryAddWithoutValidation(header.Key, header.Value.ToArray());
            }
            using var response = await upstream.SendAsync(message);
            context.Response.StatusCode = (int)response.StatusCode;
            foreach (var header in response.Headers.Concat(response.Content.Headers))
                if (!header.Key.Equals("Transfer-Encoding", StringComparison.OrdinalIgnoreCase))
                    context.Response.Headers[header.Key] = header.Value.ToArray();
            await response.Content.CopyToAsync(context.Response.Body);
        });
        await bridge.StartAsync();
        var address = bridge.Services.GetRequiredService<IServer>().Features.Get<IServerAddressesFeature>()!.Addresses.Single();
        var environmentFile = Path.Combine(Path.GetTempPath(), $"nexus-postman-{Guid.NewGuid():N}.json");
        try
        {
            var values = new Dictionary<string, string>
            {
                ["baseUrl"] = address, ["managerToken"] = managerToken, ["warehouseToken"] = warehouseToken,
                ["warehouseId"] = warehouseId.ToString(), ["productId"] = productId.ToString(),
                ["runPrefix"] = run, ["feeId"] = Guid.NewGuid().ToString(), ["returnId"] = Guid.NewGuid().ToString()
            };
            await File.WriteAllTextAsync(environmentFile, JsonSerializer.Serialize(new
            {
                name = "Ephemeral local lab only", values = values.Select(v => new { key=v.Key, value=v.Value, enabled=true })
            }));
            var start = new ProcessStartInfo("postman") { UseShellExecute=false, RedirectStandardOutput=true, RedirectStandardError=true };
            foreach (var argument in new[] { "collection", "run", Path.Combine(root,"postman","collections","NexusOMS-Day3-Day4.postman_collection.json"),
                "-e", environmentFile, "--no-report-events", "--timeout", "120000", "--bail" })
                start.ArgumentList.Add(argument);
            using var process = Process.Start(start) ?? throw new InvalidOperationException("Cannot start Postman CLI.");
            var output = process.StandardOutput.ReadToEndAsync();
            var error = process.StandardError.ReadToEndAsync();
            using var timeout = new CancellationTokenSource(TimeSpan.FromMinutes(3));
            try { await process.WaitForExitAsync(timeout.Token); }
            catch (OperationCanceledException) { process.Kill(entireProcessTree:true); throw; }
            Console.WriteLine(await output);
            var stderr = await error;
            if (!string.IsNullOrWhiteSpace(stderr)) Console.WriteLine(stderr);
            if (process.ExitCode != 0) throw new InvalidOperationException($"Postman collection failed: exit {process.ExitCode}.");
            Console.WriteLine("PASS: Postman CLI collection against the real API pipeline (loopback bridge, no cloud reporting).");
        }
        finally
        {
            if (File.Exists(environmentFile)) File.Delete(environmentFile);
            await bridge.StopAsync();
        }
    }
}
