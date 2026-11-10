FROM postgres:18-alpine@sha256:10a5c69a83035ab5239f5620d708520e8b28f5aa1f2b20143e6024532edadfb5
# Apply available distribution fixes absent from the vendor image, then scan this artifact.
RUN apk upgrade --no-cache && apk add --no-cache su-exec && test -x /sbin/su-exec \
    && rm /usr/local/bin/gosu && ln -s /sbin/su-exec /usr/local/bin/gosu
