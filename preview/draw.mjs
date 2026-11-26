import fs from 'node:fs';
import * as fontkit from 'fontkit';

const workspace = new URL('../', import.meta.url);
const openFont = (path) => fontkit.openSync(new URL(path, workspace));

const openSans = openFont('test/data/OpenSans/OpenSans-Regular.ttf');
const appleFont = openFont('test/data/ss-emoji/ss-emoji-apple.ttf');
const microsoftFont = openFont('test/data/ss-emoji/ss-emoji-microsoft.ttf');

const A = openSans.glyphForCodePoint(0x41);
const eacute = openSans.glyphForCodePoint(0xe9);
const appleEmoji = appleFont.glyphForCodePoint(0x1f61c);
const microsoftEmoji = microsoftFont.glyphForCodePoint(0x1f61c);

const PREVIEW_SIZE = 160;
const appleImage = appleEmoji.getImageForSize(PREVIEW_SIZE);
if (!appleImage) {
  throw new Error(
    'The Apple SBIX glyph does not contain an image at the requested size.',
  );
}

const appleImageMime = (() => {
  switch (appleImage.type.trim().toLowerCase()) {
    case 'png':
      return 'image/png';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    default:
      return `image/${appleImage.type.trim().toLowerCase()}`;
  }
})();
const appleImageHref = `data:${appleImageMime};base64,${appleImage.data.toString('base64')}`;
const microsoftLayers = microsoftEmoji.layers;
if (microsoftLayers.length !== 3) {
  throw new Error(
    `Expected 3 Microsoft COLR layers, received ${microsoftLayers.length}.`,
  );
}

const toHexColor = (color) => {
  const channel = (value) =>
    Math.max(0, Math.min(255, Math.round(value)))
      .toString(16)
      .padStart(2, '0');
  return `#${channel(color.red)}${channel(color.green)}${channel(color.blue)}`;
};

const outlineItems = [
  { id: 'latin-capital-a', glyph: A, font: openSans, label: 'A' },
  { id: 'latin-e-acute', glyph: eacute, font: openSans, label: 'é' },
];

const placements = [];
let penX = 48;
for (const item of outlineItems) {
  const scale = PREVIEW_SIZE / item.font.unitsPerEm;
  placements.push({ ...item, x: penX, y: 200, scale });
  penX += item.glyph.advanceWidth * scale;
}

const appleScale = PREVIEW_SIZE / appleFont.unitsPerEm;
placements.push({
  id: 'apple-sbix-stuck-out-tongue-winking-eye',
  kind: 'sbix',
  glyph: appleEmoji,
  font: appleFont,
  x: penX,
  y: 200,
  scale: appleScale,
});
penX += appleEmoji.advanceWidth * appleScale;

const microsoftScale = PREVIEW_SIZE / microsoftFont.unitsPerEm;
placements.push({
  id: 'microsoft-colr-stuck-out-tongue-winking-eye',
  kind: 'colr',
  glyph: microsoftEmoji,
  font: microsoftFont,
  x: penX,
  y: 200,
  scale: microsoftScale,
});
penX += microsoftEmoji.advanceWidth * microsoftScale;

const width = Math.ceil(penX + 48);
const height = 260;
const baseline = 200;

const renderOutline = (item) => `
  <g id="${item.id}"
     data-glyph-id="${item.glyph.id}"
     data-advance-width="${item.glyph.advanceWidth}"
     transform="translate(${item.x} ${item.y}) scale(${item.scale} ${-item.scale})">
    <path d="${item.glyph.path.toSVG()}" fill="#202124" fill-rule="nonzero"/>
  </g>`;

const renderApple = (item) => `
  <g id="${item.id}"
     data-glyph-id="${item.glyph.id}"
     data-glyph-type="${item.glyph.type}"
     data-advance-width="${item.glyph.advanceWidth}"
     data-bbox="${item.glyph.bbox.minX},${item.glyph.bbox.minY},${item.glyph.bbox.maxX},${item.glyph.bbox.maxY}"
     data-image-bytes="${appleImage.data.length}"
     data-image-type="${appleImage.type.trim()}"
     data-image-origin-x="${appleImage.originX}"
     data-image-origin-y="${appleImage.originY}">
    <image href="${appleImageHref}"
           xlink:href="${appleImageHref}"
           x="${item.x + appleImage.originX * item.scale}"
           y="${baseline - PREVIEW_SIZE - appleImage.originY * item.scale}"
           width="${PREVIEW_SIZE}"
           height="${PREVIEW_SIZE}"/>
    <g transform="translate(${item.x} ${item.y}) scale(${item.scale} ${-item.scale})">
      <path d="${item.glyph.path.toSVG()}" fill="none" stroke="none" aria-hidden="true"/>
    </g>
  </g>`;

const renderMicrosoft = (item) => {
  return `
  <g id="${item.id}"
     data-glyph-id="${item.glyph.id}"
     data-glyph-type="${item.glyph.type}"
     data-advance-width="${item.glyph.advanceWidth}"
     data-layer-count="${microsoftLayers.length}"
     transform="translate(${item.x} ${item.y}) scale(${item.scale} ${-item.scale})">
    ${microsoftLayers
      .map((layer, index) => {
        const opacity = layer.color.alpha / 255;
        return `<path data-layer-index="${index}"
          data-layer-glyph-id="${layer.glyph.id}"
          data-color-rgb="${layer.color.red},${layer.color.green},${layer.color.blue}"
          d="${layer.glyph.path.toSVG()}"
          fill="${toHexColor(layer.color)}"
          fill-opacity="${opacity}"
          fill-rule="nonzero"/>`;
      })
      .join('\n    ')}
  </g>`;
};

const body = placements
  .map((item) => {
    if (item.kind === 'sbix') return renderApple(item);
    if (item.kind === 'colr') return renderMicrosoft(item);
    return renderOutline(item);
  })
  .join('\n');

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg"
     xmlns:xlink="http://www.w3.org/1999/xlink"
     width="${width}"
     height="${height}"
     viewBox="0 0 ${width} ${height}"
     role="img"
     aria-label="Chat bubble containing A, e acute, an Apple SBIX emoji, and a Microsoft COLR emoji">
  <title>A, é, and two color 😜 glyphs</title>
  <rect x="24" y="24" width="${width - 48}" height="212" rx="30" ry="30"
        fill="#fff7e3" stroke="#e8d8ad" stroke-width="2"/>
  ${body}
</svg>
`;

fs.writeFileSync(new URL('./out.svg', import.meta.url), svg);

const aPath = A.path.toSVG();
const ePath = eacute.path.toSVG();
console.log(
  `OpenSans A: gid=${A.id} advanceWidth=${A.advanceWidth} pathLength=${aPath.length} startsExpected=${aPath.startsWith('M1120 0L938 465')} prefix=${aPath.slice(0, 20)}`,
);
console.log(
  `OpenSans é: gid=${eacute.id} advanceWidth=${eacute.advanceWidth} pathLength=${ePath.length} startsExpected=${ePath.startsWith('M639 -20Q396 -20')} prefix=${ePath.slice(0, 20)}`,
);
console.log(
  `Apple 😜: gid=${appleEmoji.id} type=${appleEmoji.type} unitsPerEm=${appleFont.unitsPerEm} advanceWidth=${appleEmoji.advanceWidth} bbox=${appleEmoji.bbox.minX},${appleEmoji.bbox.minY},${appleEmoji.bbox.maxX},${appleEmoji.bbox.maxY} imageType=${appleImage.type.trim()} imageBytes=${appleImage.data.length} origin=${appleImage.originX},${appleImage.originY}`,
);
console.log(
  `Microsoft 😜: gid=${microsoftEmoji.id} type=${microsoftEmoji.type} unitsPerEm=${microsoftFont.unitsPerEm} advanceWidth=${microsoftEmoji.advanceWidth} layers=${microsoftLayers.length} colors=${microsoftLayers
    .map((layer) => toHexColor(layer.color))
    .join(',')}`,
);
console.log(`wrote preview/out.svg (${width}x${height})`);
