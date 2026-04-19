// Simple 1D gradient noise
const perm = new Uint8Array(512)
const p = new Uint8Array(256)
for (let i = 0; i < 256; i++) p[i] = i
for (let i = 255; i > 0; i--) {
  const j = Math.floor(Math.random() * (i + 1));
  [p[i], p[j]] = [p[j], p[i]]
}
for (let i = 0; i < 512; i++) perm[i] = p[i & 255]

function fade(t: number) { return t * t * t * (t * (t * 6 - 15) + 10) }
function grad1(hash: number, x: number) { return (hash & 1) === 0 ? x : -x }

export function perlin1D(x: number): number {
  const X = Math.floor(x) & 255
  const xf = x - Math.floor(x)
  const u = fade(xf)
  const a = perm[X]
  const b = perm[X + 1]
  return lerp1(grad1(a, xf), grad1(b, xf - 1), u)
}

function lerp1(a: number, b: number, t: number) { return a + t * (b - a) }
