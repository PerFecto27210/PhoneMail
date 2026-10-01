# PhoneMail

PhoneMail is a monorepo containing the PhoneMail web applications and shared backend functionality.

## Project Structure

```text
phonemail/
├── apps/
│   ├── webchat/        # Chat-style PhoneMail web client
│   └── webmail/        # Gmail-style PhoneMail web client
├── db/                 # Convex functions, schema and backend logic
├── packages/
│   └── ui/             # Shared UI components
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
├── pnpm-lock.yaml
├── docker-compose.yml
└── .env.docker
```

## Prerequisites

Install:

- Node.js 24+
- pnpm
- Git
- Docker Desktop (for Docker execution)
- A Convex Cloud project/deployment
- Required external service accounts, such as Twilio, if those features are enabled

Check versions:

```bash
node --version
pnpm --version
docker --version
```

## 1. Clone the Repository

```bash
git clone <repository-url>
cd phonemail
```

## 2. Install Dependencies

From the repository root:

```bash
pnpm install
```

This is a pnpm workspace. Do not run separate `npm install` commands inside the apps.

## 3. Configure Convex Cloud

PhoneMail uses **Convex Cloud** for the backend. Docker does not run a Convex server.

Set the frontend Convex URL:

```env
NEXT_PUBLIC_CONVEX_URL=https://<your-deployment>.convex.cloud
NEXT_PUBLIC_CONVEX_SITE_URL=https://<your-deployment>.convex.site
```

`NEXT_PUBLIC_CONVEX_URL` is intentionally public because the browser needs it to connect to Convex. `NEXT_PUBLIC_CONVEX_SITE_URL` is the Convex site's URL used by authentication.

For local development, the repository may use:

```bash
pnpm convex dev
```

when a local Convex development workflow is needed. This is separate from the Docker setup: Dockerized web applications should connect to Convex Cloud.

## 4. Configure Environment Variables

Create the environment files required by the current apps, for example:

```text
apps/webchat/.env.local
apps/webmail/.env.local
```

At minimum:

```env
NEXT_PUBLIC_CONVEX_URL=https://<your-deployment>.convex.cloud
```

Keep private credentials server-side. Examples include:

```env
BETTER_AUTH_SECRET=...
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=...
GEMINI_API_KEY=...
```

Do not expose private credentials through `NEXT_PUBLIC_*`.

Convex server-side secrets should be configured in the Convex Cloud deployment environment rather than browser-facing Next.js configuration.

## 5. Configure Better Auth

PhoneMail uses Better Auth together with Convex.

Configure the required Better Auth secret and existing project-specific settings in the Convex Cloud environment.

Authentication/session checks should derive the current user from the authenticated context. Do not trust arbitrary `userId` values supplied by the browser.


## 6. Run the Project Locally

From the repository root:

```bash
pnpm dev
```

Check the terminal output for the exact ports. A typical setup is:

```text
Webchat → http://localhost:3000
Webmail → http://localhost:3001
```

## 7. Run Individual Apps

Use the workspace names defined by the package files:

```bash
pnpm --filter webchat dev
pnpm --filter webmail dev
```

If the package names differ, use the names from the corresponding `package.json` files.

## 8. Convex Development

Convex backend code lives under:

```text
db/
```

It contains the project's schema, queries, mutations, actions, authentication integration, storage and other backend functionality.

For development, use the repository's configured Convex command:

```bash
pnpm convex dev
```

For the Docker/production-style setup, the web applications connect to Convex Cloud instead of running Convex in a container.

## 9. Build and Validate

Build the monorepo:

```bash
pnpm build
```

If these scripts exist in the repository, also run:

```bash
pnpm lint
pnpm typecheck
```

## 11. Docker

Docker runs the Next.js applications. Convex remains in Convex Cloud.

Architecture:

```text
Browser
   │
   ├── Webchat :3000 ──┐
   │                   │
   └── Webmail :3001 ──┤
                       ▼
                  Convex Cloud
                 ┌─────┼─────┐
                 │     │     │
                DB  Realtime Storage
                 │
             Better Auth
                 │
             Convex Actions
                 │
               Twilio
```

### Docker environment

Configure both Convex URLs in the repository-root `.env` file used by Docker Compose:

```env
NEXT_PUBLIC_CONVEX_URL=https://<your-deployment>.convex.cloud
NEXT_PUBLIC_CONVEX_SITE_URL=https://<your-deployment>.convex.site
```

`NEXT_PUBLIC_CONVEX_SITE_URL` must be set in the root `.env`; app-specific `.env.local` files are not loaded by Docker Compose.

### Build

```bash
docker compose build
```

### Start

```bash
docker compose up -d
```

Typical URLs:

```text
Webchat → http://localhost:3000
Webmail → http://localhost:3001
```

### Check containers

```bash
docker compose ps
```

### Logs

```bash
docker compose logs -f
```

Specific service:

```bash
docker compose logs -f webchat
docker compose logs -f webmail
```

### Stop

```bash
docker compose down
```

### Rebuild and start

```bash
docker compose up -d --build
```


## 12. Authentication and Session Flow

The application uses Better Auth with Convex:

```text
Browser
   │
   ▼
Webchat / Webmail
   │
   ▼
Better Auth
   │
   ▼
Authenticated session
   │
   ▼
Convex
   ├── Queries
   ├── Mutations
   ├── Actions
   └── Storage
```

Backend functions should derive the current user from authentication context.

## 13. Messaging and Realtime

Convex is the source of truth for messaging and realtime data:

```text
Client
  │
  │ mutation
  ▼
Convex
  │
  ├── Store message
  │
  └── Reactive query update
             │
             ▼
       Connected clients
```

A separate WebSocket server is not required for normal Convex realtime functionality.

## 14. Twilio SMS Notifications

When enabled, PhoneMail can notify a user by SMS when a new email arrives while the user has no active session.

Conceptually:

```text
New message
     │
     ▼
Convex
     │
     ▼
Check recipient session
     │
 ┌───┴────┐
 │        │
Active   No active session
 │        │
 ▼        ▼
No SMS   Twilio Action
             │
             ▼
            SMS
```

Twilio credentials remain server-side. An SMS failure should not prevent the original message from being stored.

## 15. Troubleshooting

### Docker cannot connect to Docker Desktop

If you see an error mentioning:

```text
dockerDesktopLinuxEngine
The system cannot find the file specified
```

start Docker Desktop and verify:

```bash
docker info
```

### Convex URL is undefined

Verify:

```env
NEXT_PUBLIC_CONVEX_URL=https://<your-deployment>.convex.cloud
```

Then restart the development server or rebuild the Docker image.

### Authentication is not working

Verify:

- Better Auth configuration
- Convex Cloud deployment
- Better Auth secret
- Convex URL
- session configuration
- frontend/backend are using the same Convex deployment

### Twilio is not sending SMS

Verify:

- Twilio account configuration
- Twilio phone number
- SMS/Voice capabilities
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_PHONE_NUMBER`
- destination restrictions

Check server/Convex logs. Never expose credentials in frontend code.

## 16. Recommended Development Workflow

Normal development:

```bash
cd phonemail
pnpm install
# configure environment variables
pnpm convex dev
pnpm dev
```

Docker/Convex Cloud workflow:

```bash
docker compose build
docker compose up -d
docker compose ps
```

## 19. Security

Never commit files containing secrets:

```text
.env
.env.local
.env.docker
```

Never expose these through `NEXT_PUBLIC_*`:

```text
BETTER_AUTH_SECRET
TWILIO_AUTH_TOKEN
GEMINI_API_KEY
```

The Convex deployment URL is safe to expose to the browser.

## 20. Pre-Submission Checklist

```text
✓ Dependencies installed
✓ Environment variables configured
✓ Convex Cloud deployment configured
✓ Better Auth configured
✓ Webchat loads
✓ Webmail loads
✓ Authentication works
✓ Conversations load
✓ Messages work
✓ Realtime updates work
✓ Profile functionality works
✓ Required external integrations work
✓ pnpm build passes
✓ lint/typecheck pass where configured
✓ Docker build succeeds
✓ docker compose up -d succeeds
✓ Docker containers remain running
```
