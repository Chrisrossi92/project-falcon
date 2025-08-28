# Task
We want to standardize this codebase to plain JavaScript.

## Context
- The repo currently has a mix of `.js` and `.ts` files.
- We do NOT want TypeScript right now — remove types and convert to `.js`.
- Files like `notificationsService.ts`, `orderStatus.ts`, and `rpcFirst.ts` should be renamed to `.js`.
- All type annotations (`: string`, `: Promise<...>`, `as Foo`) must be removed.
- Default to standard ES module syntax.
- Imports across the repo must be updated so they reference the new `.js` filenames instead of `.ts`.

## Deliverables
1. Generate `.js` versions of any `.ts` files with types removed.
2. Update all imports across the repo to point to `.js` files.
3. Ensure nothing references `.ts` anymore.
4. Keep functionality identical — just drop types.
