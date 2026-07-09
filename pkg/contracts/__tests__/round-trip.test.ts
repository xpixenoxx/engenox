// round-trip.test.ts - the T02 round-trip acceptance test.
//
// Imports the generated AssertedNode, constructs one, serializes it to bytes, and
// deserializes it back, asserting the bi-temporal + provenance fields survive the wire.
// Confirms the TS codegen produces a usable surface and that an assertion is
// reproducible from its serialized node (00 §2 invariant 8) - the contract honesty this
// package exists to enforce.
//
// The two cases mirror the two flavors of (06 §2.1) `confidence: Distribution (where
// measurable)`: a measurable probe-sourced surface assertion (confidence set), and a
// declarative brand-authored fact (confidence unset). Both must round-trip unchanged.
//
// Cites: 14 §3 (the wire envelope); 06 §2.1 (the AssertedNode fields); 00 §2 invariant 8
// (reproducible from a signed node); T02 acceptance (the round-trip test).

import { describe, expect, it } from "vitest";
import { create, fromBinary, toBinary } from "@bufbuild/protobuf";
import {
  AssertedNodeSchema,
  EntityType,
  ProvenanceRefSchema,
  ProvenanceSourceType,
} from "../generated/ts/engenox/entity/v1/entity_pb.js";
import {
  AssertionEventSchema,
  AssertionSchema,
  ForeignChangeStatus,
  IdentificationStrategy,
  IntegrityTagsSchema,
} from "../generated/ts/engenox/event/v1/event_pb.js";

describe("AssertedNode (entity v1)", () => {
  it("survives a serialize/deserialize round-trip with all fields intact", () => {
    // A probe-sourced assertion of an ORGANIZATION over a one-week valid window - the
    // measurable case (confidence set, multi-sample).
    const node = create(AssertedNodeSchema, {
      id: "0192394a-7c1a-7a1a-83ad-3b6b8a7c1a2d",
      tenantId: "01923949-7c1a-7a1a-83ad-3b6b8a7c1a2e",
      entityType: EntityType.ORGANIZATION,
      validTime: {
        start: { seconds: 1_754_000_000n, nanos: 0 },
        end: { seconds: 1_755_000_000n, nanos: 0 },
      },
      txTime: { start: { seconds: 1_754_000_100n, nanos: 0 } },
      provenance: create(ProvenanceRefSchema, {
        sourceType: ProvenanceSourceType.PROBE_SAMPLE,
        sourceId: "01923947-7c1a-7a1a-83ad-3b6b8a7c1a2f",
        extractedBy: "claude-haiku-4-5@extract.v3",
      }),
      supersededBy: "",
    });

    const wire = toBinary(AssertedNodeSchema, node);
    const decoded = fromBinary(AssertedNodeSchema, wire);

    expect(decoded.id).toBe(node.id);
    expect(decoded.tenantId).toBe(node.tenantId);
    expect(decoded.entityType).toBe(EntityType.ORGANIZATION);
    expect(decoded.validTime?.start?.seconds).toBe(1_754_000_000n);
    expect(decoded.validTime?.end?.seconds).toBe(1_755_000_000n);
    expect(decoded.provenance?.sourceType).toBe(ProvenanceSourceType.PROBE_SAMPLE);
    expect(decoded.provenance?.sourceId).toBe(node.provenance?.sourceId);
    expect(decoded.provenance?.extractedBy).toBe("claude-haiku-4-5@extract.v3");
    expect(decoded.supersededBy).toBe("");
  });

  it("omits confidence for a brand-authored (declarative) fact and round-trips clean", () => {
    // A manual Brand-Card edit - declarative truth, no measurable confidence (06 §2.1)
    // but STILL bi-temporal: valid_time + tx_time are mandatory on every assertion
    // (06 §7 invariant 2 + 13 §2).
    const node = create(AssertedNodeSchema, {
      id: "01923950-7c1a-7a1a-83ad-3b6b8a7c1a30",
      tenantId: "01923949-7c1a-7a1a-83ad-3b6b8a7c1a2e",
      entityType: EntityType.ORGANIZATION,
      validTime: {
        start: { seconds: 1_755_000_000n, nanos: 0 },
      },
      txTime: { start: { seconds: 1_755_000_100n, nanos: 0 } },
      provenance: create(ProvenanceRefSchema, {
        sourceType: ProvenanceSourceType.BRAND_CARD_EDIT,
        sourceId: "01923951-7c1a-7a1a-83ad-3b6b8a7c1a31",
        extractedBy: "manual@brand-card.v1",
      }),
    });

    expect(node.confidence).toBeUndefined();

    const decoded = fromBinary(AssertedNodeSchema, toBinary(AssertedNodeSchema, node));

    expect(decoded.confidence).toBeUndefined();
    expect(decoded.provenance?.sourceType).toBe(ProvenanceSourceType.BRAND_CARD_EDIT);
    expect(decoded.tenantId).toBe(node.tenantId);
    expect(decoded.validTime?.start?.seconds).toBe(1_755_000_000n);
    expect(decoded.validTime?.end).toBeUndefined();
    expect(decoded.txTime?.start?.seconds).toBe(1_755_000_100n);
  });

  it("round-trips an AssertionEvent envelope with payload + tags + provenance", () => {
    // The only event shape on the bus (14 §3) - the spine a later event type copies.
    // event_id is the idempotency key at every sink (14 §4); the IntegrityTags gate the
    // estimator weight (06 §2.4); provenance fans back to a re-derivable source.
    const event = create(AssertionEventSchema, {
      eventId: "01923952-7c1a-7a1a-83ad-3b6b8a7c1a40",
      tenantId: "01923949-7c1a-7a1a-83ad-3b6b8a7c1a2e",
      entityId: "0192394a-7c1a-7a1a-83ad-3b6b8a7c1a2d",
      schemaVersion: "v1",
      kgVersion: "0.3.1",
      payload: create(AssertionSchema, {
        subjectId: "0192394a-7c1a-7a1a-83ad-3b6b8a7c1a2d",
        predicate: "is_a",
        object: { case: "objectLiteral", value: "Organization" },
      }),
      tags: create(IntegrityTagsSchema, {
        identificationStrategy: IdentificationStrategy.RCT_ELIGIBLE,
        foreignChangeStatus: ForeignChangeStatus.CLEAN,
      }),
      provenance: create(ProvenanceRefSchema, {
        sourceType: ProvenanceSourceType.PROBE_SAMPLE,
        sourceId: "01923947-7c1a-7a1a-83ad-3b6b8a7c1a2f",
        extractedBy: "claude-haiku-4-5@extract.v3",
      }),
      emittedAt: { seconds: 1_754_000_500n, nanos: 0 },
    });

    const wire = toBinary(AssertionEventSchema, event);
    const decoded = fromBinary(AssertionEventSchema, wire);

    expect(decoded.eventId).toBe(event.eventId);
    expect(decoded.tenantId).toBe(event.tenantId);
    expect(decoded.entityId).toBe(event.entityId);
    expect(decoded.schemaVersion).toBe("v1");
    expect(decoded.kgVersion).toBe("0.3.1");
    expect(decoded.payload?.subjectId).toBe(event.payload?.subjectId);
    expect(decoded.payload?.predicate).toBe("is_a");
    const object = decoded.payload?.object;
    expect(object?.case).toBe("objectLiteral");
    expect(object?.case === "objectLiteral" ? object.value : "").toBe("Organization");
    expect(decoded.tags?.identificationStrategy).toBe(IdentificationStrategy.RCT_ELIGIBLE);
    expect(decoded.tags?.foreignChangeStatus).toBe(ForeignChangeStatus.CLEAN);
    expect(decoded.provenance?.sourceType).toBe(ProvenanceSourceType.PROBE_SAMPLE);
    expect(decoded.emittedAt?.seconds).toBe(1_754_000_500n);
  });
});
