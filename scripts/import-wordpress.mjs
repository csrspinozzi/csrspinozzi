import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE = 'https://csrspinozzi.com';
const API = `${SITE}/wp-json/wp/v2`;

const fields = [
  'id',
  'date',
  'modified',
  'slug',
  'status',
  'type',
  'link',
  'title',
  'excerpt',
  'content',
  'yoast_head_json'
].join(',');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const outputFile = path.join(root, 'src', 'data', 'wordpress-content.json');

function normalizePath(link) {
  const parsed = new URL(link);
  const cleaned = parsed.pathname.replace(/\/+$/, '');
  return cleaned === '' ? '/' : cleaned;
}

function rewriteInternalLinks(html = '') {
  return html.replaceAll('https://csrspinozzi.com', '');
}

async function fetchCollection(resource) {
  const all = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const url = `${API}/${resource}?per_page=100&page=${page}&_fields=${fields}`;
    const res = await fetch(url);

    if (!res.ok) {
      throw new Error(`Failed ${resource} page ${page}: ${res.status} ${res.statusText}`);
    }

    totalPages = Number(res.headers.get('x-wp-totalpages') || '1');
    const data = await res.json();

    for (const item of data) {
      all.push({
        id: item.id,
        date: item.date,
        modified: item.modified,
        slug: item.slug,
        type: item.type,
        status: item.status,
        link: item.link,
        path: normalizePath(item.link),
        title: item.title?.rendered || '',
        excerpt: rewriteInternalLinks(item.excerpt?.rendered || ''),
        content: rewriteInternalLinks(item.content?.rendered || ''),
        yoast: item.yoast_head_json || null
      });
    }

    page += 1;
  }

  return all;
}

async function main() {
  const [pages, posts] = await Promise.all([
    fetchCollection('pages'),
    fetchCollection('posts')
  ]);

  const items = [...pages, ...posts].sort((a, b) => a.path.localeCompare(b.path));

  const payload = {
    source: SITE,
    fetchedAt: new Date().toISOString(),
    totals: {
      pages: pages.length,
      posts: posts.length,
      all: items.length
    },
    items
  };

  await mkdir(path.dirname(outputFile), { recursive: true });
  await writeFile(outputFile, JSON.stringify(payload, null, 2));

  console.log(`Imported ${items.length} items (${pages.length} pages, ${posts.length} posts).`);
  console.log(`Wrote: ${outputFile}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
