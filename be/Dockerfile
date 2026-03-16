FROM golang:1.25-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./

RUN go mod download

COPY . ./

RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o /app/server ./main.go

FROM alpine:3.20

WORKDIR /app

RUN apk add --no-cache ca-certificates
RUN adduser -D -g '' appuser

COPY --from=builder /app/server /app/server

EXPOSE 1323

USER appuser

CMD ["/app/server"]