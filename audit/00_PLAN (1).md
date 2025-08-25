# Project Falcon — Full Codebase Audit Plan

This plan turns the repo into a *single source of truth (SSOT)* with a rigorous, file-by-file audit.

## Objectives
1. **Necessity** — Decide whether each file is required for the MVP (keep / refactor / retire).
2. **Health** — Note whether it appears to work as expected (green/yellow/red).
3. **Context** — Record an exact path, purpose, and parent/child relationships.
4. **Traceability** — Link usage with lightweight import/dependency mapping.
5. **Actionability** — Capture a concrete next step per file.

## Outputs
- `WORKFILE.md` — the living narrative (long-form notes per file).
- `FILE_AUDIT_TEMPLATE.md` — copy/paste template for each file’s entry.
- `file_inventory.csv` — raw file list.
- `imports_map.csv` — import statements (all) for quick lookups.
- `local_edges.csv` — local dependency edges (relative imports only).

## Workflow (RLS‑first, RPC‑only writes, small PRs)
1. **Audit Order (top‑down):**
   - Entrypoints & app shell: `index.html`, `main.tsx/jsx`, `App.(t|j)sx`.
   - Routing: pages/router config.
   - Core state & data: `lib/`, `hooks/`, `store/`, Supabase client, RPC calls.
   - Primary features (Orders, Users, Dashboards, Calendar, Notifications).
   - Shared UI/components.
   - Utilities and types.
   - Config, env, and scripts.
2. **Per File:**
   - Create a new section in `WORKFILE.md` using `FILE_AUDIT_TEMPLATE.md`.
   - Decide: **Keep / Refactor / Retire / Unknown**.
   - Mark health: **Green / Yellow / Red** with a one‑line reason.
   - Describe purpose, parents (who imports it), children (what it imports).
   - Link related tickets or TODOs.
3. **Daily Audit Loop:**
   - Process ≤10 files per batch (your preference).
   - Land changes as **small PRs** using Conventional Commits.
   - Update SSOT immediately after each batch.
4. **Retirement Strategy:**
   - If `Retire`, search inbound imports to avoid breakage.
   - Replace with stubs where needed; remove dead routes/exports.
5. **Verification:**
   - For high‑risk files, add/restore quick smoke tests where feasible.
   - Keep a running “Unknowns” list to resolve.

## Suggested Conventional Commits
- `chore(audit): catalog <path>`
- `refactor(component): simplify <name>`
- `feat(orders): replace legacy <x> with <y>`
- `fix(supabase): correct RPC call for <x>`
- `docs(audit): update SSOT for <file>`

## Proposed First Batches
We’ll start with the true entrypoints and router, then branch out:

**Batch 1 — Entrypoints**
- (auto-detected) Main app mount (e.g., `src/main.tsx` or `src/main.jsx`)
- App wrapper `src/App.tsx|jsx`
- Root HTML `index.html`
- Global styles `src/index.css`, `src/styles/*`

**Batch 2 — Routing & Layout**
- Router config (e.g., `src/router.tsx`, `src/routes/*`, or `src/AppRoutes.tsx`)
- Layout shells (e.g., `src/layouts/*`, `src/components/layout/*`)

**Batch 3 — Data Layer**
- `src/lib/supabaseClient.*`
- `src/lib/api/*` and RPC bindings
- `src/lib/hooks/*`

**Batch 4 — Core Feature: Orders**
- `src/components/orders/*`
- `src/pages/orders/*`

**Batch 5 — Core Feature: Users/Admin**
- Dashboards: Admin/Appraiser/Reviewer
- `src/components/users/*`, `src/pages/admin/*`

We’ll refine batches once we confirm exact paths below.
