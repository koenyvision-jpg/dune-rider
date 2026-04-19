import Phaser from 'phaser'
import { Obstacle } from '../entities/Obstacle'
import {
  OBSTACLE_BASE_INTERVAL, OBSTACLE_MIN_INTERVAL, OBSTACLE_POOL_SIZE,
  OBS_CAT1_SPEED, OBS_CAT2_SPEED, OBS_CAT3_SPEED,
  HERO_SCALE, CEILING_Y, GROUND_Y, GAME_WIDTH,
} from '../config'

type Category = 1 | 2 | 3

const CATEGORY: Record<Category, { scaleMult: number; speedMult: number; tint: number }> = {
  1: { scaleMult: 1.0, speedMult: OBS_CAT1_SPEED, tint: 0x88ddff }, // cyan-blue canopy
  2: { scaleMult: 1.2, speedMult: OBS_CAT2_SPEED, tint: 0xff8844 }, // orange canopy, bigger+slower
  3: { scaleMult: 0.8, speedMult: OBS_CAT3_SPEED, tint: 0x88ff99 }, // green canopy, smaller+faster
}

export class ObstacleSystem {
  private pool: Obstacle[] = []
  private timer = 0
  private recentYs: number[] = []

  init(scene: Phaser.Scene, group: Phaser.Physics.Arcade.Group): void {
    for (let i = 0; i < OBSTACLE_POOL_SIZE; i++) {
      const sprite = group.create(-200, -200, 'hero') as Phaser.Physics.Arcade.Sprite
      sprite.setActive(false).setVisible(false)
      const body = sprite.body as Phaser.Physics.Arcade.Body
      body.allowGravity = false
      body.enable = false
      this.pool.push(new Obstacle(sprite))
    }
  }

  update(dt: number, elapsedMs: number, scrollSpeed: number): void {
    this.timer += dt * 1000

    const interval = Math.max(
      OBSTACLE_MIN_INTERVAL,
      OBSTACLE_BASE_INTERVAL - (elapsedMs / 1000) * 15
    )

    if (this.timer >= interval) {
      this.timer = 0
      this.spawnOne(scrollSpeed)
    }

    for (const obs of this.pool) {
      if (obs.active && obs.sprite.x < -120) {
        obs.deactivate()
      }
    }
  }

  private spawnOne(scrollSpeed: number): void {
    const obs = this.pool.find(o => !o.active)
    if (!obs) return

    const cat = (Phaser.Math.Between(1, 3)) as Category
    const cfg = CATEGORY[cat]
    const scale = HERO_SCALE * cfg.scaleMult

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

    const speed = scrollSpeed * cfg.speedMult
    obs.spawn(GAME_WIDTH + 80, y, speed, scale, cfg.tint)
  }

  reset(): void {
    this.timer = 0
    this.recentYs = []
    for (const obs of this.pool) obs.deactivate()
  }
}
