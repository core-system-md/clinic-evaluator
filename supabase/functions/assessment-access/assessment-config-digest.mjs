/**
 * Canonical digest for the complete assessment configuration consumed by the
 * scoring runtime. Object keys are sorted; array order is preserved, so callers
 * must sort collections whose order is not semantically meaningful.
 */
function stableSerialize(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(stableSerialize).join(",") + "]";
  return "{" + Object.keys(value).sort()
    .map((key) => JSON.stringify(key) + ":" + stableSerialize(value[key]))
    .join(",") + "}";
}

export async function digestAssessmentConfig(config) {
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    throw new Error("Assessment configuration must be an object");
  }
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(stableSerialize(config)),
  );
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export { stableSerialize };
