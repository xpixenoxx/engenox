// manifest/generator.go — signed intervention manifest generator (M3).
//
// Every merged PR writes a signed manifest to R2 Object-Lock (thickening).
// The manifest carries: patch, inverse patch (rollback-hash), policy decision chain,
// Critic verdict, conformal CI. Signature: per-tenant ed25519 key (libs/crypto).
//
// Cites: 15 §5d, 06 §2.4, 12 §7, 00 §2 inv 8, ADR-0007 #4, #11.

package manifest

import (
	"context"
	"crypto/ed25519"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"time"

	"github.com/engenox/contracts/generated/go/engenox/entity/v1"
	"github.com/engenox/contracts/generated/go/engenox/policy/v1"
)

type Config struct {
	VaultAddr  string
	VaultToken string
}

type Generator struct {
	signingKey ed25519.PrivateKey
}

func NewGenerator(signingKey ed25519.PrivateKey) *Generator {
	return &Generator{signingKey: signingKey}
}

type Manifest struct {
	InterventionID  string                    `json:"intervention_id"`
	TenantID        string                    `json:"tenant_id"`
	ConflictID      string                    `json:"conflict_id"`
	InterventionType entityv1.InterventionType `json:"intervention_type"`
	TargetEntityID  string                    `json:"target_entity_id"`
	TargetSurface   entityv1.Surface          `json:"target_surface"`
	TargetQuery     string                    `json:"target_query"`
	Patch           string                    `json:"patch"`            // unified diff
	RollbackPatch   string                    `json:"rollback_patch"`   // inverse diff (rollback-hash)
	DialLevel       policyv1.DialLevel        `json:"dial_level"`
	BlastRadiusBand policyv1.BlastRadiusBand  `json:"blast_radius_band"`
	AllowListGlob   string                    `json:"allow_list_glob"`
	CriticVerdict   string                    `json:"critic_verdict"`
	PredictedUplift entityv1.LiftDistribution `json:"predicted_uplift"`
	CedarAudit      []string                  `json:"cedar_audit"`
	CreatedAt       time.Time                 `json:"created_at"`
	Signature       string                    `json:"signature"`        // hex-encoded ed25519 signature
}

func (g *Generator) Generate(
	ctx context.Context,
	intervention *entityv1.Intervention,
	patch string,
	criticVerdict string,
	cedarAudit []string,
	allowListGlob string,
	dialLevel policyv1.DialLevel,
	blastRadius policyv1.BlastRadiusBand,
) (*Manifest, error) {
	// Compute rollback patch (inverse diff)
	rollbackPatch := invertPatch(patch)

	m := &Manifest{
		InterventionID:  intervention.Id,
		TenantID:        intervention.TenantId,
		ConflictID:      intervention.TargetsConflictId,
		InterventionType: intervention.InterventionType,
		TargetEntityID:  intervention.TargetEntityId,
		TargetSurface:   intervention.TargetSurface,
		TargetQuery:     intervention.TargetQuery,
		Patch:           patch,
		RollbackPatch:   rollbackPatch,
		DialLevel:       dialLevel,
		BlastRadiusBand: blastRadius,
		AllowListGlob:   allowListGlob,
		CriticVerdict:   criticVerdict,
		PredictedUplift: *intervention.PredictedUplift,
		CedarAudit:      cedarAudit,
		CreatedAt:       time.Now().UTC(),
	}

	// Sign the canonical manifest
	canonical := m.Canonicalize()
	sig := ed25519.Sign(g.signingKey, canonical)
	m.Signature = hex.EncodeToString(sig)

	return m, nil
}

// Canonicalize produces deterministic JSON for signing.
func (m *Manifest) Canonicalize() []byte {
	// Sort keys for determinism
	type sortedManifest struct {
		InterventionID  string                    `json:"intervention_id"`
		TenantID        string                    `json:"tenant_id"`
		ConflictID      string                    `json:"conflict_id"`
		InterventionType entityv1.InterventionType `json:"intervention_type"`
		TargetEntityID  string                    `json:"target_entity_id"`
		TargetSurface   entityv1.Surface          `json:"target_surface"`
		TargetQuery     string                    `json:"target_query"`
		Patch           string                    `json:"patch"`
		RollbackPatch   string                    `json:"rollback_patch"`
		DialLevel       policyv1.DialLevel        `json:"dial_level"`
		BlastRadiusBand policyv1.BlastRadiusBand  `json:"blast_radius_band"`
		AllowListGlob   string                    `json:"allow_list_glob"`
		CriticVerdict   string                    `json:"critic_verdict"`
		PredictedUplift entityv1.LiftDistribution `json:"predicted_uplift"`
		CedarAudit      []string                  `json:"cedar_audit"`
		CreatedAt       time.Time                 `json:"created_at"`
	}

	sm := sortedManifest{
		InterventionID:  m.InterventionID,
		TenantID:        m.TenantID,
		ConflictID:      m.ConflictID,
		InterventionType: m.InterventionType,
		TargetEntityID:  m.TargetEntityID,
		TargetSurface:   m.TargetSurface,
		TargetQuery:     m.TargetQuery,
		Patch:           m.Patch,
		RollbackPatch:   m.RollbackPatch,
		DialLevel:       m.DialLevel,
		BlastRadiusBand: m.BlastRadiusBand,
		AllowListGlob:   m.AllowListGlob,
		CriticVerdict:   m.CriticVerdict,
		PredictedUplift: m.PredictedUplift,
		CedarAudit:      m.CedarAudit,
		CreatedAt:       m.CreatedAt,
	}

	data, _ := json.Marshal(sm)
	return data
}

func (m *Manifest) Verify(publicKey ed25519.PublicKey) bool {
	canonical := m.Canonicalize()
	sig, err := hex.DecodeString(m.Signature)
	if err != nil {
		return false
	}
	return ed25519.Verify(publicKey, canonical, sig)
}

func (m *Manifest) RollbackHash() string {
	hash := sha256.Sum256([]byte(m.RollbackPatch))
	return hex.EncodeToString(hash[:])
}

// invertPatch creates the inverse of a unified diff for rollback.
func invertPatch(patch string) string {
	// For M3-thin: simple line-by-line inversion
	// Thickening: use a proper diff library (go-diff)
	lines := splitLines(patch)
	var inverted []string
	for _, line := range lines {
		if len(line) == 0 {
			inverted = append(inverted, "")
			continue
		}
		switch line[0] {
		case '+':
			inverted = append(inverted, "-"+line[1:])
		case '-':
			inverted = append(inverted, "+"+line[1:])
		default:
			inverted = append(inverted, line)
		}
	}
	return joinLines(inverted)
}

func splitLines(s string) []string {
	// Simple split preserving trailing empty lines
	var lines []string
	start := 0
	for i := 0; i < len(s); i++ {
		if s[i] == '\n' {
			lines = append(lines, s[start:i])
			start = i + 1
		}
	}
	if start < len(s) {
		lines = append(lines, s[start:])
	}
	return lines
}

func joinLines(lines []string) string {
	if len(lines) == 0 {
		return ""
	}
	result := lines[0]
	for i := 1; i < len(lines); i++ {
		result += "\n" + lines[i]
	}
	return result
}