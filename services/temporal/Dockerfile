# Temporal Worker - TypeScript
# Lean multi-stage build using pnpm deploy
FROM node:22-slim AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate
# Install buf + Go for protoc plugins + npm plugins (buf.gen.yaml uses Go plugins for all languages)
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates && \
    curl -sSL "https://go.dev/dl/go1.23.4.linux-amd64.tar.gz" | tar -C /usr/local -xz && \
    export PATH=$PATH:/usr/local/go/bin && \
    curl -sSL "https://github.com/bufbuild/buf/releases/download/v1.53.0/buf-Linux-x86_64" -o /usr/local/bin/buf && \
    chmod +x /usr/local/bin/buf && \
    go install google.golang.org/protobuf/cmd/protoc-gen-go@latest && \
    go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest && \
    go install connectrpc.com/connect/cmd/protoc-gen-connect-go@latest && \
    cp $(go env GOPATH)/bin/protoc-gen-go /usr/local/bin/ && \
    cp $(go env GOPATH)/bin/protoc-gen-go-grpc /usr/local/bin/ && \
    cp $(go env GOPATH)/bin/protoc-gen-connect-go /usr/local/bin/ && \
    rm -rf /usr/local/go $(go env GOPATH) && \
    apt-get purge -y curl && apt-get autoremove -y && rm -rf /var/lib/apt/lists/*
# Install npm-based protoc plugins for TypeScript generation
RUN npm install -g @bufbuild/protoc-gen-es@2.12.1 @bufbuild/protoc-gen-connect-es@0.13.0
ENV CI=true

# Copy workspace config
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY pkg/contracts/package.json ./pkg/contracts/
COPY pkg/contracts/buf.gen.yaml ./pkg/contracts/
COPY pkg/contracts/buf.yaml ./pkg/contracts/
COPY pkg/contracts/proto ./pkg/contracts/proto/
COPY libs/cedar/ts/package.json ./libs/cedar/ts/
COPY libs/crypto/ts/package.json ./libs/crypto/ts/
COPY libs/kg/ts/package.json ./libs/kg/ts/
COPY libs/verifier/ts/package.json ./libs/verifier/ts/
COPY services/temporal/package.json ./services/temporal/

# Install dependencies
RUN pnpm install --frozen-lockfile --shamefully-hoist

# Copy source code
COPY pkg/contracts/ ./pkg/contracts/
COPY libs/cedar/ts/ ./libs/cedar/ts/
COPY libs/crypto/ts/ ./libs/crypto/ts/
COPY libs/kg/ts/ ./libs/kg/ts/
COPY libs/verifier/ts/ ./libs/verifier/ts/
COPY services/temporal/ ./services/temporal/

# Generate protobuf contracts
RUN cd pkg/contracts && buf generate

# Build dependencies
RUN npx tsc --project libs/kg/ts/tsconfig.json && \
    npx tsc --project libs/verifier/ts/tsconfig.json && \
    npx tsc --project libs/cedar/ts/tsconfig.json && \
    npx tsc --project libs/crypto/ts/tsconfig.json

# Build temporal
RUN npx tsc --project services/temporal/tsconfig.json

FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/pkg/contracts ./pkg/contracts
COPY --from=builder /app/libs/cedar/ts ./libs/cedar/ts
COPY --from=builder /app/libs/crypto/ts ./libs/crypto/ts
COPY --from=builder /app/libs/kg/ts ./libs/kg/ts
COPY --from=builder /app/libs/verifier/ts ./libs/verifier/ts
COPY --from=builder /app/services/temporal/dist ./dist
COPY --from=builder /app/services/temporal/package.json ./
CMD ["node", "dist/worker.js"]