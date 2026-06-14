import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const publicDir = join(__dirname, '..', 'public');

// BirdBook icon - emerald green bird on white circle background
const createBirdIconSvg = (size) => {
  const birdSize = Math.floor(size * 0.5);
  const padding = Math.floor((size - birdSize) / 2);

  return `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#10b981;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#059669;stop-opacity:1" />
        </linearGradient>
      </defs>
      <!-- Background circle -->
      <circle cx="${size/2}" cy="${size/2}" r="${size/2}" fill="url(#bgGradient)"/>
      <!-- Bird icon (simplified) -->
      <g transform="translate(${padding}, ${padding})">
        <svg width="${birdSize}" height="${birdSize}" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M16 7h.01"/>
          <path d="M3.4 18H12a8 8 0 0 0 8-8V7a4 4 0 0 0-7.28-2.3L2 20"/>
          <path d="m20 7 2 .5-2 .5"/>
          <path d="M10 18v3"/>
          <path d="M14 17.75V21"/>
          <path d="M7 18a6 6 0 0 0 3.84-10.61"/>
        </svg>
      </g>
    </svg>
  `;
};

// Create a simpler, more visible icon
const createSimpleBirdIconSvg = (size) => {
  return `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#10b981"/>
          <stop offset="100%" style="stop-color:#059669"/>
        </linearGradient>
      </defs>
      <!-- Background -->
      <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="url(#bgGrad)"/>
      <!-- Bird silhouette -->
      <g transform="translate(${size * 0.15}, ${size * 0.15}) scale(${size * 0.7 / 24})">
        <path d="M16 7h.01" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
        <path d="M3.4 18H12a8 8 0 0 0 8-8V7a4 4 0 0 0-7.28-2.3L2 20" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        <path d="m20 7 2 .5-2 .5" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        <path d="M10 18v3" stroke="white" stroke-width="2" stroke-linecap="round"/>
        <path d="M14 17.75V21" stroke="white" stroke-width="2" stroke-linecap="round"/>
      </g>
    </svg>
  `;
};

async function generateIcons() {
  const sizes = [192, 512];

  for (const size of sizes) {
    const svg = createSimpleBirdIconSvg(size);
    const outputPath = join(publicDir, `icon-${size}.png`);

    await sharp(Buffer.from(svg))
      .png()
      .toFile(outputPath);

    console.log(`Generated: icon-${size}.png`);
  }

  // Also generate favicon
  const faviconSvg = createSimpleBirdIconSvg(32);
  await sharp(Buffer.from(faviconSvg))
    .png()
    .toFile(join(publicDir, 'favicon.png'));

  console.log('Generated: favicon.png');

  // Generate apple touch icon
  const appleSvg = createSimpleBirdIconSvg(180);
  await sharp(Buffer.from(appleSvg))
    .png()
    .toFile(join(publicDir, 'apple-touch-icon.png'));

  console.log('Generated: apple-touch-icon.png');
}

generateIcons().catch(console.error);
