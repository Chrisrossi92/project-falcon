# Falcon Information Architecture And UX Guide

## Purpose

This guide defines the foundational UX philosophy for Falcon. It is the canonical design reference
for future page design, redesign, navigation, and information hierarchy work.

Future UI changes should reference this document before building or changing screens.

This is guidance only. It does not change runtime behavior, routes, workflows, database schema,
RPCs, permissions, emails, notifications, or UI components.

## Companion Documents

Falcon's product architecture documentation is organized as five living documents:

1. `docs/architecture/FALCON_INFORMATION_ARCHITECTURE_AND_UX_GUIDE.md`
   defines the canonical UX philosophy, page hierarchy, visibility rules, and layout principles.
2. `docs/architecture/FALCON_PAGE_INVENTORY.md` maintains the canonical inventory of primary pages,
   including purpose, users, visible information, progressive disclosure, smart actions, future
   intelligence opportunities, and implementation status.
3. `docs/architecture/FALCON_PRODUCT_PRINCIPLES.md` defines the permanent product philosophy behind
   Falcon's decisions, including simplicity, explainable intelligence, calm interfaces, automation,
   and human control.
4. `docs/architecture/FALCON_MOTION_AND_INTERACTION_GUIDE.md` defines how Falcon uses motion,
   transitions, microinteractions, and progressive disclosure to clarify state without slowing work.
5. `docs/architecture/FALCON_DESIGN_SYSTEM.md` defines Falcon's visual language, including page
   structure, cards, buttons, badges, typography, spacing, tables, drawers, modals, and empty
   states.

The documents work together in this order:

```text
UX Guide
↓
Page Inventory
↓
Product Principles
↓
Motion And Interaction Guide
↓
Design System
```

Future UI work should consult all five before implementation. When new features are added, update
the Page Inventory. If product philosophy changes, update Product Principles. If layout or
information hierarchy philosophy changes, update this UX Guide. If interaction timing,
microinteraction behavior, Framer Motion usage, or animation patterns change, update the Motion And
Interaction Guide. If visual language, component categories, button hierarchy, cards, badges,
spacing, or responsive design philosophy changes, update the Design System.

These documents are living architecture, not one-time planning documents.

## Core Philosophy

Falcon should feel calm, efficient, and intentional.

The platform should never feel like software is explaining itself. Falcon should assume context and
help users accomplish work.

Every screen should answer one question:

> Why did the user come here?

Everything on that page should support that answer.

## Page Hierarchy

Every Falcon page should be designed using four information levels.

### Level 1: Primary Purpose

The primary purpose is what the user came to accomplish.

It should occupy the highest visual priority: large, obvious, and expressed with minimal words.

Examples:

- Dashboard
- Order Detail
- Vendor
- Client
- Review

### Level 2: Decision Information

Decision information is what the user needs to make the next decision.

It should be visible immediately and should not require searching through secondary content.

Examples:

- Client
- Property
- Vendor
- Fee
- Due date
- Status
- Primary smart action

### Level 3: Supporting Context

Supporting context helps users understand the work, but it is not the reason they opened the page.

It should use lower visual emphasis than primary purpose and decision information.

Examples:

- Created date
- Workspace
- Operational context
- Recent updates
- Metadata

### Level 4: Deep Detail

Deep detail is information users occasionally need, but it should not compete with the main
workflow.

Examples:

- Audit history
- Version history
- Notes
- Large document previews
- Long explanations

Use collapsible sections, drawers, secondary pages, or tabs for deep detail. Deep detail must never
compete with Level 1.

## Visibility Test

Every feature, field, panel, and action should answer:

> Why would a user come to this page?

Then decide where it belongs:

1. Immediately visible
2. Visible after one scroll
3. Behind a collapsible section
4. On a separate page
5. Removed entirely

If information does not earn its place, it should not appear.

## Context Rule

Do not repeat context Falcon already knows.

Avoid labels like:

- Internal Order Detail
- AMC Order Detail
- Internal Dashboard

Prefer labels like:

- Order 2026025
- Dashboard
- Vendor
- Client

The user already knows where they are. Page titles and labels should focus on the object or task,
not on restating product context.

## Smart Actions

Every major page should expose one obvious primary action.

Examples:

- Send to Review
- Offer Assignment
- Submit Report
- Approve Revision

The interface should answer:

> What should I do next?

It should not primarily answer:

> What information exists?

## Attention Versus Tasks

Prefer actionable language that encourages progress.

Instead of:

- No files loaded.
- Site visit not set.

Prefer:

- Upload engagement package.
- Schedule inspection.

Falcon should direct attention toward the next useful task.

## Progressive Disclosure

Start simple. Allow users to drill deeper only when needed.

Use:

- Tabs
- Accordions
- Expandable cards
- Drawers
- Dedicated pages

Avoid giant scrolling walls whenever possible.

## Scrolling

Scrolling is acceptable. Digging is not.

Primary information should be available immediately. Secondary information may require scrolling.
Deep detail should never interrupt the primary workflow.

## Order Detail Principles

The Order Detail page should answer these questions immediately:

- What order is this?
- Who is involved?
- What requires attention?
- What is my next action?
- Where can I go for deeper information?

Order Detail is one of Falcon's most important working surfaces. Its design should make the current
state, involved parties, required attention, and next action obvious before exposing deeper
operational history or document-heavy context.

## Design Review Checklist

Use this checklist before shipping a new or redesigned Falcon screen:

- The page has one clear primary purpose.
- The most important decision information is visible immediately.
- Supporting context is visually quieter than decision information.
- Deep detail is placed behind progressive disclosure.
- Page labels avoid repeating context Falcon already knows.
- There is one obvious primary smart action when the page represents actionable work.
- Empty, missing, or incomplete states use task-oriented language.
- Scrolling does not hide the reason the user came to the page.
- The screen feels calm, efficient, and intentional.
