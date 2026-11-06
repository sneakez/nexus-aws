# Electronics seed

This console tool replaces business sample data after verifying the target project, writing a local backup and checking data invariants in a single transaction.

Build with dotnet build backend/tools/NexusOMS.ElectronicsSeed/NexusOMS.ElectronicsSeed.csproj -c Release.

Supply ELECTRONICS_SEED_CONNECTION privately through the process environment. Supply ELECTRONICS_EXPECTED_PROJECT for a shared Supabase project. Secrets and backup files belong outside Git.

Modes

- inspect reads counts and checks journal references.
- backup accepts a seed SQL file path and an empty backup directory. It writes JSON snapshots, counts, protected profiles/journal snapshots and restore.sql, then rolls back without changing business data.
- replace accepts the same paths. It writes a fresh backup, rejects journals referencing business data to be removed, replaces business data, runs checks from seed.sql and compares protected data before commit.

The table list is explicit and retains auth.users, profiles, ledger_accounts, journal_entries and journal_lines. Existing administration audit entries are retained. An unknown foreign key or failed invariant aborts the transaction.

Run restore.sql only against the intended database after reviewing the target and stopping writers. It restores the business table snapshots to the backup point in time. It expects the original Auth/profiles and schema to remain available.

The 06 November 2026 import and tested backup location are recorded in supabase/seed/electronics-review/APPLIED.md.