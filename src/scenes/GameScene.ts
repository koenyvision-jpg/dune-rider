import Phaser from 'phaser'
import { BackgroundLayer } from '../entities/BackgroundLayer'
import { PhysicsSystem } from '../systems/PhysicsSystem'
import { EnergySystem } from '../systems/EnergySystem'
import { WindSystem } from '../systems/WindSystem'
import { ScrollSystem } from '../systems/ScrollSystem'
import { ScoringSystem } from '../systems/ScoringSystem'
import { ObstacleSystem } from '../systems/ObstacleSystem'
import { GAME_WIDTH, GAME_HEIGHT, HERO_SCALE, MAX_UPWARD_VELOCITY, MIN_UPWARD_VELOCITY, TERMINAL_VELOCITY, CRUISE_SPEED, STALL_TIME, GRAVITY, GRAVITY_EDGE, GRAVITY_ZONE_TOP, GRAVITY_ZONE_BOTTOM, BG_DUNE_Y, CEILING_Y, EXTRA_TOP, GRAVITY_CEILING } from '../config'
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
  private holdDuration = 0
  private releaseDuration = 0
  private horizontalVelocity = 0
  private heroState: 'lift' | 'neutral' | 'dive' = 'dive'
  private neutralTimer = 0
  private committedUpwardCap = MIN_UPWARD_VELOCITY
  private sandEmitter!: Phaser.GameObjects.Particles.ParticleEmitter


  constructor() { super('GameScene') }

  create(): void {
    this.gameRunning = true
    this.elapsedMs = 0
    this.groundDangerMs = 0
    this.isHolding = false
    this.heroState = 'dive'
    this.neutralTimer = 0
    this.committedUpwardCap = MIN_UPWARD_VELOCITY

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
    this.createSandEmitter()

    // Extend physics world upward and set camera bounds to allow upward scroll
    this.physics.world.setBounds(0, -EXTRA_TOP, GAME_WIDTH, GAME_HEIGHT + EXTRA_TOP)
    this.cameras.main.setBounds(0, -EXTRA_TOP, GAME_WIDTH, GAME_HEIGHT + EXTRA_TOP)
    this.cameras.main.scrollY = 0

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
    const duneY = BG_DUNE_Y
    const dune = this.add.tileSprite(GAME_WIDTH / 2, duneY, GAME_WIDTH, duneH, 'bg-layer2-dunes')
    dune.setTileScale(DS, DS)
    this.bgLayers.push(new BackgroundLayer(this, dune, 0.88))

    // Layer 1 — foreground ground: screen-anchored so it never scrolls off-bottom
    const gndH = Math.round(169 * S)
    const gnd = this.add.tileSprite(GAME_WIDTH / 2, GAME_HEIGHT - gndH / 2, GAME_WIDTH, gndH, 'bg-layer1-ground')
    gnd.setTileScale(S, S).setScrollFactor(0)
    this.bgLayers.push(new BackgroundLayer(this, gnd, 1.0))
  }

  private createPlayer(): void {
    // Hero image: 1032×1675, scale 0.085 → ~88×142px on screen
    this.player = this.physics.add.sprite(160, GAME_HEIGHT / 2, 'hero-dive')
    this.player.setScale(HERO_SCALE)
    this.player.body!.setSize(900, 1300)
    this.player.body!.setOffset(66, 180)
    this.player.anims.play('player-dive')
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
      (_player, obstacle) => {
        if (!this.gameRunning) return
        const obs = obstacle as Phaser.Physics.Arcade.Sprite
        const burst = this.add.particles(obs.x, obs.y, 'particle', {
          speed: { min: 80, max: 220 },
          angle: { min: 0, max: 360 },
          scale: { start: 1.4, end: 0 },
          alpha: { start: 1, end: 0 },
          lifespan: 600,
          quantity: 30,
          tint: [0xff0000, 0xff3300, 0xff6600, 0xcc0000],
          emitting: false,
        })
        burst.explode(30)
        this.triggerGameOver()
      }
    )
  }

  private createSandEmitter(): void {
    this.sandEmitter = this.add.particles(0, 0, 'particle', {
      speed: { min: 30, max: 110 },
      angle: { min: 195, max: 265 },
      scale: { start: 0.7, end: 0 },
      alpha: { start: 0.9, end: 0 },
      lifespan: { min: 150, max: 400 },
      frequency: 25,
      tint: [0xc2a45a, 0xe8d5a3, 0xb8935a, 0xd4b896],
      emitting: false,
    })
  }

  update(_time: number, delta: number): void {
    if (!this.gameRunning) return

    const dt = delta / 1000
    this.elapsedMs += delta

    // Update systems
    this.windSystem.update(delta)
    this.scrollSystem.update(dt, this.isHolding)

    // Track hold/release duration before energy update so drainMult uses current frame
    const wasHolding = this.holdDuration > 0
    if (this.isHolding) {
      // Snapshot the upward cap once at the moment of press, hold it for the entire climb
      if (!wasHolding) {
        const diveNorm = clamp(this.horizontalVelocity / CRUISE_SPEED, 0, 1)
        this.committedUpwardCap = lerp(MIN_UPWARD_VELOCITY, MAX_UPWARD_VELOCITY, diveNorm)
      }
      this.holdDuration += dt
      this.releaseDuration = 0
    } else {
      this.releaseDuration += dt
      this.holdDuration = 0
    }

    // ENERGY DISABLED FOR TUNING — bar still displays but has no gameplay effect
    this.energySystem.update(dt, this.isHolding, 1)
    const effectiveHolding = this.isHolding
    const liftMult = Math.max(0, 1 - this.holdDuration / STALL_TIME) * 1.1

    // Gravity builds from 0.35→1 over ~1.7 s after release
    const gravityMult = Math.min(1, 0.35 + this.releaseDuration * 0.38)

    // Zone gravity: stronger near top/bottom edges, and heaviest in the high-altitude extended zone
    const yNorm = this.player.y / GAME_HEIGHT
    const blendRange = 0.05
    let zoneGravity: number
    if (this.player.y < CEILING_Y) {
      // High-altitude zone: ramps GRAVITY_EDGE → GRAVITY_CEILING as player climbs into extended space
      const t = clamp((CEILING_Y - this.player.y) / EXTRA_TOP, 0, 1)
      zoneGravity = lerp(GRAVITY_EDGE, GRAVITY_CEILING, t)
    } else if (yNorm < GRAVITY_ZONE_TOP - blendRange) {
      zoneGravity = GRAVITY_EDGE
    } else if (yNorm < GRAVITY_ZONE_TOP) {
      zoneGravity = lerp(GRAVITY_EDGE, GRAVITY, (yNorm - (GRAVITY_ZONE_TOP - blendRange)) / blendRange)
    } else if (yNorm > GRAVITY_ZONE_BOTTOM + blendRange) {
      zoneGravity = GRAVITY_EDGE
    } else if (yNorm > GRAVITY_ZONE_BOTTOM) {
      zoneGravity = lerp(GRAVITY, GRAVITY_EDGE, (yNorm - GRAVITY_ZONE_BOTTOM) / blendRange)
    } else {
      zoneGravity = GRAVITY
    }
    const effectiveGravityMult = gravityMult * (zoneGravity / GRAVITY)

    const windForce = 0
    const upwardCap = effectiveHolding ? this.committedUpwardCap : MAX_UPWARD_VELOCITY

    const dy = this.physicsSystem.update(dt, effectiveHolding, windForce, liftMult, effectiveGravityMult, upwardCap)

    this.player.y += dy
    this.player.y = this.physicsSystem.clampY(this.player.y)

    if (this.physicsSystem.isAtCeiling(this.player.y)) {
      this.physicsSystem.velocityY = 0
    }

    // Dynamic camera: scroll up when player enters the extended high-altitude zone
    const targetScrollY = this.player.y < CEILING_Y
      ? clamp(this.player.y - CEILING_Y, -EXTRA_TOP, 0)
      : 0
    this.cameras.main.scrollY = lerp(this.cameras.main.scrollY, targetScrollY, Math.min(1, dt * 3))

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

    // Sand spray at hero feet when dragging along the ground
    const feetX = this.player.x
    const feetY = this.player.y + 48  // visible bottom of dive PNG with center origin
    if (atGround && Math.abs(this.horizontalVelocity) > 10) {
      this.sandEmitter.setPosition(feetX, feetY)
      if (!this.sandEmitter.emitting) this.sandEmitter.start()
    } else {
      if (this.sandEmitter.emitting) this.sandEmitter.stop()
    }

    for (const layer of this.bgLayers) {
      layer.update(displaySpeed, dt)
    }

    // Player animation + pitch rotation driven by actual vertical velocity
    // Fast up → -35°, neutral/slow → ~-10°, fast down → +35°
    this.updatePlayerAnim(effectiveHolding, dt)
    const vy = this.physicsSystem.velocityY
    const targetAngle = vy < 0
      ? mapRange(vy, MAX_UPWARD_VELOCITY, 0, -58, 0)
      : mapRange(Math.min(vy, 250), 0, 250, 0, 58)
    this.player.angle = Phaser.Math.Linear(this.player.angle, targetAngle, dt * 5)

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
        this.horizontalVelocity += vy * 0.286 * edgeDriveMult * diveMult * dt
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

  private updatePlayerAnim(holding: boolean, dt: number): void {
    let newState = this.heroState

    if (this.heroState === 'neutral') {
      this.neutralTimer -= dt
      if (this.neutralTimer <= 0) {
        // Resolve to whichever state input currently demands
        newState = holding ? 'lift' : 'dive'
      }
    } else if (holding !== (this.heroState === 'lift')) {
      // Input changed direction — always pass through neutral
      newState = 'neutral'
      this.neutralTimer = 0.25
    }

    if (newState !== this.heroState) {
      this.heroState = newState
      const key = newState === 'lift' ? 'player-lift' : newState === 'neutral' ? 'player-neutral' : 'player-dive'
      if (key !== this.prevAnim) {
        this.player.anims.play(key, true)
        this.prevAnim = key
      }
    }
  }

  private triggerGameOver(): void {
    if (!this.gameRunning) return
    this.gameRunning = false
    this.isHolding = false

    this.player.angle = 0
    this.sandEmitter.stop()
    this.holdDuration = 0
    this.releaseDuration = 0
    this.horizontalVelocity = 0
    this.heroState = 'dive'
    this.neutralTimer = 0
    this.committedUpwardCap = MIN_UPWARD_VELOCITY
    this.cameras.main.scrollY = 0
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
    this.sandEmitter?.stop()
    this.bgLayers = []
    this.input.off('pointerdown')
    this.input.off('pointerup')
  }
}

