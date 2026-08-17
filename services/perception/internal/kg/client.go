// internal/kg/client.go — KG AssertionStore client for probe workers (M5-thin).
//
// Connects to the PerceptionService.Assert gRPC endpoint to write assertions.
// M5-thin: direct gRPC call. Thickening: connection pool, retries, metrics.
//
// Cites: 11 §3 (perception writes), 13 §2/§3 (AssertionStore port), 24 §3 (gRPC clients).

package kg

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"time"

	entityv1 "github.com/engenox/contracts/generated/go/engenox/entity/v1"
	servicev1 "github.com/engenox/contracts/generated/go/engenox/service/v1"
	servicev1connect "github.com/engenox/contracts/generated/go/engenox/service/v1/servicev1connect"
	eventv1 "github.com/engenox/contracts/generated/go/engenox/event/v1"
	"connectrpc.com/connect"
	"google.golang.org/protobuf/types/known/timestamppb"
)

type Client struct {
	perception servicev1connect.PerceptionServiceClient
	addr       string
}

func NewClient(addr string) *Client {
	httpClient := &http.Client{Timeout: 30 * time.Second}
	return &Client{
		perception: servicev1connect.NewPerceptionServiceClient(httpClient, addr),
		addr:       addr,
	}
}

// Assert writes a single AssertedNode to the KG via PerceptionService.Assert.
// Returns the committed event_id on success.
func (c *Client) Assert(ctx context.Context, tenantID, idempotencyKey string, node *entityv1.AssertedNode) (string, error) {
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	req := connect.NewRequest(&servicev1.AssertRequest{
		Node:           node,
		IdempotencyKey: idempotencyKey,
	})
	req.Header().Set("x-tenant-id", tenantID)

	resp, err := c.perception.Assert(ctx, req)
	if err != nil {
		return "", fmt.Errorf("assert failed: %w", err)
	}
	return resp.Msg.EventId, nil
}

// AssertBatch writes multiple assertions in sequence.
// Non-fatal: logs errors and continues.
func (c *Client) AssertBatch(ctx context.Context, tenantID string, nodes []*entityv1.AssertedNode) []string {
	eventIDs := make([]string, 0, len(nodes))
	for i, node := range nodes {
		idemKey := fmt.Sprintf("%s-batch-%d-%d", tenantID, time.Now().UnixNano(), i)
		eventID, err := c.Assert(ctx, tenantID, idemKey, node)
		if err != nil {
			log.Printf("kg: assert failed for node %s: %v", node.Id, err)
			continue
		}
		eventIDs = append(eventIDs, eventID)
	}
	return eventIDs
}

// AssertedNodeFromAssertion builds an AssertedNode from an extracted Assertion.
func AssertedNodeFromAssertion(tenantID, probeID string, a *eventv1.Assertion) *entityv1.AssertedNode {
	entityID := a.SubjectId
	if a.GetObjectId() != "" {
		entityID = a.GetObjectId()
	}

	return &entityv1.AssertedNode{
		Id:         fmt.Sprintf("%s-%s-%s", tenantID, entityID, probeID),
		TenantId:   tenantID,
		EntityType: entityv1.EntityType_ENTITY_TYPE_UNSPECIFIED,
		ValidTime:  a.GetValidTime(),
		TxTime:     a.GetTxTime(),
	}
}

// ValidTimeNow returns a valid_time interval for "now" (week-wide).
func ValidTimeNow() *entityv1.TimeInterval {
	now := time.Now().Truncate(time.Hour)
	weekStart := now.AddDate(0, 0, -int(now.Weekday()))
	weekEnd := weekStart.Add(7 * 24 * time.Hour)
	return &entityv1.TimeInterval{
		Start: timestamppb.New(weekStart),
		End:   timestamppb.New(weekEnd),
	}
}

// TxTimeNow returns the current transaction time.
func TxTimeNow() *timestamppb.Timestamp {
	return timestamppb.Now()
}