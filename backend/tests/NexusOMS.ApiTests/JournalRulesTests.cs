using NexusOMS.OrderingAndFinance;

namespace NexusOMS.ApiTests;

public class JournalRulesTests
{
    [Fact]
    public void Accepts_balanced_journal()
    {
        JournalLine[] lines =
        [
            new(Guid.NewGuid(), 100000m, 0m),
            new(Guid.NewGuid(), 0m, 100000m)
        ];

        JournalRules.Validate(lines);
    }

    [Fact]
    public void Rejects_unbalanced_journal()
    {
        JournalLine[] lines =
        [
            new(Guid.NewGuid(), 100000m, 0m),
            new(Guid.NewGuid(), 0m, 90000m)
        ];

        Assert.Throws<ArgumentException>(
            () => JournalRules.Validate(lines));
    }

    [Theory]
    [InlineData(0, 0)]
    [InlineData(100, 100)]
    [InlineData(-100, 0)]
    [InlineData(1.001, 0)]
    public void Rejects_invalid_line_amounts(
        decimal debit, decimal credit)
    {
        JournalLine[] lines =
        [
            new(Guid.NewGuid(), debit, credit),
            new(Guid.NewGuid(), 0m, 100m)
        ];

        Assert.Throws<ArgumentException>(
            () => JournalRules.Validate(lines));
    }

    [Fact]
    public void Rejects_empty_account_id()
    {
        JournalLine[] lines =
        [
            new(Guid.Empty, 100m, 0m),
            new(Guid.NewGuid(), 0m, 100m)
        ];

        Assert.Throws<ArgumentException>(
            () => JournalRules.Validate(lines));
    }
}
