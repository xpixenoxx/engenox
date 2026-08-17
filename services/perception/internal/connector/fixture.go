// internal/connector/fixture.go — Connector fixture data (M5-thin).
//
// Provides deterministic fixture responses for testing and development.
// Thickening: replaced with real connector responses.
//
// Cites: 11 §3 (connector fixtures), ADR-0007 Thinning Rule.

package connector

import "time"

// FixtureResponse returns a deterministic fixture for each connector type.
func FixtureResponse(t ConnectorType) Response {
	now := time.Now()
	switch t {
	case TypeAhrefs:
		return Response{Connector: TypeAhrefs, Data: map[string]any{"backlinks": 1250, "referring_domains": 340, "keywords_top10": 45}, FetchedAt: now, ItemsCount: 3}
	case TypeSemrush:
		return Response{Connector: TypeSemrush, Data: map[string]any{"organic_keywords": 3200, "paid_keywords": 150, "traffic": 45000}, FetchedAt: now, ItemsCount: 3}
	case TypeGSC:
		return Response{Connector: TypeGSC, Data: map[string]any{"clicks": 12500, "impressions": 450000, "ctr": 0.028, "avg_position": 12.3}, FetchedAt: now, ItemsCount: 4}
	case TypeGA4:
		return Response{Connector: TypeGA4, Data: map[string]any{"sessions": 28000, "users": 19500, "revenue": 125000.50, "conversions": 340}, FetchedAt: now, ItemsCount: 4}
	case TypeCDN:
		return Response{Connector: TypeCDN, Data: map[string]any{"requests": 5200000, "bandwidth_gb": 450, "cache_hit_ratio": 0.87, "edge_locations": 285}, FetchedAt: now, ItemsCount: 4}
	case TypeGit:
		return Response{Connector: TypeGit, Data: map[string]any{"commits_last_week": 47, "contributors": 12, "open_prs": 8, "deployments": 5}, FetchedAt: now, ItemsCount: 4}
	case TypeCMS:
		return Response{Connector: TypeCMS, Data: map[string]any{"pages_published": 23, "pages_updated": 17, "media_uploads": 45, "workflow_pending": 3}, FetchedAt: now, ItemsCount: 4}
	default:
		return Response{Connector: t, Data: map[string]any{}, FetchedAt: now, ItemsCount: 0}
	}
}

// AllFixtureResponses returns fixtures for all 7 connector types.
func AllFixtureResponses() map[ConnectorType]Response {
	types := []ConnectorType{TypeAhrefs, TypeSemrush, TypeGSC, TypeGA4, TypeCDN, TypeGit, TypeCMS}
	resp := make(map[ConnectorType]Response, len(types))
	for _, t := range types {
		resp[t] = FixtureResponse(t)
	}
	return resp
}