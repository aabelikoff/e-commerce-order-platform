# syntax=docker/dockerfile:1
FROM node:20-slim AS base
WORKDIR /app

# 1) deps
FROM base AS deps
COPY package*.json ./
RUN npm ci

# 2) dev
FROM deps AS dev
ENV NODE_ENV=development
COPY . .
EXPOSE 3001
CMD ["npm", "run", "start:dev"]

#3) build
FROM deps AS build
COPY . .
RUN npm run build

#4) prod-deps
FROM deps AS prod-deps
RUN npm prune --omit=dev && npm cache clean --force

#5) prod
FROM node:20-slim AS prod
WORKDIR /app
ENV NODE_ENV=production

COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=prod-deps --chown=node:node /app/package.json ./package.json

USER node
EXPOSE 3001
CMD ["node", "dist/main.js"]

#6) prod-distroless
FROM gcr.io/distroless/nodejs20-debian12:nonroot AS prod-distroless
WORKDIR /app
ENV NODE_ENV=production

COPY --from=prod-deps --chown=nonroot:nonroot /app/node_modules ./node_modules
COPY --from=build --chown=nonroot:nonroot /app/dist ./dist
COPY --from=prod-deps --chown=nonroot:nonroot /app/package.json ./package.json


EXPOSE 3001
CMD ["dist/main.js"]




