import { mkdir, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ORIGIN = 'https://csrspinozzi.com';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const sourceFile = path.join(root, 'src', 'data', 'wordpress-content.json');
const publicDir = path.join(root, 'public');
const reportFile = path.join(root, 'src', 'data', 'wordpress-assets-report.json');

function extractAssetPaths(text) {
  const matches = text.match(/(?:https?:\/\/csrspinozzi\.com)?\/wp-content\/uploads\/[^"'<>\s)]+/g) || [];
  return matches.map((m) => m.replace(/^https?:\/\/csrspinozzi\.com/, ''));
}

async function fetchBuffer(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText}`);
  }
  const arr = await res.arrayBuffer();
  return Buffer.from(arr);
}

async function main() {
  const raw = await readFile(sourceFile, 'utf8');
  const data = JSON.parse(raw);

  let blob = '';
  for (const item of data.items) {
    blob += `\n${item.content || ''}\n${item.excerpt || ''}\n`;
    if (item.yoast) blob += `${JSON.stringify(item.yoast)}\n`;
  }

  const uniquePaths = [...new Set(extractAssetPaths(blob))].sort();

  let ok = 0;
  let failed = 0;
  const failures = [];

  for (const assetPath of uniquePaths) {
    const cleanPath = decodeURI(assetPath);
    const filePath = path.join(publicDir, cleanPath.replace(/^\//, ''));
    const fileDir = path.dirname(filePath);
    const remoteUrl = `${ORIGIN}${encodeURI(cleanPath)}`;

    try {
      const buffer = await fetchBuffer(remoteUrl);
      await mkdir(fileDir, { recursive: true });
      await writeFile(filePath, buffer);
      ok += 1;
      process.stdout.write(`OK   ${assetPath}\n`);
    } catch (error) {
      failed += 1;
      failures.push({ assetPath, remoteUrl, error: String(error) });
      process.stdout.write(`FAIL ${assetPath} -> ${String(error)}\n`);
    }
  }

  const report = {
    source: ORIGIN,
    attempted: uniquePaths.length,
    downloaded: ok,
    failed,
    failures,
    generatedAt: new Date().toISOString()
  };

  await writeFile(reportFile, JSON.stringify(report, null, 2));

  console.log(`\nDownloaded ${ok}/${uniquePaths.length} assets.`);
  console.log(`Report: ${reportFile}`);

  if (failed > 0) {
    process.exitCode = 2;
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
