import Phaser from 'phaser'
import { GAME_WIDTH, GAME_HEIGHT } from '../config'

export class MenuScene extends Phaser.Scene {
  constructor() { super('MenuScene') }

  create(): void {
    const S = 540 / 768
    const sky = this.add.tileSprite(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 'bg-layer4-sky')
    sky.setTileScale(S, S)
    const mtn = this.add.tileSprite(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 'bg-layer3-mountains')
    mtn.setTileScale(S, S)
    mtn.tilePositionY = -65
    const DS = S * 0.85
    const duneH = Math.round(419 * DS)
    this.add.tileSprite(GAME_WIDTH / 2, 310, GAME_WIDTH, duneH, 'bg-layer2-dunes').setTileScale(DS, DS)
    const gndH = Math.round(169 * S)
    this.add.tileSprite(GAME_WIDTH / 2, GAME_HEIGHT - gndH / 2, GAME_WIDTH, gndH, 'bg-layer1-ground').setTileScale(S, S)

    // Scanlines
    const scan = this.add.graphics()
    for (let y = 0; y < GAME_HEIGHT; y += 4) {
      scan.fillStyle(0x000000, 0.07)
      scan.fillRect(0, y, GAME_WIDTH, 2)
    }

    // Title
    this.add.text(GAME_WIDTH / 2, 90, 'DUNE RIDER', {
      fontFamily: 'monospace',
      fontSize: '52px',
      color: '#ff6ec7',
      stroke: '#220011',
      strokeThickness: 6,
    }).setOrigin(0.5)

    this.add.text(GAME_WIDTH / 2, 158, 'PARAGLIDING ENDURANCE', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#00cfff',
      letterSpacing: 5,
    }).setOrigin(0.5)

    // Hero preview — 1032×1675 source, scale to fit nicely on menu
    const preview = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 20, 'hero')
    preview.setScale(0.18)

    // Pulsing prompt
    const startText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 100, 'TAP TO FLY', {
      fontFamily: 'monospace',
      fontSize: '24px',
      color: '#ffd700',
      stroke: '#000',
      strokeThickness: 4,
    }).setOrigin(0.5)

    this.tweens.add({
      targets: startText,
      alpha: 0.15,
      duration: 550,
      yoyo: true,
      repeat: -1,
    })

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 54, 'HOLD = FLY UP       RELEASE = GLIDE', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#888888',
    }).setOrigin(0.5)

    this.input.once('pointerdown', () => this.scene.start('GameScene'))
    this.input.keyboard!.once('keydown-SPACE', () => this.scene.start('GameScene'))
  }
}
