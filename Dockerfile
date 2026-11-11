FROM node:26-alpine@sha256:8996bb5821d62a8fd9bb27c1cb07462f3fdce6e47d640c6a881ead0b064ce216 AS base
RUN apk upgrade --no-cache

FROM base AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY scripts/copy-pdf-worker.mjs ./scripts/copy-pdf-worker.mjs
RUN npm ci
COPY . .
# Ephemeral build-only auth key. Runtime secrets come from the protected host environment.
ENV NEXT_TELEMETRY_DISABLED=1
RUN APP_BUILD_ONLY=1 BETTER_AUTH_SECRET="$(node -e 'console.log(require("node:crypto").randomBytes(48).toString("base64"))')" npm run build

FROM build AS migrate
ENTRYPOINT ["./node_modules/.bin/tsx", "migrations/runner.ts"]

FROM build AS runtime-deps
# Preserve complete production packages: standalone tracing omitted transitive exports.
RUN npm prune --omit=dev --ignore-scripts --no-audit --no-fund

FROM base AS app
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000
RUN addgroup -S -g 1001 studio && adduser -S -D -H -u 1001 -G studio studio
# Runtime uses node directly. Exclude package managers and their unused vulnerable dependencies.
RUN rm -rf /usr/local/lib/node_modules/npm /opt/yarn-v1.22.22 && rm -f /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/yarn /usr/local/bin/yarnpkg
COPY --from=build --chown=studio:studio /app/.next/standalone ./
COPY --from=runtime-deps --chown=studio:studio /app/node_modules ./node_modules
COPY --from=build --chown=studio:studio /app/.next/static ./.next/static
COPY --from=build --chown=studio:studio /app/public ./public
COPY --from=build --chown=studio:studio /app/scripts/ops-worker.mjs ./scripts/ops-worker.mjs
COPY --from=build --chown=studio:studio /app/scripts/backup.mjs ./scripts/backup.mjs
# A successful compile alone does not prove standalone API/native dependencies were traced.
RUN node -e "for (const name of ['next/dist/compiled/next-server/app-route-turbo.runtime.prod.js','pg','@node-rs/argon2','sharp','@aws-sdk/client-s3']) require(name); const a=require('@node-rs/argon2'),p='synthetic-container-check';if(!a.verifySync(a.hashSync(p,{algorithm:2,memoryCost:19456,timeCost:2,parallelism:1}),p))throw Error('Native password verification failed')"
USER studio
EXPOSE 3000
CMD ["node", "server.js"]
