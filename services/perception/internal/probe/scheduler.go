// internal/probe/scheduler.go — Probe fleet scheduler (M5-thin).
//
// Orchestrates M×N×K fan-out: for each tenant, each active surface, each query template,
// each sample (1..N). Calls surface workers, gateway.Extract, writes assertions via Assert.
//
// Thin = in-process scheduler, in-memory state, no Spot fleet. The interface + orchestrator
// IS the mechanism preserved; thickening swaps in-process for distributed workers + queue.
//
// Cites: 11 §3 (perception fan-out), 13 §2 (KG write path), 24 §3 (services via gRPC client),
//        ADR-0007 Thinning Rule (mechanism preserved, substrate swapped).

package probe

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"sync"
	"time"

	"connectrpc.com/connect"
	entityv1 "github.com/engenox/contracts/generated/go/engenox/entity/v1"
	eventv1 "github.com/engenox/contracts/generated/go/engenox/event/v1"
	servicev1 "github.com/engenox/contracts/generated/go/engenox/service/v1"
	servicev1connect "github.com/engenox/contracts/generated/go/engenox/service/v1/servicev1connect"
	"github.com/engenox/kg"
)

// SchedulerConfig controls the probe fleet behavior.
type SchedulerConfig struct {
	// Samples per (tenant, surface, query) — M5-thin default 3.
	SamplesPerQuery int
	// Concurrency limit for probe workers (M5-thin: 8; thickening: N*M*K pods).
	MaxConcurrency int
	// Per-probe timeout (M5-thin: 30s; hardening: 120s with cancellation).
	ProbeTimeout time.Duration
	// Cooldown between probe attempts for same (tenant, surface, query).
	Cooldown time.Duration
	// Gateways to call for Extract seam.
	GatewayAddr string
}

// DefaultSchedulerConfig returns M5-thin defaults.
func DefaultSchedulerConfig() SchedulerConfig {
	return SchedulerConfig{
		SamplesPerQuery: 3,
		MaxConcurrency:  8,
		ProbeTimeout:    30 * time.Second,
		Cooldown:        5 * time.Minute,
		GatewayAddr:     "http://localhost:8080",
	}
}

// ProbeSchedulerInterface is the interface for scheduling probes.
// Both the real ProbeScheduler and test mocks implement this.
type ProbeSchedulerInterface interface {
	ScheduleProbe(tenantID string, surface entityv1.Surface)
	RunProbeCycle(ctx context.Context, tenantID string, surfaces []entityv1.Surface, queries []string) (int, int, map[entityv1.Surface]int)
}

// ProbeScheduler orchestrates the M×N×K fan-out.
type ProbeScheduler struct {
	cfg        SchedulerConfig
	workers    map[entityv1.Surface]SurfaceWorker
	kgStore    kg.AssertionStore
	gatewayCli servicev1connect.GatewayServiceClient
	httpClient *http.Client

	mu       sync.Mutex
	lastProbe map[string]time.Time // key: tenant|surface|query -> last probe time
}

func NewProbeScheduler(cfg SchedulerConfig, workers []SurfaceWorker, kgStore kg.AssertionStore, gatewayAddr string) *ProbeScheduler {
	workerMap := make(map[entityv1.Surface]SurfaceWorker)
	for _, w := range workers {
		workerMap[w.Surface()] = w
	}

	httpClient := &http.Client{Timeout: cfg.ProbeTimeout}
	gatewayCli := servicev1connect.NewGatewayServiceClient(httpClient, gatewayAddr)

	return &ProbeScheduler{
		cfg:        cfg,
		workers:    workerMap,
		kgStore:    kgStore,
		gatewayCli: gatewayCli,
		httpClient: httpClient,
		lastProbe:  make(map[string]time.Time),
	}
}

// ProbeRequest is the input to a single probe execution.
type ProbeRequest struct {
	TenantID      string
	Surface       entityv1.Surface
	QueryTemplate string
	SampleIdx     int
	IdempotencyKey string
}

// RunProbeCycle executes one full fan-out cycle for a tenant.
// Returns (totalProbes, successfulProbes, errorsBySurface).
func (s *ProbeScheduler) RunProbeCycle(ctx context.Context, tenantID string, surfaceIDs []entityv1.Surface, queryTemplates []string) (int, int, map[entityv1.Surface]int) {
	errs := make(map[entityv1.Surface]int)
	var total, success int
	sem := make(chan struct{}, s.cfg.MaxConcurrency)

	var wg sync.WaitGroup
	var mu sync.Mutex

	for _, surface := range surfaceIDs {
		worker, ok := s.workers[surface]
		if !ok {
			log.Printf("scheduler: no worker for surface %s, skipping", surface)
			continue
		}

		for _, tmpl := range queryTemplates {
			for i := 0; i < s.cfg.SamplesPerQuery; i++ {
				sampleIdx := i + 1

				// Cooldown check
				key := fmt.Sprintf("%s|%s|%s", tenantID, surface.String(), tmpl)
				s.mu.Lock()
				last, seen := s.lastProbe[key]
				s.mu.Unlock()
				if seen && time.Since(last) < s.cfg.Cooldown {
					continue
				}

				wg.Add(1)
				sem <- struct{}{}
				go func(surf entityv1.Surface, tmpl string, idx int) {
					defer wg.Done()
					defer func() { <-sem }()

					probeCtx, cancel := context.WithTimeout(ctx, s.cfg.ProbeTimeout)
					defer cancel()

					req := ProbeRequest{
						TenantID:      tenantID,
						Surface:       surf,
						QueryTemplate: tmpl,
						SampleIdx:     idx,
						IdempotencyKey: fmt.Sprintf("%s-%s-%s-%d", tenantID, surf.String(), tmpl, idx),
					}

					_, err := s.runSingleProbe(probeCtx, worker, req)
					mu.Lock()
					total++
					if err != nil {
						errs[surf]++
					} else {
						success++
					}
					mu.Unlock()

					// Update last probe time
					s.mu.Lock()
					s.lastProbe[key] = time.Now()
					s.mu.Unlock()
				}(surface, tmpl, sampleIdx)
			}
		}
	}

	wg.Wait()
	return total, success, errs
}

func (s *ProbeScheduler) runSingleProbe(ctx context.Context, worker SurfaceWorker, req ProbeRequest) (*entityv1.AnswerEvent, error) {
	// 1. Call surface worker to get raw answer
	answer, err := worker.Probe(ctx, req)
	if err != nil {
		log.Printf("probe failed: tenant=%s surface=%s query=%s sample=%d err=%v",
			req.TenantID, req.Surface, req.QueryTemplate, req.SampleIdx, err)
		return nil, err
	}

	// 2. Call gateway.Extract seam to get typed assertions
	assertions, err := s.extractViaGateway(ctx, req.TenantID, answer, req.IdempotencyKey)
	if err != nil {
		log.Printf("gateway extract failed: tenant=%s surface=%s err=%v", req.TenantID, req.Surface, err)
		// Non-fatal: continue with empty assertions
		assertions = []*eventv1.Assertion{}
	}

	// 3. Write assertions to KG via Assert
	for _, a := range assertions {
		node := s.assertionToNode(req.TenantID, a, req.IdempotencyKey)
		if err := s.kgStore.Append(ctx, node); err != nil {
			log.Printf("kg append failed: %v", err)
			// Non-fatal: continue
		}
	}

	return answer, nil
}

func (s *ProbeScheduler) extractViaGateway(ctx context.Context, tenantID string, answer *entityv1.AnswerEvent, idemKey string) ([]*eventv1.Assertion, error) {
	req := connect.NewRequest(&servicev1.ExtractRequest{
		TenantId:      tenantID,
		Answer:        answer,
		IdempotencyKey: idemKey,
	})
	req.Header().Set("x-tenant-id", tenantID)

	resp, err := s.gatewayCli.Extract(ctx, req)
	if err != nil {
		return nil, err
	}
	return resp.Msg.Assertions, nil
}

func (s *ProbeScheduler) assertionToNode(tenantID string, a *eventv1.Assertion, probeID string) *entityv1.AssertedNode {
	entityID := a.SubjectId
	if a.GetObjectId() != "" {
		entityID = a.GetObjectId()
	}

	return &entityv1.AssertedNode{
		Id:        fmt.Sprintf("%s-%s-%s", tenantID, entityID, probeID),
		TenantId:  tenantID,
		EntityType: entityv1.EntityType_ENTITY_TYPE_UNSPECIFIED,
		ValidTime: a.GetValidTime(),
		TxTime:    a.GetTxTime(),
	}
}

// ScheduleProbe schedules an immediate probe for a tenant+surface (internal API).
func (s *ProbeScheduler) ScheduleProbe(tenantID string, surface entityv1.Surface) {
	// For M5-thin, we schedule a single immediate probe with default query/template
	// Thickening: this would enqueue to a distributed queue
	ctx := context.Background()
	queries := []string{"Brand perception query", "Competitor comparison query"}
	s.RunProbeCycle(ctx, tenantID, []entityv1.Surface{surface}, queries)
}

// SurfaceWorker is the interface each AI surface probe implements.
type SurfaceWorker interface {
	Surface() entityv1.Surface
	Probe(ctx context.Context, req ProbeRequest) (*entityv1.AnswerEvent, error)
	Config() ProbeConfig
	HealthCheck(ctx context.Context) error
}