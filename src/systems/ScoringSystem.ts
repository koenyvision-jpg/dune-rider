import { SCORE_SCALE, SCORE_MILESTONES } from '../config'

export class ScoringSystem {
  score = 0
  private nextMilestoneIndex = 0
  private milestoneCallback: ((score: number) => void) | null = null

  onMilestone(cb: (score: number) => void): void {
    this.milestoneCallback = cb
  }

  update(dt: number, speed: number): void {
    this.score += speed * dt * SCORE_SCALE

    if (this.nextMilestoneIndex < SCORE_MILESTONES.length) {
      if (this.score >= SCORE_MILESTONES[this.nextMilestoneIndex]) {
        this.milestoneCallback?.(Math.floor(this.score))
        this.nextMilestoneIndex++
      }
    }
  }

  getDisplay(): number {
    return Math.floor(this.score)
  }

  reset(): void {
    this.score = 0
    this.nextMilestoneIndex = 0
  }
}
