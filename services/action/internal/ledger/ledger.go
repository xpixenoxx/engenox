// ledger/ledger.go — Dial ledger for the Action service (M3).
//
// The dial is the candor-floor mechanism for HOW HARD Engenox pushes on a
// brand's behalf (12 §5 + 26 §4). Three MVP actions: propose, escalate, demote.
// Escalation requires 3 axes (calibration coverage, human-approval rate, pooled overlap);
// Demotion is always permitted (safety valve - fires on alert/regret).
// The ledger is append-only; a denied escalation is STILL recorded with reasons —
// the candor floor surfaces the refused escalation in the explainer (26 §4).
//
// Cites: 12 §5, 26 §4, 26 §6, 15 §3 (Cedar gate), 23 §3m (<2ms p99), CLAUDE.md §8.

package ledger

import (
	"context"
	"strconv"
	"sync"
	"time"

	"github.com/engenox/services/action/internal/cedargate"
	"github.com/google/uuid"
)

// DialAction represents the three MVP dial transitions.
type DialAction string

const (
	DialActionPropose   DialAction = "propose"
	DialActionEscalate  DialAction = "escalate"
	DialActionDemote    DialAction = "demote"
)

// DialDecision is the outcome of a dial transition request.
type DialDecision string

const (
	DialDecisionAllow DialDecision = "allow"
	DialDecisionDeny  DialDecision = "deny"
)

// DialRequest is the input to the dial gate.
type DialRequest struct {
	TenantID   string
	Action     DialAction
	AxisCount  int
	BlastRadius string
	DialLevel  string
}

// DialVerdict is the output of the dial gate evaluation.
type DialVerdict struct {
	Decision DialDecision
	Reasons  []string
}

// DialLedgerEntry records a dial transition attempt (append-only, never mutated).
type DialLedgerEntry struct {
	ID          string
	TenantID    string
	Action      DialAction
	AxisCount   int
	Decision    DialDecision
	Reasons     []string
	TxTime      time.Time
	BlastRadius string
	DialLevel   string
}

// LedgerStore is the interface for the dial ledger.
type LedgerStore interface {
	Append(ctx context.Context, entry DialLedgerEntry) error
	LastFor(ctx context.Context, tenantID string) (*DialLedgerEntry, error)
}

// InMemoryDialLedger is the M3-thin in-memory implementation.
// M4-thicken: swap for Postgres + R2 Object-Lock (dual-canonical two-fence).
type InMemoryDialLedger struct {
	mu   sync.RWMutex
	rows []DialLedgerEntry
}

func NewInMemoryDialLedger() *InMemoryDialLedger {
	return &InMemoryDialLedger{
		rows: make([]DialLedgerEntry, 0),
	}
}

func (l *InMemoryDialLedger) Append(ctx context.Context, entry DialLedgerEntry) error {
	l.mu.Lock()
	defer l.mu.Unlock()
	// Append-only: no in-place edits. A dial transition that supersedes a prior
	// one writes a NEW row; the candor hover walks the chain back (13 §4).
	l.rows = append(l.rows, entry)
	return nil
}

func (l *InMemoryDialLedger) LastFor(ctx context.Context, tenantID string) (*DialLedgerEntry, error) {
	l.mu.RLock()
	defer l.mu.RUnlock()
	for i := len(l.rows) - 1; i >= 0; i-- {
		row := l.rows[i]
		if row.TenantID == tenantID {
			return &row, nil
		}
	}
	return nil, nil // no prior decision for this tenant
}

// ThreeAxisEvaluator evaluates whether an escalation request clears all three axes.
// The three axes (12 §9, CLAUDE.md §8 watchdog):
//  1. Calibration Coverage Axis — conformal prediction coverage >= threshold on the target segment
//  2. Human Approval Rate Axis — historical human approval rate >= threshold for similar blastRadius
//  3. Pooled Overlap Axis — pooled estimator overlap with the proposed intervention's counterfactual
//
// M3-thin: evaluation is a function of tenant's historical ledger + corpus stats (stubbed here).
// M4-thicken: real reads from ClickHouse corpus + ledger + ML provenance.
type ThreeAxisEvaluator interface {
	Evaluate(ctx context.Context, tenantID string, blastRadius string) (ThreeAxisResult, error)
}

type ThreeAxisResult struct {
	CalibrationCoverage bool    // axis 1: coverage >= threshold?
	HumanApprovalRate   bool    // axis 2: approval rate >= threshold?
	PooledOverlap       bool    // axis 3: overlap >= threshold?
	AxesCleared         int     // count of cleared axes (0-3)
	Details             string  // human-readable explanation for the ledger
}

// InMemoryThreeAxisEvaluator is the M3-thin stub evaluator.
// In M3-thin, we assume all three axes are CLEARED for demonstration.
// M4-thicken: real evaluation against ClickHouse corpus + ledger.
type InMemoryThreeAxisEvaluator struct{}

func NewInMemoryThreeAxisEvaluator() *InMemoryThreeAxisEvaluator {
	return &InMemoryThreeAxisEvaluator{}
}

func (e *InMemoryThreeAxisEvaluator) Evaluate(ctx context.Context, tenantID string, blastRadius string) (ThreeAxisResult, error) {
	// M3-thin: all three axes cleared (demonstrates the mechanism).
	// The watchdog (CLAUDE.md §8) enforces: escalation DENIED if axesCleared < 3.
	// This evaluator is deterministic and testable.
	return ThreeAxisResult{
		CalibrationCoverage: true,
		HumanApprovalRate:   true,
		PooledOverlap:       true,
		AxesCleared:         3,
		Details:             "M3-thin: all three axes assumed cleared for tenant " + tenantID + " blastRadius " + blastRadius,
	}, nil
}

// DemoteOnAlert evaluates whether an automatic demotion should fire.
// M3-thin: stub that returns false (no demotion). M4-thicken: real alert integration
// (N alerts in window OR 1 regret event → auto-demote).
type DemoteOnAlert interface {
	ShouldDemote(ctx context.Context, tenantID string) (bool, string, error)
}

type InMemoryDemoteOnAlert struct {
	alerts map[string]int
	regret map[string]bool
	mu     sync.Mutex
}

func NewInMemoryDemoteOnAlert() *InMemoryDemoteOnAlert {
	return &InMemoryDemoteOnAlert{
		alerts: make(map[string]int),
		regret: make(map[string]bool),
	}
}

func (d *InMemoryDemoteOnAlert) RecordAlert(ctx context.Context, tenantID string) {
	d.mu.Lock()
	defer d.mu.Unlock()
	d.alerts[tenantID]++
}

func (d *InMemoryDemoteOnAlert) RecordRegret(ctx context.Context, tenantID string) {
	d.mu.Lock()
	defer d.mu.Unlock()
	d.regret[tenantID] = true
}

func (d *InMemoryDemoteOnAlert) ShouldDemote(ctx context.Context, tenantID string) (bool, string, error) {
	d.mu.Lock()
	defer d.mu.Unlock()
	alertCount := d.alerts[tenantID]
	hasRegret := d.regret[tenantID]

	// M3-thin thresholds (per 12 §5: N alerts in window OR 1 regret → demote)
	const alertThreshold = 3 // N alerts in sliding window
	if alertCount >= alertThreshold {
		return true, "automatic demotion: " + string(rune(alertCount)) + " alerts in window (threshold=3)", nil
	}
	if hasRegret {
		return true, "automatic demotion: 1 regret event recorded", nil
	}
	return false, "", nil
}

// DialGateEvaluator evaluates dial transitions using the Cedar policy + three-axis + demote-on-alert.
// This is the orchestration layer that the Action service calls.
type DialGateEvaluator struct {
	CedarGate        CedarGateInterface
	Ledger           LedgerStore
	AxisEvaluator    ThreeAxisEvaluator
	DemoteEvaluator  DemoteOnAlert
}

type CedarGateInterface interface {
	Authorize(ctx context.Context, req cedargate.AuthzRequest) (cedargate.AuthzResult, error)
}

func NewDialGateEvaluator(
	cedar CedarGateInterface,
	ledger LedgerStore,
	axisEvaluator ThreeAxisEvaluator,
	demoteEvaluator DemoteOnAlert,
) *DialGateEvaluator {
	return &DialGateEvaluator{
		CedarGate:       cedar,
		Ledger:          ledger,
		AxisEvaluator:   axisEvaluator,
		DemoteEvaluator: demoteEvaluator,
	}
}

// Evaluate runs the full dial gate evaluation for a request.
// Returns the dial decision (allow/deny), the decision to record, and the ledger entry.
func (d *DialGateEvaluator) Evaluate(ctx context.Context, req DialRequest) (DialDecision, []string, *DialLedgerEntry, error) {
	// Step 1: Check if demote-on-alert should fire (for any non-demote action)
	if req.Action != DialActionDemote {
		if shouldDemote, reason, err := d.DemoteEvaluator.ShouldDemote(ctx, req.TenantID); err != nil {
			return DialDecisionDeny, nil, nil, err
		} else if shouldDemote {
			// Record a demote decision
			entry := DialLedgerEntry{
				ID:          uuid.New().String(),
				TenantID:    req.TenantID,
				Action:      DialActionDemote,
				AxisCount:   0,
				Decision:    DialDecisionAllow,
				Reasons:     []string{reason, "demote-on-alert auto-fired"},
				TxTime:      time.Now().UTC(),
				BlastRadius: req.BlastRadius,
				DialLevel:   req.DialLevel,
			}
			if err := d.Ledger.Append(ctx, entry); err != nil {
				return DialDecisionDeny, nil, nil, err
			}
			return DialDecisionAllow, []string{reason}, &entry, nil
		}
	}

	// Step 1b: Demote is ALWAYS allowed (safety valve - CLAUDE.md §8, 12 §5)
	// This bypasses Cedar and axis checks entirely
	if req.Action == DialActionDemote {
		entry := DialLedgerEntry{
			ID:          uuid.New().String(),
			TenantID:    req.TenantID,
			Action:      DialActionDemote,
			AxisCount:   0,
			Decision:    DialDecisionAllow,
			Reasons:     []string{"demote always allowed (safety valve)"},
			TxTime:      time.Now().UTC(),
			BlastRadius: req.BlastRadius,
			DialLevel:   req.DialLevel,
		}
		if err := d.Ledger.Append(ctx, entry); err != nil {
			return DialDecisionDeny, nil, nil, err
		}
		return DialDecisionAllow, entry.Reasons, &entry, nil
	}

	// Step 2: For escalate, evaluate three axes BEFORE Cedar
	var axisCleared int
	var axisDetails string
	if req.Action == DialActionEscalate {
		result, err := d.AxisEvaluator.Evaluate(ctx, req.TenantID, req.BlastRadius)
		if err != nil {
			return DialDecisionDeny, nil, nil, err
		}
		axisCleared = result.AxesCleared
		axisDetails = result.Details
		// Watchdog: escalation DENIED if < 3 axes (CLAUDE.md §8)
		if axisCleared < 3 {
			entry := DialLedgerEntry{
				ID:          uuid.New().String(),
				TenantID:    req.TenantID,
				Action:      DialActionEscalate,
				AxisCount:   req.AxisCount,
				Decision:    DialDecisionDeny,
				Reasons:     []string{"escalation denied: only " + strconv.Itoa(axisCleared) + "/3 axes cleared", axisDetails},
				TxTime:      time.Now().UTC(),
				BlastRadius: req.BlastRadius,
				DialLevel:   req.DialLevel,
			}
			if err := d.Ledger.Append(ctx, entry); err != nil {
				return DialDecisionDeny, nil, nil, err
			}
			return DialDecisionDeny, entry.Reasons, &entry, nil
		}
		// Axes cleared — proceed with axisCount = 3 for Cedar
		req.AxisCount = 3
	}

	// Step 3: Cedar two-pass evaluation
	cedarReq := cedargate.AuthzRequest{
		TenantID:    req.TenantID,
		Action:      string(req.Action),
		BlastRadius: req.BlastRadius,
		DialLevel:   req.DialLevel,
		AxisCount:   req.AxisCount,
	}
	cedarResult, err := d.CedarGate.Authorize(ctx, cedarReq)
	if err != nil {
		return DialDecisionDeny, nil, nil, err
	}

	decision := DialDecisionAllow
	if !cedarResult.Authorized {
		decision = DialDecisionDeny
	}

	// Step 4: Record in ledger (append-only, including denials)
	entry := DialLedgerEntry{
		ID:          uuid.New().String(),
		TenantID:    req.TenantID,
		Action:      req.Action,
		AxisCount:   req.AxisCount,
		Decision:    decision,
		Reasons:     append(cedarResult.Reasons, axisDetails),
		TxTime:      time.Now().UTC(),
		BlastRadius: req.BlastRadius,
		DialLevel:   req.DialLevel,
	}
	if err := d.Ledger.Append(ctx, entry); err != nil {
		return DialDecisionDeny, nil, nil, err
	}

	return decision, entry.Reasons, &entry, nil
}