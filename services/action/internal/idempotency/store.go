// idempotency/store.go — IdempotencyKey store (M3).
//
// Every external-side-effect activity carries a typed IdempotencyKey derived from
// (tenant_id, cycle_id, intervention_id, activity_name). The Action layer's
// PR-creation checks "does this PR already exist on this idempotency key" before
// creating. An integration test re-executes every external-side-effect activity
// and asserts idempotency; a PR-creating activity without a passing idempotency
// test is CI-blocked (09 §2, CLAUDE.md §8).
//
// Cites: 09 §2 (idempotency), CLAUDE.md §8 (watchdog), 25 §3 M3.

package idempotency

import (
	"context"
	"sync"
	"time"
)

type Store interface {
	// CheckAndSet returns (exists, error). If exists=false, the key was set atomically.
	CheckAndSet(ctx context.Context, key string, ttl time.Duration) (bool, error)
	// Get returns the stored value if exists.
	Get(ctx context.Context, key string) (string, bool)
	// Delete removes the key.
	Delete(ctx context.Context, key string) error
}

type InMemoryStore struct {
	mu     sync.RWMutex
	keys   map[string]string
	expiry map[string]time.Time
}

func NewInMemoryStore() *InMemoryStore {
	s := &InMemoryStore{
		keys:   make(map[string]string),
		expiry: make(map[string]time.Time),
	}
	go s.cleanupLoop()
	return s
}

func (s *InMemoryStore) CheckAndSet(ctx context.Context, key string, ttl time.Duration) (bool, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	// Check expiry
	if exp, ok := s.expiry[key]; ok && time.Now().After(exp) {
		delete(s.keys, key)
		delete(s.expiry, key)
	}

	if _, exists := s.keys[key]; exists {
		return true, nil
	}

	s.keys[key] = "done"
	s.expiry[key] = time.Now().Add(ttl)
	return false, nil
}

func (s *InMemoryStore) Get(ctx context.Context, key string) (string, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	if exp, ok := s.expiry[key]; ok && time.Now().After(exp) {
		return "", false
	}
	val, ok := s.keys[key]
	return val, ok
}

func (s *InMemoryStore) Delete(ctx context.Context, key string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.keys, key)
	delete(s.expiry, key)
	return nil
}

func (s *InMemoryStore) cleanupLoop() {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()
	for range ticker.C {
		s.mu.Lock()
		now := time.Now()
		for k, exp := range s.expiry {
			if now.After(exp) {
				delete(s.keys, k)
				delete(s.expiry, k)
			}
		}
		s.mu.Unlock()
	}
}

// IdempotencyKey constructs the canonical key for an activity.
// Format: action:{tenant}:{cycle}:{intervention}:{activity}
func IdempotencyKey(tenantID, cycleID, interventionID, activity string) string {
	return "action:" + tenantID + ":" + cycleID + ":" + interventionID + ":" + activity
}