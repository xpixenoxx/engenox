// internal/probe/workers.go — Surface probe workers (M5-thin).
//
// Each worker implements SurfaceWorker for a specific AI surface.
// M5-thin: stub implementations returning synthetic AnswerEvents.
// Thickening: real HTTP clients calling surface APIs with auth, retries, rate limits.
//
// Cites: 11 §3 (per-surface probe), 06 §2.2 (Surface entity), ADR-0007 Thinning Rule.

package probe

import (
	"context"
	"fmt"
	"time"

	entityv1 "github.com/engenox/contracts/generated/go/engenox/entity/v1"
	"google.golang.org/protobuf/types/known/timestamppb"
)

// ChatGPTWorker probes ChatGPT via web/API.
type ChatGPTWorker struct {
	cfg ProbeConfig
}

func NewChatGPTWorker() *ChatGPTWorker {
	return &ChatGPTWorker{
		cfg: ProbeConfig{
			Timeout:         30 * time.Second,
			MaxRetries:      2,
			Cooldown:        5 * time.Minute,
			SamplesPerQuery: 3,
		},
	}
}

func (w *ChatGPTWorker) Surface() entityv1.Surface {
	return entityv1.Surface_SURFACE_CHATGPT
}

func (w *ChatGPTWorker) Config() ProbeConfig {
	return w.cfg
}

func (w *ChatGPTWorker) HealthCheck(ctx context.Context) error {
	// M5-thin: always healthy. Thickening: real health check.
	return nil
}

func (w *ChatGPTWorker) Probe(ctx context.Context, req ProbeRequest) (*entityv1.AnswerEvent, error) {
	// M5-thin: synthetic answer. Thickening: real API call with auth, retries, token budget.
	answer := fmt.Sprintf("ChatGPT response for tenant %s query '%s' sample %d", req.TenantID, req.QueryTemplate, req.SampleIdx)

	return &entityv1.AnswerEvent{
		Id:            fmt.Sprintf("%s-%s-answer-%d", req.TenantID, entityv1.Surface_SURFACE_CHATGPT.String(), req.SampleIdx),
		TenantId:      req.TenantID,
		ProbeId:       fmt.Sprintf("%s-probe-%s-%d", req.TenantID, entityv1.Surface_SURFACE_CHATGPT.String(), req.SampleIdx),
		Surface:       entityv1.Surface_SURFACE_CHATGPT,
		QueryText:     req.QueryTemplate,
		QueryId:       fmt.Sprintf("%s-query-%s", req.TenantID, entityv1.Surface_SURFACE_CHATGPT.String()),
		ModelId:       "gpt-4-turbo",
		SampleIdx:     int32(req.SampleIdx),
		VerbatimAnswer: answer,
		CapturedAt:    timestamppb.Now(),
	}, nil
}

// PerplexityWorker probes Perplexity.
type PerplexityWorker struct {
	cfg ProbeConfig
}

func NewPerplexityWorker() *PerplexityWorker {
	return &PerplexityWorker{
		cfg: ProbeConfig{
			Timeout:         30 * time.Second,
			MaxRetries:      2,
			Cooldown:        5 * time.Minute,
			SamplesPerQuery: 3,
		},
	}
}

func (w *PerplexityWorker) Surface() entityv1.Surface {
	return entityv1.Surface_SURFACE_PERPLEXITY
}

func (w *PerplexityWorker) Config() ProbeConfig {
	return w.cfg
}

func (w *PerplexityWorker) HealthCheck(ctx context.Context) error {
	// M5-thin: always healthy. Thickening: real health check.
	return nil
}

func (w *PerplexityWorker) Probe(ctx context.Context, req ProbeRequest) (*entityv1.AnswerEvent, error) {
	answer := fmt.Sprintf("Perplexity response for tenant %s query '%s' sample %d", req.TenantID, req.QueryTemplate, req.SampleIdx)

	return &entityv1.AnswerEvent{
		Id:            fmt.Sprintf("%s-%s-answer-%d", req.TenantID, entityv1.Surface_SURFACE_PERPLEXITY.String(), req.SampleIdx),
		TenantId:      req.TenantID,
		ProbeId:       fmt.Sprintf("%s-probe-%s-%d", req.TenantID, entityv1.Surface_SURFACE_PERPLEXITY.String(), req.SampleIdx),
		Surface:       entityv1.Surface_SURFACE_PERPLEXITY,
		QueryText:     req.QueryTemplate,
		QueryId:       fmt.Sprintf("%s-query-%s", req.TenantID, entityv1.Surface_SURFACE_PERPLEXITY.String()),
		ModelId:       "sonar-large",
		SampleIdx:     int32(req.SampleIdx),
		VerbatimAnswer: answer,
		CapturedAt:    timestamppb.Now(),
	}, nil
}

// GeminiWorker probes Google Gemini.
type GeminiWorker struct {
	cfg ProbeConfig
}

func NewGeminiWorker() *GeminiWorker {
	return &GeminiWorker{
		cfg: ProbeConfig{
			Timeout:         30 * time.Second,
			MaxRetries:      2,
			Cooldown:        5 * time.Minute,
			SamplesPerQuery: 3,
		},
	}
}

func (w *GeminiWorker) Surface() entityv1.Surface {
	return entityv1.Surface_SURFACE_GEMINI
}

func (w *GeminiWorker) Config() ProbeConfig {
	return w.cfg
}

func (w *GeminiWorker) HealthCheck(ctx context.Context) error {
	// M5-thin: always healthy. Thickening: real health check.
	return nil
}

func (w *GeminiWorker) Probe(ctx context.Context, req ProbeRequest) (*entityv1.AnswerEvent, error) {
	answer := fmt.Sprintf("Gemini response for tenant %s query '%s' sample %d", req.TenantID, req.QueryTemplate, req.SampleIdx)

	return &entityv1.AnswerEvent{
		Id:            fmt.Sprintf("%s-%s-answer-%d", req.TenantID, entityv1.Surface_SURFACE_GEMINI.String(), req.SampleIdx),
		TenantId:      req.TenantID,
		ProbeId:       fmt.Sprintf("%s-probe-%s-%d", req.TenantID, entityv1.Surface_SURFACE_GEMINI.String(), req.SampleIdx),
		Surface:       entityv1.Surface_SURFACE_GEMINI,
		QueryText:     req.QueryTemplate,
		QueryId:       fmt.Sprintf("%s-query-%s", req.TenantID, entityv1.Surface_SURFACE_GEMINI.String()),
		ModelId:       "gemini-1.5-pro",
		SampleIdx:     int32(req.SampleIdx),
		VerbatimAnswer: answer,
		CapturedAt:    timestamppb.Now(),
	}, nil
}

// GrokWorker probes xAI Grok.
type GrokWorker struct {
	cfg ProbeConfig
}

func NewGrokWorker() *GrokWorker {
	return &GrokWorker{
		cfg: ProbeConfig{
			Timeout:         30 * time.Second,
			MaxRetries:      2,
			Cooldown:        5 * time.Minute,
			SamplesPerQuery: 3,
		},
	}
}

func (w *GrokWorker) Surface() entityv1.Surface {
	return entityv1.Surface_SURFACE_GROK
}

func (w *GrokWorker) Config() ProbeConfig {
	return w.cfg
}

func (w *GrokWorker) HealthCheck(ctx context.Context) error {
	// M5-thin: always healthy. Thickening: real health check.
	return nil
}

func (w *GrokWorker) Probe(ctx context.Context, req ProbeRequest) (*entityv1.AnswerEvent, error) {
	answer := fmt.Sprintf("Grok response for tenant %s query '%s' sample %d", req.TenantID, req.QueryTemplate, req.SampleIdx)

	return &entityv1.AnswerEvent{
		Id:            fmt.Sprintf("%s-%s-answer-%d", req.TenantID, entityv1.Surface_SURFACE_GROK.String(), req.SampleIdx),
		TenantId:      req.TenantID,
		ProbeId:       fmt.Sprintf("%s-probe-%s-%d", req.TenantID, entityv1.Surface_SURFACE_GROK.String(), req.SampleIdx),
		Surface:       entityv1.Surface_SURFACE_GROK,
		QueryText:     req.QueryTemplate,
		QueryId:       fmt.Sprintf("%s-query-%s", req.TenantID, entityv1.Surface_SURFACE_GROK.String()),
		ModelId:       "grok-1",
		SampleIdx:     int32(req.SampleIdx),
		VerbatimAnswer: answer,
		CapturedAt:    timestamppb.Now(),
	}, nil
}

// ClaudeWorker probes Anthropic Claude.
type ClaudeWorker struct {
	cfg ProbeConfig
}

func NewClaudeWorker() *ClaudeWorker {
	return &ClaudeWorker{
		cfg: ProbeConfig{
			Timeout:         30 * time.Second,
			MaxRetries:      2,
			Cooldown:        5 * time.Minute,
			SamplesPerQuery: 3,
		},
	}
}

func (w *ClaudeWorker) Surface() entityv1.Surface {
	return entityv1.Surface_SURFACE_CLAUDE
}

func (w *ClaudeWorker) Config() ProbeConfig {
	return w.cfg
}

func (w *ClaudeWorker) HealthCheck(ctx context.Context) error {
	// M5-thin: always healthy. Thickening: real health check.
	return nil
}

func (w *ClaudeWorker) Probe(ctx context.Context, req ProbeRequest) (*entityv1.AnswerEvent, error) {
	answer := fmt.Sprintf("Claude response for tenant %s query '%s' sample %d", req.TenantID, req.QueryTemplate, req.SampleIdx)

	return &entityv1.AnswerEvent{
		Id:            fmt.Sprintf("%s-%s-answer-%d", req.TenantID, entityv1.Surface_SURFACE_CLAUDE.String(), req.SampleIdx),
		TenantId:      req.TenantID,
		ProbeId:       fmt.Sprintf("%s-probe-%s-%d", req.TenantID, entityv1.Surface_SURFACE_CLAUDE.String(), req.SampleIdx),
		Surface:       entityv1.Surface_SURFACE_CLAUDE,
		QueryText:     req.QueryTemplate,
		QueryId:       fmt.Sprintf("%s-query-%s", req.TenantID, entityv1.Surface_SURFACE_CLAUDE.String()),
		ModelId:       "claude-3.5-sonnet",
		SampleIdx:     int32(req.SampleIdx),
		VerbatimAnswer: answer,
		CapturedAt:    timestamppb.Now(),
	}, nil
}

// AllWorkers returns the complete set of surface workers for M5-thin.
func AllWorkers() []SurfaceWorker {
	return []SurfaceWorker{
		NewChatGPTWorker(),
		NewPerplexityWorker(),
		NewGeminiWorker(),
		NewGrokWorker(),
		NewClaudeWorker(),
	}
}