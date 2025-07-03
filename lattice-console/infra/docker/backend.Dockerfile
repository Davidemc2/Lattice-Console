FROM node:20-alpine AS base

# Install pnpm
RUN corepack enable && corepack prepare pnpm@8.14.1 --activate

# Set working directory
WORKDIR /app

# Install dependencies only when needed
FROM base AS deps
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml ./
COPY apps/backend/package.json ./apps/backend/
COPY packages/utils/package.json ./packages/utils/
COPY packages/trpc/package.json ./packages/trpc/

RUN pnpm install --frozen-lockfile

# Rebuild the source code only when needed
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/backend/node_modules ./apps/backend/node_modules
COPY --from=deps /app/packages/utils/node_modules ./packages/utils/node_modules
COPY --from=deps /app/packages/trpc/node_modules ./packages/trpc/node_modules

COPY . .

# Generate Prisma client
WORKDIR /app/apps/backend
RUN pnpm prisma generate

WORKDIR /app
RUN pnpm run build

# Production image, copy all the files and run
FROM base AS runner
ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs

COPY --from=builder /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder /app/apps/backend/prisma ./apps/backend/prisma
COPY --from=builder /app/apps/backend/node_modules ./apps/backend/node_modules
COPY --from=builder /app/packages/utils/dist ./packages/utils/dist
COPY --from=builder /app/packages/trpc/dist ./packages/trpc/dist
COPY --from=builder /app/node_modules ./node_modules

USER nodejs

EXPOSE 3001

WORKDIR /app/apps/backend
CMD ["node", "dist/index.js"]