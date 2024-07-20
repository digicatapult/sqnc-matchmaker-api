# syntax=docker/dockerfile:1.9
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

RUN apk add --update coreutils
RUN npm -g install npm@10.x.x

COPY package*.json ./
COPY processFlows.json ./

RUN npm ci --production

COPY --from=builder /sqnc-matchmaker-api/build ./build

EXPOSE 80
CMD [ "npm", "start" ]
