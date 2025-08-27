:contentReference[oaicite:7]{index=7}

---

## `docs/audit/users-and-roles.md`
```md
# Users & Roles

## Tables
- `user_profiles` — Self-editable profile (display name, color, phone, avatar_url)
- `user_roles` — Roles: `admin`, `appraiser`, `associate`, `reviewer`

## RPCs
- `rpc_update_profile(display_name, color, phone, avatar_url) -> user_profiles`
- `rpc_set_user_role(user_id, role, grant)` *(admin only)*
- `rpc_bootstrap_admin() -> bool` *(one-time; grants caller admin if none exist)*

## RLS
- Profiles & Roles: `SELECT` open to `authenticated` for UI
- Writes only via RPCs

## Calendar Enrichment
- `v_admin_calendar_enriched` adds:
  - `appraiser_name`
  - `appraiser_color`
  - `event_icon`

