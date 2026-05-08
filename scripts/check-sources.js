import fs from 'node:fs/promises';
import { performance } from 'node:perf_hooks';

const SOURCE_FILE = new URL('../sources.json', import.meta.url);
const OUT_FILE = new URL('../dist/check-result.json', import.meta.url);

async function fetchWithTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const start = performance.now();
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'user-agent': 'tvbox-auto-template/1.0'
      }
    });
    const elapsedMs = Math.round(performance.now() - start);
    const contentType = res.headers.get('content-type') || '';
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      // Some endpoints return text config. Keep it as reachable but not mergeable.
    }

    return {
      ok: res.ok,
      status: res.status,
      elapsedMs,
      contentType,
      isJson: Boolean(json && typeof json === 'object'),
      hasSites: Boolean(json?.sites && Array.isArray(json.sites)),
      hasLives: Boolean(json?.lives && Array.isArray(json.lives)),
      size: Buffer.byteLength(text, 'utf8')
    };
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  await fs.mkdir(new URL('../dist/', import.meta.url), { recursive: true });
  const config = JSON.parse(await fs.readFile(SOURCE_FILE, 'utf8'));
  const timeoutMs = Number(config.timeoutMs || 6000);
  const sources = (config.sources || []).filter(item => item.enabled !== false && item.url);

  const results = [];
  for (const source of sources) {
    try {
      const result = await fetchWithTimeout(source.url, timeoutMs);
      results.push({
        name: source.name || source.url,
        url: source.url,
        ...result
      });
    } catch (error) {
      results.push({
        name: source.name || source.url,
        url: source.url,
        ok: false,
        error: error?.name === 'AbortError' ? 'timeout' : String(error?.message || error)
      });
    }
  }

  results.sort((a, b) => {
    if (a.ok !== b.ok) return a.ok ? -1 : 1;
    return (a.elapsedMs || 999999) - (b.elapsedMs || 999999);
  });

  await fs.writeFile(OUT_FILE, JSON.stringify({ updatedAt: new Date().toISOString(), results }, null, 2));

  for (const item of results) {
    const mark = item.ok ? '✅' : '❌';
    console.log(`${mark} ${item.elapsedMs ?? '-'}ms ${item.url}`);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
