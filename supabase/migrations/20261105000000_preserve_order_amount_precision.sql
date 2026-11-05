-- Quantity has scale 3 and unit price has scale 2.
-- Preserve their exact product and keep the existing integer capacity.
alter table public.order_items
    alter column line_total type numeric(17,5);
alter table public.orders
    alter column subtotal type numeric(17,5),
    alter column total type numeric(17,5);
