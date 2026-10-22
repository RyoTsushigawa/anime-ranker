// Builds the data for the public Higher or Lower Ranker: every anime on AniList with its site median,
// titles, format, episode count, airing status and sequel/prequel links, plus cover image addresses.
// Usage: node build-db.mjs <output folder>
// Writes <folder>/db.json            {made, rows: {anilistId: [malId, median, english, romaji, format, episodes, status, sequels[], prequels[]]}}
//        <folder>/cover-urls.json    {anilistId: url}   (used by build-covers.mjs, not published)
// Walks AniList ids in blocks of 500 (AniList won't page past 5000 results). Resumes from db.partial.json.
import { writeFileSync, readFileSync, renameSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const outDir = process.argv[2] || '.';
const partialPath = join(outDir, 'db.partial.json');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const BLOCK = 500;
const Q = `query($ids:[Int],$page:Int){Page(page:$page,perPage:50){pageInfo{hasNextPage}
  media(type:ANIME,id_in:$ids){id idMal format episodes status title{english romaji} coverImage{medium}
    stats{scoreDistribution{score amount}} relations{edges{relationType node{id type}}}}}}`;
function median(dist) {
  const rows = (dist || []).filter(r => r.amount > 0).sort((a, b) => a.score - b.score);
  const total = rows.reduce((s, r) => s + r.amount, 0); if (!total) return 0;
  let cum = 0;
  for (const r of rows) { if (cum + r.amount >= total / 2) return Math.round(r.score - 5 + ((total / 2 - cum) / r.amount) * 10) / 10; cum += r.amount; } // 0-10 scale, one decimal
  return 0;
}
let rows = {}, covers = {}, after = 0;
if (existsSync(partialPath)) {
  const prev = JSON.parse(readFileSync(partialPath, 'utf8'));
  ({ rows, covers, after } = prev);
  console.log(`Resuming after id ${after} (${Object.keys(rows).length} saved)`);
}
const savePartial = () => writeFileSync(partialPath, JSON.stringify({ rows, covers, after }));
async function ask(body) {
  for (let tries = 0; ; tries++) {
    let res;
    try { res = await fetch('https://graphql.anilist.co', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(body) }); }
    catch (e) { if (tries < 5) { await sleep(10000); continue; } throw e; }
    if (res.status === 429 || res.status >= 500) { await sleep(((+res.headers.get('retry-after')) || 30) * 1000); continue; }
    if (!res.ok) { savePartial(); throw new Error(`AniList answered ${res.status} after id ${after}: ${await res.text()}`); }
    return (await res.json()).data;
  }
}
const maxId = (await ask({ query: 'query{Page(perPage:1){media(type:ANIME,sort:ID_DESC){id}}}' })).Page.media[0].id;
console.log(`Highest anime id: ${maxId}`);
await sleep(2100);
let calls = 0;
while (after < maxId) {
  const ids = Array.from({ length: BLOCK }, (_, i) => after + 1 + i);
  for (let page = 1; ; page++) {
    const p = (await ask({ query: Q, variables: { ids, page } })).Page;
    for (const m of p.media) {
      const rel = t => (m.relations?.edges || []).filter(e => e.relationType === t && e.node.type === 'ANIME').map(e => e.node.id);
      rows[m.id] = [m.idMal || 0, median(m.stats?.scoreDistribution), m.title.english || '', m.title.romaji || '', m.format || '', m.episodes || 0, m.status || '', rel('SEQUEL'), rel('PREQUEL')];
      if (m.coverImage?.medium) covers[m.id] = m.coverImage.medium;
    }
    await sleep(2100);
    if (!p.pageInfo.hasNextPage) break;
  }
  after += BLOCK;
  if (++calls % 10 === 0) { console.log(`up to id ${after} of ${maxId}: ${Object.keys(rows).length} anime`); savePartial(); }
}
writeFileSync(join(outDir, 'db.json'), JSON.stringify({ made: new Date().toISOString(), rows }));
writeFileSync(join(outDir, 'cover-urls.json'), JSON.stringify(covers));
renameSync(partialPath, join(outDir, 'db.previous-run.json'));
console.log(`Done: ${Object.keys(rows).length} anime, ${Object.keys(covers).length} cover addresses.`);
