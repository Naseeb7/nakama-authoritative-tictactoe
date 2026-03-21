FROM node:alpine AS builder

WORKDIR /app

COPY package.json tsconfig.json ./
RUN npm install

COPY src ./src
RUN npm run build

FROM registry.heroiclabs.com/heroiclabs/nakama:3.22.0

COPY --from=builder /app/build /nakama/data/modules/build
