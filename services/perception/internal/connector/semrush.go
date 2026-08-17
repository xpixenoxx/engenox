// internal/connector/semrush.go — Semrush connector (M5-thin stub).
package connector

import (
	"context"
	"time"
)

type SemrushConnector struct {
	cfg Config
}

func NewSemrushConnector(cfg Config) *SemrushConnector {
	if cfg.RateLimit.QPS == 0 {
		cfg.RateLimit = DefaultRateLimitConfig()
	}
	return &SemrushConnector{cfg: cfg}
}

func (s *SemrushConnector) Type() ConnectorType { return TypeSemrush }
func (s *SemrushConnector) RateLimit() RateLimitConfig { return s.cfg.RateLimit }
func (s *SemrushConnector) HealthCheck(ctx context.Context) error { return nil }

func (s *SemrushConnector) Fetch(ctx context.Context, req Request) (Response, error) {
	return Response{
		Connector:  TypeSemrush,
		Data:       map[string]any{"organic_keywords": 3200, "paid_keywords": 150, "traffic": 45000},
		FetchedAt:  time.Now(),
		ItemsCount: 3,
	}, nil
}