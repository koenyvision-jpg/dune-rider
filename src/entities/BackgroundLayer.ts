import Phaser from 'phaser'

export class BackgroundLayer {
  private tile: Phaser.GameObjects.TileSprite
  parallaxFactor: number

  constructor(scene: Phaser.Scene, tile: Phaser.GameObjects.TileSprite, parallaxFactor: number) {
    this.tile = tile
    this.parallaxFactor = parallaxFactor
  }

  update(speed: number, dt: number): void {
    this.tile.tilePositionX += speed * this.parallaxFactor * dt
  }
}
