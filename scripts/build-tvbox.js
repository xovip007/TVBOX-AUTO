import fs from 'node:fs/promises';

const SOURCE_FILE = new URL('../sources.json', import.meta.url);
const RESULT_FILE = new URL('../dist/check-result.json', import.meta.url);
const OUT_FILE = new URL('../dist/tvbox.json', import.meta.url);
const STATUS_FILE = new URL('../dist/status.json', import.meta.url);

async function fetchConfig(url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'user-agent': 'tvbox-auto-template/1.0' }
    });
    const text = await res.text();
    return JSON.parse(text);
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  await fs.mkdir(new URL('../dist/', import.meta.url), { recursive: true });
  const sourceConfig = JSON.parse(await fs.readFile(SOURCE_FILE, 'utf8'));
  const result = JSON.parse(await fs.readFile(RESULT_FILE, 'utf8'));
  const timeoutMs = Number(sourceConfig.timeoutMs || 8000);

  // Filter to working sources that return valid JSON with sites
  const working = result.results
    .filter(item => item.ok && item.isJson && item.hasSites)
    .sort((a, b) => (a.elapsedMs || 999999) - (b.elapsedMs || 999999));

  if (working.length === 0) {
    console.error('No working sources found. Skipping build.');
    process.exit(1);
  }

  // Fetch full config from top 5 fastest sources, pick the one with most sites
  const topN = Math.min(5, working.length);
  let bestConfig = null;
  let bestSource = null;
  let bestSiteCount = 0;

  for (let i = 0; i < topN; i++) {
    const source = working[i];
    try {
      const config = await fetchConfig(source.url, timeoutMs);
      const siteCount = config.sites?.length || 0;
      console.log(`  ${source.name}: ${siteCount} sites (${source.elapsedMs}ms)`);
      if (siteCount > bestSiteCount) {
        bestSiteCount = siteCount;
        bestConfig = config;
        bestSource = source;
      }
    } catch (e) {
      console.log(`  ${source.name}: fetch failed - ${e.message}`);
    }
  }

  if (!bestConfig) {
    console.error('Failed to fetch any source content.');
    process.exit(1);
  }

  // Add wallpaper fallback if missing
  if (!bestConfig.wallpaper) {
    bestConfig.wallpaper = 'https://picsum.photos/1920/1080';
  }

  await fs.writeFile(OUT_FILE, JSON.stringify(bestConfig, null, 2));

  const status = {
    updatedAt: new Date().toISOString(),
    activeSource: { name: bestSource.name, url: bestSource.url, elapsedMs: bestSource.elapsedMs, siteCount: bestSiteCount },
    availableSources: working.map(item => ({ name: item.name, url: item.url, elapsedMs: item.elapsedMs })),
    failedCount: result.results.length - working.length
  };

  await fs.writeFile(STATUS_FILE, JSON.stringify(status, null, 2));
  console.log(`Generated dist/tvbox.json from ${bestSource.name}: ${bestSiteCount} sites, ${working.length} sources available`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
