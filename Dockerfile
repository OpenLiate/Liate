# Liate Sovereign Runtime - Universal Production Container
# Model Context Protocol (MCP): Stdio (Node.js/npx + Python/uvx) & HTTP/SSE
FROM oven/bun:latest AS builder

WORKDIR /app

# Install dependencies and compile runtime
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build:runtime && bun run build:bin

# Runtime Stage: Node 26 + Python + uv / uvx + npx
FROM node:26-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=7071

# 1. Install Python 3, pip, curl, bash, and git for local tool execution
RUN apk add --no-cache python3 py3-pip curl bash git

# 2. Copy official Astral uv and uvx binaries for instant Python MCP execution
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# 3. Copy compiled runtime bundle, CLI, hub definitions, and package.json
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/hub ./hub
COPY --from=builder /app/package.json ./package.json

EXPOSE 7071

# Start Liate Runtime (Agent Protocol Interface)
CMD ["node", "dist/runtime/index.js"]

