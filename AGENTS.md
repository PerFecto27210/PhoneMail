# PhoneMail Development Guide

## Project

PhoneMail is a phone-number-based email application.

## Repository

This is a pnpm + Turborepo monorepo.

## Applications

- apps/webchat
- apps/webmail

## Shared packages

- packages/ui
- packages/eslint-config
- packages/typescript-config

## Backend

- db/convex

Convex is the primary backend/database/realtime layer.

## Architecture rules

- Do not introduce Prisma.
- Do not introduce Hono unless explicitly required.
- Do not create duplicate backend logic inside webchat and webmail.
- Shared UI components belong in packages/ui.
- Application-specific components stay inside their application.
- Do not duplicate shadcn components between webchat and webmail.
- Do not move Convex logic into the frontend applications unless there is a specific reason.
- Do not add dependencies unnecessarily.
- Prefer existing dependencies over introducing new libraries.

## Package manager

Use pnpm.

Do not use npm or yarn.

## Monorepo

Changes affecting multiple packages should be evaluated from the repository root.

## Validation

After making changes, run the smallest relevant checks first.

Then run:

pnpm lint
pnpm check-types
pnpm build

when appropriate.

## Code quality

- TypeScript
- strict typing
- avoid any unless necessary
- keep functions small
- preserve existing architecture
- don't rewrite working code unnecessarily

## Important

Before changing architecture, explain why the change is necessary.

Do not silently replace one technology with another.