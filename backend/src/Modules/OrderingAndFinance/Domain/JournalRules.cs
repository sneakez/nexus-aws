namespace NexusOMS.OrderingAndFinance;

public static class JournalRules
{
    public static void Validate(IReadOnlyList<JournalLine> lines)
    {
        if (lines is null || lines.Count is < 2 or > 100)
            throw new ArgumentException(
                "Journal phải có từ 2 đến 100 dòng.");

        foreach (var line in lines)
        {
            if (line is null || line.AccountId == Guid.Empty)
                throw new ArgumentException(
                    "Tài khoản của dòng journal không hợp lệ.");

            ValidateAmount(line.DebitAmount);
            ValidateAmount(line.CreditAmount);

            var hasDebit = line.DebitAmount > 0;
            var hasCredit = line.CreditAmount > 0;

            if (hasDebit == hasCredit)
                throw new ArgumentException(
                    "Mỗi dòng phải ghi tiền ở đúng một bên Nợ hoặc Có.");
        }

        var totalDebit = lines.Sum(line => line.DebitAmount);
        var totalCredit = lines.Sum(line => line.CreditAmount);

        if (totalDebit != totalCredit)
            throw new ArgumentException(
                "Tổng Nợ phải bằng tổng Có.");
    }

    private static void ValidateAmount(decimal amount)
    {
        if (amount < 0
            || amount > 999999999999.99m
            || decimal.Round(amount, 2) != amount)
        {
            throw new ArgumentException(
                "Số tiền phải không âm, tối đa 12 chữ số nguyên và 2 chữ số thập phân.");
        }
    }
}
