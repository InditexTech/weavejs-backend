# SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
#
# SPDX-License-Identifier: Apache-2.0

FROM node:20 as base

# Install dependencies step
FROM base AS deps

WORKDIR /app
COPY package*.json ./
RUN npm install

# Build step
FROM base AS builder

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Runtime image
FROM base AS runner

WORKDIR /app
ENV NODE_ENV production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 service
COPY --from=deps --chown=service:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=service:nodejs /app/dist ./
COPY --chown=service:nodejs .env ./
COPY --chown=service:nodejs package.json ./
USER service
CMD ["node", "--env-file=./.env", "action.js"]
