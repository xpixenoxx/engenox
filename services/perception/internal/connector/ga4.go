// internal/connector/ga4.go — Google Analytics 4 connector (M5-thin stub).
package connector

import (
	"context"
	"time"
)

type GA4Connector struct {
	cfg Config
}

func NewGA4Connector(cfg Config) *GA4Connector {
	if cfg.RateLimit.QPS == 0 {
		cfg.RateLimit = DefaultRateLimitConfig()
	}
	return &GA4Connector{cfg: cfg}
}

func (g *GA4Connector) Type() ConnectorType { return TypeGA4 }
func (g *GA4Connector) RateLimit() RateLimitConfig { return g.cfg.RateLimit }
func (g *GA4Connector) HealthCheck(ctx context.Context) error { return nil }

func (g *GA4Connector) Fetch(ctx context.Context, req Request) (Response, error) {
	return Response{
		Connector:  TypeGA4,
		Data:       map[string]any{"sessions": 28000, "users": 19500, "revenue": 125000.50, "conversions": 340},
		FetchedAt:  time.Now(),
		ItemsCount: 4,
	}, nil
}