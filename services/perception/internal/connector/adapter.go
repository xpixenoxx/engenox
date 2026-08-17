// internal/connector/adapter.go — Connector interface (M5-thin).
//
// Defines the contract for all external data connectors.
// M5-thin: stub implementations. Thickening: real SDKs + Vault credentials.
//
// Cites: 19 §3 Panel 1 (verbatim probe read), 11 §3 (perception connectors),
//        ADR-0007 Thinning Rule (mechanism preserved, substrate swapped).

package connector

import (
	"context"
	"time"
)

// ConnectorType identifies a connector.
type ConnectorType string

const (
	TypeAhrefs ConnectorType = "ahrefs"
	TypeSemrush ConnectorType = "semrush"
	TypeGSC     ConnectorType = "gsc"
	TypeGA4     ConnectorType = "ga4"
	TypeCDN     ConnectorType = "cdn"
	TypeGit     ConnectorType = "git"
	TypeCMS     ConnectorType = "cms"
)

// Request is the input to a connector fetch.
type Request struct {
	TenantID   string
	DateRange  DateRange
	Filters    map[string]string
	PageToken  string
	PageSize   int
}

// DateRange for connector queries.
type DateRange struct {
	Start time.Time
	End   time.Time
}

// Response is the output from a connector fetch.
type Response struct {
	Connector    ConnectorType
	Data         map[string]any
	FetchedAt    time.Time
	ItemsCount   int
	NextPageToken string
	Error        string
}

// Connector is the interface all external data sources implement.
type Connector interface {
	// Type returns the connector type identifier.
	Type() ConnectorType
	// Fetch retrieves data for the request.
	Fetch(ctx context.Context, req Request) (Response, error)
	// RateLimit returns the rate limit config for this connector.
	RateLimit() RateLimitConfig
	// HealthCheck verifies the connector is operational.
	HealthCheck(ctx context.Context) error
}

// RateLimitConfig controls per-connector rate limiting.
type RateLimitConfig struct {
	QPS   float64 // Queries per second (sustained)
	Burst int     // Token bucket burst allowance
}

// DefaultRateLimitConfig returns M5-thin defaults.
func DefaultRateLimitConfig() RateLimitConfig {
	return RateLimitConfig{
		QPS:   10,
		Burst: 20,
	}
}

// ConnectorRegistry holds all registered connectors.
type ConnectorRegistry struct {
	connectors map[ConnectorType]Connector
	limiters   map[ConnectorType]*TokenBucket
}

func NewConnectorRegistry() *ConnectorRegistry {
	return &ConnectorRegistry{
		connectors: make(map[ConnectorType]Connector),
		limiters:   make(map[ConnectorType]*TokenBucket),
	}
}

func (r *ConnectorRegistry) Register(c Connector) {
	r.connectors[c.Type()] = c
	r.limiters[c.Type()] = NewTokenBucket(c.RateLimit().QPS, c.RateLimit().Burst)
}

func (r *ConnectorRegistry) Get(t ConnectorType) (Connector, bool) {
	c, ok := r.connectors[t]
	return c, ok
}

func (r *ConnectorRegistry) All() []Connector {
	res := make([]Connector, 0, len(r.connectors))
	for _, c := range r.connectors {
		res = append(res, c)
	}
	return res
}

func (r *ConnectorRegistry) Acquire(ctx context.Context, t ConnectorType) error {
	if limiter, ok := r.limiters[t]; ok {
		return limiter.Acquire(ctx, 1)
	}
	return nil
}

// TokenBucket implements a thread-safe token bucket rate limiter.
type TokenBucket struct {
	rate   float64
	burst  int
	tokens float64
	last   time.Time
	mu     chan struct{} // simple mutex via buffered channel
}

func NewTokenBucket(qps float64, burst int) *TokenBucket {
	tb := &TokenBucket{
		rate:  qps,
		burst: burst,
		tokens: float64(burst),
		last:   time.Now(),
		mu:     make(chan struct{}, 1),
	}
	tb.mu <- struct{}{}
	return tb
}

func (tb *TokenBucket) Acquire(ctx context.Context, n int) error {
	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-tb.mu:
			now := time.Now()
			elapsed := now.Sub(tb.last).Seconds()
			tb.tokens = min(tb.tokens+elapsed*tb.rate, float64(tb.burst))
			tb.last = now

			if tb.tokens >= float64(n) {
				tb.tokens -= float64(n)
				tb.mu <- struct{}{}
				return nil
			}
			tb.mu <- struct{}{}

			// Wait for token to become available
			waitTime := time.Duration((float64(n)-tb.tokens)/tb.rate * float64(time.Second))
			select {
			case <-ctx.Done():
				return ctx.Err()
			case <-time.After(min(waitTime, 100*time.Millisecond)):
			}
		}
	}
}