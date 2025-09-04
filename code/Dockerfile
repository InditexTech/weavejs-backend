# SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
#
# SPDX-License-Identifier: Apache-2.0

FROM node:20 as base

# Install dependencies step
FROM base AS deps

RUN apt-get update -y
RUN apt-get install -y bash g++ make python3
RUN apt-get install -y build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev libtool autoconf automake

WORKDIR /app
COPY package*.json ./
RUN npm pkg delete scripts.prepare
RUN npm install

# Build step
FROM base AS builder

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/public ./public
COPY --from=deps /app/fonts ./fonts
COPY . .
RUN npm run build

# Runtime image
FROM base AS runner

RUN apt-get update -y
RUN apt-get install -y build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev libtool autoconf automake

WORKDIR /app
ENV NODE_ENV production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 service
COPY --from=deps --chown=service:nodejs /app/node_modules ./node_modules
COPY --from=deps --chown=service:nodejs /app/fonts ./fonts
COPY --from=builder --chown=service:nodejs /app/dist ./
COPY --chown=service:nodejs .env ./
COPY --chown=service:nodejs package.json ./
USER service
EXPOSE 8080
ENV PORT 8080
CMD ["node", "--experimental-specifier-resolution=node", "--env-file=.env", "--loader=ts-node/esm", "server.js"]
