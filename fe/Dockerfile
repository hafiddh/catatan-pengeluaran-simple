# ---------- Build stage ----------
FROM node:22-alpine AS builder

WORKDIR /app

ARG API_BE_URL
ARG PUBLIC_API_BE_URL
ARG PUBLIC_API_BASE_URL

ENV API_BE_URL=${API_BE_URL}
ENV PUBLIC_API_BE_URL=${PUBLIC_API_BE_URL}
ENV PUBLIC_API_BASE_URL=${PUBLIC_API_BASE_URL}

COPY package.json package-lock.json* ./

RUN npm ci

COPY . .

RUN npm run build


# ---------- Runtime stage ----------
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# lightweight static file server
RUN npm install -g serve

# copy build output
COPY --from=builder /app/dist ./dist

EXPOSE 4321

CMD ["sh", "-c", "serve dist -l tcp://0.0.0.0:${PORT:-4321}"]