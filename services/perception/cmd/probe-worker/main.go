// cmd/probe-worker/main.go — Perception probe fleet worker entry point (M5-thin).
//
// The probe fleet runs the fan-out across AI surfaces, fan-in through
// gateway.Extract, and writes Assertion nodes to the KG via libs/kg.
// This is the fleet entry point that runs as a Temporal activity or
// standalone cron job. M5-thin: stub workers + scheduler; M6-thicken:
// real surface adapters + gateway Extract RPC.
package main

import (
	"context"
	"flag"
	"log"
	"net/http"
	"os"
	"os/signal"
	"sync"
	"syscall"
	"time"

	entityv1 "github.com/engenox/contracts/generated/go/engenox/entity/v1"
	"github.com/engenox/perception/internal/probe"
	engkg "github.com/engenox/kg"
)

var (
	addr         = flag.String("addr", ":9091", "HTTP listen address for health/metrics")
	gatewayAddr  = flag.String("gateway", "http://localhost:8080", "Gateway service address")
	measurement  = flag.String("measurement", "http://localhost:8083", "Measurement service address")
	tenantID     = flag.String("tenant", "", "Tenant ID to probe (required for single-tenant mode)")
	surfaces     = flag.String("surfaces", "chatgpt,perplexity,gemini,grok,claude", "Comma-separated surfaces to probe")
	queries      = flag.String("queries", "", "Comma-separated query templates (required)")
	samples      = flag.Int("samples", 2, "Samples per query (M)")
	interval     = flag.Duration("interval", 5*time.Minute, "Probe cycle interval (0 = run once)")
	concurrency  = flag.Int("concurrency", 10, "Max concurrent probes")
	timeout      = flag.Duration("timeout", 30*time.Second, "Per-probe timeout")
	cooldown     = flag.Duration("cooldown", 1*time.Hour, "Cooldown between cycles for same tenant/surface/query")
	once         = flag.Bool("once", false, "Run single cycle and exit (overrides -interval)")
	healthOnly   = flag.Bool("health", false, "Run health check on all surfaces and exit")
)

func main() {
	flag.Parse()

	// Parse surfaces
	surfaceList := parseSurfaces(*surfaces)
	if len(surfaceList) == 0 {
		log.Fatal("no surfaces specified")
	}

	// Parse queries
	queryList := parseQueries(*queries)
	if *healthOnly {
		// Health check mode doesn't require queries
	} else if len(queryList) == 0 {
		log.Fatal("no queries specified (or use -health for health check only)")
	}

	ctx, cancel := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer cancel()

	// Initialize KG store (in-memory for M5-thin)
	kgStore := engkg.NewInMemoryAssertionStore()

	// Initialize workers
	workers := probe.AllWorkers()
	log.Printf("Initialized %d probe workers", len(workers))

	// Initialize scheduler
	cfg := probe.SchedulerConfig{
		SamplesPerQuery: *samples,
		MaxConcurrency:  *concurrency,
		ProbeTimeout:    *timeout,
		Cooldown:        *cooldown,
		GatewayAddr:     *measurement,
	}
	scheduler := probe.NewProbeScheduler(cfg, workers, kgStore, *measurement)

	// Health check mode
	if *healthOnly {
		runHealthChecks(ctx, workers, surfaceList)
		return
	}

	// Single tenant mode vs multi-tenant (future)
	if *tenantID != "" {
		runTenantMode(ctx, scheduler, *tenantID, surfaceList, queryList, *once, *interval)
	} else {
		// Future: multi-tenant from config/DB
		log.Fatal("multi-tenant mode not implemented in M5-thin; use -tenant flag")
	}
}

func runHealthChecks(ctx context.Context, workers []probe.SurfaceWorker, surfaces []entityv1.Surface) {
	log.Println("Running health checks...")

	surfaceMap := make(map[entityv1.Surface]probe.SurfaceWorker)
	for _, w := range workers {
		surfaceMap[w.Surface()] = w
	}

	var wg sync.WaitGroup
	errCh := make(chan error, len(surfaces))

	for _, s := range surfaces {
		w, ok := surfaceMap[s]
		if !ok {
			log.Printf("WARNING: no worker for surface %s", s)
			continue
		}

		wg.Add(1)
		go func(surface entityv1.Surface, worker probe.SurfaceWorker) {
			defer wg.Done()
			if err := worker.HealthCheck(ctx); err != nil {
				errCh <- err
			} else {
				log.Printf("Health check PASSED: %s", surface)
			}
		}(s, w)
	}

	wg.Wait()
	close(errCh)

	hasErrors := false
	for err := range errCh {
		hasErrors = true
		log.Printf("Health check FAILED: %v", err)
	}

	if hasErrors {
		os.Exit(1)
	}
	log.Println("All health checks passed")
}

func runTenantMode(ctx context.Context, scheduler *probe.ProbeScheduler, tenantID string, surfaces []entityv1.Surface, queries []string, once bool, interval time.Duration) {
	log.Printf("Starting probe fleet for tenant=%s surfaces=%v queries=%v samples=%d",
		tenantID, surfaces, queries, len(surfaces)*len(queries)*2)

	// Start HTTP server for health/metrics
	httpSrv := &http.Server{Addr: *addr}
	go func() {
		if err := httpSrv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Printf("HTTP server error: %v", err)
		}
	}()
	defer httpSrv.Shutdown(ctx)

	runCycle := func() (int, int, map[entityv1.Surface]int) {
		log.Printf("Starting probe cycle for tenant=%s", tenantID)
		total, success, errs := scheduler.RunProbeCycle(ctx, tenantID, surfaces, queries)
		log.Printf("Cycle complete: total=%d success=%d errors=%v", total, success, errs)
		return total, success, errs
	}

	if once {
		runCycle()
		return
	}

	// Scheduled cycles
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	// Run first cycle immediately
	runCycle()

	for {
		select {
		case <-ctx.Done():
			log.Println("Shutdown signal received")
			return
		case <-ticker.C:
			runCycle()
		}
	}
}

func parseSurfaces(input string) []entityv1.Surface {
	if input == "" {
		return nil
	}
	parts := splitAndTrim(input)
	surfaces := make([]entityv1.Surface, 0, len(parts))
	for _, p := range parts {
		s := surfaceFromString(p)
		if s != entityv1.Surface_SURFACE_UNSPECIFIED {
			surfaces = append(surfaces, s)
		} else {
			log.Printf("WARNING: unknown surface %q, skipping", p)
		}
	}
	return surfaces
}

func parseQueries(input string) []string {
	if input == "" {
		return nil
	}
	return splitAndTrim(input)
}

func splitAndTrim(input string) []string {
	// Simple comma split and trim
	var result []string
	current := ""
	for _, r := range input {
		if r == ',' {
			trimmed := trimSpace(current)
			if trimmed != "" {
				result = append(result, trimmed)
			}
			current = ""
		} else {
			current += string(r)
		}
	}
	if trimmed := trimSpace(current); trimmed != "" {
		result = append(result, trimmed)
	}
	return result
}

func trimSpace(s string) string {
	// Trim leading/trailing whitespace
	start := 0
	for start < len(s) && (s[start] == ' ' || s[start] == '\t' || s[start] == '\n' || s[start] == '\r') {
		start++
	}
	end := len(s)
	for end > start && (s[end-1] == ' ' || s[end-1] == '\t' || s[end-1] == '\n' || s[end-1] == '\r') {
		end--
	}
	return s[start:end]
}

func surfaceFromString(s string) entityv1.Surface {
	switch s {
	case "chatgpt":
		return entityv1.Surface_SURFACE_CHATGPT
	case "perplexity":
		return entityv1.Surface_SURFACE_PERPLEXITY
	case "gemini":
		return entityv1.Surface_SURFACE_GEMINI
	case "groq":
		return entityv1.Surface_SURFACE_GROK
	case "claude":
		return entityv1.Surface_SURFACE_CLAUDE
	default:
		return entityv1.Surface_SURFACE_UNSPECIFIED
	}
}