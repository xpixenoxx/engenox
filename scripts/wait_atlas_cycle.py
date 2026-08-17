#!/usr/bin/env python3
"""
scripts/wait_atlas_cycle.py — Poll Temporal for AtlasCycle completion.

Waits for the workflow to reach COMPLETED/FAILED/TERMINATED state.
Exits 0 on COMPLETED, 1 on timeout or failure.
Cites: M7 T02; 14 §3 (Temporal workflow).
"""

import argparse
import asyncio
import os
import sys
import time

from temporalio.client import Client


async def wait_for_cycle(
    tenant_id: str,
    temporal_address: str,
    namespace: str,
    timeout_sec: int = 600,
    poll_interval: int = 10,
) -> int:
    """Wait for AtlasCycle workflow to complete. Returns 0 on success, 1 on failure/timeout."""
    print(f"⏳ Waiting for AtlasCycle (tenant={tenant_id}) at {temporal_address}...")
    print(f"   Timeout: {timeout_sec}s, Poll interval: {poll_interval}s")

    client = await Client.connect(temporal_address, namespace=namespace)
    workflow_id = f"atlas-cycle-{tenant_id}"

    start = time.time()
    while time.time() - start < timeout_sec:
        try:
            handle = client.get_workflow_handle(workflow_id)
            desc = await handle.describe()
            status = desc.status.name
            print(f"   Status: {status} (elapsed: {int(time.time() - start)}s)")

            if status == "COMPLETED":
                result = await handle.result()
                print(f"   ✅ COMPLETED: {result}")
                return 0
            elif status in ("FAILED", "TERMINATED", "CANCELED"):
                print(f"   ❌ {status}")
                return 1
            # RUNNING, PENDING -> keep polling
        except Exception as e:
            # Workflow might not exist yet
            print(f"   (not found yet: {e})")

        await asyncio.sleep(poll_interval)

    print(f"   ⏱️ TIMEOUT after {timeout_sec}s")
    return 1


async def main() -> int:
    parser = argparse.ArgumentParser(description="Wait for AtlasCycle completion")
    parser.add_argument("--tenant", required=True, help="Tenant ID")
    parser.add_argument("--temporal", default=os.getenv("TEMPORAL_ADDRESS", "localhost:7233"), help="Temporal gRPC address")
    parser.add_argument("--namespace", default=os.getenv("TEMPORAL_NAMESPACE", "default"), help="Temporal namespace")
    parser.add_argument("--timeout", type=int, default=600, help="Timeout in seconds")
    parser.add_argument("--interval", type=int, default=10, help="Poll interval in seconds")
    args = parser.parse_args()

    try:
        return await wait_for_cycle(args.tenant, args.temporal, args.namespace, args.timeout, args.interval)
    except Exception as e:
        print(f"❌ Error: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))