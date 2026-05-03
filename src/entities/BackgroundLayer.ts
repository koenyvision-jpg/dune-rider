import Phaser from 'phaser'

export class BackgroundLayer {
  private tile: Phaser.GameObjects.TileSprite
  parallaxFactor: number
  private baseSpriteY: number
  private respondToVertical: boolean

  constructor(
    scene: Phaser.Scene,
    tile: Phaser.GameObjects.TileSprite,
    parallaxFactor: number,
    respondToVertical = true
  ) {
    this.tile = tile
    this.parallaxFactor = parallaxFactor
    this.baseSpriteY = tile.y
    this.respondToVertical = respondToVertical
  }

  update(cameraScrollX: number, cameraScrollY: number): void {
    // Horizontal: parallax via texture offset
    this.tile.tilePositionX = cameraScrollX * this.parallaxFactor

    // Vertical: shift sprite screen position to match camera scroll.
    // All responding layers move together as one — no per-layer Y parallax.
    if (this.respondToVertical) {
      this.tile.y = this.baseSpriteY - cameraScrollY
    }
  }
}
