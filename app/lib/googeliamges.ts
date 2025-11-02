// getImageSrcs.js
// Usage: const urls = await getImageSrcs("cats", { key: "...", cx: "..." });

export async function getImageSrcs(query: string, { key, cx, num = 5, safe = "active", timeoutMs = 8000 }: { key?: string; cx?: string; num?: number; safe?: string; timeoutMs?: number } = {}) {
  if (!query) throw new Error("query required");
  if (!key || !cx) throw new Error("key and cx required");

  const u = new URL("https://www.googleapis.com/customsearch/v1");
  u.searchParams.set("q", query);
  u.searchParams.set("cx", cx);
  u.searchParams.set("key", key);
  u.searchParams.set("searchType", "image");
  u.searchParams.set("num", String(Math.min(num, 10)));
  u.searchParams.set("safe", safe);

  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), timeoutMs);

  try {
    const res = await fetch(u, { signal: ac.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const items = Array.isArray(data.items) ? data.items : [];
    // Prefer full image link; fall back to thumbnail if missing.
    return items.slice(0, num).map((it: any) => it.link || it?.image?.thumbnailLink).filter(Boolean);
  } finally {
    clearTimeout(to);
  }
}
