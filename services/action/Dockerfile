# Action Service - Go
FROM golang:1.25-alpine AS builder
WORKDIR /app
COPY services/action/ ./
COPY pkg/contracts/ ./pkg/contracts/
COPY libs/kg/go/ ./libs/kg/go/
# Copy generated contracts (git-ignored, must be generated locally before build)
COPY pkg/contracts/generated/ ./pkg/contracts/generated/
RUN sed -i 's|github.com/engenox/contracts => ../../pkg/contracts|github.com/engenox/contracts => ./pkg/contracts|' go.mod && \
    sed -i 's|github.com/engenox/kg => ../../libs/kg/go|github.com/engenox/kg => ./libs/kg/go|' go.mod
RUN go mod download
RUN CGO_ENABLED=0 GOOS=linux go build -o /action .

FROM alpine:3.20 AS runner
WORKDIR /app
COPY --from=builder /action ./action
EXPOSE 9091
CMD ["./action"]
