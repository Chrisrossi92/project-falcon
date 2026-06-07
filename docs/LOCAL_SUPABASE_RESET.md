# Local Supabase Reset

Use this command for local AMC smoke-test preparation:

```bash
npm run supabase:reset:local
```

Why this exists:

- Supabase CLI `2.41.3` with local Storage API `v1.26.7` can replay all project migrations and
  then fail during Storage bucket reconciliation because `service_role` does not have local
  privileges on `storage.buckets`.
- The project migrations must not create fake Storage tables or weaken production Storage
  policies.
- The wrapper keeps the repair local to Docker-backed development by running the normal
  `supabase db reset`, detecting the known local Storage reconciliation failure, granting local
  Storage metadata privileges through the local Postgres container, reconciling the private
  `order-documents` bucket, and restarting the local Storage API.

Local-only behavior:

- Pins `supabase/.temp/storage-version` to `v1.26.7` when the local temp file exists or needs repair.
- Grants local `service_role` access to Storage metadata tables, sequences, and functions.
- Ensures the private `order-documents` bucket exists with `public = false` and a 50 MiB file limit.
- Does not expose storage paths.
- Does not add production migrations, Storage policies, Edge Function behavior, or remote Supabase
  changes.

Use plain `supabase db reset` only when the local CLI/Storage image pair no longer needs this
bootstrap.
