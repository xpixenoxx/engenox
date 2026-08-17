// internal/connector/connector_test.go — M5-thin connector property tests.
package connector

import (
	"context"
	"sync"
	"testing"
	"time"
)

// TestRateLimiterEnforcesQPS verifies TokenBucket rate limits calls per second.
func TestRateLimiterEnforcesQPS(t *testing.T) {
	ctx := context.Background()

	// Test TokenBucket from adapter.go
	tb := NewTokenBucket(10, 5) // 10 QPS, burst 5

	// Initial burst should be allowed immediately
	for i := 0; i < 5; i++ {
		if err := tb.Acquire(ctx, 1); err != nil {
			t.Errorf("burst acquire %d failed: %v", i, err)
		}
	}

	// Next acquire should wait (bucket depleted)
	start := time.Now()
	err := tb.Acquire(ctx, 1)
	elapsed := time.Since(start)

	if err != nil {
		t.Errorf("acquire after burst failed: %v", err)
	}
	// Should have waited ~100ms (1 token at 10 QPS = 100ms)
	if elapsed < 80*time.Millisecond || elapsed > 200*time.Millisecond {
		t.Errorf("rate limit wait incorrect: elapsed=%v, expected ~100ms", elapsed)
	}
}

// TestRateLimiterTryAllowNonBlocking verifies TryAllow returns false when limited.
func TestRateLimiterTryAllowNonBlocking(t *testing.T) {
	rl := NewRateLimiter(1, 1) // 1 QPS, burst 1

	// First call should succeed
	if !rl.TryAllow() {
		t.Error("first TryAllow should succeed")
	}

	// Second call should fail (no tokens)
	if rl.TryAllow() {
		t.Error("second TryAllow should fail when rate limited")
	}

	// After time passes, should succeed again
	time.Sleep(1100 * time.Millisecond)
	if !rl.TryAllow() {
		t.Error("TryAllow should succeed after token replenished")
	}
}

// TestRateLimiterTokensAvailable verifies observability method.
func TestRateLimiterTokensAvailable(t *testing.T) {
	rl := NewRateLimiter(5, 10)

	// Initially full
	if rl.TokensAvailable() != 10 {
		t.Errorf("initial tokens should be burst (10), got %v", rl.TokensAvailable())
	}

	// Consume some
	rl.TryAllow()
	rl.TryAllow()
	if rl.TokensAvailable() != 8 {
		t.Errorf("after 2 consumes, should be 8, got %v", rl.TokensAvailable())
	}
}

// TestConnectorRegistryAcquireEnforcesRateLimit verifies registry-level rate limiting.
func TestConnectorRegistryAcquireEnforcesRateLimit(t *testing.T) {
	ctx := context.Background()
	reg := NewConnectorRegistry()

	// Register a mock connector with known rate limit
	mock := &MockConnector{
		type_: TypeAhrefs,
		rate: RateLimitConfig{QPS: 5, Burst: 3},
	}
	reg.Register(mock)

	// Acquire within burst should succeed immediately
	for i := 0; i < 3; i++ {
		if err := reg.Acquire(ctx, TypeAhrefs); err != nil {
			t.Errorf("acquire %d (within burst) failed: %v", i, err)
		}
	}

	// Next acquire should wait
	start := time.Now()
	_ = reg.Acquire(ctx, TypeAhrefs)
	elapsed := time.Since(start)

	// 1 token at 5 QPS = 200ms
	if elapsed < 150*time.Millisecond || elapsed > 400*time.Millisecond {
		t.Errorf("registry acquire rate limit wait incorrect: elapsed=%v, expected ~200ms", elapsed)
	}
}

// TestConnectorRegistryAllReturnsRegistered verifies All() returns all registered.
func TestConnectorRegistryAllReturnsRegistered(t *testing.T) {
	reg := NewConnectorRegistry()

	reg.Register(&MockConnector{type_: TypeAhrefs, rate: DefaultRateLimitConfig()})
	reg.Register(&MockConnector{type_: TypeSemrush, rate: DefaultRateLimitConfig()})
	reg.Register(&MockConnector{type_: TypeGSC, rate: DefaultRateLimitConfig()})

	all := reg.All()
	if len(all) != 3 {
		t.Errorf("expected 3 connectors, got %d", len(all))
	}

	seen := make(map[ConnectorType]bool)
	for _, c := range all {
		seen[c.Type()] = true
	}

	expected := []ConnectorType{TypeAhrefs, TypeSemrush, TypeGSC}
	for _, e := range expected {
		if !seen[e] {
			t.Errorf("missing connector %s in All()", e)
		}
	}
}

// TestConnectorRegistryGetReturnsCorrect verifies Get returns registered connector.
func TestConnectorRegistryGetReturnsCorrect(t *testing.T) {
	reg := NewConnectorRegistry()
	expected := &MockConnector{type_: TypeGA4, rate: DefaultRateLimitConfig()}
	reg.Register(expected)

	got, ok := reg.Get(TypeGA4)
	if !ok {
		t.Error("Get(TypeGA4) should return true")
	}
	if got != expected {
		t.Error("Get returned different connector instance")
	}

	_, ok = reg.Get(TypeCDN)
	if ok {
		t.Error("Get(TypeCDN) should return false for unregistered")
	}
}

// TestAllSevenConnectorsExist verifies all 7 connector types have implementations.
func TestAllSevenConnectorsExist(t *testing.T) {
	// This test ensures the 7 stub connectors compile and satisfy the interface
	testConfig := Config{RateLimit: DefaultRateLimitConfig()}
	connectors := []Connector{
		NewAhrefsConnector(testConfig),
		NewSemrushConnector(testConfig),
		NewGSCConnector(testConfig),
		NewGA4Connector(testConfig),
		NewCDNConnector(testConfig),
		NewGitConnector(testConfig),
		NewCMSConnector(testConfig),
	}

	expectedTypes := []ConnectorType{
		TypeAhrefs, TypeSemrush, TypeGSC, TypeGA4, TypeCDN, TypeGit, TypeCMS,
	}

	if len(connectors) != len(expectedTypes) {
		t.Fatalf("expected 7 connectors, got %d", len(connectors))
	}

	seen := make(map[ConnectorType]bool)
	for i, c := range connectors {
		typ := c.Type()
		if typ != expectedTypes[i] {
			t.Errorf("connector %d: expected type %s, got %s", i, expectedTypes[i], typ)
		}
		if seen[typ] {
			t.Errorf("duplicate connector type %s", typ)
		}
		seen[typ] = true

		// Verify rate limit config is valid
		rl := c.RateLimit()
		if rl.QPS <= 0 {
			t.Errorf("connector %s has invalid QPS %v", typ, rl.QPS)
		}
		if rl.Burst <= 0 {
			t.Errorf("connector %s has invalid Burst %v", typ, rl.Burst)
		}

		// HealthCheck should not panic
		if err := c.HealthCheck(context.Background()); err != nil {
			t.Errorf("connector %s HealthCheck error: %v", typ, err)
		}

		// Fetch should not panic and return Response
		resp, err := c.Fetch(context.Background(), Request{TenantID: "test"})
		if err != nil {
			t.Errorf("connector %s Fetch error: %v", typ, err)
		}
		if resp.Connector != typ {
			t.Errorf("connector %s response type mismatch: %s", typ, resp.Connector)
		}
	}
}

// MockConnector implements Connector for testing.
type MockConnector struct {
	type_ ConnectorType
	rate  RateLimitConfig
}

func (m *MockConnector) Type() ConnectorType         { return m.type_ }
func (m *MockConnector) RateLimit() RateLimitConfig { return m.rate }
func (m *MockConnector) HealthCheck(ctx context.Context) error {
	return nil
}
func (m *MockConnector) Fetch(ctx context.Context, req Request) (Response, error) {
	return Response{Connector: m.type_, Data: map[string]any{"mock": "data"}}, nil
}

// TestConcurrentRateLimiterAccess verifies thread safety.
func TestConcurrentRateLimiterAccess(t *testing.T) {
	rl := NewRateLimiter(100, 100) // High rate to avoid blocking
	var wg sync.WaitGroup
	const goroutines = 20
	const callsPerGoroutine = 5

	for i := 0; i < goroutines; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for j := 0; j < callsPerGoroutine; j++ {
				_ = rl.TryAllow()
			}
		}()
	}
	wg.Wait()

	// Should have consumed 100 tokens max
	available := rl.TokensAvailable()
	if available < 0 || available > 100 {
		t.Errorf("invalid tokens available after concurrent access: %v", available)
	}
}