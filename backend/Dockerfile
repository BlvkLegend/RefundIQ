FROM node:20-alpine

WORKDIR /app

# Install build deps for better-sqlite3 native bindings
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

RUN mkdir -p /app/data

EXPOSE 3001

CMD ["sh", "-c", "node src/db/seed.js && node src/index.js"]
