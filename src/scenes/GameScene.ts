import Phaser from 'phaser'
import { BackgroundLayer } from '../entities/BackgroundLayer'
import { PhysicsSystem } from '../systems/PhysicsSystem'
import { EnergySystem } from '../systems/EnergySystem'
import { WindSystem } from '../systems/WindSystem'
import { ScrollSystem } from '../systems/ScrollSystem'
import { ScoringSystem } from '../systems/ScoringSystem'
import { ObstacleSystem } from '../systems/ObstacleSystem'
import { GAME_WIDTH, GAME_HEIGHT, HERO_SCALE, MAX_UPWARD_VELOCITY, TERMINAL_VELOCITY } from '../config'
import { mapRange, lerp, clamp } from '../utils/math'

export class GameScene extends Phaser.Scene {
  // Systems
  physicsSystem!: PhysicsSystem
  energySystem!: EnergySystem
  windSystem!: WindSystem
  scrollSystem!: ScrollSystem
  scoringSystem!: ScoringSystem
  obstacleSystem!: ObstacleSystem

  // Entities
  private player!: Phaser.Physics.Arcade.Sprite
  private bgLayers: BackgroundLayer[] = []
  private obstacleGroup!: Phaser.Physics.Arcade.Group

  // State
  private isHolding = false
  private gameRunning = false
  private elapsedMs = 0
  private groundDangerMs = 0
  private prevAnim = ''
  private holdDuration = 0    // seconds held continuously
  private releaseDuration = 0 // seconds released continuously
  private horizontalVelocity = 0 // px/s rightward momentum


  constructor() { super('GameScene') }

  create(): void {
    this.gameRunning = true
    this.elapsedMs = 0
    this.groundDangerMs = 0
    this.isHolding = false

    this.physicsSystem = new PhysicsSystem()
    this.energySystem = new EnergySystem()
    this.windSystem = new WindSystem()
    this.scrollSystem = new ScrollSystem()
    this.scoringSystem = new ScoringSystem()
    this.obstacleSystem = new ObstacleSystem()

    this.energySystem.onDepleted(() => {
      this.events.emit('energyDepleted')
    })

    this.scoringSystem.onMilestone((score) => {
      this.events.emit('scoreMilestone', score)
      this.cameras.main.flash(200, 255, 200, 0, false)
    })

    this.createBackground()
    this.createPlayer()
    this.createObstacles()
    this.setupInput()
    this.setupCollision()

    // Launch UI overlay
    this.scene.launch('UIScene')
  }

  private createBackground(): void {
    // All source layers are 1376px wide. Reference full image is 768px tall.
    // Scale factor to fit game height 540px: 540/768 = 0.703
    const S = 540 / 768

    // Layer 4 — sky (768px tall): full screen, slowest
    const sky = this.add.tileSprite(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 'bg-layer4-sky')
    sky.setTileScale(S, S)
    this.bgLayers.push(new BackgroundLayer(this, sky, 0.04))

    // Layer 3 — mountains (768px tall): shifted down so peaks just peek above dunes
    const mtn = this.add.tileSprite(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 'bg-layer3-mountains')
    mtn.setTileScale(S, S)
    mtn.tilePositionY = -65  // negative = texture shifts down → peaks move lower on screen
    this.bgLayers.push(new BackgroundLayer(this, mtn, 0.15))

    // Layer 2 — mid dunes (419px tall): 15% smaller, moved up in screenspace
    const DS = S * 0.85
    const duneH = Math.round(419 * DS)
    const duneY = 310  // center; top at ~185px — higher than before
    const dune = this.add.tileSprite(GAME_WIDTH / 2, duneY, GAME_WIDTH, duneH, 'bg-layer2-dunes')
    dune.setTileScale(DS, DS)
    this.bgLayers.push(new BackgroundLayer(this, dune, 0.88))

    // Layer 1 — foreground ground (169px tall): bottom-anchored, fastest
    const gndH = Math.round(169 * S)
    const gnd = this.add.tileSprite(GAME_WIDTH / 2, GAME_HEIGHT - gndH / 2, GAME_WIDTH, gndH, 'bg-layer1-ground')
    gnd.setTileScale(S, S)
    this.bgLayers.push(new BackgroundLayer(this, gnd, 1.0))
  }

  private createPlayer(): void {
    // Hero image: 1032×1675, scale 0.085 → ~88×142px on screen
    this.player = this.physics.add.sprite(160, GAME_HEIGHT / 2, 'hero')
    this.player.setScale(HERO_SCALE)
    // Body covers the canopy + pilot area (texture-space pixels)
    this.player.body!.setSize(900, 1300)
    this.player.body!.setOffset(66, 180)
    this.player.anims.play('player-idle')
    // Disable gravity from arcade physics — we handle it manually
    ;(this.player.body as Phaser.Physics.Arcade.Body).allowGravity = false
  }

  private createObstacles(): void {
    this.obstacleGroup = this.physics.add.group()
    this.obstacleSystem.init(this, this.obstacleGroup)
  }

  private setupInput(): void {
    this.input.addPointer(1)
    this.input.on('pointerdown', () => { this.isHolding = true })
    this.input.on('pointerup', () => { this.isHolding = false })
    this.input.keyboard!.on('keydown-SPACE', () => { this.isHolding = true })
    this.input.keyboard!.on('keyup-SPACE', () => { this.isHolding = false })
  }

  private setupCollision(): void {
    this.physics.add.overlap(
      this.player,
      this.obstacleGroup,
      (_player, _obstacle) => {
        if (this.gameRunning) this.triggerGameOver()
      }
    )
  }

  update(_time: number, delta: number): void {
    if (!this.gameRunning) return

    const dt = delta / 1000
    this.elapsedMs += delta

    // Update systems
    this.windSystem.update(delta)
    this.scrollSystem.update(dt, this.isHolding)

    // Track hold/release duration before energy update so drainMult uses current frame
    if (this.isHolding) {
      this.holdDuration += dt
      this.releaseDuration = 0
    } else {
      this.releaseDuration += dt
      this.holdDuration = 0
    }

    // ENERGY DISABLED FOR TUNING — bar still displays but has no gameplay effect
    this.energySystem.update(dt, this.isHolding, 1)
    const effectiveHolding = this.isHolding
    const liftMult = Math.max(0, 1 - this.holdDuration * 0.13) * 1.1

    // Gravity builds from 0.35→1 over ~1.7 s after release
    const gravityMult = Math.min(1, 0.35 + this.releaseDuration * 0.38)

    const windForce = 0 // wind system disabled for now
    const dy = this.physicsSystem.update(dt, effectiveHolding, windForce, liftMult, gravityMult)

    this.player.y += dy
    this.player.y = this.physicsSystem.clampY(this.player.y)

    if (this.physicsSystem.isAtCeiling(this.player.y)) {
      this.physicsSystem.velocityY = 0
    }

    // Ground halt system: after 4s on ground slow everything to a stop → game over
    const atGround = this.physicsSystem.isAtGround(this.player.y)
    if (atGround) {
      this.groundDangerMs += delta
    } else {
      this.groundDangerMs = 0
    }

    let haltFactor = 1.0
    if (this.groundDangerMs >= 4000) {
      const haltProgress = Math.min(1, (this.groundDangerMs - 4000) / 3000)
      haltFactor = 1 - haltProgress
      if (haltProgress >= 1) {
        this.triggerGameOver()
        return
      }
    }

    const displaySpeed = this.scrollSystem.currentSpeed * haltFactor
    this.scoringSystem.update(dt, displaySpeed)
    this.obstacleSystem.update(dt, this.elapsedMs, displaySpeed)

    for (const layer of this.bgLayers) {
      layer.update(displaySpeed, dt)
    }

    // Player animation + pitch rotation driven by actual vertical velocity
    // Fast up → -35°, neutral/slow → ~-10°, fast down → +35°
    this.updatePlayerAnim(effectiveHolding)
    const vy = this.physicsSystem.velocityY
    const targetAngle = vy < 0
      ? mapRange(vy, MAX_UPWARD_VELOCITY, 0, -35, 0)
      : mapRange(Math.min(vy, 250), 0, 250, 0, 35)
    this.player.angle = Phaser.Math.Linear(this.player.angle, targetAngle, dt * 3)

    // Edge proximity: near right → more drag/less drive; near left → more drive/less drag (subtle ±20%)
    const xNorm = (this.player.x - 50) / (GAME_WIDTH - 100)  // 0=left edge, 1=right edge
    const edgeDriveMult = lerp(1.2, 0.8, xNorm)
    const edgeDragMult  = lerp(0.8, 1.2, xNorm)

    // Horizontal momentum
    if (atGround) {
      // Sand drag overrides everything: linear deceleration + leftward pull
      if (this.horizontalVelocity > 0) {
        this.horizontalVelocity = Math.max(0, this.horizontalVelocity - 320 * dt)
      }
      this.horizontalVelocity -= 80 * dt
    } else if (!effectiveHolding) {
      if (vy > 20) {
        // Exponential dive thrust: starts gentle, doubles every ~1.2s of continuous release
        const diveMult = Math.min(6, Math.pow(2.2, this.releaseDuration / 1.2))
        this.horizontalVelocity += vy * 0.26 * edgeDriveMult * diveMult * dt
      }
      this.horizontalVelocity *= Math.pow(lerp(0.988, 0.980, xNorm), dt * 60)
    } else {
      if (this.holdDuration < 0.6) {
        this.horizontalVelocity *= Math.pow(0.988, dt * 60)
      } else {
        this.horizontalVelocity -= 55 * edgeDragMult * dt
      }
    }
    this.horizontalVelocity = clamp(this.horizontalVelocity, -70, 180) * haltFactor
    this.player.x += this.horizontalVelocity * dt
    this.player.x = clamp(this.player.x, 50, GAME_WIDTH - 50)

    // Emit HUD update event
    this.events.emit('hudUpdate', {
      score: this.scoringSystem.getDisplay(),
      energy: this.energySystem.getNormalized(),
      wind: this.windSystem.getCategory(),
      groundDanger: Math.min(1, Math.max(0, (this.groundDangerMs - 4000) / 3000)),
    })
  }

  private updatePlayerAnim(holding: boolean): void {
    let anim: string
    if (holding) {
      anim = 'player-hold'
    } else if (this.physicsSystem.velocityY > 50) {
      anim = 'player-glide'
    } else {
      anim = 'player-idle'
    }
    if (anim !== this.prevAnim) {
      this.player.anims.play(anim, true)
      this.prevAnim = anim
    }
  }

  private triggerGameOver(): void {
    if (!this.gameRunning) return
    this.gameRunning = false
    this.isHolding = false

    this.player.angle = 0
    this.holdDuration = 0
    this.releaseDuration = 0
    this.horizontalVelocity = 0
    this.cameras.main.shake(200, 0.015)

    // Burst particles
    const burst = this.add.particles(this.player.x, this.player.y, 'particle', {
      speed: { min: 60, max: 180 },
      angle: { min: 0, max: 360 },
      scale: { start: 1.2, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 500,
      quantity: 20,
      tint: [0xff6ec7, 0xffd700, 0xff2244],
      emitting: false,
    })
    burst.explode(20)

    this.scene.stop('UIScene')

    this.time.delayedCall(600, () => {
      this.scene.start('GameOverScene', {
        score: this.scoringSystem.getDisplay(),
      })
    })
  }

  shutdown(): void {
    this.bgLayers = []
    this.input.off('pointerdown')
    this.input.off('pointerup')
  }
}

