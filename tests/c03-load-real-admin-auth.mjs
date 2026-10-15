import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

const sourcePath = "supabase/migrations/20261003170912_p5_admin_architecture.sql";
const outputPath = "tests/.generated-c03-admin-auth.sql";
const source = await readFile(sourcePath, "utf8");
const names = ["is_owner", "has_admin_capability", "require_admin_capability"];
const definitions = [];

for (const name of names) {
  const pattern = new RegExp(
    `create\\s+or\\s+replace\\s+function\\s+public\\.${name}\\s*\\([^)]*\\)[\\s\\S]*?\\$\\$;`,
    "i",
  );
  const match = source.match(pattern);
  if (!match) throw new Error(`Canonical authorization function not found: public.${name}`);
  definitions.push(match[0].trim());
}

const sourceSha256 = createHash("sha256").update(source).digest("hex");
const output = [
  "-- GENERATED from the canonical repository migration; do not edit.",
  `-- source: ${sourcePath}`,
  `-- source_sha256: ${sourceSha256}`,
  ...definitions,
  "",
].join("\\n");

await writeFile(outputPath, output, "utf8");
console.log(`Loaded ${names.join(", ")} from ${sourcePath} (sha256 ${sourceSha256})`);
