FROM node:20-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src/ ./src/

RUN npm run build

# medicines.db is mounted via docker-compose volumes at /app/medicines.db
CMD ["node", "dist/index.js"]
