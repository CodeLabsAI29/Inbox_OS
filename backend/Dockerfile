# ─── Stage 1: Development Environment / Builder ────────────────────────────────
FROM node:20-alpine AS builder

RUN apk add --no-cache openssl libc6-compat

WORKDIR /usr/src/app

# Install dependencies (leverage layer cache)
COPY package*.json ./
RUN npm install --ignore-scripts

# Copy source files
COPY tsconfig.json ./
COPY prisma ./prisma/
COPY src ./src/

# Generate Prisma client
RUN npx prisma generate

# ─── Stage 2: Development Stage ──────────────────────────────────────────────
FROM builder AS dev

EXPOSE 8000
CMD ["npm", "run", "dev"]

# ─── Stage 3: Production Compile Stage ─────────────────────────────────────────
FROM builder AS compiler
RUN npm run build

# ─── Stage 4: Production Runtime ─────────────────────────────────────────────
FROM node:20-alpine AS runner

RUN apk add --no-cache openssl libc6-compat

WORKDIR /usr/src/app

# Install only production dependencies
COPY package*.json ./
RUN npm install --omit=dev --ignore-scripts

# Copy compiled output and Prisma artifacts from compiler
COPY --from=compiler /usr/src/app/dist ./dist
COPY --from=compiler /usr/src/app/prisma ./prisma
COPY --from=compiler /usr/src/app/node_modules/.prisma ./node_modules/.prisma
COPY --from=compiler /usr/src/app/node_modules/@prisma ./node_modules/@prisma

# Set proper ownership to non-root node user
RUN chown -R node:node /usr/src/app

# Run as non-root user
USER node

# Expose API port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8000/api/health || exit 1

# Start the compiled server
CMD ["node", "dist/server.js"]
