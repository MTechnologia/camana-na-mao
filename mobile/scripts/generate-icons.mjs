import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs/promises';

import { Jimp } from 'jimp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function usage() {
  console.log('Usage: node scripts/generate-icons.mjs <relativePathToSourcePng>');
  process.exit(1);
}

const srcArg = process.argv[2];
if (!srcArg) usage();

const projectRoot = path.resolve(__dirname, '..');
const srcPath = path.resolve(projectRoot, srcArg);
const assetsDir = path.resolve(projectRoot, 'assets');

async function main() {
  await fs.access(srcPath);

  const src = await Jimp.read(srcPath);

  // Icon targets
  const size = 1024;
  const bg = 0xffffffff; // white

  // Contain into a square with padding (no crop, no stretch)
  const contained = src.clone().contain({
    w: size,
    h: size,
  });
  const square = new Jimp({ width: size, height: size, color: bg });
  square.composite(contained, 0, 0);

  await square.write(path.join(assetsDir, 'icon.png'));

  // Adaptive icon (foreground) - keep transparent background and add extra safe padding
  const fgSize = 1024;
  const fg = src.clone().contain({
    w: Math.round(fgSize * 0.72),
    h: Math.round(fgSize * 0.72),
  });
  const fgCanvas = new Jimp({ width: fgSize, height: fgSize, color: 0x00000000 });
  fgCanvas.composite(
    fg,
    Math.round((fgSize - fg.bitmap.width) / 2),
    Math.round((fgSize - fg.bitmap.height) / 2),
  );
  await fgCanvas.write(path.join(assetsDir, 'adaptive-icon.png'));

  // Splash: Expo template uses 1242x2436-ish internally, but a square image works ok.
  await square.write(path.join(assetsDir, 'splash-icon.png'));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

