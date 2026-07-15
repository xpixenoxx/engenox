// server/server.go — ActionService gRPC implementation (M3).
//
// The Action layer is the ONLY external-side-effect boundary (CLAUDE.md §5).
// It owns: GitHub App credential (Vault), allow-list-glob, diff-review blocker,
// Cedar two-pass gate, signed manifest, pre-staged rollback-hash, idempotency.
// No LLM touches this service; the Cedar gate is the symbolic commitment.
//
// Cites: 25 §3 M3, 15 §5, 12 §3-5, 09 §6, ADR-0007 #4.

package server

import (
	"context"
	"crypto/ed25519"
	"fmt"
	"log"
	"strings"
	"time"

	entityv1 "github.com/engenox/contracts/generated/go/engenox/entity/v1"
	policyv1 "github.com/engenox/contracts/generated/go/engenox/policy/v1"
	servicev1 "github.com/engenox/contracts/generated/go/engenox/service/v1"
	servicev1connect "github.com/engenox/contracts/generated/go/engenox/service/v1/servicev1connect"
	"github.com/google/go-github/v62/github"
	"github.com/google/uuid"
	"google.golang.org/grpc"
	"google.golang.org/protobuf/types/known/timestamppb"

	"github.com/engenox/services/action/internal/allowlist"
	"github.com/engenox/services/action/internal/cedargate"
	"github.com/engenox/services/action/internal/diffreview"
	"github.com/engenox/services/action/internal/idempotency"
	"github.com/engenox/services/action/internal/ledger"
	"github.com/engenox/services/action/internal/manifest"
	"connectrpc.com/connect"
)

// ActionServiceDeps holds the dependencies for the ActionService.
type ActionServiceDeps struct {
	GitHubClient   *github.Client
	SigningKey     ed25519.PrivateKey
	Idempotency    idempotency.Store
	PolicyStore    *cedargate.PolicyStore
	AllowListEval  *allowlist.Evaluator
	DiffReviewer   *diffreview.Reviewer
	CedarGate      *cedargate.Gate
	ManifestGen    *manifest.Generator
	DialLedger     ledger.LedgerStore
	DialGateEval   *ledger.DialGateEvaluator
}

// ActionService implements the engenox.service.servicev1.ActionService.
type ActionService struct {
	deps ActionServiceDeps

	// In-memory proposal store (M3-thin: thickening -> Postgres + Temporal)
	proposals map[string]*ProposalRecord
}

type ProposalRecord struct {
	ProposalID   string
	TenantID     string
	ConflictID   string
	PRURL        string
	State        servicev1.ProposalState
	DialDecision servicev1.DialDecision
	CedarAudit   []string
	DiffReview   *servicev1.DiffReviewResult
	CreatedAt    time.Time
	UpdatedAt    time.Time
}

func NewActionService(deps ActionServiceDeps) *ActionService {
	return &ActionService{
		deps:      deps,
		proposals: make(map[string]*ProposalRecord),
	}
}

// Ensure ActionService implements the Connect handler interface.
var _ servicev1connect.ActionServiceHandler = (*ActionService)(nil)

// ProposeIntervention proposes an intervention as a GitHub PR.
// Runs: idempotency check -> allow-list -> diff-review -> Cedar gate -> GitHub PR create -> manifest sign.
func (s *ActionService) ProposeIntervention(
	ctx context.Context,
	req *connect.Request[servicev1.ProposeInterventionRequest],
) (*connect.Response[servicev1.ProposeInterventionResponse], error) {
	msg := req.Msg

	// 1. Validate required fields
	if msg.TenantId == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("tenant_id required"))
	}
	if msg.IdempotencyKey == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("idempotency_key required (CLAUDE.md §8)"))
	}
	if msg.GithubRepo == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("github_repo required"))
	}
	if msg.BaseBranch == "" {
		msg.BaseBranch = "main"
	}

	// 2. Idempotency check
	idemKey := idempotency.IdempotencyKey(msg.TenantId, "cycle", msg.IdempotencyKey, "propose")
	exists, err := s.deps.Idempotency.CheckAndSet(ctx, idemKey, 24*time.Hour)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("idempotency check failed: %w", err))
	}
	if exists {
		// Return existing proposal if found
		if existing, ok := s.proposals[msg.IdempotencyKey]; ok {
			return existingResponse(existing), nil
		}
		return nil, connect.NewError(connect.CodeAlreadyExists, fmt.Errorf("proposal with idempotency key %s already exists", msg.IdempotencyKey))
	}

	// 3. Extract diff paths from intervention params (thin: generate from params)
	patch, diffPaths := s.generatePatchAndPaths(msg.Params)

	// 4. Allow-list evaluation (tenant-scoped, deny-list is platform non-overridable)
	allowConfig := allowlist.TenantConfig{
		TenantID:   msg.TenantId,
		AllowGlobs: []string{"**/*"}, // Thin: default allow all; thickening: from tenant config
	}
	allowResult := s.deps.AllowListEval.Evaluate(allowConfig, diffPaths)
	if !allowResult.Allowed {
		return &connect.Response[servicev1.ProposeInterventionResponse]{
			Msg: &servicev1.ProposeInterventionResponse{
				ProposalId:    "",
				PrUrl:         "",
				DialDecision:  servicev1.DialDecision_DIAL_DECISION_ESCALATION_REFUSED,
				CedarAudit:    []string{fmt.Sprintf("allowlist_deny: %s", allowResult.DenyMatched)},
				DiffReview:    &servicev1.DiffReviewResult{Blocked: true, Reasons: []string{"Allow-list denied: " + allowResult.DenyMatched}},
			},
		}, nil
	}

	// 5. Diff-review (rule-based, no LLM) - runs BEFORE Cedar
	diffResult := s.deps.DiffReviewer.Review(patch, msg.Params.GetSchemaJsonLd()) // thin: target_surface from params

	// 6. Dial gate evaluation (three-axis + Cedar two-pass + demote-on-alert)
	dialReq := ledger.DialRequest{
		TenantID:    msg.TenantId,
		Action:      ledger.DialActionPropose,
		AxisCount:   0, // M3-thin: no axes cleared for propose
		BlastRadius: "single_page",
		DialLevel:   "propose",
	}
	dialDecision, dialReasons, _, err := s.deps.DialGateEval.Evaluate(ctx, dialReq)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("dial gate evaluation failed: %w", err))
	}

	cedarAudit := dialReasons

	// 7. Determine dial decision proto
	dialDecisionProto := servicev1.DialDecision_DIAL_DECISION_PROPOSE
	if dialDecision != ledger.DialDecisionAllow {
		dialDecisionProto = servicev1.DialDecision_DIAL_DECISION_ESCALATION_REFUSED
	}

	// If diff-review blocked or dial gate denied, return without creating PR
	if diffResult.Blocked || dialDecision != ledger.DialDecisionAllow {
		reasons := diffResult.Reasons
		if dialDecision != ledger.DialDecisionAllow {
			reasons = append(reasons, "Dial gate denied: policy violation")
		}
		return &connect.Response[servicev1.ProposeInterventionResponse]{
			Msg: &servicev1.ProposeInterventionResponse{
				ProposalId:    "",
				PrUrl:         "",
				DialDecision:  dialDecisionProto,
				CedarAudit:    cedarAudit,
				DiffReview:    toProtoDiffReview(diffResult),
			},
		}, nil
	}

	// 8. Create GitHub PR
	prURL, err := s.createGitHubPR(ctx, msg, patch, cedarAudit, dialDecisionProto)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("create PR failed: %w", err))
	}

	// 9. Generate signed manifest
	intervention := &entityv1.Intervention{
		Id:                     uuid.New().String(),
		TenantId:               msg.TenantId,
		InterventionType:       s.interventionTypeFromParams(msg.Params),
		TargetEntityId:         extractEntityID(msg.Params),
		TargetSurface:          entityv1.Surface_SURFACE_UNSPECIFIED, // thin
		TargetQuery:            "",                                    // thin
		Params:                 msg.Params,
		PredictedUplift:        &entityv1.LiftDistribution{PointEstimate: 0.0, CiLow: 0.0, CiHigh: 0.0}, // thin
		TargetsConflictId:      msg.ConflictId,
		BlastRadius:            policyv1.BlastRadiusBand_BLAST_RADIUS_BAND_SINGLE_PAGE,
	}
	_, err = s.deps.ManifestGen.Generate(ctx, intervention, patch, "propose", cedarAudit, allowResult.MatchedGlob, policyv1.DialLevel_DIAL_LEVEL_PROPOSE, policyv1.BlastRadiusBand_BLAST_RADIUS_BAND_SINGLE_PAGE)
	if err != nil {
		log.Printf("WARN: manifest generation failed: %v", err)
	}

	// 10. Record proposal
	proposalID := uuid.New().String()
	record := &ProposalRecord{
		ProposalID:   proposalID,
		TenantID:     msg.TenantId,
		ConflictID:   msg.ConflictId,
		PRURL:        prURL,
		State:        servicev1.ProposalState_PROPOSAL_STATE_OPEN,
		DialDecision: dialDecisionProto,
		CedarAudit:   cedarAudit,
		DiffReview:   toProtoDiffReview(diffResult),
		CreatedAt:    time.Now().UTC(),
		UpdatedAt:    time.Now().UTC(),
	}
	s.proposals[proposalID] = record
	s.proposals[msg.IdempotencyKey] = record // Also index by idempotency key

	return &connect.Response[servicev1.ProposeInterventionResponse]{
		Msg: &servicev1.ProposeInterventionResponse{
			ProposalId:    proposalID,
			PrUrl:         prURL,
			DialDecision:  dialDecisionProto,
			CedarAudit:    cedarAudit,
			DiffReview:    toProtoDiffReview(diffResult),
		},
	}, nil
}

// GetProposalStatus returns the status of a proposed intervention.
func (s *ActionService) GetProposalStatus(
	ctx context.Context,
	req *connect.Request[servicev1.GetProposalStatusRequest],
) (*connect.Response[servicev1.GetProposalStatusResponse], error) {
	record, ok := s.proposals[req.Msg.ProposalId]
	if !ok {
		return nil, connect.NewError(connect.CodeNotFound, fmt.Errorf("proposal %s not found", req.Msg.ProposalId))
	}

	return &connect.Response[servicev1.GetProposalStatusResponse]{
		Msg: &servicev1.GetProposalStatusResponse{
			State:        record.State,
			PrUrl:        record.PRURL,
			DialDecision: record.DialDecision,
			CedarAudit:   record.CedarAudit,
			DiffReview:   record.DiffReview,
			CreatedAt:    timestamppb.New(record.CreatedAt),
			UpdatedAt:    timestamppb.New(record.UpdatedAt),
		},
	}, nil
}

// ListProposals lists proposals for a tenant.
func (s *ActionService) ListProposals(
	ctx context.Context,
	req *connect.Request[servicev1.ListProposalsRequest],
) (*connect.Response[servicev1.ListProposalsResponse], error) {
	var results []*servicev1.ProposalSummary
	pageSize := int(req.Msg.PageSize)
	if pageSize <= 0 {
		pageSize = 20
	}

	count := 0
	for _, r := range s.proposals {
		if r.TenantID == req.Msg.TenantId {
			if count >= pageSize {
				break
			}
			results = append(results, &servicev1.ProposalSummary{
				ProposalId:   r.ProposalID,
				ConflictId:   r.ConflictID,
				PrUrl:        r.PRURL,
				State:        r.State,
				DialDecision: r.DialDecision,
				CreatedAt:    timestamppb.New(r.CreatedAt),
			})
			count++
		}
	}

	return &connect.Response[servicev1.ListProposalsResponse]{
		Msg: &servicev1.ListProposalsResponse{
			Proposals:       results,
			NextPageToken:   "", // thin: no pagination
		},
	}, nil
}

// generatePatchAndPaths creates a unified diff from intervention params.
func (s *ActionService) generatePatchAndPaths(params *entityv1.InterventionParams) (string, []string) {
	var paths []string
	var diff strings.Builder

	switch p := params.Params.(type) {
	case *entityv1.InterventionParams_SchemaJsonLd:
		paths = []string{"schema.jsonld"}
		diff.WriteString("diff --git a/schema.jsonld b/schema.jsonld\n")
		diff.WriteString("--- /dev/null\n")
		diff.WriteString("+++ b/schema.jsonld\n")
		diff.WriteString("@@ -0,0 +1 @@\n")
		diff.WriteString("+" + p.SchemaJsonLd + "\n")
	case *entityv1.InterventionParams_ContentBrief:
		paths = []string{"content-brief.md"}
		diff.WriteString("diff --git a/content-brief.md b/content-brief.md\n")
		diff.WriteString("--- /dev/null\n")
		diff.WriteString("+++ b/content-brief.md\n")
		diff.WriteString("@@ -0,0 +1 @@\n")
		diff.WriteString("+" + p.ContentBrief + "\n")
	case *entityv1.InterventionParams_BrandCardField:
		paths = []string{fmt.Sprintf("brand-card/%s.json", p.BrandCardField.EntityId)}
		diff.WriteString(fmt.Sprintf("diff --git a/brand-card/%s.json b/brand-card/%s.json\n", p.BrandCardField.EntityId, p.BrandCardField.EntityId))
		diff.WriteString(fmt.Sprintf("--- a/brand-card/%s.json\n", p.BrandCardField.EntityId))
		diff.WriteString(fmt.Sprintf("+++ b/brand-card/%s.json\n", p.BrandCardField.EntityId))
		diff.WriteString(fmt.Sprintf("@@ -1 +1 @@\n-%s\n+%s\n", p.BrandCardField.OldValue, p.BrandCardField.NewValue))
	}

	return diff.String(), paths
}

// createGitHubPR creates a PR using the GitHub App client.
func (s *ActionService) createGitHubPR(
	ctx context.Context,
	req *servicev1.ProposeInterventionRequest,
	patch string,
	cedarAudit []string,
	dialDecision servicev1.DialDecision,
) (string, error) {
	// Get intervention type name for PR title
	interventionTypeName := s.interventionTypeNameFromParams(req.Params)
	Title := fmt.Sprintf("[Engenox] Intervention: %s", interventionTypeName)
	Body := s.buildPRBody(req, patch, cedarAudit, dialDecision)

	// Use GitHub App client to create PR
	ghClient := s.deps.GitHubClient

	// Parse owner/repo from github_repo (format: "owner/repo")
	owner, repo, err := parseRepo(req.GithubRepo)
	if err != nil {
		return "", fmt.Errorf("parse repo: %w", err)
	}

	// Create branch
	branchName := fmt.Sprintf("engenox-intervention-%s", uuid.New().String()[:8])

	// Get base branch ref
	baseRef, _, err := ghClient.Git.GetRef(ctx, owner, repo, fmt.Sprintf("refs/heads/%s", req.BaseBranch))
	if err != nil {
		// Try main
		baseRef, _, err = ghClient.Git.GetRef(ctx, owner, repo, "refs/heads/main")
		if err != nil {
			return "", fmt.Errorf("get base ref: %w", err)
		}
	}

	// Create new branch
	newRef := &github.Reference{
		Ref: github.String(fmt.Sprintf("refs/heads/%s", branchName)),
		Object: &github.GitObject{
			SHA: baseRef.Object.SHA,
		},
	}
	_, _, err = ghClient.Git.CreateRef(ctx, owner, repo, newRef)
	if err != nil {
		return "", fmt.Errorf("create branch: %w", err)
	}

	// For M3-thin: we just create the PR with the patch in the body
	// Thickening: apply patch to files in the new branch
	pr := &github.NewPullRequest{
		Title: github.String(Title),
		Head:  github.String(branchName),
		Base:  github.String(req.BaseBranch),
		Body:  github.String(Body),
	}

	createdPR, _, err := ghClient.PullRequests.Create(ctx, owner, repo, pr)
	if err != nil {
		return "", fmt.Errorf("create PR: %w", err)
	}

	return createdPR.GetHTMLURL(), nil
}

// parseRepo splits "owner/repo" into owner and repo.
func parseRepo(fullRepo string) (string, string, error) {
	parts := strings.Split(fullRepo, "/")
	if len(parts) != 2 {
		return "", "", fmt.Errorf("invalid repo format: %s (expected owner/repo)", fullRepo)
	}
	return parts[0], parts[1], nil
}

func (s *ActionService) buildPRBody(req *servicev1.ProposeInterventionRequest, patch string, cedarAudit []string, dialDecision servicev1.DialDecision) string {
	var b strings.Builder
	b.WriteString("## Engenox Intervention Proposal\n\n")
	b.WriteString(fmt.Sprintf("**Tenant:** %s\n", req.TenantId))
	b.WriteString(fmt.Sprintf("**Conflict ID:** %s\n", req.ConflictId))
	b.WriteString(fmt.Sprintf("**Dial Decision:** %s\n\n", dialDecision.String()))

	b.WriteString("### Proposed Changes\n\n")
	b.WriteString("```diff\n")
	b.WriteString(patch)
	b.WriteString("\n```\n\n")

	b.WriteString("### Cedar Audit Trail\n\n")
	for _, audit := range cedarAudit {
		b.WriteString(fmt.Sprintf("- %s\n", audit))
	}

	b.WriteString("\n---\n*This PR was proposed by the Engenox Action layer. The dial is at `propose` — you merge this PR when ready.*")
	return b.String()
}

func (s *ActionService) interventionTypeFromParams(params *entityv1.InterventionParams) entityv1.InterventionType {
	switch params.Params.(type) {
	case *entityv1.InterventionParams_SchemaJsonLd:
		return entityv1.InterventionType_INTERVENTION_TYPE_ADD_SCHEMA_ELEMENT
	case *entityv1.InterventionParams_ContentBrief:
		return entityv1.InterventionType_INTERVENTION_TYPE_ADD_CONTENT_BRIEF
	case *entityv1.InterventionParams_BrandCardField:
		return entityv1.InterventionType_INTERVENTION_TYPE_FIX_BRAND_CARD_FIELD
	}
	return entityv1.InterventionType_INTERVENTION_TYPE_UNSPECIFIED
}

func (s *ActionService) interventionTypeNameFromParams(params *entityv1.InterventionParams) string {
	switch params.Params.(type) {
	case *entityv1.InterventionParams_SchemaJsonLd:
		return "schema_json_ld"
	case *entityv1.InterventionParams_ContentBrief:
		return "content_brief"
	case *entityv1.InterventionParams_BrandCardField:
		return "brand_card_field"
	}
	return "unknown"
}

func extractEntityID(params *entityv1.InterventionParams) string {
	if p, ok := params.Params.(*entityv1.InterventionParams_BrandCardField); ok {
		return p.BrandCardField.EntityId
	}
	return ""
}

func toProtoDiffReview(r diffreview.ReviewResult) *servicev1.DiffReviewResult {
	return &servicev1.DiffReviewResult{
		Blocked:       r.Blocked,
		Reasons:       r.Reasons,
		MatchedGlob:   r.MatchedGlob,
	}
}

func existingResponse(r *ProposalRecord) *connect.Response[servicev1.ProposeInterventionResponse] {
	return &connect.Response[servicev1.ProposeInterventionResponse]{
		Msg: &servicev1.ProposeInterventionResponse{
			ProposalId:    r.ProposalID,
			PrUrl:         r.PRURL,
			DialDecision:  r.DialDecision,
			CedarAudit:    r.CedarAudit,
			DiffReview:    r.DiffReview,
		},
	}
}

// UnaryLoggingInterceptor logs gRPC requests.
func UnaryLoggingInterceptor(ctx context.Context, req interface{}, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (interface{}, error) {
	start := time.Now()
	resp, err := handler(ctx, req)
	log.Printf("[action] %s duration=%v err=%v", info.FullMethod, time.Since(start), err)
	return resp, err
}