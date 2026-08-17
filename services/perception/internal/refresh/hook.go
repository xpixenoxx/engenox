// internal/refresh/hook.go — EWMA/CUSUM fixture refresh hook (M5-thin).
//
// Calls measurement service foreign-change detector to decide when to re-probe.
// M5-thin: HTTP call to measurement service `/v1/detect/foreign-change`.
// Thickening: local Go EWMA/CUSUM + ClickHouse-scheduled job.
//
// Cites: 25 §3 M5, 26 §4 (foreign-change detector ships with loop), ADR-0007.

package refresh

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	entityv1 "github.com/engenox/contracts/generated/go/engenox/entity/v1"
	"github.com/engenox/perception/internal/probe"
)

// MeasurementClient calls the measurement service for foreign-change detection.
type MeasurementClient struct {
	baseURL string
	client  *http.Client
}

func NewMeasurementClient(baseURL string) *MeasurementClient {
	return &MeasurementClient{
		baseURL: baseURL,
		client:  &http.Client{Timeout: 10 * time.Second},
	}
}

// ForeignChangeRequest matches the measurement service input.
type ForeignChangeRequest struct {
	Series []DataPoint `json:"series"`
}

type DataPoint struct {
	Timestamp string  `json:"timestamp"`
	Value     float64 `json:"value"`
}

// ForeignChangeResponse matches the measurement service output.
type ForeignChangeResponse struct {
	EWMA          EWMAState       `json:"ewma"`
	CUSUM         CUSUMState      `json:"cusum"`
	CombinedSignal string         `json:"combined_signal"`
	Reason        string          `json:"reason,omitempty"`
}

type EWMAState struct {
	Value     float64 `json:"value"`
	Signal    string  `json:"signal"`
	Threshold float64 `json:"threshold"`
	Lambda    float64 `json:"lambda_param"`
}

type CUSUMState struct {
	CPlus     float64 `json:"c_plus"`
	CMinus    float64 `json:"c_minus"`
	Signal    string  `json:"signal"`
	Threshold float64 `json:"threshold"`
	Drift     float64 `json:"drift"`
}

// DetectForeignChange calls the measurement service.
func (c *MeasurementClient) DetectForeignChange(ctx context.Context, series []float64) (*ForeignChangeResponse, error) {
	// Convert series to measurement service format
	points := make([]DataPoint, len(series))
	baseTime := time.Now().Add(-time.Duration(len(series)) * 24 * time.Hour)
	for i, v := range series {
		points[i] = DataPoint{
			Timestamp: baseTime.Add(time.Duration(i) * 24 * time.Hour).Format(time.RFC3339),
			Value:     v,
		}
	}

	reqBody := ForeignChangeRequest{Series: points}
	jsonBody, _ := json.Marshal(reqBody)

	req, err := http.NewRequestWithContext(ctx, "POST", c.baseURL+"/v1/detect/foreign-change", bytes.NewReader(jsonBody))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("measurement service returned %d", resp.StatusCode)
	}

	var result ForeignChangeResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}
	return &result, nil
}

// RefreshHookConfig configures the refresh hook.
type RefreshHookConfig struct {
	MeasurementURL   string
	CheckInterval    time.Duration
	SeriesWindow     int
	TriggerOnWarning bool
	Scheduler        probe.ProbeSchedulerInterface
}

// RefreshHook runs periodic foreign-change checks and triggers re-probes.
type RefreshHook struct {
	cfg       RefreshHookConfig
	client    *MeasurementClient
	scheduler probe.ProbeSchedulerInterface
	stopCh    chan struct{}
}

func NewRefreshHook(cfg RefreshHookConfig) *RefreshHook {
	return &RefreshHook{
		cfg:       cfg,
		client:    NewMeasurementClient(cfg.MeasurementURL),
		scheduler: cfg.Scheduler,
		stopCh:    make(chan struct{}),
	}
}

// SetMeasurementClientForTest allows injecting a mock client for testing.
func (h *RefreshHook) SetMeasurementClientForTest(client *MeasurementClient) {
	h.client = client
}

// SetSchedulerForTest allows injecting a mock scheduler for testing.
func (h *RefreshHook) SetSchedulerForTest(scheduler probe.ProbeSchedulerInterface) {
	h.scheduler = scheduler
}

// ValidateConfig validates the hook configuration.
func (h *RefreshHook) ValidateConfig() error {
	if h.cfg.MeasurementURL == "" {
		return fmt.Errorf("measurement_url is required")
	}
	if h.cfg.CheckInterval <= 0 {
		return fmt.Errorf("check_interval must be positive")
	}
	if h.cfg.SeriesWindow <= 0 {
		return fmt.Errorf("series_window must be positive")
	}
	return nil
}

// Start begins the periodic check loop.
func (h *RefreshHook) Start(ctx context.Context) {
	if h.cfg.CheckInterval <= 0 {
		h.cfg.CheckInterval = 15 * time.Minute
	}
	if h.cfg.SeriesWindow <= 0 {
		h.cfg.SeriesWindow = 30
	}

	ticker := time.NewTicker(h.cfg.CheckInterval)
	defer ticker.Stop()

	// Initial check
	h.checkAllTenants(ctx)

	for {
		select {
		case <-ctx.Done():
			return
		case <-h.stopCh:
			return
		case <-ticker.C:
			h.checkAllTenants(ctx)
		}
	}
}

func (h *RefreshHook) Stop() {
	close(h.stopCh)
}

func (h *RefreshHook) checkAllTenants(ctx context.Context) {
	// M5-thin: fixture tenant list. Thickening: query KG for active tenants.
	tenants := []string{"tenant-a", "tenant-b", "tenant-c", "tenant-founder-1", "tenant-founder-2", "tenant-founder-3"}
	surfaces := []entityv1.Surface{
		entityv1.Surface_SURFACE_CHATGPT,
		entityv1.Surface_SURFACE_PERPLEXITY,
		entityv1.Surface_SURFACE_GEMINI,
		entityv1.Surface_SURFACE_GROK,
		entityv1.Surface_SURFACE_CLAUDE,
	}

	for _, tenant := range tenants {
		for _, surface := range surfaces {
			series := h.syntheticImpressionSeries(tenant, surface)
			if len(series) < 5 {
				continue
			}

			result, err := h.client.DetectForeignChange(ctx, series)
			if err != nil {
				log.Printf("refresh hook: foreign change check failed for %s/%s: %v", tenant, surface, err)
				continue
			}

			trigger := false
			if result.CombinedSignal == "ALERT" {
				trigger = true
			} else if h.cfg.TriggerOnWarning && result.CombinedSignal == "WARNING" {
				trigger = true
			}

			if trigger {
				log.Printf("refresh hook: foreign change %s for tenant=%s surface=%s — scheduling re-probe",
					result.CombinedSignal, tenant, surface)
				h.scheduler.ScheduleProbe(tenant, surface)
			}
		}
	}
}

// syntheticImpressionSeries generates a fixture impression series.
// tenant-b + GEMINI: step up at day 20
// tenant-founder-1 + CLAUDE: step down at day 25
func (h *RefreshHook) syntheticImpressionSeries(tenantID string, surface entityv1.Surface) []float64 {
	base := 1000.0
	series := make([]float64, h.cfg.SeriesWindow)
	for i := 0; i < h.cfg.SeriesWindow; i++ {
		series[i] = base
	}

	if tenantID == "tenant-b" && surface == entityv1.Surface_SURFACE_GEMINI {
		for i := 20; i < h.cfg.SeriesWindow; i++ {
			series[i] = base * 1.5
		}
	}
	if tenantID == "tenant-founder-1" && surface == entityv1.Surface_SURFACE_CLAUDE {
		for i := 25; i < h.cfg.SeriesWindow; i++ {
			series[i] = base * 0.5
		}
	}

	return series
}