FROM golang:1.27-alpine@sha256:fa3d596898d9f126af7c01d14ee7597bab3f39cccf392ef36b69fe77cd681f18 AS build
WORKDIR /src
ENV GOTOOLCHAIN=local CGO_ENABLED=0
COPY go.mod go.sum ./
RUN go mod download
COPY main.go ./
RUN go build -mod=readonly -trimpath -ldflags="-s -w" -o /caddy .

FROM caddy:2.11-alpine@sha256:e70b164da81ef698b3ad19af799ea6086ce6d9e48ed4079eb9fe26f6fbf14ee5
# Vendor image predates available Alpine curl/brotli fixes. Re-scan the built image.
RUN apk upgrade --no-cache
COPY --from=build /caddy /usr/bin/caddy
