using NexusOMS.OrderingAndFinance;

namespace NexusOMS.ApiTests;

public class CustomerServiceTests
{
    [Fact]
    public async Task Invalid_name_does_not_reach_repository()
    {
        var repository = new RecordingRepository();
        var service = new CustomerService(repository);
        await Assert.ThrowsAsync<ArgumentException>(() => service.CreateAsync("  ", null, null));
        Assert.False(repository.Called);
    }

    [Fact]
    public async Task Normalizes_input_and_forwards_cancellation()
    {
        var repository = new RecordingRepository();
        using var cancellation = new CancellationTokenSource();
        var customer = await new CustomerService(repository)
            .CreateAsync("  Demo  ", "  ", " demo@example.test ", cancellation.Token);
        Assert.Equal("Demo", customer.Name);
        Assert.Null(customer.Phone);
        Assert.Equal("demo@example.test", customer.Email);
        Assert.Equal(cancellation.Token, repository.Token);
    }

    private sealed class RecordingRepository : ICustomerRepository
    {
        public bool Called { get; private set; }
        public CancellationToken Token { get; private set; }
        public Task<IReadOnlyList<Customer>> ListAsync(CancellationToken cancellationToken = default) =>
            Task.FromResult<IReadOnlyList<Customer>>([]);
        public Task<Customer> CreateAsync(string name, string? phone, string? email, CancellationToken cancellationToken = default)
        {
            Called = true;
            Token = cancellationToken;
            return Task.FromResult(new Customer(Guid.NewGuid(), name, phone, email));
        }
    }
}
