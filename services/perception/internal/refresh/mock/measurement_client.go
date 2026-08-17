// internal/refresh/mock/measurement_client.go — M5-thin mock measurement client.
package mock

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"sync"

	entityv1 "github.com/engenox/contracts/generated/go/engenox/entity/v1"
)

// MockMeasurementServer is a test HTTP server that simulates the measurement service
// foreign-change detection endpoint.
type MockMeasurementServer struct {
	mu           sync.Mutex
	server       *httptest.Server
	seriesData   map[string][]float64
	callCount    int
	lastTenantID string
	lastEntityID string
	lastSurface  entityv1.Surface
	triggered    bool
}

// ForeignChangeResponse matches the measurement service output for foreign-change detection.
type ForeignChangeResponse struct {
	EWMA          EWMAState `json:"ewma"`
	CUSUM         CUSUMState `json:"cusum"`
	CombinedSignal string    `json:"combined_signal"`
	Reason        string    `json:"reason,omitempty"`
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

// ForeignChangeRequest matches the measurement service input.
type ForeignChangeRequest struct {
	Series []DataPoint `json:"series"`
}

type DataPoint struct {
	Timestamp string  `json:"timestamp"`
	Value     float64 `json:"value"`
}

// NewMockMeasurementServer creates a new mock measurement server.
func NewMockMeasurementServer() *MockMeasurementServer {
	m := &MockMeasurementServer{
		seriesData: make(map[string][]float64),
	}
	m.server = httptest.NewServer(http.HandlerFunc(m.handleRequest))
	return m
}

// URL returns the server URL.
func (m *MockMeasurementServer) URL() string {
	return m.server.URL
}

// Close shuts down the server.
func (m *MockMeasurementServer) Close() {
	m.server.Close()
}

// SetSeries sets the time series data for a tenant/entity/surface combination.
func (m *MockMeasurementServer) SetSeries(tenantID, entityID string, surface entityv1.Surface, points []float64) {
	m.mu.Lock()
	defer m.mu.Unlock()

	key := tenantID + "/" + entityID + "/" + surface.String()
	m.seriesData[key] = points
}

// SetDriftSeries sets a drifting time series for the given tenant/entity/surface.
func (m *MockMeasurementServer) SetDriftSeries(tenantID, entityID string, surface entityv1.Surface) {
	points := generateDriftSeries()
	m.SetSeries(tenantID, entityID, surface, points)
}

// SetShiftSeries sets a sudden shift time series.
func (m *MockMeasurementServer) SetShiftSeries(tenantID, entityID string, surface entityv1.Surface) {
	points := generateShiftSeries()
	m.SetSeries(tenantID, entityID, surface, points)
}

// SetStableSeries sets a stable time series.
func (m *MockMeasurementServer) SetStableSeries(tenantID, entityID string, surface entityv1.Surface) {
	points := generateStableSeries()
	m.SetSeries(tenantID, entityID, surface, points)
}

// CallCount returns the number of calls made to the server.
func (m *MockMeasurementServer) CallCount() int {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.callCount
}

// Triggered returns whether the foreign change detection triggered.
func (m *MockMeasurementServer) Triggered() bool {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.triggered
}

// SetTriggered sets the triggered flag (for test verification).
func (m *MockMeasurementServer) SetTriggered(v bool) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.triggered = v
}

func (m *MockMeasurementServer) handleRequest(w http.ResponseWriter, r *http.Request) {
	m.mu.Lock()
	m.callCount++
	m.mu.Unlock()

	// Read the request body
	var req ForeignChangeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request", http.StatusBadRequest)
		return
	}

	// Simulate EWMA/CUSUM detection based on the series
	series := make([]float64, len(req.Series))
	for i, p := range req.Series {
		series[i] = p.Value
	}

	ewmaSignal, cusumSignal := detectForeignChange(series)

	combined := "NORMAL"
	if ewmaSignal == "ALERT" || cusumSignal == "ALERT" {
		combined = "ALERT"
	} else if ewmaSignal == "WARNING" || cusumSignal == "WARNING" {
		combined = "WARNING"
	}

	// Record if triggered
	if combined == "ALERT" || combined == "WARNING" {
		m.mu.Lock()
		m.triggered = true
		m.mu.Unlock()
	}

	resp := ForeignChangeResponse{
		EWMA: EWMAState{
			Value:     series[len(series)-1],
			Signal:    ewmaSignal,
			Threshold: 2.0,
			Lambda:    0.3,
		},
		CUSUM: CUSUMState{
			CPlus:     0,
			CMinus:    0,
			Signal:    cusumSignal,
			Threshold: 5.0,
			Drift:     0,
		},
		CombinedSignal: combined,
		Reason:         "mock detection",
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(resp); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}

// detectForeignChange simulates EWMA/CUSUM detection logic.
func detectForeignChange(series []float64) (ewmaSignal, cusumSignal string) {
	if len(series) < 2 {
		return "NORMAL", "NORMAL"
	}

	// Simple EWMA calculation
	lambda := 0.3
	ewma := series[0]
	for i := 1; i < len(series); i++ {
		ewma = lambda*series[i] + (1-lambda)*ewma
	}

	// Check if latest value deviates significantly from EWMA
	lastVal := series[len(series)-1]
	if lastVal > ewma*1.2 || lastVal < ewma*0.8 {
		return "ALERT", "ALERT"
	}

	// Simple CUSUM-like check for step change
	if len(series) >= 10 {
		firstHalf := series[:len(series)/2]
		secondHalf := series[len(series)/2:]
		var sum1, sum2 float64
		for _, v := range firstHalf {
			sum1 += v
		}
		for _, v := range secondHalf {
			sum2 += v
		}
		mean1 := sum1 / float64(len(firstHalf))
		mean2 := sum2 / float64(len(secondHalf))
		if (mean2 > mean1*1.3) || (mean2 < mean1*0.7) {
			return "ALERT", "ALERT"
		}
	}

	return "NORMAL", "NORMAL"
}

// Helper functions to generate test series data.

func generateDriftSeries() []float64 {
	// Gradual upward drift - should trigger EWMA warning
	series := []float64{10.0}
	for i := 1; i < 30; i++ {
		series = append(series, series[i-1]+0.15)
	}
	return series
}

func generateShiftSeries() []float64 {
	// Sudden shift - should trigger CUSUM
	series := []float64{}
	for i := 0; i < 15; i++ {
		series = append(series, 10.0)
	}
	for i := 15; i < 30; i++ {
		series = append(series, 25.0) // Jump from 10 to 25
	}
	return series
}

func generateStableSeries() []float64 {
	// Stable around 10 with small noise - should not trigger
	series := []float64{}
	for i := 0; i < 30; i++ {
		variance := float64(i%5-2) * 0.1 // -0.2 to 0.2
		series = append(series, 10.0+variance)
	}
	return series
}