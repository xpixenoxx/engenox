// constraints.ts — the JSON Schema + Outlines/XGrammar constrained decoding specs
// for the Extract seam (M2-thin: constrained decoding on highest-volume seam first).
//
// The grammar restricts the LLM to ONLY emit valid assertion objects where:
//   - subject_id ∈ known_entity_ids
//   - predicate ∈ the tenant's SHACL predicate set (extracted from their Brand Card + surfaces)
//   - object is either a NodeRef (object_id ∈ known_entity_ids) OR a Literal (any JSON value)
//   - mentions.entity_id ∈ known_entity_ids OR "" (the "ARM MISSING" gap signal, 04 §5)
//
// M2-thin implements this as a JSON Schema enforced via a post-hoc validator (the
// constrained decoding integration with Outlines/XGrammar lands at thickening; the
// validator here provides the same guarantee deterministically).
//
// Cites: 11 §3 (Extract seam) + 11 §2b (SHACL shapes = tenant's living entity set) + ADR-0007.

import type { ExtractRequest } from "@engenox/contracts/service/v1/gateway";

// Plain interfaces for validation (not protobuf messages)
export interface ValidatedAssertion {
  subject_id: string;
  predicate: string;
  object: { case: "objectId"; value: string } | { case: "objectLiteral"; value: unknown };
}

export interface ValidatedMentionRef {
  entity_id: string;
}

export interface ValidatedExtractResponse {
  assertions: ValidatedAssertion[];
  mentions: ValidatedMentionRef[];
}

// The JSON Schema for a single validated assertion (mirrors event.v1.Assertion).
export const AssertionSchema = {
  type: "object",
  required: ["subject_id", "predicate", "object"],
  properties: {
    subject_id: { type: "string", minLength: 1 },
    predicate: { type: "string", minLength: 1 },
    object: {
      type: "object",
      required: ["case"],
      properties: {
        case: { type: "string", enum: ["objectId", "objectLiteral"] },
        value: {}
      }
    }
  },
  additionalProperties: false
} as const;

// The JSON Schema for a mention reference (mirrors entity.v1.MentionRef).
export const MentionRefSchema = {
  type: "object",
  required: ["entity_id"],
  properties: {
    entity_id: { type: "string" }
  },
  additionalProperties: false
} as const;

// The JSON Schema for the full ExtractResponse payload.
export const ExtractResponseSchema = {
  type: "object",
  required: ["assertions", "mentions"],
  properties: {
    assertions: {
      type: "array",
      items: AssertionSchema
    },
    mentions: {
      type: "array",
      items: MentionRefSchema
    }
  },
  additionalProperties: false
} as const;

/**
 * Build the constrained decoding prompt for Extract. The prompt includes the
 * tenant's known entity IDs + predicate whitelist so the LLM can only emit
 * valid references. M2-thin: the post-hoc validator enforces; thickening
 * upgrades to Outlines/XGrammar compile-time grammar.
 */
export function buildExtractPrompt(
  request: ExtractRequest,
  predicateWhitelist: readonly string[]
): string {
  const knownEntities = request.knownEntityIds.join(", ") || "(none)";
  const predicates = predicateWhitelist.join(", ") || "(none)";

  return `You are an assertion extractor for tenant ${request.tenantId}.

KNOWN ENTITIES (subject_id must be ONE of these):
${knownEntities}

ALLOWED PREDICATES (predicate must be ONE of these):
${predicates}

ANSWER TO EXTRACT FROM:
${JSON.stringify(request.answer, null, 2)}

RULES:
1. Every assertion MUST have: subject_id (from KNOWN ENTITIES), predicate (from ALLOWED PREDICATES), object.
2. The object is EITHER:
   - { "case": "objectId", "value": "<known entity id>" } — a reference to another known entity
   - { "case": "objectLiteral", "value": <any JSON> } — a literal value (ranking number, text, boolean)
3. Every mention MUST have entity_id that is either "" (unresolved gap) or from KNOWN ENTITIES.
4. Output ONLY valid JSON matching the ExtractResponse schema. No commentary.`;
}

/**
 * Post-hoc validator for Extract output. Enforces that every subject_id,
 * resolved object_id, and resolved mention.entity_id is in the known set.
 * This is the M2-thin guarantee; thickening compiles this to an Outlines
 * grammar so the LLM CANNOT produce invalid output.
 */
export function validateExtractResponse(
  response: unknown,
  knownEntityIds: readonly string[],
  predicateWhitelist: readonly string[]
): { ok: true; data: ValidatedExtractResponse } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const known = new Set(knownEntityIds);
  const predicates = new Set(predicateWhitelist);

  if (typeof response !== "object" || response === null) {
    return { ok: false, errors: ["Response is not an object"] };
  }

  const resp = response as Record<string, unknown>;

  // Validate assertions array
  if (!Array.isArray(resp.assertions)) {
    return { ok: false, errors: ["assertions must be an array"] };
  }

  for (let i = 0; i < resp.assertions.length; i++) {
    const a = resp.assertions[i] as Record<string, unknown>;

    // subject_id
    if (typeof a.subject_id !== "string" || a.subject_id === "") {
      errors.push(`assertions[${i}].subject_id: must be non-empty string`);
    } else if (!known.has(a.subject_id)) {
      errors.push(`assertions[${i}].subject_id: "${a.subject_id}" not in known entities`);
    }

    // predicate
    if (typeof a.predicate !== "string" || a.predicate === "") {
      errors.push(`assertions[${i}].predicate: must be non-empty string`);
    } else if (!predicates.has(a.predicate)) {
      errors.push(`assertions[${i}].predicate: "${a.predicate}" not in allowed predicates`);
    }

    // object (discriminated union)
    if (typeof a.object !== "object" || a.object === null) {
      errors.push(`assertions[${i}].object: must be object`);
    } else {
      const obj = a.object as Record<string, unknown>;
      if (obj.case !== "objectId" && obj.case !== "objectLiteral") {
        errors.push(`assertions[${i}].object.case: must be "objectId" or "objectLiteral"`);
      } else if (obj.case === "objectId") {
        if (typeof obj.value !== "string") {
          errors.push(`assertions[${i}].object.value: must be string for objectId`);
        } else if (obj.value !== "" && !known.has(obj.value)) {
          errors.push(`assertions[${i}].object.value: "${obj.value}" not in known entities`);
        }
      }
    }
  }

  // Validate mentions array
  if (!Array.isArray(resp.mentions)) {
    return { ok: false, errors: ["mentions must be an array"] };
  }

  for (let i = 0; i < resp.mentions.length; i++) {
    const m = resp.mentions[i] as Record<string, unknown>;
    if (typeof m.entity_id !== "string") {
      errors.push(`mentions[${i}].entity_id: must be string`);
    } else if (m.entity_id !== "" && !known.has(m.entity_id)) {
      errors.push(`mentions[${i}].entity_id: "${m.entity_id}" not in known entities`);
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  // Type-safe cast after validation
  return {
    ok: true,
    data: response as ValidatedExtractResponse
  };
}

/**
 * The M2-thin constrained decoding adapter. Attempts the LLM call with the
 * constrained prompt, then validates. If validation fails, returns the
 * FALLBACK path (empty assertions + status=FALLBACK). The caller handles
 * the candor microcopy.
 */
export async function runExtractWithConstraints(
  request: ExtractRequest,
  callLlm: (prompt: string) => Promise<{ raw: string; tokens: number }>,
  predicateWhitelist: readonly string[]
): Promise<ValidatedExtractResponse> {
  const prompt = buildExtractPrompt(request, predicateWhitelist);
  const { raw, tokens } = await callLlm(prompt);

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // JSON parse failed → FALLBACK
    throw new Error("Extract JSON parse failed");
  }

  const validated = validateExtractResponse(parsed, request.knownEntityIds, predicateWhitelist);

  if (!validated.ok) {
    // Validation failed → FALLBACK with candor
    throw new Error(`Extract validation failed: ${validated.errors.join("; ")}`);
  }

  return validated.data;
}

/**
 * M2-thin base predicate whitelist. Thickening: per-tenant SHACL shapes from Brand Card + surfaces.
 * Cites: 11 §2b (SHACL shapes = tenant's living entity set + predicate set).
 */
export const DEFAULT_PREDICATES = [
  "hasRanking",
  "hasReviewCount",
  "hasRating",
  "hasPrice",
  "hasFeature",
  "mentionsEntity",
  "citesSource"
] as const;