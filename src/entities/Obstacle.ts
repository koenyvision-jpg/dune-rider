import Phaser from 'phaser'

export class Obstacle {
  sprite: Phaser.Physics.Arcade.Sprite
  active = false

  constructor(sprite: Phaser.Physics.Arcade.Sprite) {
    this.sprite = sprite
    this.sprite.setActive(false).setVisible(false)
  }

  spawn(x: number, y: number, speed: number, scale: number, tint: number): void {
    this.active = true
    this.sprite.setPosition(x, y)
    this.sprite.setScale(scale)
    const body = this.sprite.body as Phaser.Physics.Arcade.Body
    body.enable = true
    body.setSize(900, 1300)
    body.setOffset(66, 180)
    this.sprite.setTint(tint)
    this.sprite.setFlipX(true)
    this.sprite.setActive(true).setVisible(true)
    this.sprite.setVelocityX(-speed)
  }

  deactivate(): void {
    this.active = false
    ;(this.sprite.body as Phaser.Physics.Arcade.Body).enable = false
    this.sprite.setActive(false).setVisible(false)
    this.sprite.setVelocityX(0)
    this.sprite.clearTint()
  }
}
