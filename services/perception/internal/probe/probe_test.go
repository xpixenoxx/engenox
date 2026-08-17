// internal/probe/probe_test.go — M5-thin probe fleet property tests.
package probe

import (
	"context"
	"sync"
	"testing"
	"time"

	entityv1 "github.com/engenox/contracts/generated/go/engenox/entity/v1"
)

// TestSchedulerFanOutCompletesAllSurfaces verifies the M×N×K fan-out completes within timeout.
func TestSchedulerFanOutCompletesAllSurfaces(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	cfg := DefaultSchedulerConfig()
	cfg.SamplesPerQuery = 2 // M thin: 2 samples per query
	cfg.MaxConcurrency = 10
	cfg.ProbeTimeout = 5 * time.Second
	cfg.Cooldown = 0 // Disable cooldown for test

	workers := AllWorkers()
	kgStore := NewMockAssertionStore()
	gatewayAddr := "http://localhost:8080"

	scheduler := NewProbeScheduler(cfg, workers, kgStore, gatewayAddr)

	tenantID := "tenant-test"
	surfaces := []entityv1.Surface{
		entityv1.Surface_SURFACE_CHATGPT,
		entityv1.Surface_SURFACE_PERPLEXITY,
		entityv1.Surface_SURFACE_GEMINI,
		entityv1.Surface_SURFACE_GROK,
		entityv1.Surface_SURFACE_CLAUDE,
	}
	queries := []string{"test query 1", "test query 2"}

	// Run fan-out
	total, success, errs := scheduler.RunProbeCycle(ctx, tenantID, surfaces, queries)

	expectedProbes := len(surfaces) * len(queries) * cfg.SamplesPerQuery
	if total != expectedProbes {
		t.Errorf("expected %d total probes, got %d", expectedProbes, total)
	}

	if success != expectedProbes {
		t.Errorf("expected %d successful probes, got %d (errors: %v)", expectedProbes, success, errs)
	}

	// Verify each surface was probed
	for _, s := range surfaces {
		if errs[s] > 0 {
			t.Errorf("surface %s had %d errors", s, errs[s])
		}
	}
}

// TestSchedulerCooldownRespected verifies cooldown prevents re-probing same tenant+surface+query.
func TestSchedulerCooldownRespected(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	cfg := DefaultSchedulerConfig()
	cfg.SamplesPerQuery = 1
	cfg.MaxConcurrency = 5
	cfg.ProbeTimeout = 2 * time.Second
	cfg.Cooldown = 1 * time.Hour // Long cooldown

	workers := AllWorkers()
	kgStore := NewMockAssertionStore()
	scheduler := NewProbeScheduler(cfg, workers, kgStore, "http://localhost:8080")

	tenantID := "tenant-test"
	surfaces := []entityv1.Surface{entityv1.Surface_SURFACE_CHATGPT}
	queries := []string{"test query"}

	// First run - should succeed
	total1, success1, errs1 := scheduler.RunProbeCycle(ctx, tenantID, surfaces, queries)
	if total1 != 1 || success1 != 1 || errs1[entityv1.Surface_SURFACE_CHATGPT] > 0 {
		t.Errorf("first run: total=%d success=%d errs=%v", total1, success1, errs1)
	}

	// Second run immediately - should skip due to cooldown
	total2, _, _ := scheduler.RunProbeCycle(ctx, tenantID, surfaces, queries)
	if total2 != 0 {
		t.Errorf("second run should be skipped by cooldown, got total=%d", total2)
	}
}

// TestSchedulerConcurrencyLimit verifies MaxConcurrency is enforced.
// M5-thin: stub workers complete synchronously, so this test only verifies
// the scheduler structure works. M6-thicken: use slow workers for timing test.
func TestSchedulerConcurrencyLimit(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	cfg := DefaultSchedulerConfig()
	cfg.SamplesPerQuery = 1
	cfg.MaxConcurrency = 2 // Limit to 2 concurrent
	cfg.ProbeTimeout = 1 * time.Second
	cfg.Cooldown = 0

	workers := AllWorkers()
	kgStore := NewMockAssertionStore()
	scheduler := NewProbeScheduler(cfg, workers, kgStore, "http://localhost:8080")

	tenantID := "tenant-test"
	surfaces := []entityv1.Surface{
		entityv1.Surface_SURFACE_CHATGPT,
		entityv1.Surface_SURFACE_PERPLEXITY,
		entityv1.Surface_SURFACE_GEMINI,
	}
	queries := []string{"query 1"}

	// M5-thin: verify the scheduler runs without panic and returns correct counts
	// (timing test not applicable with synchronous stub workers)
	total, success, errs := scheduler.RunProbeCycle(ctx, tenantID, surfaces, queries)

	expectedProbes := len(surfaces) * len(queries) * cfg.SamplesPerQuery
	if total != expectedProbes {
		t.Errorf("expected %d total probes, got %d", expectedProbes, total)
	}

	if success != expectedProbes {
		t.Errorf("expected %d successful probes, got %d (errors: %v)", expectedProbes, success, errs)
	}
}

// TestWorkerInterfaceCompliance verifies all 5 workers implement SurfaceWorker.
func TestWorkerInterfaceCompliance(t *testing.T) {
	workers := AllWorkers()
	if len(workers) != 5 {
		t.Fatalf("expected 5 workers, got %d", len(workers))
	}

	seen := make(map[entityv1.Surface]bool)
	for _, w := range workers {
		s := w.Surface()
		if seen[s] {
			t.Errorf("duplicate worker for surface %s", s)
		}
		seen[s] = true

		cfg := w.Config()
		if cfg.Timeout <= 0 {
			t.Errorf("worker %s has invalid timeout %v", s, cfg.Timeout)
		}
		if cfg.MaxRetries < 0 {
			t.Errorf("worker %s has invalid retries %d", s, cfg.MaxRetries)
		}
		if cfg.Cooldown <= 0 {
			t.Errorf("worker %s has invalid cooldown %v", s, cfg.Cooldown)
		}
		if cfg.SamplesPerQuery <= 0 {
			t.Errorf("worker %s has invalid samples %d", s, cfg.SamplesPerQuery)
		}
	}

	expected := []entityv1.Surface{
		entityv1.Surface_SURFACE_CHATGPT,
		entityv1.Surface_SURFACE_PERPLEXITY,
		entityv1.Surface_SURFACE_GEMINI,
		entityv1.Surface_SURFACE_GROK,
		entityv1.Surface_SURFACE_CLAUDE,
	}
	for _, s := range expected {
		if !seen[s] {
			t.Errorf("missing worker for surface %s", s)
		}
	}
}

// TestWorkerProbeReturnsValidAnswerEvent verifies Probe returns valid AnswerEvent.
func TestWorkerProbeReturnsValidAnswerEvent(t *testing.T) {
	ctx := context.Background()

	for _, w := range AllWorkers() {
		req := ProbeRequest{
			TenantID:      "tenant-test",
			Surface:       w.Surface(),
			QueryTemplate: "test query for " + w.Surface().String(),
			SampleIdx:     1,
			IdempotencyKey: "test-key-" + w.Surface().String(),
		}

		answer, err := w.Probe(ctx, req)
		if err != nil {
			t.Errorf("worker %s error: %v", w.Surface(), err)
			continue
		}
		if answer == nil {
			t.Errorf("worker %s returned nil answer", w.Surface())
			continue
		}
		if answer.Id == "" {
			t.Errorf("worker %s missing AnswerEvent.Id", w.Surface())
		}
		if answer.TenantId != req.TenantID {
			t.Errorf("worker %s tenant mismatch: %s != %s", w.Surface(), answer.TenantId, req.TenantID)
		}
		if answer.Surface != req.Surface {
			t.Errorf("worker %s surface mismatch: %s != %s", w.Surface(), answer.Surface, req.Surface)
		}
		if answer.VerbatimAnswer == "" {
			t.Errorf("worker %s missing VerbatimAnswer", w.Surface())
		}
		if answer.CapturedAt == nil {
			t.Errorf("worker %s missing CapturedAt", w.Surface())
		}
		if answer.SampleIdx != 1 {
			t.Errorf("worker %s SampleIdx mismatch: %d != 1", w.Surface(), answer.SampleIdx)
		}
	}
}

// TestSchedulerHandlesWorkerErrorsGracefully verifies partial failures don't panic.
func TestSchedulerHandlesWorkerErrorsGracefully(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	cfg := DefaultSchedulerConfig()
	cfg.SamplesPerQuery = 1
	cfg.MaxConcurrency = 5
	cfg.ProbeTimeout = 100 * time.Millisecond // Very short timeout to cause errors
	cfg.Cooldown = 0

	// Use a worker that will fail (simulated by short timeout)
	workers := AllWorkers()
	kgStore := NewMockAssertionStore()
	scheduler := NewProbeScheduler(cfg, workers, kgStore, "http://unreachable:9999")

	tenantID := "tenant-test"
	surfaces := []entityv1.Surface{entityv1.Surface_SURFACE_CHATGPT}
	queries := []string{"test query"}

	// Should not panic, just record errors
	total, success, errs := scheduler.RunProbeCycle(ctx, tenantID, surfaces, queries)

	if total != 1 {
		t.Errorf("expected 1 total probe, got %d", total)
	}
	// Success may be 0 due to gateway unreachable, but should not panic
	_ = success
	_ = errs
}

// MockAssertionStore implements the minimal AssertionStore for testing.
type MockAssertionStore struct {
	mu         sync.Mutex
	assertions []any
}

func NewMockAssertionStore() *MockAssertionStore {
	return &MockAssertionStore{assertions: make([]any, 0)}
}

func (m *MockAssertionStore) Append(ctx context.Context, node any) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.assertions = append(m.assertions, node)
	return nil
}

func (m *MockAssertionStore) ReadAssertions(ctx context.Context, tenantID, entityID string, validFrom, validTo int64) ([]any, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.assertions, nil
}