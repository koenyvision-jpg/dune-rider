import { MAX_ENERGY, DRAIN_RATE, RECHARGE_RATE, RECHARGE_THRESHOLD } from '../config'

export type EnergyState = 'DRAINING' | 'CHARGING' | 'DEPLETED'

export class EnergySystem {
  energy = MAX_ENERGY
  state: EnergyState = 'CHARGING'
  private depletedCallback: (() => void) | null = null

  onDepleted(cb: () => void): void {
    this.depletedCallback = cb
  }

  update(dt: number, isHolding: boolean, drainMult = 1): boolean {
    // returns effective isHolding (false when depleted)
    if (this.state === 'DEPLETED') {
      this.energy = Math.min(MAX_ENERGY, this.energy + RECHARGE_RATE * dt)
      if (this.energy >= RECHARGE_THRESHOLD) {
        this.state = 'CHARGING'
      }
      return false
    }

    if (isHolding) {
      this.state = 'DRAINING'
      this.energy = Math.max(0, this.energy - DRAIN_RATE * drainMult * dt)
      if (this.energy <= 0) {
        this.state = 'DEPLETED'
        this.depletedCallback?.()
        return false
      }
      return true
    } else {
      this.state = 'CHARGING'
      this.energy = Math.min(MAX_ENERGY, this.energy + RECHARGE_RATE * dt)
      return false
    }
  }

  getNormalized(): number {
    return this.energy / MAX_ENERGY
  }

  reset(): void {
    this.energy = MAX_ENERGY
    this.state = 'CHARGING'
  }
}
