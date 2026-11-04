alter table public.order_operation_receipts
    drop constraint order_operation_receipts_operation_type_check;
alter table public.order_operation_receipts
    add constraint order_operation_receipts_operation_type_check
    check (operation_type in ('cancel', 'ship', 'confirm', 'process'));
