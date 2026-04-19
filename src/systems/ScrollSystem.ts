import { CRUISE_SPEED, HOLD_SPEED } from '../config'
import { lerp } from '../utils/math'

export class ScrollSystem {
  currentSpeed = CRUISE_SPEED

  update(dt: number, isHolding: boolean): void {
    const target = isHolding ? HOLD_SPEED : CRUISE_SPEED
    this.currentSpeed = lerp(this.currentSpeed, target, dt * 1.2)
  }

  reset(): void {
    this.currentSpeed = CRUISE_SPEED
  }
}
