do $$
begin
    if exists (
        select e.id
        from public.journal_entries e
        left join public.journal_lines l
            on l.journal_entry_id = e.id
        group by e.id
        having count(l.id) < 2
            or coalesce(sum(l.debit_amount), 0)
                <> coalesce(sum(l.credit_amount), 0)
    ) then
        raise exception
            'Existing journals are invalid. Review data before migration.';
    end if;
end;
$$;
create or replace function public.lock_journal_parent()
returns trigger
language plpgsql
set search_path = public
as $$
declare
    affected_ids uuid[];
begin
    if TG_OP = 'INSERT' then
        affected_ids := array[NEW.journal_entry_id];
    elsif TG_OP = 'DELETE' then
        affected_ids := array[OLD.journal_entry_id];
    else
        affected_ids := array[
            OLD.journal_entry_id,
            NEW.journal_entry_id
        ];
    end if;

    perform id
    from public.journal_entries
    where id = any(affected_ids)
    order by id
    for update;

    if TG_OP = 'DELETE' then
        return OLD;
    end if;

    return NEW;
end;
$$;

drop trigger if exists journal_lines_lock_parent on public.journal_lines;
create trigger journal_lines_lock_parent
before insert or update or delete
on public.journal_lines
for each row
execute function public.lock_journal_parent();

create or replace function public.assert_journal_balanced(p_journal_id uuid)
returns void
language plpgsql
set search_path = public
as $$
declare
    line_count bigint;
    total_debit numeric;
    total_credit numeric;
begin
    if not exists (
        select 1
        from public.journal_entries
        where id = p_journal_id
    ) then
        return;
    end if;

    select count(*),
           coalesce(sum(debit_amount), 0),
           coalesce(sum(credit_amount), 0)
    into line_count, total_debit, total_credit
    from public.journal_lines
    where journal_entry_id = p_journal_id;

    if line_count < 2 or total_debit <> total_credit then
        raise exception
            'Journal must contain at least two balanced lines.'
            using errcode = '23514',
                  constraint = 'journal_entries_balanced_check';
    end if;
end;
$$;

create or replace function public.check_journal_balance_trigger()
returns trigger
language plpgsql
set search_path = public
as $$
begin
    if TG_TABLE_NAME = 'journal_entries' then
        perform public.assert_journal_balanced(NEW.id);
    elsif TG_OP = 'INSERT' then
        perform public.assert_journal_balanced(
            NEW.journal_entry_id);
    elsif TG_OP = 'DELETE' then
        perform public.assert_journal_balanced(
            OLD.journal_entry_id);
    else
        perform public.assert_journal_balanced(
            OLD.journal_entry_id);

        if NEW.journal_entry_id <> OLD.journal_entry_id then
            perform public.assert_journal_balanced(
                NEW.journal_entry_id);
        end if;
    end if;

    return null;
end;
$$;

drop trigger if exists journal_header_balance_check on public.journal_entries;
create constraint trigger journal_header_balance_check
after insert or update
on public.journal_entries
deferrable initially deferred
for each row
execute function public.check_journal_balance_trigger();

drop trigger if exists journal_lines_balance_check on public.journal_lines;
create constraint trigger journal_lines_balance_check
after insert or update or delete
on public.journal_lines
deferrable initially deferred
for each row
execute function public.check_journal_balance_trigger();
