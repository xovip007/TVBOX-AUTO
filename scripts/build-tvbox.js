import fs from 'node:fs/promises';

const SOURCE_FILE = new URL('../sources.json', import.meta.url);
const RESULT_FILE = new URL('../dist/check-result.json', import.meta.url);
const OUT_FILE = new URL('../dist/tvbox.json', import.meta.url);
const STATUS_FILE = new URL('../dist/status.json', import.meta.url);

const RELATIVE_BASE = 'https://g.33445500.xyz/https://raw.githubusercontent.com/qist/tvbox/refs/heads/master/';

// Known relative path patterns in TVBox configs that need resolution
const RELATIVE_PATTERNS = [
  './', '../', 'json/', 'js/', 'lib/', 'XBPQ/', 'XYQBiu/', 'jar/', 'live/', 'py/', 'xiaosa/',
  'XYQHiker/', 'cat/', 'biliext/', 'jsm.json', 'dianshi.json', 'fty.json'
];

function isRelativePath(str) {
  if (!str || typeof str !== 'string') return false;
  if (str.startsWith('./') || str.startsWith('../')) return true;
  // Match patterns like "json/xxx.json", "js/xxx.js", "lib/token.json"
  // but NOT "https://..." or "FbjDcUx..." (base64) or "FbjDc..."
  if (/^[a-zA-Z0-9_-]+\//.test(str) && !str.includes('http') && !str.startsWith('tvfan/')) return true;
  // Special case: tvfan/Cloud-drive.txt
  if (str.startsWith('tvfan/')) return true;
  return false;
}

function resolveRelative(str) {
  if (!str || typeof str !== 'string') return str;
  if (str.startsWith('./') || str.startsWith('../')) {
    return RELATIVE_BASE + str.replace(/^(\.\.?\/)+/, '');
  }
  if (str.startsWith('tvfan/')) {
    return RELATIVE_BASE + str;
  }
  // Match patterns like "json/xxx", "js/xxx", "lib/xxx", "XBPQ/xxx"
  if (/^[a-zA-Z0-9_-]+\//.test(str) && !str.includes('http')) {
    return RELATIVE_BASE + str;
  }
  return str;
}

// Handle complex ext strings like: ./lib/token.json$$$https://url$$$./json/wogg.json
function resolveComplexExt(str) {
  if (!str || typeof str !== 'string') return str;
  if (!str.includes('$$$')) {
    return resolveRelative(str);
  }
  // Split by $$$, resolve each part that looks like a path
  return str.split('$$$').map(part => {
    // Skip URLs, base64 strings, numbers, and special keywords
    if (!part || part.startsWith('http') || part === 'null' ||
        part === 'proxy' || part === 'noproxy' || part === 'db' ||
        part === '1' || /^[A-Za-z0-9+/=]{20,}$/.test(part) || // base64
        /^\d+$/.test(part) || // numbers
        part.includes('$$$') || // nested
        part.startsWith('socks5') ||
        part.includes('@') ||
        part.startsWith('fanty') || part.startsWith('satoken') ||
        part.startsWith('Alist') || part.startsWith('W') || part.startsWith('N') ||
        part.startsWith('XIAOMI') || part.startsWith('TUDO') || part.startsWith('MOGG') ||
        part.startsWith('LABI') || part.startsWith('NLG')) {
      return part;
    }
    return resolveRelative(part);
  }).join('$$$');
}

function fixRelativePaths(obj) {
  if (typeof obj === 'string') {
    // Handle spider format: "./jar/pg.jar;md5;hash"
    if (obj.startsWith('./') || obj.startsWith('../')) {
      const parts = obj.split(';');
      parts[0] = resolveRelative(parts[0]);
      return parts.join(';');
    }
    // Handle ext fields with $$$ separators
    if (obj.includes('$$$') && (obj.includes('/') || obj.includes('token'))) {
      return resolveComplexExt(obj);
    }
    // Handle simple relative paths in ext
    if (isRelativePath(obj)) {
      return resolveRelative(obj);
    }
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(fixRelativePaths);
  }
  if (obj && typeof obj === 'object') {
    const fixed = {};
    for (const [key, value] of Object.entries(obj)) {
      if (key === 'Cloud-drive') {
        // Cloud-drive references user token file, resolve to absolute
        fixed[key] = resolveRelative(value);
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

  // Fetch from top sources, pick the one with most sites
  const topN = Math.min(5, working.length);
  let bestConfig = null;
  let bestSource = null;
  let bestSiteCount = 0;

  for (let i = 0; i < topN; i++) {
    const source = working[i];
    // Use generous timeout for fetching full config
    const fetchTimeout = Math.max(timeoutMs * 2, 15000);
    try {
      const config = await fetchConfig(source.url, fetchTimeout);
      const siteCount = config.sites?.length || 0;
      console.log(`  ${source.name}: ${siteCount} sites (${source.elapsedMs}ms response)`);
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

  console.log(`\nSelected: ${bestSource.name} (${bestSiteCount} sites)`);
  console.log('Resolving relative paths...');

  // Fix ALL relative paths
  const fixedConfig = fixRelativePaths(bestConfig);
  if (!fixedConfig.wallpaper) {
    fixedConfig.wallpaper = 'https://picsum.photos/1920/1080';
  }

  await fs.writeFile(OUT_FILE, JSON.stringify(fixedConfig, null, 2));

  // Report what was fixed
  let fixedCount = 0;
  const checkRelative = (obj) => {
    if (typeof obj === 'string') {
      if (obj.startsWith(RELATIVE_BASE)) fixedCount++;
    }
    if (Array.isArray(obj)) obj.forEach(checkRelative);
    if (obj && typeof obj === 'object') Object.values(obj).forEach(checkRelative);
  };
  checkRelative(fixedConfig);

  console.log(`Resolved ${fixedCount} paths to absolute URLs`);

  const status = {
    updatedAt: new Date().toISOString(),
    activeSource: { name: bestSource.name, url: bestSource.url, elapsedMs: bestSource.elapsedMs, siteCount: bestSiteCount },
    availableSources: working.map(item => ({ name: item.name, url: item.url, elapsedMs: item.elapsedMs })),
    failedCount: result.results.length - working.length
  };

  await fs.writeFile(STATUS_FILE, JSON.stringify(status, null, 2));
  console.log(`\nGenerated dist/tvbox.json: ${bestSiteCount} sites, ${fixedCount} paths resolved`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
