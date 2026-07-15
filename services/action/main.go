// main.go — ActionService entry point (M3).
//
// The Action layer is the ONLY external-side-effect boundary.
// It owns: GitHub App credential (Vault), allow-list-glob, diff-review blocker,
// Cedar two-pass gate, signed manifest, pre-staged rollback-hash, idempotency.
// No LLM touches this service; the Cedar gate is the symbolic commitment.
//
// Cites: 25 §3 M3, 15 §5, 12 §3-5, 09 §6, ADR-0007 #4.

package main

import (
	"context"
	"crypto/ed25519"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/engenox/contracts/generated/go/engenox/service/v1/servicev1connect"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
	"go.opentelemetry.io/otel/propagation"
	"go.opentelemetry.io/otel/sdk/resource"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	semconv "go.opentelemetry.io/otel/semconv/v1.26.0"
	"golang.org/x/net/http2"
	"golang.org/x/net/http2/h2c"

	"github.com/engenox/services/action/internal/allowlist"
	"github.com/engenox/services/action/internal/cedargate"
	"github.com/engenox/services/action/internal/diffreview"
	"github.com/engenox/services/action/internal/githubapp"
	"github.com/engenox/services/action/internal/idempotency"
	"github.com/engenox/services/action/internal/ledger"
	"github.com/engenox/services/action/internal/manifest"
	"github.com/engenox/services/action/internal/server"
)

const (
	serviceName    = "action"
	defaultPort    = "9091"
	otelEndpoint   = "OTEL_EXPORTER_OTLP_ENDPOINT"
	githubAppID    = "GITHUB_APP_ID"
	githubAppKey   = "GITHUB_APP_PRIVATE_KEY"
	githubAppInstall = "GITHUB_APP_INSTALLATION_ID"
	vaultAddr      = "VAULT_ADDR"
	vaultToken     = "VAULT_TOKEN"
)

func main() {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// OTel setup
	tp, err := initTracer(ctx)
	if err != nil {
		log.Printf("WARN: OTel init failed: %v", err)
	} else {
		defer func() { _ = tp.Shutdown(ctx) }()
	}

	// GitHub App client
	ghClient, err := githubapp.NewClient(ctx)
	if err != nil {
		log.Fatalf("GitHub App client init failed: %v", err)
	}

	// Signing key for manifests (in production: from Vault/HSM)
	signingKey, err := loadOrGenerateSigningKey()
	if err != nil {
		log.Fatalf("Signing key init failed: %v", err)
	}

	// Idempotency store (in production: Redis/Valkey with TTL)
	idemStore := idempotency.NewInMemoryStore()

	// Policy store for Cedar (in production: compiled policies from config)
	policyStore := cedargate.NewInMemoryPolicyStore()
	if err := policyStore.LoadDefaultPolicies(); err != nil {
		log.Fatalf("Cedar policy load failed: %v", err)
	}

	// Dial ledger + three-axis evaluator + demote-on-alert (M3-thin: in-memory)
	dialLedger := ledger.NewInMemoryDialLedger()
	axisEvaluator := ledger.NewInMemoryThreeAxisEvaluator()
	demoteEvaluator := ledger.NewInMemoryDemoteOnAlert()

	// Dial gate evaluator orchestrates Cedar + three-axis + demote-on-alert
	dialGateEval := ledger.NewDialGateEvaluator(
		cedargate.NewGate(policyStore),
		dialLedger,
		axisEvaluator,
		demoteEvaluator,
	)

	// Action service implementation
	svc := server.NewActionService(server.ActionServiceDeps{
		GitHubClient:   ghClient,
		SigningKey:     signingKey,
		Idempotency:    idemStore,
		PolicyStore:    policyStore,
		AllowListEval:  allowlist.NewEvaluator(),
		DiffReviewer:   diffreview.NewReviewer(diffreview.Config{}),
		CedarGate:      cedargate.NewGate(policyStore),
		ManifestGen:    manifest.NewGenerator(signingKey),
		DialLedger:     dialLedger,
		DialGateEval:   dialGateEval,
	})

	// ConnectRPC HTTP handler (supports Connect, gRPC, gRPC-Web)
	path, handler := servicev1connect.NewActionServiceHandler(svc)
	mux := http.NewServeMux()
	mux.Handle(path, handler)

	// HTTP server with h2c for gRPC support
	port := os.Getenv("PORT")
	if port == "" {
		port = defaultPort
	}

	// h2c allows gRPC over HTTP/2 without TLS (for local dev)
	h2cHandler := h2c.NewHandler(mux, &http2.Server{})

	httpServer := &http.Server{
		Addr:    ":" + port,
		Handler: h2cHandler,
	}

	// Start server
	go func() {
		log.Printf("[%s] ConnectRPC server listening on :%s (h2c)", serviceName, port)
		if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("serve failed: %v", err)
		}
	}()

	// Graceful shutdown
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
	<-sigCh
	log.Println("Shutting down...")
	ctxShut, cancelShut := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancelShut()
	_ = httpServer.Shutdown(ctxShut)
	cancel()
	time.Sleep(500 * time.Millisecond)
}

func initTracer(ctx context.Context) (*sdktrace.TracerProvider, error) {
	endpoint := os.Getenv(otelEndpoint)
	if endpoint == "" {
		endpoint = "localhost:4317"
	}

	exporter, err := otlptracegrpc.New(ctx,
		otlptracegrpc.WithEndpoint(endpoint),
		otlptracegrpc.WithInsecure(),
	)
	if err != nil {
		return nil, err
	}

	res, err := resource.New(ctx,
		resource.WithAttributes(
			semconv.ServiceName(serviceName),
			semconv.ServiceVersion("0.1.0"),
		),
	)
	if err != nil {
		return nil, err
	}

	tp := sdktrace.NewTracerProvider(
		sdktrace.WithBatcher(exporter),
		sdktrace.WithResource(res),
	)
	otel.SetTracerProvider(tp)
	otel.SetTextMapPropagator(propagation.NewCompositeTextMapPropagator(
		propagation.TraceContext{},
		propagation.Baggage{},
	))

	return tp, nil
}

func loadOrGenerateSigningKey() (ed25519.PrivateKey, error) {
	// In production: fetch from Vault transit engine or HSM
	// For M3-thin: generate ephemeral or load from env
	keyHex := os.Getenv("ACTION_SIGNING_KEY")
	if keyHex != "" {
		bytes, err := hex.DecodeString(keyHex)
		if err != nil {
			return nil, err
		}
		if len(bytes) != ed25519.PrivateKeySize {
			return nil, fmt.Errorf("invalid key size: %d", len(bytes))
		}
		return ed25519.PrivateKey(bytes), nil
	}

	// Generate ephemeral for dev
	pub, priv, err := ed25519.GenerateKey(rand.Reader)
	if err != nil {
		return nil, err
	}
	log.Printf("[action] Generated ephemeral signing key (pub: %s)", hex.EncodeToString(pub))
	return priv, nil
}