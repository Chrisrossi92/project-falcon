# Orders List (Backend)

## View
- `public.v_orders_list` (tailored to current `orders` columns)

## Computed Columns
- `display_address`
- `is_overdue`
- `is_review_overdue`
- `has_site_visit`
- `due_in_days`
- `review_due_in_days`
- `priority`

## Indexes
- `status`
- `created_at desc`
- `assigned_to`
- `appraiser_id`
- `client_id`
- `due_date`
- `review_due_date`
- Partial: `created_at desc where not is_archived`

## Typical Query
```sql
select * from v_orders_list
where not is_archived
order by created_at desc
limit 50 offset 0;

