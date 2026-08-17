# Perception Service - Go
FROM golang:1.25-alpine AS builder
WORKDIR /app
COPY services/perception/ ./
COPY pkg/contracts/ ./pkg/contracts/
COPY libs/kg/go/ ./libs/kg/go/
COPY pkg/contracts/generated/ ./pkg/contracts/generated/
RUN sed -i 's|github.com/engenox/contracts => ../../pkg/contracts|github.com/engenox/contracts => ./pkg/contracts|' go.mod && \
    sed -i 's|github.com/engenox/kg => ../../libs/kg/go|github.com/engenox/kg => ./libs/kg/go|' go.mod
RUN go mod download
RUN CGO_ENABLED=0 GOOS=linux go build -o /perception ./cmd/main.go

FROM alpine:3.20 AS runner
WORKDIR /app
COPY --from=builder /perception ./perception
EXPOSE 9090
CMD ["./perception"]
