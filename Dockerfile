# ---------- Build stage ----------
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./

RUN npm ci

COPY . .

RUN npm run build


# ---------- Runtime stage ----------
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4321

# lightweight static file server
RUN npm install -g serve

# copy build output
COPY --from=builder /app/dist ./dist

EXPOSE 4321

CMD ["serve", "dist", "-l", "tcp://0.0.0.0:4321"]