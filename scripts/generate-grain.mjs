/**
 * Generates the paper-grain texture used over the public site: a small tiling image of
 * warm-brown specks with low alpha, pre-rendered once so phones never compute a live filter.
 *
 *   node scripts/generate-grain.mjs
 *
 * Deterministic (seeded), so re-running produces the same file.
 */
import sharp from 'sharp'

const SIZE = 128
const SEED = 20260925
const OUT = 'public/textures/grain.webp'

// Small seeded PRNG (mulberry32) so the texture is reproducible.
let state = SEED
const random = () => {
  state |= 0
  state = (state + 0x6d2b79f5) | 0
  let t = Math.imul(state ^ (state >>> 15), 1 | state)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

const pixels = Buffer.alloc(SIZE * SIZE * 4)
for (let i = 0; i < SIZE * SIZE; i++) {
  // Mostly faint specks, a few darker ones: reads as paper fibre, not digital noise.
  const r = random()
  const alpha = r < 0.72 ? Math.round(r * 18) : Math.round(14 + (r - 0.72) * 90)
  pixels[i * 4 + 0] = 58 // warm earth brown, from the palette's --earth
  pixels[i * 4 + 1] = 42
  pixels[i * 4 + 2] = 34
  pixels[i * 4 + 3] = alpha
}

const info = await sharp(pixels, { raw: { width: SIZE, height: SIZE, channels: 4 } })
  .webp({ quality: 55, alphaQuality: 60, effort: 6 })
  .toFile(OUT)

console.log(`${OUT}: ${SIZE}×${SIZE}, ${(info.size / 1024).toFixed(1)} KB`)
