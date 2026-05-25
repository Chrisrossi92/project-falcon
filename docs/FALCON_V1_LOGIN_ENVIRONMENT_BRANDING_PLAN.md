# Falcon v1 Login Environment Branding Plan

## Purpose

This document defines how the Falcon login and authentication screen should introduce the
Executive Operational Command Console identity before runtime implementation.

The login screen should:

- feel like Falcon, not a disconnected white-card utility page;
- establish a premium first impression before the app shell loads;
- support Continental now and future tenant/company logos later;
- avoid overbranding or confusing Falcon platform identity with tenant/company identity.

This phase is planning only. It does not implement runtime code, CSS changes, component changes,
auth logic changes, route changes, permission changes, workflow changes, data/query changes,
backend changes, Supabase changes, tenant switching, signup-flow logic changes, AMC work, Client
Portal work, automation, AI work, or production data changes.

## Visual Direction

The login screen should feel like the entry point into Falcon's operational environment.

Recommended direction:

- simple;
- cinematic;
- dark-to-light slate gradient;
- premium operational console;
- calm and secure;
- low clutter;
- restrained brand presence.

Avoid:

- disconnected white-card-only presentation;
- startup hero nonsense;
- marketing illustration layouts;
- gamer or cyberpunk UI;
- neon/glow effects;
- decorative glassmorphism;
- dense ERP-style login chrome.

The screen should communicate trust and operational seriousness before asking for credentials.

## Brand Hierarchy

Falcon and the tenant/company logo should have distinct jobs.

Identity model:

- **Falcon** = platform identity and operational environment;
- **Continental** = tenant/company identity and current workspace destination.

Recommended hierarchy:

- Falcon wordmark as the environmental/platform anchor;
- tenant logo inside or above the auth card as "signing into this company/workspace";
- future-ready tenant logo slot that can support other company logos without redesigning the
  login page.

Falcon should define the surrounding atmosphere. The tenant logo should identify the workspace the
user is entering. Neither should visually imply it owns the other's role.

## Layout Concept

Recommended layout:

- full-screen dark/slate gradient background;
- subtle Falcon wordmark or brand anchor in the upper-left or top-center area;
- centered auth card;
- Continental logo inside the card or directly above the credential fields;
- clear title: `Sign in to Falcon`;
- optional subtitle: `Continue to your workspace`;
- small, quiet footer for legal/version/support copy if needed.

The auth card should be clear and focused, but it should sit inside the Falcon environment rather
than feeling like a generic authentication modal on a blank page.

## Tenant Logo Strategy

Tenant/company identity should remain separate from Falcon platform branding.

Rules:

- keep company logo assets separate from Falcon logo assets;
- treat the tenant logo as workspace context, not as the global product brand;
- support future tenant logo replacement without reworking the page structure;
- avoid hardcoded Continental-only visual dependency where a reusable tenant-logo slot is
  practical;
- preserve current auth behavior and account resolution.

The first runtime pass may use Continental's current logo asset where it is already available, but
the structure should not require Continental as the only possible tenant.

## Asset Strategy

Recommended assets:

- `src/assets/branding/falcon-wordmark-dark-shell.png` for Falcon identity on the dark/slate
  environment;
- the existing Continental logo asset where currently used;
- future tenant logo assets loaded through a governed tenant/company branding path when available.

Rules:

- do not embed tenant logos into Falcon assets;
- do not bake the background into the Falcon wordmark;
- do not use a tenant logo as a decorative background motif;
- keep light-surface and dark-shell logo variants separate where contrast requires it.

## Component / Runtime Implementation Roadmap

### Login A1: Visual Shell / Background Pass

Purpose:

- make the auth route inherit Falcon's operational environment.

Expected scope:

- full-screen dark/slate gradient background;
- controlled page framing;
- no auth logic changes.

### Login A2: Brand Hierarchy Integration

Purpose:

- introduce the correct Falcon/platform and tenant/company hierarchy.

Expected scope:

- Falcon wordmark as platform/environment anchor;
- tenant logo slot in or above the auth card;
- `Sign in to Falcon` title and optional workspace subtitle;
- no tenant-switching implementation.

### Login A3: Responsive / Mobile Polish

Purpose:

- preserve the same brand hierarchy on small screens.

Expected scope:

- compact wordmark placement;
- card spacing and logo scale adjustments;
- keyboard-safe mobile layout;
- no mobile-specific auth behavior changes.

### Login A4: Auth-State / Error / Loading QA

Purpose:

- verify that all auth states remain clear inside the new environment.

Expected scope:

- loading state;
- error state;
- password reset or signup entry points if already present;
- disabled/submitting state;
- focus and keyboard review;
- no Supabase or auth-flow changes.

## Explicit Non-Goals

This plan does not include:

- auth logic changes;
- Supabase changes;
- route changes;
- permission changes;
- workflow changes;
- data/query changes;
- backend/schema changes;
- tenant-switching implementation;
- signup flow redesign except presentation-only refinements around existing behavior;
- AMC implementation;
- Client Portal work;
- automation;
- AI UI;
- production data changes.

## Login A1 Implementation Record

Login A1 implements the first visual shell/background pass for the auth route.

Runtime file updated:

- `src/pages/auth/Login.jsx`.

Docs updated:

- `docs/FALCON_V1_LOGIN_ENVIRONMENT_BRANDING_PLAN.md`;
- `docs/IMPLEMENTATION_ROADMAP.md`.

Login A1 changes:

- replaces the generic light auth background with a restrained dark/slate operational environment;
- adds the Falcon dark-shell wordmark as the platform/environment anchor;
- preserves the centered auth card structure;
- preserves the Continental logo inside the auth card as tenant/workspace identity;
- updates the auth card treatment so it sits inside the Falcon environment without becoming a
  landing-page hero.

Login A1 intentionally does not:

- change auth logic;
- change Supabase Auth UI behavior or providers;
- change redirect or return-path behavior;
- change routes, permissions, workflow, data/query behavior, backend, schema, tenant switching,
  signup flow logic, AMC, Client Portal, automation, AI, or production data behavior.
