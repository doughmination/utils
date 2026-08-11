FROM oven/bun:1-alpine

WORKDIR /app

# Copy manifest + lockfile first for cached installs
COPY package.json bun.lock ./

# Install dependencies (frozen to the lockfile) AND dotenvx globally
RUN bun install --frozen-lockfile && bun install -g @dotenvx/dotenvx

# Copy source code
COPY . .

# Make start script executable
RUN chmod +x start.sh

# Deploy commands and run the bot (TypeScript runs directly under bun)
CMD ["sh", "start.sh"]
