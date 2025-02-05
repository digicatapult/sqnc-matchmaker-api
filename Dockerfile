# syntax=docker/dockerfile:1.13
FROM node:lts-alpine as builder

WORKDIR /sqnc-matchmaker-api

# Install base dependencies
RUN npm install -g npm@10.x.x

COPY package*.json ./
COPY tsconfig.json ./

RUN npm ci
COPY . .
RUN npm run build

# service
FROM node:lts-alpine as service

WORKDIR /sqnc-matchmaker-api

RUN apk add --no-cache coreutils curl
RUN npm -g install npm@10.x.x

COPY package*.json ./
COPY processFlows.json ./

COPY import ./import

RUN npm ci --production

COPY --from=builder /sqnc-matchmaker-api/build ./build

HEALTHCHECK --interval=30s  --timeout=20s \
    CMD curl -f http://localhost:3000/health || exit 1

EXPOSE 3000
CMD [ "npm", "start" ]
