# Falcon 2025/2026 Historical Import Plan

Generated: 2026-06-26T02:26:13.939Z

## Target

- Staging status: approved_staging_read_only_inventory_complete
- Project ref: voompccpkjfcsmehdoqu
- Database writes: none
- Final SQL generated: no
- Target operations scope: internal_operations
- Import source: Historical Import
- Import batch: 2025_2026

## Input Counts

- Candidate orders: 560
- Candidate clients: 116
- Validation errors: 0
- Validation warnings: 0

## Staging Inventory

- Existing orders read: 577
- Existing clients read: 131
- Existing staff/users read: 11

## Plan Counts

### Clients

- reuse: 127

### Staff

- mapping_needed: 17
- reuse: 7

### Orders

- skip_existing: 552
- manual_review: 8

## Metadata Recommendation

No existing orders import_source/import_batch or obvious metadata JSON field was found in inspected migrations. Recommend adding explicit nullable orders.import_source and orders.import_batch columns, plus optional historical_import_batches metadata table, before SQL generation.

## Notes

- Exact existing order number matches are marked `skip_existing`.
- Same or similar property address plus same or similar client is marked `manual_review`.
- Missing staff are marked `mapping_needed`; users are not created by this planner.
- Unknown or blank appraiser/reviewer values remain unassigned.
- AMC operations are not targeted by this plan.
