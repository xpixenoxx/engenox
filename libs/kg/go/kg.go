// Package kg — truth-spine typed access (Go port of @engenox/kg).
//
// This is the GO-implementation of the bi-temporal KG access port.
// Cites: 13 §2/§3 (AssertionStore port), 06 §7 invariant 2.
package kg

import (
	"context"
	"sync"

	entityv1 "github.com/engenox/contracts/generated/go/engenox/entity/v1"
	eventv1 "github.com/engenox/contracts/generated/go/engenox/event/v1"
)

// AssertionStore is the port for bi-temporal KG writes/reads.
// Every assertion carries valid_time (when true in reality) + tx_time (when written).
// The port NEVER exposes raw SQL — callers must use assertion_view (13 §3).
type AssertionStore interface {
	// Append appends a bi-temporal node to the KG (surface assertion or full node).
	// The store enforces the candor gate: valid_time and tx_time MUST be present.
	// node can be *entityv1.AssertedNode or *entityv1.SurfaceAssertion.
	Append(ctx context.Context, node any) error

	// ReadAssertions queries assertions for a tenant/entity within valid-time range.
	ReadAssertions(ctx context.Context, tenantID, entityID string, validFrom, validTo int64) ([]any, error)
}

// InMemoryAssertionStore is a dev-only implementation for M3-thin.
// M4-thicken: swap for CNPG+AGE implementation (libs/kg/go/postgres/...).
type InMemoryAssertionStore struct {
	mu         sync.RWMutex
	assertions []any
}

func NewInMemoryAssertionStore() *InMemoryAssertionStore {
	return &InMemoryAssertionStore{
		assertions: make([]any, 0),
	}
}

func (s *InMemoryAssertionStore) Append(ctx context.Context, node any) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	// Candor gate: valid_time is mandatory (06 §7 invariant 2)
	// Use type switch to get ValidTime from either type
	var validTime *entityv1.TimeInterval
	switch n := node.(type) {
	case *entityv1.AssertedNode:
		validTime = n.GetValidTime()
	case *entityv1.SurfaceAssertion:
		validTime = n.GetValidTime()
	default:
		return &KgError{Kind: "unsupported-type", NodeId: ""}
	}

	if validTime == nil {
		return &KgError{Kind: "missing-valid-time", NodeId: nodeId(node)}
	}

	s.assertions = append(s.assertions, node)
	return nil
}

func (s *InMemoryAssertionStore) ReadAssertions(ctx context.Context, tenantID, entityID string, validFrom, validTo int64) ([]any, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	var result []any
	for _, a := range s.assertions {
		var taid, tvid string
		var vt *entityv1.TimeInterval

		switch n := a.(type) {
		case *entityv1.AssertedNode:
			taid = n.GetTenantId()
			tvid = n.GetId()
			vt = n.GetValidTime()
		case *entityv1.SurfaceAssertion:
			taid = n.GetTenantId()
			tvid = n.GetEntityId()
			vt = n.GetValidTime()
		default:
			continue
		}

		if taid == tenantID && (entityID == "" || tvid == entityID) {
			if vt != nil && vt.Start != nil {
				start := vt.Start.AsTime().Unix()
				if start >= validFrom && start <= validTo {
					result = append(result, a)
				}
			}
		}
	}
	return result, nil
}

// nodeId extracts an ID from a node for error messages.
func nodeId(node any) string {
	switch n := node.(type) {
	case *entityv1.AssertedNode:
		return n.GetId()
	case *entityv1.SurfaceAssertion:
		return n.GetEntityId()
	default:
		return ""
	}
}

// KgError is a typed error for KG operations.
type KgError struct {
	Kind   string
	NodeId string
}

func (e *KgError) Error() string {
	return "kg error: " + e.Kind + " for node " + e.NodeId
}

// EventStore is a minimal port for CIO corpus events (measurement service).
type EventStore interface {
	WriteEvent(ctx context.Context, e *eventv1.AssertionEvent) error
	ReadEvents(ctx context.Context, tenantID string, from, to int64) ([]*eventv1.AssertionEvent, error)
}

type InMemoryEventStore struct {
	mu     sync.RWMutex
	events []*eventv1.AssertionEvent
}

func NewInMemoryEventStore() *InMemoryEventStore {
	return &InMemoryEventStore{events: make([]*eventv1.AssertionEvent, 0)}
}

func (s *InMemoryEventStore) WriteEvent(ctx context.Context, e *eventv1.AssertionEvent) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.events = append(s.events, e)
	return nil
}

func (s *InMemoryEventStore) ReadEvents(ctx context.Context, tenantID string, from, to int64) ([]*eventv1.AssertionEvent, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	var result []*eventv1.AssertionEvent
	for _, e := range s.events {
		if e.TenantId == tenantID && e.EmittedAt != nil {
			ts := e.EmittedAt.AsTime().Unix()
			if ts >= from && ts <= to {
				result = append(result, e)
			}
		}
	}
	return result, nil
}