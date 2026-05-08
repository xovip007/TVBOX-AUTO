import fs from 'node:fs/promises';

const SOURCE_FILE = new URL('../sources.json', import.meta.url);
const RESULT_FILE = new URL('../dist/check-result.json', import.meta.url);
const OUT_FILE = new URL('../dist/tvbox.json', import.meta.url);
const STATUS_FILE = new URL('../dist/status.json', import.meta.url);

function uniqueByUrl(items) {
  const seen = new Set();
  return items.filter(item => {
    if (!item?.url || seen.has(item.url)) return false;
    seen.add(item.url);
    return true;
  });
}

async function main() {
  await fs.mkdir(new URL('../dist/', import.meta.url), { recursive: true });
  const sourceConfig = JSON.parse(await fs.readFile(SOURCE_FILE, 'utf8'));
  const result = JSON.parse(await fs.readFile(RESULT_FILE, 'utf8'));
  const maxActiveSources = Number(sourceConfig.maxActiveSources || 3);

  const active = uniqueByUrl(
    result.results
      .filter(item => item.ok && item.isJson && item.hasSites)
      .sort((a, b) => (a.elapsedMs || 999999) - (b.elapsedMs || 999999))
  ).slice(0, maxActiveSources);

  const tvbox = {
    spider: '',
    sites: active.map(item => ({
      key: item.name,
      name: item.name,
      type: 3,
      api: item.url,
      searchable: 1,
      quickSearch: 1,
      filterable: 1
    })),
    lives: [],
    parses: [],
    flags: [],
    ads: []
  };

  const status = {
    updatedAt: new Date().toISOString(),
    activeCount: active.length,
    activeSources: active.map(item => ({ name: item.name, url: item.url, elapsedMs: item.elapsedMs })),
    failedCount: result.results.length - active.length
  };

  await fs.writeFile(OUT_FILE, JSON.stringify(tvbox, null, 2));
  await fs.writeFile(STATUS_FILE, JSON.stringify(status, null, 2));
  console.log(`Generated dist/tvbox.json with ${active.length} active source(s).`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
