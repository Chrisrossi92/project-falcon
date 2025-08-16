# Project Falcon (MVP)

Modern appraisal workflow platform for Continental Valuation.

## Quickstart

    npm i
    cp .env.example .env   # fill SUPABASE_*, MAPS_API_KEY, etc.
    npm run dev

## Architecture
- React + Vite + Tailwind (UI)
- Supabase (auth, DB, RPC-only writes)
- Principles: Small PRs • Conventional Commits • RLS-first • RPC-only writes

## Repo Map
- Docs:
  - `docs/components.md`
  - `docs/pages.md`
  - `docs/hooks.md`
  - `docs/architecture.md`
  - `docs/deps-graph.svg` (dependency graph)
  - `docs/roadmap-mvp.md` (MVP plan)
- Machine-readable inventory: `docs/inventory.json`

## Contributing
- Branch naming: `feat/*`, `fix/*`, `docs/*`, `chore/*`
- Commit style: Conventional Commits
- Prefer small PRs with clear acceptance criteria
