// src/worker.ts — Temporal worker entry point (ADR-0007 M3-thin).
//
// Registers the AtlasCycle workflow + activities and InterventionSaga workflow + activities.
// Starts the worker on the appropriate task queues. Uses the Temporal TypeScript SDK.

import { Worker, NativeConnection } from "@temporalio/worker";
import * as actionActivities from "./activities/actionActivities.js";
import * as activities from "./activities/atlasCycleActivities.js";
import * as interventionActivities from "./activities/interventionSagaActivities.js";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

console.error("[WORKER-DEBUG-12345] Starting worker process, PID:", process.pid);

const __dirname = dirname(fileURLToPath(import.meta.url));

async function run() {
  const address = process.env.TEMPORAL_ADDRESS || 'localhost:7233';
  console.error(`[WORKER-DEBUG-12345] Connecting to Temporal at ${address}`);
  const connection = await NativeConnection.connect({
    address,
  });

  const worker = await Worker.create({
    connection,
    workflowsPath: join(__dirname, "workflows"),
    activities: {
      ...activities,
      ...actionActivities,
      ...interventionActivities,
    },
    taskQueue: "atlas-cycle",
    // M3-thin: single worker for all. M3-thicken: separate workers per taskQueue.
  });

  console.error("[WORKER-DEBUG-12345] Worker started on taskQueue: atlas-cycle");
  await worker.run();
}

run().catch((err) => {
  console.error("[WORKER-DEBUG-12345] Worker failed:", err);
  process.exit(1);
});