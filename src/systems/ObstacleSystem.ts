import Phaser from 'phaser'
import { Obstacle } from '../entities/Obstacle'
import {
  OBSTACLE_BASE_INTERVAL, OBSTACLE_MIN_INTERVAL, OBSTACLE_POOL_SIZE,
  ENEMY_SCALE, ENEMY_BANIT_SPEED, ENEMY_M2RED_SPEED, CEILING_Y, GROUND_Y, GAME_WIDTH,
} from '../config'

const ENEMY_TYPES = [
  { key: 'enemy-banit', speed: ENEMY_BANIT_SPEED },
  { key: 'enemy-m2red', speed: ENEMY_M2RED_SPEED },
]

export class ObstacleSystem {
  private pool: Obstacle[] = []
  private timer = 0
  private recentYs: number[] = []

  init(scene: Phaser.Scene, group: Phaser.Physics.Arcade.Group): void {
    for (let i = 0; i < OBSTACLE_POOL_SIZE; i++) {
      const sprite = group.create(-200, -200, 'enemy-banit') as Phaser.Physics.Arcade.Sprite
      sprite.setActive(false).setVisible(false)
      const body = sprite.body as Phaser.Physics.Arcade.Body
      body.allowGravity = false
      body.enable = false
      this.pool.push(new Obstacle(sprite))
    }
  }

  update(dt: number, elapsedMs: number, _scrollSpeed: number): void {
    this.timer += dt * 1000

    const interval = Math.max(
      OBSTACLE_MIN_INTERVAL,
      OBSTACLE_BASE_INTERVAL - (elapsedMs / 1000) * 15
    )

    if (this.timer >= interval) {
      this.timer = 0
      this.spawnOne()
    }

    for (const obs of this.pool) {
      if (obs.active && obs.sprite.x < -120) {
        obs.deactivate()
      }
    }
  }

  private spawnOne(): void {
    const obs = this.pool.find(o => !o.active)
    if (!obs) return

    const type = ENEMY_TYPES[Phaser.Math.Between(0, ENEMY_TYPES.length - 1)]

    const minY = CEILING_Y + 30
    const maxY = GROUND_Y - 30
    let y = Phaser.Math.Between(minY, maxY)
    let attempts = 0
    while (this.recentYs.some(ry => Math.abs(ry - y) < 60) && attempts < 10) {
      y = Phaser.Math.Between(minY, maxY)
      attempts++
    }
    this.recentYs.push(y)
    if (this.recentYs.length > 3) this.recentYs.shift()

    obs.spawn(GAME_WIDTH + 80, y, type.speed, ENEMY_SCALE, type.key)
  }

  reset(): void {
    this.timer = 0
    this.recentYs = []
    for (const obs of this.pool) obs.deactivate()
  }
}
