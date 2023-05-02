# syntax=docker/dockerfile:1.4
FROM node:lts-alpine as builder

WORKDIR /dscp-matchmaker-api

# Install base dependencies
RUN npm install -g npm@latest

COPY package*.json ./
COPY tsconfig.json ./

RUN npm ci
COPY . .
RUN npm run build

# service 
FROM node:lts-alpine as service

RUN apk add --update coreutils

WORKDIR /dscp-matchmaker-api

RUN npm -g install npm@9.x.x

COPY package*.json ./
COPY processFlows.json ./
RUN npm ci --production
RUN npm install @digicatapult/dscp-process-management@latest
COPY --from=builder /dscp-matchmaker-api/build .

EXPOSE 80
CMD [ "node", "./index.js" ]