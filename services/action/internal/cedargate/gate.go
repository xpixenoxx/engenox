// cedargate/gate.go — Cedar two-pass authorization gate (M3).
//
// The Cedar gate is the symbolic commitment to autonomy. Two-pass:
// Pass 1: structural — policy exists, schema valid, entity types match.
// Pass 2: isAuthorized — the actual policy decision.
//
// Thin = one trivial policy; thickening = per-tenant policies, escalation conditions.
// The gate mechanism is NEVER thinned (ADR-0007 Thinning Rule).
//
// Evaluates: (dial_level, blast_radius_band) → permitted | denied
//
// Cites: 15 §6 (Cedar two-pass), 12 §3-4 (dial + blast radius), 09 §6 (Action layer),
//        23 §3m (<2ms p99 CI test), ADR-0007 #4, #8 (invariant).

package cedargate

import (
	"context"
	"embed"
	"fmt"

	"github.com/cedar-policy/cedar-go"
	"github.com/cedar-policy/cedar-go/types"
)

//go:embed policies/*.cedar
var policyFS embed.FS

type PolicyStore struct {
	policies map[string]*cedar.PolicySet
}

func NewInMemoryPolicyStore() *PolicyStore {
	return &PolicyStore{
		policies: make(map[string]*cedar.PolicySet),
	}
}

func (ps *PolicyStore) LoadDefaultPolicies() error {
	// MVP thin: default embedded policy
	policyBytes, err := policyFS.ReadFile("policies/default.cedar")
	if err != nil {
		return err
	}

	// Parse policy set - v1.8.0 API
	policySet, err := cedar.NewPolicySetFromBytes("default.cedar", policyBytes)
	if err != nil {
		return fmt.Errorf("parse default policy: %w", err)
	}

	ps.policies["default"] = policySet
	return nil
}

func (ps *PolicyStore) GetPolicySet(ctx context.Context, name string) (*cedar.PolicySet, error) {
	if policySet, ok := ps.policies[name]; ok {
		return policySet, nil
	}
	return ps.policies["default"], nil // fallback
}

type Gate struct {
	store *PolicyStore
}

func NewGate(store *PolicyStore) *Gate {
	return &Gate{store: store}
}

type AuthzRequest struct {
	TenantID      string
	Action        string // "propose", "escalate", "demote"
	BlastRadius   string // "single_page", "multi_page", "sitewide", "canonical", "redirect"
	DialLevel     string // "read", "recommend", "draft", "propose", "execute_with_approval", "guarded", "autonomous"
	AxisCount     int    // for escalation: number of cleared axes
}

type AuthzResult struct {
	Authorized bool
	Reasons    []string
	PolicyIDs  []string
}

// entityGetter wraps a map of entities and implements types.EntityGetter.
type entityGetter struct {
	entities map[types.EntityUID]types.Entity
}

func (eg entityGetter) Get(uid types.EntityUID) (types.Entity, bool) {
	e, ok := eg.entities[uid]
	return e, ok
}

func (g *Gate) Authorize(ctx context.Context, req AuthzRequest) (AuthzResult, error) {
	// Pass 1: Structural validation
	if req.TenantID == "" {
		return AuthzResult{Authorized: false, Reasons: []string{"missing tenant_id"}}, nil
	}

	validActions := map[string]bool{"propose": true, "escalate": true, "demote": true}
	if !validActions[req.Action] {
		return AuthzResult{Authorized: false, Reasons: []string{"invalid action: " + req.Action}}, nil
	}

	validBlastRadius := map[string]bool{
		"single_page": true, "multi_page": true, "sitewide": true,
		"canonical": true, "redirect": true,
	}
	if !validBlastRadius[req.BlastRadius] {
		return AuthzResult{Authorized: false, Reasons: []string{"invalid blast_radius: " + req.BlastRadius}}, nil
	}

	// Pass 2: Cedar evaluation
	policySet, err := g.store.GetPolicySet(ctx, "default")
	if err != nil {
		return AuthzResult{Authorized: false, Reasons: []string{"policy load failed: " + err.Error()}}, nil
	}

	// Build Cedar entities
	principal := types.EntityUID{
		Type: "Engenox::Tenant",
		ID:   types.String(req.TenantID),
	}

	action := types.EntityUID{
		Type: "Engenox::Action",
		ID:   types.String(req.Action),
	}

	resource := types.EntityUID{
		Type: "Engenox::Dial",
		ID:   types.String("the-dial"),
	}

	// Create a map of entities
	entities := make(map[types.EntityUID]types.Entity)
	entities[principal] = types.Entity{
		UID: principal,
		Attributes: types.NewRecord(types.RecordMap{
			"axisCount":     cedar.Long(req.AxisCount),
			"blastRadius":   cedar.String(req.BlastRadius),
			"dialLevel":     cedar.String(req.DialLevel),
		}),
	}

	// Create request
	cedarReq := types.Request{
		Principal: principal,
		Action:    action,
		Resource:  resource,
		Context:   types.NewRecord(types.RecordMap{}),
	}

	// Evaluate - pass policySet as *PolicySet which implements PolicyIterator via All()
	decision, diagnostic := policySet.IsAuthorized(entityGetter{entities}, cedarReq)

	var reasons []string
	var policyIDs []string

	// Collect reasons from diagnostic
	for _, reason := range diagnostic.Reasons {
		reasons = append(reasons, string(reason.PolicyID))
		policyIDs = append(policyIDs, string(reason.PolicyID))
	}
	for _, err := range diagnostic.Errors {
		reasons = append(reasons, err.Message)
		if err.PolicyID != "" {
			policyIDs = append(policyIDs, string(err.PolicyID))
		}
	}

	return AuthzResult{
		Authorized: bool(decision),
		Reasons:    reasons,
		PolicyIDs:  policyIDs,
	}, nil
}