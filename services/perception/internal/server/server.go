// internal/server/server.go — PerceptionService implementation (T14 exemplar).
//
// Implements the gRPC contract for probing surfaces and writing assertions.
// M3-thin: ProbeSurface calls gateway.Extract for each probe answer, writes
// Assertion nodes via libs/kg AssertionStore port. Assert provides
// direct KG writes for the control-plane's KG hydration path.
// M3-thin: REAL ConnectRPC call to gateway.Extract seam (replaces synthetic stub).
//
// Cites: 11 §3 (Extract seam), 13 §2/§3 (KG store port), ADR-0007 (thin column).

package server

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"connectrpc.com/connect"
	entityv1 "github.com/engenox/contracts/generated/go/engenox/entity/v1"
	eventv1 "github.com/engenox/contracts/generated/go/engenox/event/v1"
	servicev1 "github.com/engenox/contracts/generated/go/engenox/service/v1"
	servicev1connect "github.com/engenox/contracts/generated/go/engenox/service/v1/servicev1connect"
	"github.com/engenox/kg"
	"google.golang.org/protobuf/types/known/timestamppb"
)

type perceptionServer struct {
	servicev1.UnimplementedPerceptionServiceServer

	kg           kg.AssertionStore
	gatewayAddr  string
	gatewayClient servicev1connect.GatewayServiceClient
}

func New() *perceptionServer {
	// M3-thin: in-memory KG + REAL ConnectRPC gateway client
	// M4-thicken: CNPG+AGE store + real gateway client
	httpClient := &http.Client{
		Timeout: 30 * time.Second,
	}
	gatewayAddr := getEnv("GATEWAY_ADDR", "http://localhost:8080")
	gatewayClient := servicev1connect.NewGatewayServiceClient(httpClient, gatewayAddr)
	return &perceptionServer{
		kg:            kg.NewInMemoryAssertionStore(),
		gatewayAddr:   gatewayAddr,
		gatewayClient: gatewayClient,
	}
}

// ProbeSurface runs the perception pipeline for one surface:
// 1. Render the query and call the AI surface (stubbed in M3-thin)
// 2. Call gateway.Extract seam to get typed assertions from the answer
// 3. Write Assertion nodes to the KG via AssertionStore
func (s *perceptionServer) ProbeSurface(ctx context.Context, req *servicev1.ProbeSurfaceRequest) (*servicev1.ProbeSurfaceResponse, error) {
	log.Printf("ProbeSurface: tenant=%s surface=%s idem=%s", req.TenantId, req.Surface, req.IdempotencyKey)

	// M3-thin: single surface per request (req.Surface is enum, not repeated)
	// M4-thicken: repeat per target in req.Targets (see perception.proto design)

	// Generate a synthetic AnswerEvent for the probe (M3-thin stub)
	answerEvent := s.syntheticAnswerEvent(req.TenantId, req.Surface, req.IdempotencyKey)

	// Call gateway.Extract seam to get assertions from the answer
	// M3-thin: inline stub extraction. M4-thicken: real ConnectRPC call to gateway.
	assertions := s.extractViaGateway(ctx, req.TenantId, answerEvent, req.IdempotencyKey)

	// Write assertions to KG via Assert
	// Also convert to SurfaceAssertion internally if needed for surface-specific stats
	for _, a := range assertions {
		// Convert eventv1.Assertion to entityv1.AssertedNode for KG write
		assertedNode := s.assertionToAssertedNode(req.TenantId, a, req.IdempotencyKey)
		if err := s.kg.Append(ctx, assertedNode); err != nil {
			log.Printf("KG append failed: %v", err)
			// M3-thin: continue; M4-thicken: proper error handling
		}
	}

	return &servicev1.ProbeSurfaceResponse{
		Assertions:      assertions,
		GscResponseId:   fmt.Sprintf("%s-%s-%s", req.TenantId, req.Surface.String(), req.IdempotencyKey),
		ProbedAt:        timestamppb.Now(),
	}, nil
}

// Assert writes a typed AssertedNode directly into the truth spine.
// Idempotent on (tenant_id, idempotency_key) - the caller (control-plane)
// uses this for KG hydration from authoritative sources.
func (s *perceptionServer) Assert(ctx context.Context, req *servicev1.AssertRequest) (*servicev1.AssertResponse, error) {
	log.Printf("Assert: tenant=%s idem=%s", req.Node.TenantId, req.IdempotencyKey)

	// The store enforces the candor gate (valid_time, tx_time, provenance mandatory)
	if err := s.kg.Append(ctx, req.Node); err != nil {
		return nil, fmt.Errorf("kg append: %w", err)
	}

	// Return the event_id for the committed AssertionEvent (14 §3)
	// M3-thin: synthetic. M4-thicken: actual event bus correlation ID.
	eventId := fmt.Sprintf("evt-%s-%d", req.IdempotencyKey, time.Now().UnixNano())
	return &servicev1.AssertResponse{EventId: eventId}, nil
}

// FastPartialProbe returns early signal (<90s) for onboarding activation.
func (s *perceptionServer) FastPartialProbe(ctx context.Context, req *servicev1.FastPartialProbeRequest) (*servicev1.FastPartialProbeResponse, error) {
	// M3-thin: stub. M4-thicken: real fast-partial probe.
	return &servicev1.FastPartialProbeResponse{
		HasPresence:      false,
		EstimatedPosition: 0,
		Confidence:       0,
	}, nil
}

// GetProbeHistory returns probe history for a surface.
func (s *perceptionServer) GetProbeHistory(ctx context.Context, req *servicev1.GetProbeHistoryRequest) (*servicev1.GetProbeHistoryResponse, error) {
	// M3-thin: stub. M4-thicken: query probe history table.
	return &servicev1.GetProbeHistoryResponse{}, nil
}

// syntheticAnswerEvent creates a stub AnswerEvent for M3-thin testing.
// In M4, this comes from the actual probe fleet (Go workers calling surfaces via gateway).
func (s *perceptionServer) syntheticAnswerEvent(tenantId string, surface entityv1.Surface, idemKey string) *entityv1.AnswerEvent {
	return &entityv1.AnswerEvent{
		Id:            fmt.Sprintf("%s-%s-answer-%s", tenantId, surface.String(), idemKey),
		TenantId:      tenantId,
		ProbeId:       fmt.Sprintf("%s-probe-%s", tenantId, surface.String()),
		Surface:       surface,
		QueryText:     "Brand query for " + surface.String(),
		QueryId:       fmt.Sprintf("%s-query-%s", tenantId, surface.String()),
		ModelId:       "synthetic-probe-m3",
		SampleIdx:     1,
		VerbatimAnswer: "Sample answer from " + surface.String() + " for tenant " + tenantId,
		CapturedAt:    timestamppb.Now(),
	}
}

// extractViaGateway calls the gateway Extract seam via ConnectRPC.
// M3-thin: real ConnectRPC call. M4-thicken: retries, circuit breaker, metrics.
func (s *perceptionServer) extractViaGateway(ctx context.Context, tenantId string, answer *entityv1.AnswerEvent, idemKey string) []*eventv1.Assertion {
	req := connect.NewRequest(&servicev1.ExtractRequest{
		TenantId:   tenantId,
		Answer:     answer,
		IdempotencyKey: idemKey,
	})
	// Inject tenant_id from validated session (CLAUDE.md §8 - gateway never trusts client-supplied tenant_id)
	req.Header().Set("x-tenant-id", tenantId)

	resp, err := s.gatewayClient.Extract(ctx, req)
	if err != nil {
		log.Printf("gateway.Extract failed: %v", err)
		// M3-thin: return empty assertions on failure; M4-thicken: proper error handling + fallback
		return []*eventv1.Assertion{}
	}
	return resp.Msg.Assertions
}

// assertionToAssertedNode converts an Extract assertion to an AssertedNode for KG storage.
func (s *perceptionServer) assertionToAssertedNode(tenantId string, a *eventv1.Assertion, probeId string) *entityv1.AssertedNode {
	entityId := a.SubjectId
	if a.GetObjectId() != "" {
		entityId = a.GetObjectId()
	}

	return &entityv1.AssertedNode{
		Id:        fmt.Sprintf("%s-%s", tenantId, entityId),
		TenantId:  tenantId,
		EntityType: entityv1.EntityType(0),
		ValidTime: a.GetValidTime(),
		TxTime:    a.GetTxTime(),
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}