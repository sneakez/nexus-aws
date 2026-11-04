namespace NexusOMS.OrderingAndFinance;

public sealed class JournalService(IJournalRepository repository)
{
    public Task<JournalDetail?> GetAsync(
        Guid id,
        CancellationToken cancellationToken = default) =>
        repository.GetAsync(id, cancellationToken);

    public Task<CreateJournalResult> CreateAsync(
        CreateJournalRequest request,
        Guid actorId,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(request);

        if (request.Id == Guid.Empty || actorId == Guid.Empty)
            throw new ArgumentException(
                "Mã journal và người thực hiện không được rỗng.");

        var entryNumber = request.EntryNumber?.Trim() ?? string.Empty;
        var eventSource = request.EventSource?
            .Trim().ToLowerInvariant() ?? string.Empty;

        if (entryNumber.Length is 0 or > 120)
            throw new ArgumentException(
                "Số chứng từ phải có từ 1 đến 120 ký tự.");

        if (eventSource.Length is 0 or > 60)
            throw new ArgumentException(
                "Nguồn phát sinh phải có từ 1 đến 60 ký tự.");

        if (request.ReferenceId == Guid.Empty)
            throw new ArgumentException(
                "Mã tham chiếu không hợp lệ.");

        JournalRules.Validate(request.Lines);

        var normalized = request with
        {
            EntryNumber = entryNumber,
            EventSource = eventSource
        };

        return repository.CreateAsync(
            normalized, actorId, cancellationToken);
    }
}
