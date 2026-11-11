FROM golang:1.27-alpine@sha256:d200d2dd76b03a99b52651fd1325aff7dcd35422c35c01bac56571b0507f3deb AS build
WORKDIR /src
ENV GOTOOLCHAIN=local CGO_ENABLED=0
COPY go.mod go.sum ./
RUN go mod download
COPY main.go ./
RUN go build -mod=readonly -trimpath -ldflags="-s -w" -o /caddy .

FROM caddy:2.11-alpine@sha256:78bd35025c7ba85961dd149ae670315129954e77abe2383ac47c89106b35ade9
# Vendor image predates available Alpine curl/brotli fixes. Re-scan the built image.
RUN apk upgrade --no-cache
COPY --from=build /caddy /usr/bin/caddy
