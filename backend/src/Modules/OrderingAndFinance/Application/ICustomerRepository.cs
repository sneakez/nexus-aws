namespace NexusOMS.OrderingAndFinance;

public interface ICustomerRepository
{
    Task<IReadOnlyList<Customer>> ListAsync(CancellationToken cancellationToken = default);
    Task<Customer> CreateAsync(string name, string? phone, string? email, CancellationToken cancellationToken = default);
}
