import Phaser from 'phaser'

// Sprite frame size — 64×64 gives crisp look at 960×540
const FRAME = 64

export class BootScene extends Phaser.Scene {
  constructor() { super('BootScene') }

  preload(): void {
    this.load.image('hero-lift',    'assets/sprites/hero-lift.png')
    this.load.image('hero-neutral', 'assets/sprites/hero-neutral.png')
    this.load.image('hero-dive',    'assets/sprites/hero-dive.png')
    this.load.image('enemy-banit',  'assets/sprites/enemy-banit.png')
    this.load.image('enemy-m2red',  'assets/sprites/enemy-m2red.png')
    this.load.image('bg-layer4-sky',       'assets/sprites/bg-layer4-sky.png')
    this.load.image('bg-layer3-mountains', 'assets/sprites/bg-layer3-mountains.png')
    this.load.image('bg-layer2-dunes',     'assets/sprites/bg-layer2-dunes.png')
    this.load.image('bg-layer1-ground',    'assets/sprites/bg-layer1-ground.png')
    this.load.image('logo',          'assets/sprites/logo.png')
    this.load.image('glider-hopper', 'assets/sprites/glider-hopper.png')
    this.load.image('glider-scraper','assets/sprites/glider-scraper.png')
  }

  create(): void {
    this.generateTextures()
    this.createAnims()
    this.scene.start('MenuScene')
  }

  private generateTextures(): void {
    this.generatePlayerSheet()
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

private generateParticle(): void {
    const gfx = this.add.graphics()
    gfx.fillStyle(0xffffff).fillRect(0, 0, 6, 6)
    gfx.generateTexture('particle', 6, 6)
    gfx.destroy()
  }

  private createAnims(): void {
    // Hero: one static image per state — animations are single-frame stubs
    this.anims.create({ key: 'player-lift',    frames: [{ key: 'hero-lift' }],    frameRate: 1, repeat: -1 })
    this.anims.create({ key: 'player-neutral', frames: [{ key: 'hero-neutral' }], frameRate: 1, repeat: -1 })
    this.anims.create({ key: 'player-dive',    frames: [{ key: 'hero-dive' }],    frameRate: 1, repeat: -1 })

  }
}
