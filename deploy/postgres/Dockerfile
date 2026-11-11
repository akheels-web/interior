FROM postgres:18-alpine@sha256:123b17998ccaf47e53b502e8c6a1e79afd8f579c6f3eec83c563da026f957395
# Apply available distribution fixes absent from the vendor image, then scan this artifact.
RUN apk upgrade --no-cache && apk add --no-cache su-exec && test -x /sbin/su-exec \
    && rm /usr/local/bin/gosu && ln -s /sbin/su-exec /usr/local/bin/gosu
