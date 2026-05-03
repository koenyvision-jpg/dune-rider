import Phaser from 'phaser'
import { BootScene } from './scenes/BootScene'
import { MenuScene } from './scenes/MenuScene'
import { GameScene } from './scenes/GameScene'
import { UIScene } from './scenes/UIScene'
import { GameOverScene } from './scenes/GameOverScene'
import { GAME_WIDTH, GAME_HEIGHT } from './config'

new Phaser.Game({
  type: Phaser.CANVAS,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#5fa8d8',
  pixelArt: true,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scene: [BootScene, MenuScene, GameScene, UIScene, GameOverScene],
})
