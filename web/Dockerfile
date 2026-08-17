FROM node:22-alpine AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate
# Install buf + Go for protoc plugins + node-gyp dependencies
RUN apk add --no-cache curl go python3 make g++ && \
    curl -sSL "https://github.com/bufbuild/buf/releases/download/v1.53.0/buf-Linux-x86_64" -o /usr/local/bin/buf && \
    chmod +x /usr/local/bin/buf && \
    go install google.golang.org/protobuf/cmd/protoc-gen-go@latest && \
    go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest && \
    go install connectrpc.com/connect/cmd/protoc-gen-connect-go@latest && \
    cp $(go env GOPATH)/bin/protoc-gen-go /usr/local/bin/ && \
    cp $(go env GOPATH)/bin/protoc-gen-go-grpc /usr/local/bin/ && \
    cp $(go env GOPATH)/bin/protoc-gen-connect-go /usr/local/bin/ && \
    apk del curl go

# copy workspace files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY web/package.json ./web/
COPY design-system/package.json ./design-system/
COPY pkg/contracts/package.json ./pkg/contracts/

# Install dependencies
RUN pnpm install --frozen-lockfile --shamefully-hoist

# Copy source
COPY web/ ./web/
COPY design-system/ ./design-system/
COPY pkg/contracts/ ./pkg/contracts/

# Build design-system so latest source changes are compiled into dist/
RUN cd design-system && CI=true pnpm run build
# Build contracts
RUN cd pkg/contracts && CI=true pnpm run build
# Build the nextjs app (dummy WORKOS_API_KEY for build-time module evaluation)
RUN cd web && WORKOS_API_KEY=sk_build_placeholder CI=true pnpm build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV production
COPY --from=builder /app/web/public ./web/public
# copy the standalone directory to /app
COPY --from=builder /app/web/.next/standalone ./
COPY --from=builder /app/web/.next/static ./web/.next/static
# fix for Next.js 16 turbopack standalone missing chunks
COPY --from=builder /app/web/.next/server/chunks/ssr ./web/.next/server/chunks/ssr
EXPOSE 3000
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "web/server.js"]
