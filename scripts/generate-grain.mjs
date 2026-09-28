/**
 * Generates the paper-grain texture used over the public site: a small tiling image of
 * warm-brown specks with low alpha, pre-rendered once so phones never compute a live filter.
 *
 *   node scripts/generate-grain.mjs
 *
 * Deterministic (seeded), so re-running produces the same files.
 * Also writes grain-light.webp for the pink palette preview (branch design-pink): the same
 * specks at about half the strength, tinted rose-plum instead of earth brown.
 */
import sharp from 'sharp'

const SIZE = 128
const SEED = 20260925

const variants = [
  // warm earth brown, from the palette's --earth
  { out: 'public/textures/grain.webp', rgb: [58, 42, 34], strength: 1 },
  // palette preview only: lighter and rose-toned
  { out: 'public/textures/grain-light.webp', rgb: [74, 40, 52], strength: 0.5 },
]

for (const { out, rgb, strength } of variants) {
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
    pixels[i * 4 + 0] = rgb[0]
    pixels[i * 4 + 1] = rgb[1]
    pixels[i * 4 + 2] = rgb[2]
    pixels[i * 4 + 3] = Math.round(alpha * strength)
  }

  const info = await sharp(pixels, { raw: { width: SIZE, height: SIZE, channels: 4 } })
    .webp({ quality: 55, alphaQuality: 60, effort: 6 })
    .toFile(out)

  console.log(`${out}: ${SIZE}×${SIZE}, ${(info.size / 1024).toFixed(1)} KB`)
}
