// internal/consent/fixture.go — Consent fixtures (M5-thin).
package consent

import (
	entityv1 "github.com/engenox/contracts/generated/go/engenox/entity/v1"
)

// FixtureCohort returns the founder-network panel cohort.
func FixtureCohort() []struct {
	TenantID     string
	Surface      entityv1.Surface
	Strategy     entityv1.IdentificationStrategy
	Jurisdiction string
} {
	tenants := []string{"tenant-founder-1", "tenant-founder-2", "tenant-founder-3"}
	surfaces := []entityv1.Surface{
		entityv1.Surface_SURFACE_CHATGPT,
		entityv1.Surface_SURFACE_PERPLEXITY,
		entityv1.Surface_SURFACE_GEMINI,
		entityv1.Surface_SURFACE_GROK,
		entityv1.Surface_SURFACE_CLAUDE,
	}

	var cohort []struct {
		TenantID     string
		Surface      entityv1.Surface
		Strategy     entityv1.IdentificationStrategy
		Jurisdiction string
	}

	for i, tenant := range tenants {
		jurisdictions := []string{"US-CA", "US-NY", "EU-DE"}
		for _, surface := range surfaces {
			cohort = append(cohort, struct {
				TenantID     string
				Surface      entityv1.Surface
				Strategy     entityv1.IdentificationStrategy
				Jurisdiction string
			}{
				TenantID:     tenant,
				Surface:      surface,
				Strategy:     entityv1.IdentificationStrategy_IDENTIFICATION_STRATEGY_RCT_ELIGIBLE,
				Jurisdiction: jurisdictions[i%len(jurisdictions)],
			})
		}
	}
	return cohort
}

// SeedTestConsents adds test consent records.
func SeedTestConsents(cl *ConsentLedger) {
	cl.RecordConsent("tenant-a", entityv1.Surface_SURFACE_CHATGPT, entityv1.IdentificationStrategy_IDENTIFICATION_STRATEGY_RCT_ELIGIBLE, "US")
	cl.RecordConsent("tenant-a", entityv1.Surface_SURFACE_PERPLEXITY, entityv1.IdentificationStrategy_IDENTIFICATION_STRATEGY_RCT_ELIGIBLE, "US")
	cl.RecordConsent("tenant-b", entityv1.Surface_SURFACE_GEMINI, entityv1.IdentificationStrategy_IDENTIFICATION_STRATEGY_RCT_ELIGIBLE, "EU")
	cl.RecordConsent("tenant-c", entityv1.Surface_SURFACE_CLAUDE, entityv1.IdentificationStrategy_IDENTIFICATION_STRATEGY_OBSERVATIONAL, "US")
}