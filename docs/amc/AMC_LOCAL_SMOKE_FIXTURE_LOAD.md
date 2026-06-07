# AMC Local Smoke Fixture Load

Use this local-only setup before executing the full AMC MVP smoke test.

```bash
npm run supabase:reset:local
npm run amc:smoke:fixtures:load
```

The fixture load creates disposable records only:

- Owner login: `amc.smoke.owner@example.test`
- Vendor login: `amc.smoke.vendor@example.test`
- Temporary password for both: `FalconSmoke123!`
- Owner company: existing `falcon_default`
- Vendor company: `AMC Smoke Disposable Vendor`
- AMC order: `AMC-SMOKE-001`
- Open bid request and sent bid recipient for the disposable vendor
- Vendor-visible source document metadata
- Disposable report PDF: `/private/tmp/project-falcon-amc-smoke/amc-smoke-report.pdf`
- Disposable invoice PDF: `/private/tmp/project-falcon-amc-smoke/amc-smoke-invoice.pdf`
- Owner auth app metadata sets active company to `falcon_default`.
- Vendor auth app metadata sets active company to `AMC Smoke Disposable Vendor`.

Fixture scope:

- Local/dev only.
- No production or staging data.
- No assignment offers, submitted reports, invoices, approvals, scheduled payments, or paid
  ledger rows are pre-created. Those remain smoke-test actions.

Context note:

- Plain SQL sessions without JWT claims still resolve `public.current_company_id()` through the
  compatibility fallback, `falcon_default`.
- Authenticated smoke sessions include `app_metadata.active_company_id`, so owner sessions resolve
  to `falcon_default` and vendor sessions resolve to the disposable vendor company.
