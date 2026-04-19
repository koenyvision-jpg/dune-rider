import Phaser from 'phaser'
import { GAME_WIDTH, GAME_HEIGHT } from '../config'

interface HudData {
  score: number
  energy: number
  wind: string
  groundDanger: number
}

export class UIScene extends Phaser.Scene {
  private scoreText!: Phaser.GameObjects.Text
  private energyBar!: Phaser.GameObjects.Graphics
  private windText!: Phaser.GameObjects.Text
  private dangerText!: Phaser.GameObjects.Text
  private energyWarning!: Phaser.GameObjects.Text

  constructor() { super({ key: 'UIScene', active: false }) }

  create(): void {
    // Score — top center
    this.scoreText = this.add.text(GAME_WIDTH / 2, 14, '0 m', {
      fontFamily: 'monospace',
      fontSize: '22px',
      color: '#ffd700',
      stroke: '#000',
      strokeThickness: 4,
    }).setOrigin(0.5, 0)

    // Energy bar — bottom left
    const barBg = this.add.graphics()
    barBg.fillStyle(0x000000, 0.55)
    barBg.fillRect(16, GAME_HEIGHT - 40, 140, 18)

    this.add.text(16, GAME_HEIGHT - 58, 'ENERGY', {
      fontFamily: 'monospace',
      fontSize: '13px',
      color: '#aaaaaa',
    })

    this.energyBar = this.add.graphics()

    // Wind indicator — top right (hidden while wind system is disabled)
    this.windText = this.add.text(GAME_WIDTH - 16, 14, '', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#00cfff',
      stroke: '#000',
      strokeThickness: 3,
    }).setOrigin(1, 0).setVisible(false)

    // Ground danger warning — center
    this.dangerText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 60, '⚠  PULL UP!', {
      fontFamily: 'monospace',
      fontSize: '28px',
      color: '#ff2244',
      stroke: '#000',
      strokeThickness: 4,
    }).setOrigin(0.5).setVisible(false)

    // Energy depleted warning — center
    this.energyWarning = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 40, 'ENERGY LOW!', {
      fontFamily: 'monospace',
      fontSize: '20px',
      color: '#ff8800',
      stroke: '#000',
      strokeThickness: 3,
    }).setOrigin(0.5).setAlpha(0)

    // Scanlines
    const scan = this.add.graphics()
    for (let y = 0; y < GAME_HEIGHT; y += 4) {
      scan.fillStyle(0x000000, 0.06)
      scan.fillRect(0, y, GAME_WIDTH, 2)
    }

    // Vignette
    const vig = this.add.graphics()
    vig.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.5, 0.5, 0.0, 0.0)
    vig.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT / 3)
    vig.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.0, 0.0, 0.5, 0.5)
    vig.fillRect(0, GAME_HEIGHT * 2 / 3, GAME_WIDTH, GAME_HEIGHT / 3)

    const gameScene = this.scene.get('GameScene')
    gameScene.events.on('hudUpdate', this.onHudUpdate, this)
    gameScene.events.on('energyDepleted', this.onEnergyDepleted, this)
  }

  private onHudUpdate(data: HudData): void {
    this.scoreText.setText(`${data.score} m`)

    // Energy bar fill
    this.energyBar.clear()
    const barW = Math.floor(140 * data.energy)
    const color = data.energy > 0.5 ? 0x00ff88 : data.energy > 0.25 ? 0xffaa00 : 0xff2244
    this.energyBar.fillStyle(color)
    this.energyBar.fillRect(16, GAME_HEIGHT - 40, barW, 18)

    // Wind label
    const windLabels: Record<string, string> = {
      strong: '▲▲ STRONG',
      moderate: '▲ MODERATE',
      weak: '▼ WEAK',
      dying: '▼▼ DYING',
    }
    const windColors: Record<string, string> = {
      strong: '#00ff88',
      moderate: '#00cfff',
      weak: '#ffaa00',
      dying: '#ff2244',
    }
    this.windText.setText(`WIND: ${windLabels[data.wind] ?? '--'}`)
    this.windText.setColor(windColors[data.wind] ?? '#ffffff')

    // Ground danger
    this.dangerText.setVisible(data.groundDanger > 0.01)
    if (data.groundDanger > 0.01) {
      this.dangerText.setAlpha(0.6 + (Math.sin(Date.now() * 0.01) * 0.5 + 0.5) * 0.4)
    }
  }

  private onEnergyDepleted(): void {
    this.tweens.add({
      targets: this.energyWarning,
      alpha: { from: 1, to: 0 },
      duration: 1500,
      ease: 'Cubic.Out',
    })
  }

  shutdown(): void {
    const gameScene = this.scene.get('GameScene')
    gameScene.events.off('hudUpdate', this.onHudUpdate, this)
    gameScene.events.off('energyDepleted', this.onEnergyDepleted, this)
  }
}
