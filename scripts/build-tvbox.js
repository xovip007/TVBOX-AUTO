import fs from 'node:fs/promises';

const SOURCE_FILE = new URL('../sources.json', import.meta.url);
const RESULT_FILE = new URL('../dist/check-result.json', import.meta.url);
const OUT_FILE = new URL('../dist/tvbox.json', import.meta.url);
const STATUS_FILE = new URL('../dist/status.json', import.meta.url);

// Base URL for resolving relative paths (gaotianliuyun/gao master branch)
const RELATIVE_BASE = 'https://ghproxy.net/https://raw.githubusercontent.com/gaotianliuyun/gao/master/';

function fixRelativePaths(obj) {
  if (typeof obj === 'string') {
    // Fix spider: "./jar/pg.jar;md5;xxx" -> absolute URL
    if (obj.startsWith('./')) {
      const parts = obj.split(';');
      parts[0] = RELATIVE_BASE + parts[0].slice(2);
      return parts.join(';');
    }
    // Fix live url: "./list.txt" -> absolute URL
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(fixRelativePaths);
  }
  if (obj && typeof obj === 'object') {
    const fixed = {};
    for (const [key, value] of Object.entries(obj)) {
      // Fix "ext" fields that may contain relative paths
      if (typeof value === 'string' && value.startsWith('./')) {
        fixed[key] = RELATIVE_BASE + value.slice(2);
      } else {
        fixed[key] = fixRelativePaths(value);
      }
    }
    return fixed;
  }
  return obj;
}

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

  const working = result.results
    .filter(item => item.ok && item.isJson && item.hasSites)
    .sort((a, b) => (a.elapsedMs || 999999) - (b.elapsedMs || 999999));

  if (working.length === 0) {
    console.error('No working sources found. Skipping build.');
    process.exit(1);
  }

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

  // Fix all relative paths (spider, live url, ext, etc.) to absolute URLs
  const fixedConfig = fixRelativePaths(bestConfig);
  if (!fixedConfig.wallpaper) {
    fixedConfig.wallpaper = 'https://picsum.photos/1920/1080';
  }

  await fs.writeFile(OUT_FILE, JSON.stringify(fixedConfig, null, 2));

  // Report fixed paths
  console.log(`\nFixed relative paths:`);
  console.log(`  spider: ${fixedConfig.spider}`);
  const lives = fixedConfig.lives || [];
  for (const live of lives.slice(0, 3)) {
    if (live.url?.startsWith(RELATIVE_BASE)) {
      console.log(`  live: ${live.name} -> ${live.url}`);
    }
  }

  const status = {
    updatedAt: new Date().toISOString(),
    activeSource: { name: bestSource.name, url: bestSource.url, elapsedMs: bestSource.elapsedMs, siteCount: bestSiteCount },
    availableSources: working.map(item => ({ name: item.name, url: item.url, elapsedMs: item.elapsedMs })),
    failedCount: result.results.length - working.length
  };

  await fs.writeFile(STATUS_FILE, JSON.stringify(status, null, 2));
  console.log(`\nGenerated dist/tvbox.json from ${bestSource.name}: ${bestSiteCount} sites, ${working.length} sources available`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
