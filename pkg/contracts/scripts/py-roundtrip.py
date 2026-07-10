#!/usr/bin/env python3
# py-roundtrip.py — the REAL-IMPORT gate for the Python half of the contract spine (T02).
#
# WHAT THIS CATCHES that `mypy --strict` cannot: the protobuf gencode<->runtime version
# match + the real Python surface the plugin emits. The BSR `protocolbuffers/python` plugin
# emits gencode 7.35.1; the engenox-contracts runtime dep is pinned `protobuf>=7.35,<8` to
# match. If the plugin floats to a gencode the pinned runtime cannot load, `import
# engenox.*._pb2` raises ValidateProtobufRuntimeVersion — and THIS script raises it
# (non-zero). `mypy --strict` passes regardless (it never imports), so without this gate
# that failure is INVISIBLE — the CLAUDE.md §12 "green only by static check" inflated
# score that T02 verify caught: runtime 5.29 < gencode 7.35.1 imported-and-raised while
# mypy was green.
#
# WHAT IT DOES:
#   1. Imports every generated *_pb2 (entity/event/policy/service) — any gencode/runtime
#      mismatch raises at import, before main runs (the point).
#   2. Asserts the Python SURFACE the plugin actually emits (NOT a guessed surface): the
#      gRPC Python STUBS come from a separate plugin not in buf.gen.yaml, so the Perception
#      service is NOT a `service.PerceptionService` class — it lives at
#      `service.DESCRIPTOR.services_by_name['PerceptionService']` with method Assert.
#      Asserting the descriptor (service + method + in/out types) is the contract integrity
#      proof; asserting a phantom class was a bug in an earlier gate draft (caught by the
#      gate itself — the candor loop working).
#   3. Round-trips AssertRequest -> AssertResponse(envelope) cross-namespace: an
#      AssertRequest carries an AssertedNode (entity.v1) + idempotency_key. Construct,
#      serialize, parse, assert equality. Proves (a) the cross-namespace import (service
#      references entity.v1.AssertedNode) resolves at runtime AND (b) the bi-temporal
#      truth unit (06 S2, 13 S2) survives serialize/parse under the pinned protobuf.
#   4. Prints the loaded protobuf runtime version — the gencode<->runtime match is the
#      candor artifact in the gate's output (the 7.35.1 == 7.35.1 the gate proves).
#
# The TS round-trip (vitest) is the static+type half; this is the runtime half. A contract
# bump that breaks cross-language parity fails here FIRST.
#
# Cites: T02; 06 S2 (AssertedNode); 13 S2 (bi-temporal); 00 S2 inv 8 (reproducible from a
# signed node); 24 S2 (AssertRequest carries idempotency_key); CLAUDE.md S4 (contract-spine-
# first) + S12 (the candor floor on the gencode<->runtime match).

import sys

# The gate is the four imports below. A gencode/runtime mismatch raises here, before main
# runs — which is the point. Order matters only for readability; each imports google.protobuf
# transitively, so the runtime-version guard fires on the first line.
import engenox.entity.v1.entity_pb2 as entity
import engenox.event.v1.event_pb2 as event
import engenox.policy.v1.policy_pb2 as policy
import engenox.service.v1.service_pb2 as service


def _assert(cond: bool, msg: str) -> None:
    if not cond:
        raise AssertionError(msg)


def main() -> int:
    # 1. every namespace's primary type imports + is constructible (the four v1 namespaces
    #    T02 ships, one proto each). Python proto3 messages construct with zero args; the
    #    enum types are exposed as generated enum types on the module.
    _assert(entity.AssertedNode is not None, "entity.AssertedNode missing")
    _assert(event.AssertionEvent is not None, "event.AssertionEvent missing")
    _assert(policy.DialLevel is not None, "policy.DialLevel missing")

    # 2. the Perception SERVICE surface (the CORRECT Python representation — the descriptor,
    #    not a class): one service, one RPC Assert, AssertRequest -> AssertResponse. The
    #    contract is the RPC signature; this is the integrity proof the gate adds over a
    #    bare `import`. (24 S3: the reference shape for control-plane -> perception calls.)
    svc_desc = service.DESCRIPTOR.services_by_name.get("PerceptionService")
    _assert(svc_desc is not None, "PerceptionService missing from services_by_name")
    rpc_names = [m.name for m in svc_desc.methods]
    _assert(rpc_names == ["Assert"], f"expected one RPC 'Assert', got {rpc_names}")
    assert_method = svc_desc.methods[0]
    _assert(
        assert_method.input_type.name == "AssertRequest",
        f"Assert input not AssertRequest: {assert_method.input_type.name}",
    )
    _assert(
        assert_method.output_type.name == "AssertResponse",
        f"Assert output not AssertResponse: {assert_method.output_type.name}",
    )
    _assert(
        service.AssertRequest is not None and service.AssertResponse is not None,
        "AssertRequest/AssertResponse messages not exposed",
    )

    # 3. the DialLevel policy enum has the 7 symbolic levels (12 S5) — assert the enum
    #    descriptor enumerates values (UNSPECIFIED + the levels). Loose count (>=7) is the
    #    honest bound: the gate proves the enum SURFACE exists; exact level names are a
    #    contract-compat concern for `buf breaking`, not this runtime gate.
    dial_values = policy.DialLevel.values()
    _assert(len(dial_values) >= 7, f"DialLevel has {len(dial_values)} values, expected >=7")

    # 4. the bi-temporal truth unit (06 S2, 13 S2): an ORGANIZATION AssertedNode with a
    #    measurable confidence Distribution, serialize -> parse -> assert byte-identity.
    node = entity.AssertedNode(
        id="node-1",
        tenant_id="tenant-A",  # from the edge JWT, never the client request (15 S3)
        entity_type=entity.ENTITY_TYPE_ORGANIZATION,
        confidence=entity.Distribution(
            sample_count=1,
            mean=0.42,
            standard_deviation=0.1,
        ),
    )
    node_wire = node.SerializeToString()
    node_parsed = entity.AssertedNode()
    node_parsed.ParseFromString(node_wire)
    _assert(node_parsed == node, "AssertedNode round-trip mismatch")
    _assert(
        node_parsed.entity_type == entity.ENTITY_TYPE_ORGANIZATION, "enum not preserved"
    )

    # 5. the CROSS-NAMESPACE service envelope (24 S2): AssertRequest carries that AssertedNode
    #    (entity.v1) + the idempotency_key every mutating RPC requires (the CLAUDE.md S8
    #    watchdog invariant; service.proto AssertRequest.idempotency_key). Round-trip the
    #    envelope — proves the service<->entity reference resolves at runtime, not just at
    #    mypy. The AssertResponse carries the event_id the assertion produces.
    request = service.AssertRequest(node=node, idempotency_key="dk-2026-01-01-abc")
    req_wire = request.SerializeToString()
    req_parsed = service.AssertRequest()
    req_parsed.ParseFromString(req_wire)
    _assert(req_parsed == request, "AssertRequest round-trip mismatch")
    _assert(req_parsed.idempotency_key == "dk-2026-01-01-abc", "idempotency_key not preserved")
    _assert(
        req_parsed.node.entity_type == entity.ENTITY_TYPE_ORGANIZATION,
        "nested AssertedNode enum not preserved through the envelope",
    )
    response = service.AssertResponse(event_id="evt-42")
    _assert(response.SerializeToString(), "AssertResponse not serializable")

    import google.protobuf  # the loaded runtime — AFTER the import+round-trip gate above

    print(
        f"py-roundtrip OK: 4 namespaces import; PerceptionService.Assert(AssertRequest->"
        f"AssertResponse) present; DialLevel x{len(dial_values)}; AssertedNode "
        f"({len(node_wire)}B) + AssertRequest({len(req_wire)}B) round-trip under "
        f"protobuf {google.protobuf.__version__}"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
