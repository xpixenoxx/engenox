// ensure-pyinit.mjs - the reproducibility fix for the Buf Python plugin's PEP-420 output.
//
// `buf generate` (the protoc-gen-python plugin) emits *_pb2.py with NO __init__.py - by
// design, PEP-420 namespace packages. That tree is importable as Python and ships fine in
// the wheel ([tool.setuptools.packages.find] namespaces = true discovers the dirs, 24 §6).
// BUT mypy --strict cannot resolve a CROSS-PACKAGE import from a namespace tree without
// __init__.py markers: service_pb2.py and event_pb2.py both
// `import engenox.entity.v1.entity_pb2`, and mypy reports
// `Cannot find implementation or library stub for module named "engenox.entity.v1"`
// (verified empirically against a fresh-regen tree). Pointing mypy at the package root via
// MYPYPATH only upgrades the error to `[attr-defined]` - mypy finds the namespace package
// but cannot enumerate its submodules. It is genuinely marker-dependent.
//
// That makes the mypy gate non-reproducible: it's green ONLY when a human has hand-created
// the __init__.py markers, and generated/ is git-ignored (the .gitignore line 5) so those
// markers aren't in the repo - a fresh clone + `buf generate` + `mypy` regresses. This is a
// CLAUDE.md §12 candor-floor breach (a gate green only by hand is an inflated score), so
// the markers must be part of the reproducible `gen` step, not a manual one-off.
//
// This script runs AFTER `buf generate` (wired into the package.json `gen` script). For
// every *_pb2.py it ensures an empty __init__.py in that dir and every ancestor up to
// generated/python/. Idempotent - re-running leaves existing markers untouched. A fresh
// clone + `pnpm --filter @engenox/contracts gen` + `mypy --strict` is then green with no
// human intervention. New namespaces added at M1+ are covered automatically (the dir walk
// derives markers from whatever buf generated).
//
// The markers are NOT cross-language types (CLAUDE.md §4 - never hand-write a type); they
// are empty package-structure files. The types remain the generated *_pb2.py.
//
// Cites: 24 §6 (generated-artifact discipline); CLAUDE.md §12 (the candor floor); T02.

import { readdirSync, existsSync, writeFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const pyRoot = join(here, "..", "generated", "python");

if (!existsSync(pyRoot)) {
  console.error(
    `ensure-pyinit: ${pyRoot} not found. Run \`buf generate\` first (this script is the post-gen step).`,
  );
  process.exit(1);
}

// Collect every *_pb2.py under the python root (the modules buf generated).
function findPb2(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) out.push(...findPb2(p));
    else if (name.endsWith("_pb2.py")) out.push(p);
  }
  return out;
}

const modules = findPb2(pyRoot);
if (modules.length === 0) {
  console.error("ensure-pyinit: no *_pb2.py found. Did `buf generate` run?");
  process.exit(1);
}

let created = 0;
for (const mod of modules) {
  // Ensure __init__.py in the module's dir and every ancestor up to (not including) pyRoot.
  let dir = dirname(mod);
  while (dir !== pyRoot && dir.startsWith(pyRoot)) {
    const init = join(dir, "__init__.py");
    if (!existsSync(init)) {
      writeFileSync(init, "");
      created++;
    }
    dir = dirname(dir);
  }
}

console.log(
  `ensure-pyinit: ${modules.length} *_pb2.py module(s); ${created} __init__.py marker(s) created (idempotent).`,
);
