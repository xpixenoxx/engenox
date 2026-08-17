// internal/consent/consent_test.go — M5-thin consent ledger property tests.
package consent

import (
	"sync"
	"testing"

	entityv1 "github.com/engenox/contracts/generated/go/engenox/entity/v1"
)

// TestConsentLedgerCRUD tests Create, Read, Update, Delete operations.
func TestConsentLedgerCRUD(t *testing.T) {
	ledger := NewConsentLedger()

	tenantID := "tenant-test"
	surface := entityv1.Surface_SURFACE_CHATGPT

	// Create consent
	record := ledger.RecordConsent(tenantID, surface, entityv1.IdentificationStrategy_IDENTIFICATION_STRATEGY_RCT_ELIGIBLE, "test-jurisdiction")
	if record == nil {
		t.Fatal("RecordConsent returned nil")
	}
	if record.TenantID != tenantID {
		t.Errorf("tenant mismatch: %s != %s", record.TenantID, tenantID)
	}
	if record.Surface != surface {
		t.Errorf("surface mismatch: %s != %s", record.Surface, surface)
	}
	if record.Strategy != entityv1.IdentificationStrategy_IDENTIFICATION_STRATEGY_RCT_ELIGIBLE {
		t.Errorf("strategy mismatch: %s != RCT_ELIGIBLE", record.Strategy)
	}
	if record.RevokedAt != nil {
		t.Error("RevokedAt should be nil for new consent")
	}

	// Read consent - Check existence
	if !ledger.HasConsent(tenantID, surface) {
		t.Error("HasConsent should return true for granted consent")
	}

	// Get strategy
	strategy, ok := ledger.GetConsentStrategy(tenantID, surface)
	if !ok {
		t.Fatal("GetConsentStrategy should return true for existing consent")
	}
	if strategy != entityv1.IdentificationStrategy_IDENTIFICATION_STRATEGY_RCT_ELIGIBLE {
		t.Errorf("strategy mismatch: %s", strategy)
	}

	// Revoke consent
	if !ledger.RevokeConsent(tenantID, surface) {
		t.Error("RevokeConsent should return true")
	}

	// Should no longer have consent (all records for this surface are revoked)
	if ledger.HasConsent(tenantID, surface) {
		t.Error("HasConsent should return false after revoke")
	}

	// Non-existent consent
	if ledger.HasConsent("tenant-nonexistent", surface) {
		t.Error("HasConsent should return false for non-existent tenant")
	}
}

// TestConsentLedgerIdempotency tests that multiple records for same tenant+surface are tracked.
func TestConsentLedgerIdempotency(t *testing.T) {
	ledger := NewConsentLedger()

	tenantID := "tenant-idem"
	surface := entityv1.Surface_SURFACE_GEMINI

	// Record multiple consents
	ledger.RecordConsent(tenantID, surface, entityv1.IdentificationStrategy_IDENTIFICATION_STRATEGY_RCT_ELIGIBLE, "test")
	ledger.RecordConsent(tenantID, surface, entityv1.IdentificationStrategy_IDENTIFICATION_STRATEGY_QUASI_EXPERIMENTAL, "test")
	ledger.RecordConsent(tenantID, surface, entityv1.IdentificationStrategy_IDENTIFICATION_STRATEGY_OBSERVATIONAL, "test")

	// All should be tracked in history
	records := ledger.ListConsented(tenantID)
	if len(records) != 3 {
		t.Errorf("expected 3 records in history, got %d", len(records))
	}

	// Latest should be OBSERVATIONAL
	if len(records) > 0 && records[len(records)-1].Strategy != entityv1.IdentificationStrategy_IDENTIFICATION_STRATEGY_OBSERVATIONAL {
		t.Errorf("latest record strategy mismatch: %s", records[len(records)-1].Strategy)
	}
}

// TestConsentLedgerValidateProbe tests the ValidateProbe logic.
func TestConsentLedgerValidateProbe(t *testing.T) {
	ledger := NewConsentLedger()

	tests := []struct {
		name          string
		setup         func()
		tenantID      string
		surface       entityv1.Surface
		wantAllowed   bool
		wantStrategy  entityv1.IdentificationStrategy
		wantReason    string
	}{
		{
			name:     "no consent - denied",
			setup:    func() {},
			tenantID: "tenant-no-consent",
			surface:  entityv1.Surface_SURFACE_CHATGPT,
			wantAllowed: false,
			wantStrategy: entityv1.IdentificationStrategy_IDENTIFICATION_STRATEGY_UNSPECIFIED,
			wantReason: "no consent for surface SURFACE_CHATGPT",
		},
		{
			name: "granted RCT_ELIGIBLE - allowed",
			setup: func() {
				ledger.RecordConsent("tenant-rct", entityv1.Surface_SURFACE_PERPLEXITY, entityv1.IdentificationStrategy_IDENTIFICATION_STRATEGY_RCT_ELIGIBLE, "test")
			},
			tenantID:     "tenant-rct",
			surface:      entityv1.Surface_SURFACE_PERPLEXITY,
			wantAllowed:  true,
			wantStrategy: entityv1.IdentificationStrategy_IDENTIFICATION_STRATEGY_RCT_ELIGIBLE,
			wantReason:   "",
		},
		{
			name: "granted QUASI_EXPERIMENTAL - allowed",
			setup: func() {
				ledger.RecordConsent("tenant-quasi", entityv1.Surface_SURFACE_GEMINI, entityv1.IdentificationStrategy_IDENTIFICATION_STRATEGY_QUASI_EXPERIMENTAL, "test")
			},
			tenantID:     "tenant-quasi",
			surface:      entityv1.Surface_SURFACE_GEMINI,
			wantAllowed:  true,
			wantStrategy: entityv1.IdentificationStrategy_IDENTIFICATION_STRATEGY_QUASI_EXPERIMENTAL,
			wantReason:   "",
		},
		{
			name: "revoked - denied",
			setup: func() {
				ledger.RecordConsent("tenant-revoked", entityv1.Surface_SURFACE_CLAUDE, entityv1.IdentificationStrategy_IDENTIFICATION_STRATEGY_RCT_ELIGIBLE, "test")
				ledger.RevokeConsent("tenant-revoked", entityv1.Surface_SURFACE_CLAUDE)
			},
			tenantID:     "tenant-revoked",
			surface:      entityv1.Surface_SURFACE_CLAUDE,
			wantAllowed:  false,
			wantStrategy: entityv1.IdentificationStrategy_IDENTIFICATION_STRATEGY_UNSPECIFIED,
			wantReason:   "consent revoked for surface SURFACE_CLAUDE",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			tt.setup()
			allowed, strategy, reason := ledger.ValidateProbe(tt.tenantID, tt.surface)

			if allowed != tt.wantAllowed {
				t.Errorf("allowed = %v, want %v", allowed, tt.wantAllowed)
			}
			if strategy != tt.wantStrategy {
				t.Errorf("strategy = %v, want %v", strategy, tt.wantStrategy)
			}
			if reason != tt.wantReason {
				t.Errorf("reason = %q, want %q", reason, tt.wantReason)
			}
		})
	}
}

// TestConsentLedgerFixtureCohort tests the founder cohort seeding.
func TestConsentLedgerFixtureCohort(t *testing.T) {
	ledger := NewConsentLedger()

	if err := ledger.SeedFixtureCohort(); err != nil {
		t.Fatalf("SeedFixtureCohort failed: %v", err)
	}

	// Verify founder tenants have consent for all 5 surfaces
	founderTenants := []struct {
		tenantID     string
		jurisdiction string
	}{
		{"tenant-founder-1", "US-CA"},
		{"tenant-founder-2", "US-NY"},
		{"tenant-founder-3", "EU-DE"},
	}

	surfaces := []entityv1.Surface{
		entityv1.Surface_SURFACE_CHATGPT,
		entityv1.Surface_SURFACE_PERPLEXITY,
		entityv1.Surface_SURFACE_GEMINI,
		entityv1.Surface_SURFACE_GROK,
		entityv1.Surface_SURFACE_CLAUDE,
	}

	for _, ft := range founderTenants {
		for _, s := range surfaces {
			if !ledger.HasConsent(ft.tenantID, s) {
				t.Errorf("founder tenant %s missing consent for %s", ft.tenantID, s)
			}
			strategy, ok := ledger.GetConsentStrategy(ft.tenantID, s)
			if !ok {
				t.Errorf("founder tenant %s strategy lookup failed for %s", ft.tenantID, s)
			}
			if strategy != entityv1.IdentificationStrategy_IDENTIFICATION_STRATEGY_RCT_ELIGIBLE {
				t.Errorf("founder tenant %s wrong strategy for %s: %s", ft.tenantID, s, strategy)
			}
		}
	}
}

// TestConsentLedgerStatus tests GetStatus method.
func TestConsentLedgerStatus(t *testing.T) {
	ledger := NewConsentLedger()

	tenantID := "tenant-status"
	surface := entityv1.Surface_SURFACE_CHATGPT

	// Initially absent
	if ledger.GetStatus(tenantID, surface) != ConsentStatusAbsent {
		t.Error("initial status should be ABSENT")
	}

	// Grant
	ledger.RecordConsent(tenantID, surface, entityv1.IdentificationStrategy_IDENTIFICATION_STRATEGY_RCT_ELIGIBLE, "test")
	if ledger.GetStatus(tenantID, surface) != ConsentStatusGranted {
		t.Error("status should be GRANTED after RecordConsent")
	}

	// Revoke
	ledger.RevokeConsent(tenantID, surface)
	if ledger.GetStatus(tenantID, surface) != ConsentStatusRevoked {
		t.Error("status should be REVOKED after RevokeConsent")
	}
}

// TestConsentLedgerConcurrentAccess tests thread safety.
func TestConsentLedgerConcurrentAccess(t *testing.T) {
	ledger := NewConsentLedger()

	const numGoroutines = 20
	const opsPerGoroutine = 50

	var wg sync.WaitGroup
	errCh := make(chan error, numGoroutines)

	for i := 0; i < numGoroutines; i++ {
		wg.Add(1)
		go func(id int) {
			defer wg.Done()
			for j := 0; j < opsPerGoroutine; j++ {
				tenantID := "tenant-concurrent"
				surface := entityv1.Surface(entityv1.Surface_SURFACE_CHATGPT + entityv1.Surface(id%5))

				if j%3 == 0 {
					// Write
					ledger.RecordConsent(tenantID, surface, entityv1.IdentificationStrategy_IDENTIFICATION_STRATEGY_RCT_ELIGIBLE, "test")
				} else {
					// Read
					_ = ledger.HasConsent(tenantID, surface)
					_, _ = ledger.GetConsentStrategy(tenantID, surface)
					_, _, _ = ledger.ValidateProbe(tenantID, surface)
				}
			}
		}(i)
	}

	wg.Wait()
	close(errCh)

	for err := range errCh {
		if err != nil {
			t.Errorf("concurrent access error: %v", err)
		}
	}
}

// TestSeedTestConsents tests the test fixture seeding function.
func TestSeedTestConsents(t *testing.T) {
	ledger := NewConsentLedger()

	SeedTestConsents(ledger)

	// Verify fixture data from fixture.go
	// tenant-a: CHATGPT (RCT_ELIGIBLE), PERPLEXITY (RCT_ELIGIBLE)
	allowed, strategy, reason := ledger.ValidateProbe("tenant-a", entityv1.Surface_SURFACE_CHATGPT)
	if !allowed {
		t.Errorf("tenant-a/CHATGPT should be allowed: %s", reason)
	}
	if strategy != entityv1.IdentificationStrategy_IDENTIFICATION_STRATEGY_RCT_ELIGIBLE {
		t.Errorf("tenant-a/CHATGPT wrong strategy: %s", strategy)
	}

	allowed, strategy, reason = ledger.ValidateProbe("tenant-a", entityv1.Surface_SURFACE_PERPLEXITY)
	if !allowed {
		t.Errorf("tenant-a/PERPLEXITY should be allowed: %s", reason)
	}
	if strategy != entityv1.IdentificationStrategy_IDENTIFICATION_STRATEGY_RCT_ELIGIBLE {
		t.Errorf("tenant-a/PERPLEXITY wrong strategy: %s", strategy)
	}

	// tenant-b: GEMINI (RCT_ELIGIBLE)
	allowed, strategy, reason = ledger.ValidateProbe("tenant-b", entityv1.Surface_SURFACE_GEMINI)
	if !allowed {
		t.Errorf("tenant-b/GEMINI should be allowed: %s", reason)
	}
	if strategy != entityv1.IdentificationStrategy_IDENTIFICATION_STRATEGY_RCT_ELIGIBLE {
		t.Errorf("tenant-b/GEMINI wrong strategy: %s", strategy)
	}

	// tenant-c: CLAUDE (OBSERVATIONAL)
	allowed, strategy, reason = ledger.ValidateProbe("tenant-c", entityv1.Surface_SURFACE_CLAUDE)
	if !allowed {
		t.Errorf("tenant-c/CLAUDE should be allowed: %s", reason)
	}
	if strategy != entityv1.IdentificationStrategy_IDENTIFICATION_STRATEGY_OBSERVATIONAL {
		t.Errorf("tenant-c/CLAUDE wrong strategy: %s", strategy)
	}

	// Non-existent tenant/surface should be absent
	allowed, _, reason = ledger.ValidateProbe("tenant-nonexistent", entityv1.Surface_SURFACE_CHATGPT)
	if allowed {
		t.Error("tenant-nonexistent/CHATGPT should be denied")
	}
	if reason == "" {
		t.Error("should have a rejection reason")
	}
}