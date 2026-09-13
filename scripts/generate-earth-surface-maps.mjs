import sharp from "sharp";

const source = "tmp/nasa-gebco-elevation.png";
const width = 2048;
const height = 1024;

const { data, info } = await sharp(source)
  .resize(width, height, { kernel: "lanczos3" })
  .greyscale()
  .normalise()
  .blur(1.15)
  .raw()
  .toBuffer({ resolveWithObject: true });

const sample = (x, y) => {
  const wrappedX = (x + width) % width;
  const clampedY = Math.max(0, Math.min(height - 1, y));
  return data[(clampedY * width + wrappedX) * info.channels] / 255;
};

const normal = Buffer.alloc(width * height * 3);
const strength = 2.25;

for (let y = 0; y < height; y += 1) {
  const latitude = Math.abs((y / (height - 1) - 0.5) * Math.PI);
  const longitudeCorrection = 1 / Math.max(0.28, Math.cos(latitude));

  for (let x = 0; x < width; x += 1) {
    const dx = (sample(x + 1, y) - sample(x - 1, y)) * strength * longitudeCorrection;
    const dy = (sample(x, y + 1) - sample(x, y - 1)) * strength;
    const invLength = 1 / Math.hypot(dx, dy, 1);
    const offset = (y * width + x) * 3;
    normal[offset] = Math.round((-dx * invLength * 0.5 + 0.5) * 255);
    normal[offset + 1] = Math.round((dy * invLength * 0.5 + 0.5) * 255);
    normal[offset + 2] = Math.round(invLength * 255);
  }
}

await Promise.all([
  sharp(data, { raw: info })
    .webp({ lossless: true, effort: 5 })
    .toFile("public/assets/exterior/earth/elevation-2048.webp"),
  sharp(normal, { raw: { width, height, channels: 3 } })
    .webp({ quality: 92, effort: 5 })
    .toFile("public/assets/exterior/earth/normal-2048.webp"),
]);
