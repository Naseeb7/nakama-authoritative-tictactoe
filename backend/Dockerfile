FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json tsconfig.json ./
RUN npm ci

COPY src ./src
RUN npm run build

FROM registry.heroiclabs.com/heroiclabs/nakama:3.22.0

COPY --from=builder /app/build /nakama/data/modules/build
COPY local.yml /nakama/data/local.yml

EXPOSE 7349 7350 7351

CMD ["/bin/sh", "-ec", "/nakama/nakama migrate up --database.address \"$DATABASE_ADDRESS\" && exec /nakama/nakama --config /nakama/data/local.yml --database.address \"$DATABASE_ADDRESS\""]
