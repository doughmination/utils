#!/bin/sh

echo "Deploying commands to Discord..."
dotenvx run -- bun run src/deploy-commands.ts

echo "Starting bot..."
dotenvx run -- bun run src/main.ts
