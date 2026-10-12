const PRIVATE_PREFIXES = [
  "/documentation",
  "/supabase",
  "/tests",
  "/.github",
];

const PRIVATE_EXACT_PATHS = new Set([
  "/axis_kpi_mapping_guide_v1.0.md",
  "/readme.md",
  "/package.json",
  "/package-lock.json",
  "/.gitignore",
]);

function isBlockedPath(pathname) {
  let decodedPath;

  try {
    decodedPath = decodeURIComponent(pathname);
  } catch {
    // Malformed encoded paths should fail closed.
    return true;
  }

  const normalizedPath = decodedPath
    .replace(/\\/g, "/")
    .replace(/\/{2,}/g, "/")
    .toLowerCase();

  if (PRIVATE_EXACT_PATHS.has(normalizedPath)) {
    return true;
  }

  if (PRIVATE_PREFIXES.some((prefix) =>
    normalizedPath === prefix || normalizedPath.startsWith(prefix + "/")
  )) {
    return true;
  }

  // These are obsolete, unreferenced assessment JSON snapshots. The client
  // must continue to receive report_texts.json, which is intentionally public.
  if (/^\/assets\/data\/[^/]*_assesstment\.json$/i.test(normalizedPath)) {
    return true;
  }

  return false;
}

export async function onRequest(context) {
  const pathname = new URL(context.request.url).pathname;

  if (isBlockedPath(pathname)) {
    return new Response("Not Found", {
      status: 404,
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }

  return context.next();
}
