import { WIND_CHANGE_SPEED, MIN_WIND, MAX_WIND } from '../config'
import { perlin1D } from '../utils/perlinNoise'
import { mapRange, lerp } from '../utils/math'

export type WindCategory = 'strong' | 'moderate' | 'weak' | 'dying'

export class WindSystem {
  private noiseTime = Math.random() * 1000
  currentWind = 0
  private displayWind = 0

  update(delta: number): void {
    this.noiseTime += delta * WIND_CHANGE_SPEED
    const raw = perlin1D(this.noiseTime)
    this.currentWind = mapRange(raw, -1, 1, MIN_WIND, MAX_WIND)
    this.displayWind = lerp(this.displayWind, this.currentWind, 0.02)
  }

  getCategory(): WindCategory {
    const w = this.displayWind
    if (w > MAX_WIND * 0.5) return 'strong'
    if (w > 0) return 'moderate'
    if (w > MIN_WIND * 0.5) return 'weak'
    return 'dying'
  }

  getDisplayWind(): number {
    return this.displayWind
  }

  reset(): void {
    this.noiseTime = Math.random() * 1000
    this.currentWind = 0
    this.displayWind = 0
  }
}
