// internal/refresh/config.go — Refresh hook configuration (M5-thin).
package refresh

import (
	"time"
)

// RefreshConfig controls foreign-change-driven fixture refresh.
type RefreshConfig struct {
	// CheckInterval is how often to check for foreign changes.
	CheckInterval time.Duration
	// SeriesWindow is the number of historical data points to analyze.
	SeriesWindow int
	// TriggerOnWarning refreshes on WARNING signal (not just ALERT).
	TriggerOnWarning bool
}

// DefaultRefreshConfig returns M5-thin defaults.
func DefaultRefreshConfig() RefreshConfig {
	return RefreshConfig{
		CheckInterval:    15 * time.Minute,
		SeriesWindow:     30,
		TriggerOnWarning: true,
	}
}