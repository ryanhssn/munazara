# syntax=docker/dockerfile:1
FROM node:20-alpine AS base
WORKDIR /app

# Install dependencies from the lockfile first for cache reuse.
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# Build the Next.js production bundle.
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# NEXT_PUBLIC_* vars are inlined at build time.
ARG NEXT_PUBLIC_API_URL=http://localhost:8000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN npm run build

# Runtime image: install prod deps only, run `next start`.
FROM base AS runner
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/next.config.ts ./next.config.ts
EXPOSE 3000
CMD ["npm", "run", "start"]
