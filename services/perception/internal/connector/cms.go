// internal/connector/cms.go — CMS content connector (M5-thin stub).
package connector

import (
	"context"
	"time"
)

type CMSConnector struct {
	cfg Config
}

func NewCMSConnector(cfg Config) *CMSConnector {
	if cfg.RateLimit.QPS == 0 {
		cfg.RateLimit = DefaultRateLimitConfig()
	}
	return &CMSConnector{cfg: cfg}
}

func (c *CMSConnector) Type() ConnectorType { return TypeCMS }
func (c *CMSConnector) RateLimit() RateLimitConfig { return c.cfg.RateLimit }
func (c *CMSConnector) HealthCheck(ctx context.Context) error { return nil }

func (c *CMSConnector) Fetch(ctx context.Context, req Request) (Response, error) {
	return Response{
		Connector:  TypeCMS,
		Data:       map[string]any{"pages_published": 23, "pages_updated": 17, "media_uploads": 45, "workflow_pending": 3},
		FetchedAt:  time.Now(),
		ItemsCount: 4,
	}, nil
}