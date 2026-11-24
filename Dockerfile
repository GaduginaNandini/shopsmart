FROM node:22-slim

WORKDIR /srv
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json firebase-applet-config.json server.ts ./
COPY src ./src
COPY public ./public
COPY drizzle ./drizzle

RUN npm run build

EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["sh", "-c", "npx drizzle-kit push --config=src/db/drizzle.config.ts && npm start"]
