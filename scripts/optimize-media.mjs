import { readdir, stat, writeFile, readFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import pngToIco from 'png-to-ico';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const publicDir = path.join(root, 'public');
const uploadsDir = path.join(publicDir, 'wp-content', 'uploads');
const reportFile = path.join(root, 'src', 'data', 'media-optimization-report.json');

const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png']);
const WEBP_MIN_BYTES = 70 * 1024;

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const filePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(filePath)));
    } else {
      files.push(filePath);
    }
  }
  return files;
}

async function optimizeInPlace(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (!IMAGE_EXT.has(ext)) return null;

  const input = await readFile(filePath);
  const transformer = sharp(input, { failOn: 'none' });
  const meta = await transformer.metadata();

  let output;
  if (ext === '.jpg' || ext === '.jpeg') {
    output = await transformer
      .rotate()
      .jpeg({
        quality: 82,
        mozjpeg: true,
        progressive: true,
      })
      .toBuffer();
  } else if (ext === '.png') {
    output = await transformer
      .rotate()
      .png({
        compressionLevel: 9,
        effort: 10,
        adaptiveFiltering: true,
      })
      .toBuffer();
  } else {
    return null;
  }

  let replaced = false;
  if (output.length < input.length * 0.98) {
    await writeFile(filePath, output);
    replaced = true;
  }

  let webpWritten = false;
  const currentBytes = replaced ? output.length : input.length;
  if (currentBytes >= WEBP_MIN_BYTES) {
    const webpPath = filePath.replace(/\.(jpe?g|png)$/i, '.webp');
    const webpBuffer = await sharp(replaced ? output : input, { failOn: 'none' })
      .rotate()
      .webp({ quality: 82, effort: 6, smartSubsample: true })
      .toBuffer();
    if (!existsSync(webpPath) || webpBuffer.length < (await stat(webpPath)).size * 0.98) {
      await writeFile(webpPath, webpBuffer);
      webpWritten = true;
    }
  }

  return {
    filePath,
    bytesBefore: input.length,
    bytesAfter: replaced ? output.length : input.length,
    format: ext.replace('.', ''),
    width: meta.width || null,
    height: meta.height || null,
    optimizedInPlace: replaced,
    webpGenerated: webpWritten,
  };
}

async function generateBrandAssets() {
  const sourcePath = path.join(publicDir, 'brand-source-favicon.png');
  if (!existsSync(sourcePath)) return { generated: false, reason: 'brand-source-favicon.png not found' };

  const brandDir = path.join(publicDir, 'brand');
  await mkdir(brandDir, { recursive: true });

  const source = sharp(sourcePath, { failOn: 'none' }).rotate();

  await source.clone().resize(64, 64).png({ compressionLevel: 9, effort: 10 }).toFile(path.join(brandDir, 'logo-64.png'));
  await source.clone().resize(64, 64).webp({ quality: 90, effort: 6 }).toFile(path.join(brandDir, 'logo-64.webp'));
  await source.clone().resize(32, 32).png({ compressionLevel: 9, effort: 10 }).toFile(path.join(publicDir, 'favicon-32x32.png'));
  await source.clone().resize(16, 16).png({ compressionLevel: 9, effort: 10 }).toFile(path.join(publicDir, 'favicon-16x16.png'));
  await source.clone().resize(180, 180).png({ compressionLevel: 9, effort: 10 }).toFile(path.join(publicDir, 'apple-touch-icon.png'));
  await source.clone().resize(512, 512).png({ compressionLevel: 9, effort: 10 }).toFile(path.join(publicDir, 'android-chrome-512x512.png'));
  await source.clone().resize(192, 192).png({ compressionLevel: 9, effort: 10 }).toFile(path.join(publicDir, 'android-chrome-192x192.png'));

  const icoBuffer = await pngToIco([
    path.join(publicDir, 'favicon-16x16.png'),
    path.join(publicDir, 'favicon-32x32.png'),
  ]);
  await writeFile(path.join(publicDir, 'favicon.ico'), icoBuffer);

  return { generated: true };
}

async function main() {
  const files = await walk(uploadsDir);
  const imageFiles = files.filter((filePath) => IMAGE_EXT.has(path.extname(filePath).toLowerCase()));

  const results = [];
  for (const filePath of imageFiles) {
    const info = await optimizeInPlace(filePath);
    if (info) results.push(info);
  }

  const brand = await generateBrandAssets();
  const saved = results.reduce((acc, item) => acc + (item.bytesBefore - item.bytesAfter), 0);
  const optimizedCount = results.filter((item) => item.optimizedInPlace).length;
  const webpCount = results.filter((item) => item.webpGenerated).length;

  const report = {
    generatedAt: new Date().toISOString(),
    scanned: imageFiles.length,
    optimizedInPlace: optimizedCount,
    webpGenerated: webpCount,
    bytesSaved: saved,
    bytesSavedHumanMB: Number((saved / (1024 * 1024)).toFixed(2)),
    brand,
  };

  await writeFile(reportFile, JSON.stringify(report, null, 2));
  console.log(`Scanned: ${report.scanned}`);
  console.log(`Optimized in place: ${report.optimizedInPlace}`);
  console.log(`Generated/updated webp: ${report.webpGenerated}`);
  console.log(`Saved: ${report.bytesSavedHumanMB} MB`);
  console.log(`Report: ${reportFile}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
