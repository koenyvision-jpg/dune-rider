import Phaser from 'phaser'

// Sprite frame size — 64×64 gives crisp look at 960×540
const FRAME = 64

export class BootScene extends Phaser.Scene {
  constructor() { super('BootScene') }

  preload(): void {
    this.load.image('hero', 'assets/sprites/hero.png')
    this.load.image('bg-layer4-sky',       'assets/sprites/bg-layer4-sky.png')
    this.load.image('bg-layer3-mountains', 'assets/sprites/bg-layer3-mountains.png')
    this.load.image('bg-layer2-dunes',     'assets/sprites/bg-layer2-dunes.png')
    this.load.image('bg-layer1-ground',    'assets/sprites/bg-layer1-ground.png')
  }

  create(): void {
    this.generateTextures()
    this.createAnims()
    this.scene.start('MenuScene')
  }

  private generateTextures(): void {
    this.generatePlayerSheet()
    this.generateObstacleSheet()
    this.generateParticle()
  }

  private generatePlayerSheet(): void {
    // 12 frames × FRAME px wide, FRAME px tall
    // Frames 0-3: idle, 4-7: hold/ascending, 8-11: glide/descending
    const gfx = this.add.graphics()

    for (let frame = 0; frame < 12; frame++) {
      const ox = frame * FRAME
      const anim = Math.floor(frame / 4)
      const f = frame % 4

      const bodyColor = anim === 0 ? 0xff6ec7 : anim === 1 ? 0xffd700 : 0x00cfff
      const wingColor = anim === 0 ? 0xcc44aa : anim === 1 ? 0xff8c00 : 0x0088cc

      const wingY = anim === 1 ? 6 + (f % 2) * 2 : anim === 2 ? 14 + (f % 2) * 2 : 10

      // Canopy
      gfx.fillStyle(wingColor)
      gfx.fillRect(ox + 8, wingY, 48, 10)
      // Highlight
      gfx.fillStyle(0xffffff, 0.3)
      gfx.fillRect(ox + 12, wingY + 2, 40, 4)
      // Lines
      gfx.fillStyle(0x888888)
      gfx.fillRect(ox + 20, wingY + 10, 4, 14)
      gfx.fillRect(ox + 40, wingY + 10, 4, 14)
      // Harness
      gfx.fillStyle(0xff4400)
      gfx.fillRect(ox + 22, wingY + 24, 20, 10)
      // Body
      gfx.fillStyle(0x223355)
      gfx.fillRect(ox + 26, wingY + 18, 12, 18)
      // Helmet
      gfx.fillStyle(bodyColor)
      gfx.fillRect(ox + 26, wingY + 10, 12, 12)
      // Visor
      gfx.fillStyle(0x000033)
      gfx.fillRect(ox + 28, wingY + 14, 8, 4)
    }

    gfx.generateTexture('player', FRAME * 12, FRAME)
    gfx.destroy()

    const tex = this.textures.get('player')
    for (let i = 0; i < 12; i++) {
      tex.add(i, 0, i * FRAME, 0, FRAME, FRAME)
    }
  }

  private generateObstacleSheet(): void {
    const gfx = this.add.graphics()

    for (let frame = 0; frame < 4; frame++) {
      const ox = frame * FRAME
      const w = frame % 2 * 2

      // Drawn in white so setTint() applies the category colour cleanly
      gfx.fillStyle(0xffffff)              // canopy
      gfx.fillRect(ox + 8, 12 + w, 48, 10)
      gfx.fillStyle(0xdddddd)              // canopy highlight
      gfx.fillRect(ox + 12, 13 + w, 40, 4)
      gfx.fillStyle(0xaaaaaa)              // lines
      gfx.fillRect(ox + 20, 22 + w, 4, 12)
      gfx.fillRect(ox + 40, 22 + w, 4, 12)
      gfx.fillStyle(0xcccccc)              // harness
      gfx.fillRect(ox + 22, 34 + w, 20, 8)
      gfx.fillStyle(0x888899)              // body
      gfx.fillRect(ox + 26, 28 + w, 12, 16)
      gfx.fillStyle(0xffffff)              // helmet
      gfx.fillRect(ox + 26, 20 + w, 12, 12)
      gfx.fillStyle(0x222233)              // visor (stays dark regardless of tint)
      gfx.fillRect(ox + 28, 24 + w, 8, 4)
    }

    gfx.generateTexture('obstacle', FRAME * 4, FRAME)
    gfx.destroy()

    const tex = this.textures.get('obstacle')
    for (let i = 0; i < 4; i++) {
      tex.add(i, 0, i * FRAME, 0, FRAME, FRAME)
    }
  }

  private generateParticle(): void {
    const gfx = this.add.graphics()
    gfx.fillStyle(0xffffff).fillRect(0, 0, 6, 6)
    gfx.generateTexture('particle', 6, 6)
    gfx.destroy()
  }

  private createAnims(): void {
    // Hero uses a single static image — all anim states map to the same frame
    const heroFrame = [{ key: 'hero' }]
    this.anims.create({ key: 'player-idle',  frames: heroFrame, frameRate: 1, repeat: -1 })
    this.anims.create({ key: 'player-hold',  frames: heroFrame, frameRate: 1, repeat: -1 })
    this.anims.create({ key: 'player-glide', frames: heroFrame, frameRate: 1, repeat: -1 })

    this.anims.create({
      key: 'obstacle-fly',
      frames: this.anims.generateFrameNumbers('obstacle', { start: 0, end: 3 }),
      frameRate: 8,
      repeat: -1,
    })
  }
}
