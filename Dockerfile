FROM node:22-slim

WORKDIR /srv
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci

COPY tsconfig.json firebase-applet-config.json server.ts ./
COPY src ./src
COPY public ./public
COPY drizzle ./drizzle

RUN npm run build

EXPOSE 3000

CMD ["sh", "-c", "npx drizzle-kit push --config=src/db/drizzle.config.ts && npm start"]
