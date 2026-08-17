// internal/connector/gsc.go — Google Search Console connector (M5-thin stub).
package connector

import (
	"context"
	"time"
)

type GSCConnector struct {
	cfg Config
}

func NewGSCConnector(cfg Config) *GSCConnector {
	if cfg.RateLimit.QPS == 0 {
		cfg.RateLimit = DefaultRateLimitConfig()
	}
	return &GSCConnector{cfg: cfg}
}

func (g *GSCConnector) Type() ConnectorType { return TypeGSC }
func (g *GSCConnector) RateLimit() RateLimitConfig { return g.cfg.RateLimit }
func (g *GSCConnector) HealthCheck(ctx context.Context) error { return nil }

func (g *GSCConnector) Fetch(ctx context.Context, req Request) (Response, error) {
	return Response{
		Connector:  TypeGSC,
		Data:       map[string]any{"clicks": 12500, "impressions": 450000, "ctr": 0.028, "avg_position": 12.3},
		FetchedAt:  time.Now(),
		ItemsCount: 4,
	}, nil
}