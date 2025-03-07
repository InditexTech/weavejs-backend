FROM --platform=linux/amd64 node:20-alpine as base

# Install dependencies step
FROM base AS deps

ENV NODE_EXTRA_CA_CERTS=/app/cert.pem

RUN sed -i 's/https/http/' /etc/apk/repositories
RUN apk add --no-cache bash g++ make python3
RUN apk add --no-cache build-base cairo-dev cairo cairo-tools pango pango-dev jpeg-dev zlib-dev freetype-dev lcms2-dev openjpeg-dev tiff-dev tk-dev tcl-dev

WORKDIR /app
COPY cert.pem ./
COPY package*.json ./
RUN npm pkg delete scripts.prepare
RUN npm ci

# Build step
FROM base AS builder

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Runtime image
FROM base AS runner

RUN sed -i 's/https/http/' /etc/apk/repositories
RUN apk add --no-cache libjpeg libpng cairo pango

WORKDIR /app
ENV NODE_ENV production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 service
COPY --from=deps --chown=service:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=service:nodejs /app/dist ./
COPY --chown=service:nodejs .env ./
COPY --chown=service:nodejs package.json ./
USER service
EXPOSE 3000
ENV PORT 3000
CMD ["node", "--experimental-specifier-resolution=node", "--env-file", ".env", "--loader", "ts-node/esm", "server.js"]