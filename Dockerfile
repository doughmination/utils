FROM oven/bun:1-alpine

WORKDIR /app

# Install dependencies first (better layer caching). dotenvx is a project
# dependency, so this pulls it in — no global install needed. Runs as root
# because the freshly-created /app is root-owned; a non-root `bun install`
# here would fail trying to create node_modules.
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# App source (node_modules, .env, .env.keys, command-ids.json all excluded
# via .dockerignore, so the installed node_modules isn't clobbered).
COPY . .

# The locally-installed dotenvx binary lives here — put it on PATH so the bare
# `dotenvx` command resolves without a global install or bunx.
ENV PATH="/app/node_modules/.bin:$PATH"

# Drop to the unprivileged bun user (uid 1000) — matches compose's
# user: 1000:1002 so bind-mounted files get the right perms.
USER bun

# Deploy commands, then run the bot. Shell form (sh -c) so `&&` chains the two
# commands — the exec form ["dotenvx", ...] has no shell and can't use `&&`.
CMD ["sh", "-c", "dotenvx run -- bun run src/deploy-commands.ts && dotenvx run -- bun run src/main.ts"]
