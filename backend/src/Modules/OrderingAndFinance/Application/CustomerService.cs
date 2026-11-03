namespace NexusOMS.OrderingAndFinance;

public sealed class CustomerService(ICustomerRepository repository)
{
    public Task<IReadOnlyList<Customer>> ListAsync(CancellationToken cancellationToken = default) => repository.ListAsync(cancellationToken);
    public Task<Customer> CreateAsync(string name, string? phone, string? email, CancellationToken cancellationToken = default) =>
     repository.CreateAsync(CustomerName.Normalize(name), Clean(phone), Clean(email), cancellationToken);
    private static string? Clean(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
