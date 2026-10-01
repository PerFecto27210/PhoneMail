FROM node:24-alpine AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable

WORKDIR /app


FROM base AS deps

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./

COPY apps/webchat/package.json apps/webchat/package.json
COPY packages packages

RUN pnpm install --frozen-lockfile


FROM deps AS builder

COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

RUN pnpm turbo build --filter=webchat


FROM node:24-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /app/apps/webchat/.next/standalone ./
COPY --from=builder /app/apps/webchat/.next/static ./apps/webchat/.next/static

EXPOSE 3000

CMD ["node", "apps/webchat/server.js"]