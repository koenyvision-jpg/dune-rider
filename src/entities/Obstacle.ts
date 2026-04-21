import Phaser from 'phaser'

const HITBOX: Record<string, { w: number; h: number; ox: number; oy: number }> = {
  'enemy-banit': { w: 350, h: 500, ox: 233, oy: 291 },  // 816×1082 source
  'enemy-m2red': { w: 350, h: 450, ox: 233, oy: 263 },  // 816×976 source
}

export class Obstacle {
  sprite: Phaser.Physics.Arcade.Sprite
  active = false

  constructor(sprite: Phaser.Physics.Arcade.Sprite) {
    this.sprite = sprite
    this.sprite.setActive(false).setVisible(false)
  }

  spawn(x: number, y: number, speed: number, scale: number, textureKey: string): void {
    this.active = true
    this.sprite.setTexture(textureKey)
    this.sprite.setPosition(x, y)
    this.sprite.setScale(scale)
    const body = this.sprite.body as Phaser.Physics.Arcade.Body
    body.enable = true
    const hb = HITBOX[textureKey]
    body.setSize(hb.w, hb.h)
    body.setOffset(hb.ox, hb.oy)
    this.sprite.setActive(true).setVisible(true)
    this.sprite.setVelocityX(-speed)
  }

  deactivate(): void {
    this.active = false
    ;(this.sprite.body as Phaser.Physics.Arcade.Body).enable = false
    this.sprite.setActive(false).setVisible(false)
    this.sprite.setVelocityX(0)
  }
}
