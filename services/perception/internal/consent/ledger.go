// internal/consent/ledger.go — In-memory consent ledger (M5-thin).
//
// Records consent for the founder-network panel cohort.
// M5-thin: in-memory map. Thickening: append-only ledger + R2 mirror + GPG-signed consent.
//
// Cites: 19 §3 Panel 2 (consented panel), 25 §3 M5 (consent ledger), ADR-0007.

package consent

import (
	"fmt"
	"sync"
	"time"

	entityv1 "github.com/engenox/contracts/generated/go/engenox/entity/v1"
)

// ConsentRecord represents a single consent grant.
type ConsentRecord struct {
	TenantID      string
	Surface       entityv1.Surface
	Strategy      entityv1.IdentificationStrategy
	GrantedAt     time.Time
	RevokedAt     *time.Time
	Jurisdiction  string
	ConsentHash   string // hash of signed consent doc (thickening: GPG)
	Metadata      map[string]string
}

// ConsentLedger manages consent records.
type ConsentLedger struct {
	mu      sync.RWMutex
	records map[string][]*ConsentRecord // key: tenantID
}

// NewConsentLedger creates a new in-memory ledger.
func NewConsentLedger() *ConsentLedger {
	return &ConsentLedger{
		records: make(map[string][]*ConsentRecord),
	}
}

// RecordConsent adds a new consent grant.
func (cl *ConsentLedger) RecordConsent(tenantID string, surface entityv1.Surface, strategy entityv1.IdentificationStrategy, jurisdiction string) *ConsentRecord {
	cl.mu.Lock()
	defer cl.mu.Unlock()

	record := &ConsentRecord{
		TenantID:     tenantID,
		Surface:      surface,
		Strategy:     strategy,
		GrantedAt:    time.Now(),
		Jurisdiction: jurisdiction,
		Metadata:     make(map[string]string),
	}

	cl.records[tenantID] = append(cl.records[tenantID], record)
	return record
}

// RevokeConsent marks a consent as revoked.
func (cl *ConsentLedger) RevokeConsent(tenantID string, surface entityv1.Surface) bool {
	cl.mu.Lock()
	defer cl.mu.Unlock()

	records := cl.records[tenantID]
	for _, r := range records {
		if r.Surface == surface && r.RevokedAt == nil {
			now := time.Now()
			r.RevokedAt = &now
			return true
		}
	}
	return false
}

// HasConsent checks if valid consent exists for tenant+surface.
func (cl *ConsentLedger) HasConsent(tenantID string, surface entityv1.Surface) bool {
	cl.mu.RLock()
	defer cl.mu.RUnlock()

	records := cl.records[tenantID]
	for _, r := range records {
		if r.Surface == surface && r.RevokedAt == nil {
			return true
		}
	}
	return false
}

// GetConsentStrategy returns the identification strategy for tenant+surface if consented.
func (cl *ConsentLedger) GetConsentStrategy(tenantID string, surface entityv1.Surface) (entityv1.IdentificationStrategy, bool) {
	cl.mu.RLock()
	defer cl.mu.RUnlock()

	records := cl.records[tenantID]
	for _, r := range records {
		if r.Surface == surface && r.RevokedAt == nil {
			return r.Strategy, true
		}
	}
	return entityv1.IdentificationStrategy_IDENTIFICATION_STRATEGY_UNSPECIFIED, false
}

// ListConsented returns all active consent records for a tenant.
func (cl *ConsentLedger) ListConsented(tenantID string) []*ConsentRecord {
	cl.mu.RLock()
	defer cl.mu.RUnlock()

	records := cl.records[tenantID]
	var active []*ConsentRecord
	for _, r := range records {
		if r.RevokedAt == nil {
			active = append(active, r)
		}
	}
	return active
}

// AllRecords returns all records (for admin/debug).
func (cl *ConsentLedger) AllRecords() map[string][]*ConsentRecord {
	cl.mu.RLock()
	defer cl.mu.RUnlock()

	result := make(map[string][]*ConsentRecord)
	for k, v := range cl.records {
		copy := make([]*ConsentRecord, len(v))
		for i, r := range v {
			copy[i] = r
		}
		result[k] = copy
	}
	return result
}

// SeedFixtureCohort seeds the founder-network panel cohort (3 tenants, 5 surfaces each, RCT_ELIGIBLE).
func (cl *ConsentLedger) SeedFixtureCohort() error {
	tenants := []struct {
		tenantID     string
		jurisdiction string
	}{
		{"tenant-founder-1", "US-CA"},
		{"tenant-founder-2", "US-NY"},
		{"tenant-founder-3", "EU-DE"},
	}

	for _, t := range tenants {
		for _, surface := range []entityv1.Surface{
			entityv1.Surface_SURFACE_CHATGPT,
			entityv1.Surface_SURFACE_PERPLEXITY,
			entityv1.Surface_SURFACE_GEMINI,
			entityv1.Surface_SURFACE_GROK,
			entityv1.Surface_SURFACE_CLAUDE,
		} {
			cl.RecordConsent(t.tenantID, surface, entityv1.IdentificationStrategy_IDENTIFICATION_STRATEGY_RCT_ELIGIBLE, t.jurisdiction)
		}
	}

	return nil
}

// ConsentStatus represents the consent status for a surface.
type ConsentStatus string

const (
	ConsentStatusGranted  ConsentStatus = "GRANTED"
	ConsentStatusRevoked  ConsentStatus = "REVOKED"
	ConsentStatusAbsent   ConsentStatus = "ABSENT"
)

// GetStatus returns the consent status for tenant+surface.
func (cl *ConsentLedger) GetStatus(tenantID string, surface entityv1.Surface) ConsentStatus {
	cl.mu.RLock()
	defer cl.mu.RUnlock()

	records := cl.records[tenantID]
	for _, r := range records {
		if r.Surface == surface {
			if r.RevokedAt != nil {
				return ConsentStatusRevoked
			}
			return ConsentStatusGranted
		}
	}
	return ConsentStatusAbsent
}

// ValidateProbe checks if a probe should run for tenant+surface.
func (cl *ConsentLedger) ValidateProbe(tenantID string, surface entityv1.Surface) (bool, entityv1.IdentificationStrategy, string) {
	status := cl.GetStatus(tenantID, surface)
	switch status {
	case ConsentStatusGranted:
		strategy, ok := cl.GetConsentStrategy(tenantID, surface)
		if !ok {
			strategy = entityv1.IdentificationStrategy_IDENTIFICATION_STRATEGY_UNSPECIFIED
		}
		return true, strategy, ""
	case ConsentStatusRevoked:
		return false, entityv1.IdentificationStrategy_IDENTIFICATION_STRATEGY_UNSPECIFIED, fmt.Sprintf("consent revoked for surface %s", surface)
	default:
		return false, entityv1.IdentificationStrategy_IDENTIFICATION_STRATEGY_UNSPECIFIED, fmt.Sprintf("no consent for surface %s", surface)
	}
}