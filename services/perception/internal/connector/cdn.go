// internal/connector/cdn.go — CDN analytics connector (M5-thin stub).
package connector

import (
	"context"
	"time"
)

type CDNConnector struct {
	cfg Config
}

func NewCDNConnector(cfg Config) *CDNConnector {
	if cfg.RateLimit.QPS == 0 {
		cfg.RateLimit = DefaultRateLimitConfig()
	}
	return &CDNConnector{cfg: cfg}
}

func (c *CDNConnector) Type() ConnectorType { return TypeCDN }
func (c *CDNConnector) RateLimit() RateLimitConfig { return c.cfg.RateLimit }
func (c *CDNConnector) HealthCheck(ctx context.Context) error { return nil }

func (c *CDNConnector) Fetch(ctx context.Context, req Request) (Response, error) {
	return Response{
		Connector:  TypeCDN,
		Data:       map[string]any{"requests": 5200000, "bandwidth_gb": 450, "cache_hit_ratio": 0.87, "edge_locations": 285},
		FetchedAt:  time.Now(),
		ItemsCount: 4,
	}, nil
}