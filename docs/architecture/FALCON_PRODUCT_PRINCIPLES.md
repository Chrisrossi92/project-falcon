# Falcon Product Principles

## Purpose

This document captures Falcon's permanent product philosophy. It defines how Falcon should make
product decisions across UX, workflows, intelligence, automation, and future feature design.

This is living architecture. Future work should update this document when Falcon's product
philosophy changes. It should not be used to imply approval for runtime, schema, permission,
notification, email, deployment, or data changes.

Companion documents:

- `docs/architecture/FALCON_INFORMATION_ARCHITECTURE_AND_UX_GUIDE.md` defines the page hierarchy
  and layout philosophy.
- `docs/architecture/FALCON_PAGE_INVENTORY.md` maintains the canonical inventory of primary pages.
- `docs/architecture/FALCON_MOTION_AND_INTERACTION_GUIDE.md` defines motion, transition,
  microinteraction, and animation philosophy.
- `docs/architecture/FALCON_DESIGN_SYSTEM.md` defines Falcon's visual language and reusable design
  categories.
- `docs/architecture/FALCON_PREMIUM_EXPERIENCE_SPRINT_1_CHECKPOINT.md` records the completed
  Premium Experience Sprint 1 foundation, adoption rules, risks, and next target guidance.

## Product Philosophy

Falcon exists to help users move appraisal work forward with clarity, speed, and control.

The product should reduce operational noise. It should make the next useful action obvious, expose
enough context for confident decisions, and keep deeper detail available without making every screen
feel heavy.

## Principles

### Simplicity Over Explanation

Falcon should not rely on long instructional text to make a page understandable. If a page needs a
lot of explanation, the page likely needs a clearer purpose, better hierarchy, or fewer competing
decisions.

### Information Earns Its Place

Every field, panel, status, link, and action must justify its visibility. Information that does not
help the user decide or act should be quieter, hidden, moved, or removed.

### Context Should Not Be Repeated

Falcon should not restate context the user already knows. Product context, workspace context, and
route context should guide behavior, but page labels should focus on the object or task.

### Smart Actions Over Button Overload

Every major page should make the next best action obvious. Secondary actions may exist, but they
should not compete with the primary workflow.

### Progressive Disclosure

Start with the essentials. Reveal deeper information only when needed through tabs, accordions,
drawers, secondary pages, or other clear progressive disclosure patterns.

### Every Page Answers One Purpose

Each page should have one governing reason to exist. If a page tries to answer too many unrelated
questions, the product should split, simplify, or reprioritize the experience.

### Falcon Should Reduce Decisions, Not Add Them

The product should narrow choices where possible by ordering work, highlighting risk, filtering
irrelevant options, and clarifying what matters now.

### Explainable Intelligence

Falcon may recommend, prioritize, summarize, classify, and detect risk, but users should understand
why. Intelligence should expose enough reasoning to support trust without overwhelming the workflow.

### Calm Interfaces

Falcon should feel steady under operational pressure. Visual priority, language, and interaction
patterns should reduce noise, avoid panic, and help users focus.

### Fast Workflows

Common tasks should be direct. Falcon should minimize unnecessary navigation, repeated entry,
avoidable confirmation, and duplicate context gathering.

### Consistency Before Novelty

New patterns should be introduced only when they solve a real product problem. Consistent page
structure, action placement, language, and disclosure patterns matter more than novelty.

### Automation Where Trust Is Preserved

Falcon should automate repetitive or low-risk work when the system can do so transparently and
safely. Automation should not obscure accountability or bypass governance.

### Human Remains In Control

Falcon may assist decisions, but critical workflow, approval, assignment, client delivery,
compliance, and lifecycle decisions must remain understandable and controllable by authorized users.

## Questions Every New Feature Must Answer

Before implementation, every new feature should answer:

- Why does this exist?
- What page owns it?
- Is it immediately visible?
- Could it be hidden?
- Can Falcon automate part of it?
- Does it make another feature unnecessary?
- What user decision or action does it improve?
- What information does it require, and is that information safe to show?
- Does it preserve the user's control over important workflow outcomes?
- Does it align with the canonical page hierarchy and page inventory?

## Living Architecture Rules

When new features are added:

- Update `docs/architecture/FALCON_PAGE_INVENTORY.md` when page ownership, purpose, visibility,
  smart actions, or implementation status changes.
- Update this document when Falcon's product philosophy changes.
- Update `docs/architecture/FALCON_INFORMATION_ARCHITECTURE_AND_UX_GUIDE.md` when layout,
  hierarchy, or UX philosophy changes.
- Update `docs/architecture/FALCON_MOTION_AND_INTERACTION_GUIDE.md` when interaction timing,
  Framer Motion usage, transition behavior, or motion philosophy changes.
- Update `docs/architecture/FALCON_DESIGN_SYSTEM.md` when visual language, component categories,
  button hierarchy, cards, badges, typography, spacing, or responsive design philosophy changes.

These documents are part of Falcon's architecture. They are not one-time planning documents.
