import {
  GRAVITY, HOLD_LIFT, DRAG_COEFFICIENT,
  TERMINAL_VELOCITY, MAX_UPWARD_VELOCITY, CEILING_Y, GROUND_Y, EXTRA_TOP
} from '../config'
import { clamp } from '../utils/math'

export class PhysicsSystem {
  velocityY = 0

  // liftMult: 1→0 as hold duration grows (diminishing lift)
  // gravityMult: 0→1 as release duration grows (building fall)
  update(dt: number, isHolding: boolean, windForce: number, liftMult = 1, gravityMult = 1, upwardCap = MAX_UPWARD_VELOCITY): number {
    let acceleration = GRAVITY * gravityMult + windForce
    if (isHolding) acceleration += HOLD_LIFT * liftMult

    this.velocityY += acceleration * dt
    this.velocityY *= Math.pow(DRAG_COEFFICIENT, dt * 60)
    this.velocityY = clamp(this.velocityY, upwardCap, TERMINAL_VELOCITY)

    return this.velocityY * dt
  }

  clampY(y: number): number {
    return clamp(y, CEILING_Y - EXTRA_TOP, GROUND_Y)
  }

  isAtCeiling(y: number): boolean {
    return y <= CEILING_Y - EXTRA_TOP
  }

  isAtGround(y: number): boolean {
    return y >= GROUND_Y
  }

  reset(): void {
    this.velocityY = 0
  }
}
