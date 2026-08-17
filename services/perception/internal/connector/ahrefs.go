// internal/connector/ahrefs.go — Ahrefs connector (M5-thin stub).
package connector

import (
	"context"
	"time"
)

type AhrefsConnector struct {
	cfg Config
}

type Config struct {
	APIKey       string
	BaseURL      string
	RateLimit    RateLimitConfig
	TimeoutSecs  int
}

func NewAhrefsConnector(cfg Config) *AhrefsConnector {
	if cfg.RateLimit.QPS == 0 {
		cfg.RateLimit = DefaultRateLimitConfig()
	}
	return &AhrefsConnector{cfg: cfg}
}

func (a *AhrefsConnector) Type() ConnectorType { return TypeAhrefs }
func (a *AhrefsConnector) RateLimit() RateLimitConfig { return a.cfg.RateLimit }

func (a *AhrefsConnector) HealthCheck(ctx context.Context) error { return nil }

func (a *AhrefsConnector) Fetch(ctx context.Context, req Request) (Response, error) {
	return Response{
		Connector:  TypeAhrefs,
		Data:       map[string]any{"backlinks": 1250, "referring_domains": 340, "keywords_top10": 45},
		FetchedAt:  time.Now(),
		ItemsCount: 3,
	}, nil
}