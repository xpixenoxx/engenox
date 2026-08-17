// internal/probe/mock_scheduler.go — Mock scheduler for testing (M5-thin).
package probe

import (
	"context"

	entityv1 "github.com/engenox/contracts/generated/go/engenox/entity/v1"
)

// MockScheduler is a test double for ProbeScheduler.
type MockScheduler struct {
	ScheduleProbeFn func(tenantID string, surface entityv1.Surface)
	RunProbeCycleFn func(ctx context.Context, tenantID string, surfaces []entityv1.Surface, queries []string) (int, int, map[entityv1.Surface]int)
}

// NewMockScheduler creates a new mock scheduler.
func NewMockScheduler() *MockScheduler {
	return &MockScheduler{}
}

// ScheduleProbe implements the ProbeSchedulerInterface for testing.
func (m *MockScheduler) ScheduleProbe(tenantID string, surface entityv1.Surface) {
	if m.ScheduleProbeFn != nil {
		m.ScheduleProbeFn(tenantID, surface)
	}
}

// RunProbeCycle implements the ProbeSchedulerInterface for testing.
func (m *MockScheduler) RunProbeCycle(ctx context.Context, tenantID string, surfaces []entityv1.Surface, queries []string) (int, int, map[entityv1.Surface]int) {
	if m.RunProbeCycleFn != nil {
		return m.RunProbeCycleFn(ctx, tenantID, surfaces, queries)
	}
	return 0, 0, make(map[entityv1.Surface]int)
}