import Phaser from 'phaser'
import { GAME_WIDTH, GAME_HEIGHT } from '../config'

export class GameOverScene extends Phaser.Scene {
  constructor() { super('GameOverScene') }

  create(data: { score: number }): void {
    const score = data?.score ?? 0

    // Background dim
    this.add.graphics().fillStyle(0x000000, 0.65).fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT)

    // Panel
    this.add.graphics()
      .fillStyle(0x0a053a, 0.9)
      .fillRect(GAME_WIDTH / 2 - 240, 80, 480, 360)
      .lineStyle(2, 0xff6ec7)
      .strokeRect(GAME_WIDTH / 2 - 240, 80, 480, 360)

    this.add.text(GAME_WIDTH / 2, 130, 'GAME OVER', {
      fontFamily: 'monospace',
      fontSize: '42px',
      color: '#ff2244',
      stroke: '#000',
      strokeThickness: 5,
    }).setOrigin(0.5)

    this.add.text(GAME_WIDTH / 2, 210, `DISTANCE`, {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#aaaaaa',
    }).setOrigin(0.5)

    this.add.text(GAME_WIDTH / 2, 248, `${score} m`, {
      fontFamily: 'monospace',
      fontSize: '36px',
      color: '#ffd700',
      stroke: '#000',
      strokeThickness: 4,
    }).setOrigin(0.5)

    const best = this.getBest(score)
    this.add.text(GAME_WIDTH / 2, 302, `BEST: ${best} m`, {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#00cfff',
    }).setOrigin(0.5)

    if (score >= best) {
      this.add.text(GAME_WIDTH / 2, 334, '★  NEW RECORD!  ★', {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: '#ffd700',
      }).setOrigin(0.5)
    }

    // Restart button
    const restartBtn = this.add.text(GAME_WIDTH / 2, 390, '[ PLAY AGAIN ]', {
      fontFamily: 'monospace',
      fontSize: '22px',
      color: '#ff6ec7',
      stroke: '#000',
      strokeThickness: 3,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })

    restartBtn.on('pointerover', () => restartBtn.setColor('#ffd700'))
    restartBtn.on('pointerout', () => restartBtn.setColor('#ff6ec7'))
    restartBtn.on('pointerdown', () => this.scene.start('GameScene'))

    const menuBtn = this.add.text(GAME_WIDTH / 2, 432, '[ MENU ]', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#888888',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })

    menuBtn.on('pointerover', () => menuBtn.setColor('#ffffff'))
    menuBtn.on('pointerout', () => menuBtn.setColor('#888888'))
    menuBtn.on('pointerdown', () => this.scene.start('MenuScene'))

    this.input.keyboard!.once('keydown-SPACE', () => this.scene.start('GameScene'))

    // Scanlines
    const scan = this.add.graphics()
    for (let y = 0; y < GAME_HEIGHT; y += 4) {
      scan.fillStyle(0x000000, 0.06)
      scan.fillRect(0, y, GAME_WIDTH, 2)
    }
  }

  private getBest(current: number): number {
    const stored = parseInt(localStorage.getItem('dunerider_best') ?? '0', 10)
    const best = Math.max(current, stored)
    localStorage.setItem('dunerider_best', String(best))
    return best
  }
}
