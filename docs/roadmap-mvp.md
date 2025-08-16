# Falcon — MVP Roadmap (Reset)

## Principles
Small PRs · Conventional Commits · RLS-first · RPC-only writes · Daily audit loop.

## Epics → Milestones → Tasks
- **Orders Core**
  - [ ] Orders List MVP (filters, sort, pagination)
  - [ ] Order Drawer (3-column detail panel + Activity Log + Map tab)
  - [ ] Activity Log (DB-backed line items on status changes)
- **User & Roles**
  - [ ] Manage Roles (permissions, fee splits, notification prefs)
  - [ ] Edit Profile Details (display name, color, contact, docs upload)
- **Admin Calendar**
  - [ ] Calendar shows only: 📍 Site Visits · 🚨 Due for Review · 🚨 Due to Client
  - [ ] Color by appraiser; icon by event type
- **Supabase Schema**
  - [ ] Verify FKs for orders↔clients/AMCs/users
  - [ ] `activity_log` table wired to status changes
  - [ ] `calendar_events` table for the three event types
- **Security**
  - [ ] RLS policies validated per table
  - [ ] RPC-only write paths confirmed
- **QA/Docs**
  - [ ] Keep docs current; re-run inventory on each merge

## Daily Audit Loop
- Rebuild inventory & docs:
```
node scripts/analyze-deps.mjs && node scripts/inventory-to-md.mjs
```
