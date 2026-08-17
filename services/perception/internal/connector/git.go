// internal/connector/git.go — Git repository connector (M5-thin stub).
package connector

import (
	"context"
	"time"
)

type GitConnector struct {
	cfg Config
}

func NewGitConnector(cfg Config) *GitConnector {
	if cfg.RateLimit.QPS == 0 {
		cfg.RateLimit = DefaultRateLimitConfig()
	}
	return &GitConnector{cfg: cfg}
}

func (g *GitConnector) Type() ConnectorType { return TypeGit }
func (g *GitConnector) RateLimit() RateLimitConfig { return g.cfg.RateLimit }
func (g *GitConnector) HealthCheck(ctx context.Context) error { return nil }

func (g *GitConnector) Fetch(ctx context.Context, req Request) (Response, error) {
	return Response{
		Connector:  TypeGit,
		Data:       map[string]any{"commits_last_week": 47, "contributors": 12, "open_prs": 8, "deployments": 5},
		FetchedAt:  time.Now(),
		ItemsCount: 4,
	}, nil
}