import Phaser from 'phaser'
import { BackgroundLayer } from '../entities/BackgroundLayer'
import { PhysicsSystem } from '../systems/PhysicsSystem'
import { EnergySystem } from '../systems/EnergySystem'
import { WindSystem } from '../systems/WindSystem'
import { ScoringSystem } from '../systems/ScoringSystem'
import { ObstacleSystem } from '../systems/ObstacleSystem'
import { GAME_WIDTH, GAME_HEIGHT, HERO_SCALE, MAX_UPWARD_VELOCITY, MIN_UPWARD_VELOCITY, TERMINAL_VELOCITY, TRIM_SPEED, DIVE_SPEED_MAX, STALL_TIME, GRAVITY, GRAVITY_EDGE, GRAVITY_BLEND_RANGE, GRAVITY_ZONE_TOP, GRAVITY_ZONE_BOTTOM, CEILING_Y, EXTRA_TOP, GRAVITY_CEILING } from '../config'
import { mapRange, lerp, clamp } from '../utils/math'
import { SoundSystem } from '../systems/SoundSystem'

export class GameScene extends Phaser.Scene {
  // Systems
  physicsSystem!: PhysicsSystem
  energySystem!: EnergySystem
  windSystem!: WindSystem
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
  private committedLiftMult = 0
  private cameraVelX = 0
  private sandEmitter!: Phaser.GameObjects.Particles.ParticleEmitter
  private stopGround: (() => void) | null = null
  private bgMusic: HTMLAudioElement | null = null

  constructor() { super('GameScene') }

  create(): void {
    this.gameRunning = true
    this.elapsedMs = 0
    this.groundDangerMs = 0
    this.isHolding = false
    this.heroState = 'dive'
    this.neutralTimer = 0
    this.committedUpwardCap = MIN_UPWARD_VELOCITY
    this.committedLiftMult = 0
    this.horizontalVelocity = TRIM_SPEED
    this.cameraVelX = 0

    this.physicsSystem = new PhysicsSystem()
    this.energySystem = new EnergySystem()
    this.windSystem = new WindSystem()
    this.scoringSystem = new ScoringSystem()
    this.obstacleSystem = new ObstacleSystem()

    this.energySystem.onDepleted(() => {
      this.events.emit('energyDepleted')
      SoundSystem.playEnergyDepleted()
    })

    this.scoringSystem.onMilestone((score) => {
      this.events.emit('scoreMilestone', score)
      this.cameras.main.flash(200, 255, 200, 0, false)
      const idx = [500, 1000, 2500, 5000, 10000, 25000].indexOf(score)
      SoundSystem.playMilestone(idx >= 0 ? idx : 0)
    })

    this.createBackground()
    this.createPlayer()
    this.createObstacles()
    this.setupInput()
    this.setupCollision()
    this.createSandEmitter()

    // Camera follows hero — infinite horizontal, extended vertical for high-altitude zone
    this.cameras.main.setBounds(0, -EXTRA_TOP, Number.MAX_SAFE_INTEGER, GAME_HEIGHT + EXTRA_TOP)
    this.cameras.main.scrollX = 0
    this.cameras.main.scrollY = 0

    // Gameplay music — random pick
    const tracks = [
      import.meta.env.BASE_URL + 'assets/audio/Gameplay Music/ES_Maniamaster - Lupus Nocte.mp3',
      import.meta.env.BASE_URL + 'assets/audio/Gameplay Music/ES_Pink Vortex - ELFL.mp3',
    ]
    this.bgMusic = new Audio(tracks[Math.floor(Math.random() * tracks.length)])
    this.bgMusic.loop = true
    this.bgMusic.volume = 0.7
    this.bgMusic.play().catch(() => {})

    // Launch UI overlay
    this.scene.launch('UIScene')
  }

  private createBackground(): void {
    // All source layers are 1376px wide. Reference full image is 768px tall.
    // Scale factor to fit game height 540px: 540/768 = 0.703
    const S = 540 / 768

    // Solid sky fill — always covers the full viewport even when camera scrolls into negative Y.
    // Placed first so everything renders on top of it.
    const skyFill = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x5fa8d8)
    skyFill.setScrollFactor(0)

    // All tileSprite layers use setScrollFactor(0) — screen-fixed. tilePositionX driven by camera.

    // Layer 4 — sky texture: full screen, very slow horizontal parallax
    const sky = this.add.tileSprite(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 'bg-layer4-sky')
    sky.setTileScale(S, S).setScrollFactor(0)
    this.bgLayers.push(new BackgroundLayer(this, sky, 0.04))

    // Layer 3 — back dunes: crests at screen y≈155 (40px above front y=195)
    // T=57 → screen y=0 shows texture y=57 < 212 (transparent) ✓; no bottom wrap within 540px
    const mtn = this.add.tileSprite(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 'bg-layer3-mountains')
    mtn.setTileScale(S, S).setScrollFactor(0)
    mtn.tilePositionY = 57
    mtn.setTint(0xaacce8)
    this.bgLayers.push(new BackgroundLayer(this, mtn, 0.15))

    // Layer 2.5 — mid dunes: crests at screen y≈175 (20px above front y=195)
    // T=53 → screen y=0 shows texture y=53 < 228 (transparent) ✓; tile H=583 > 540 so no wrap
    const mid = this.add.tileSprite(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 'bg-layer3-mountains')
    mid.setTileScale(S * 1.08, S * 1.08).setScrollFactor(0)
    mid.tilePositionY = 53
    mid.setTint(0xd4e8ec)
    this.bgLayers.push(new BackgroundLayer(this, mid, 0.45))

    // Layer 2 — front dunes (cropped 1376×371, content starts at row 0)
    // Span from duneTopY to bottom; ground layer covers any vertical tile repeat below
    const duneTopY = 195
    const duneH = GAME_HEIGHT - duneTopY
    const dune = this.add.tileSprite(GAME_WIDTH / 2, duneTopY + duneH / 2, GAME_WIDTH, duneH, 'bg-layer2-dunes')
    dune.setTileScale(S, S).setScrollFactor(0)
    this.bgLayers.push(new BackgroundLayer(this, dune, 0.88))

    // Layer 1 — foreground ground: screen-anchored, no vertical response
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

    // Track hold/release duration before energy update so drainMult uses current frame
    const wasHolding = this.holdDuration > 0
    if (this.isHolding) {
      // Snapshot the upward cap once at the moment of press, hold it for the entire climb.
      // In the extended high-altitude zone: no new lift budget — cap is capped to current
      // upward velocity only (so momentum from below carries through, but re-engaging hold
      // mid-zone gives no new boost).
      if (!wasHolding) {
        const diveNorm = clamp(this.horizontalVelocity / DIVE_SPEED_MAX, 0, 1)
        if (this.player.y < CEILING_Y) {
          // Extended zone: no new lift budget — only existing momentum carries through
          this.committedUpwardCap = Math.min(0, this.physicsSystem.velocityY)
          this.committedLiftMult = 0
        } else {
          this.committedUpwardCap = lerp(MIN_UPWARD_VELOCITY, MAX_UPWARD_VELOCITY, diveNorm)
          this.committedLiftMult = Math.pow(diveNorm, 0.5)  // square root: medium dives get much more lift
        }
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

    // Gravity builds from 0.35→1 over ~1.7 s after release
    const gravityMult = Math.min(1, 0.35 + this.releaseDuration * 0.38)

    // Gravity zones: GRAVITY in the mid band, GRAVITY_EDGE at top/bottom, GRAVITY_CEILING above ceiling
    const yNorm = this.player.y / GAME_HEIGHT
    const blendRange = GRAVITY_BLEND_RANGE
    let zoneGravity: number
    if (this.player.y < CEILING_Y) {
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

    // Lift strength is determined by how much dive was built up at the moment of press.
    // No dive = no lift. Full dive = full lift. Decays over hold duration (stall).
    const liftMult = Math.max(0, 1 - this.holdDuration / STALL_TIME) * 1.1 * this.committedLiftMult

    const windForce = 0
    const upwardCap = effectiveHolding ? this.committedUpwardCap : MAX_UPWARD_VELOCITY

    const dy = this.physicsSystem.update(dt, effectiveHolding, windForce, liftMult, effectiveGravityMult, upwardCap)

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

    const displaySpeed = this.horizontalVelocity * haltFactor
    this.scoringSystem.update(dt, displaySpeed)
    this.obstacleSystem.update(dt, this.elapsedMs, this.cameras.main.scrollX)

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
      layer.update(this.cameras.main.scrollX, this.cameras.main.scrollY)
    }


    // Player animation + pitch rotation driven by actual vertical velocity
    // Fast up → -35°, neutral/slow → ~-10°, fast down → +35°
    this.updatePlayerAnim(effectiveHolding, dt, atGround)
    const vy = this.physicsSystem.velocityY
    const targetAngle = atGround ? 0 : vy < 0
      ? mapRange(vy, MAX_UPWARD_VELOCITY, 0, -58, 0)
      : mapRange(Math.min(vy, 250), 0, 250, 0, 58)
    this.player.angle = Phaser.Math.Linear(this.player.angle, targetAngle, dt * (atGround ? 12 : 5))

    // Edge proximity: screen-relative position within the camera viewport
    const screenX = this.player.x - this.cameras.main.scrollX
    const xNorm = clamp((screenX - 50) / (GAME_WIDTH - 100), 0, 1)
    const edgeDriveMult = lerp(1.2, 0.8, xNorm)
    const edgeDragMult  = lerp(0.8, 1.2, xNorm)

    // ── Sound loops: ground slide ──
    const sliding = atGround && this.horizontalVelocity > 10
    if (sliding && !this.stopGround) {
      this.stopGround = SoundSystem.startGroundSlide(() => this.horizontalVelocity)
    } else if (!sliding && this.stopGround) {
      this.stopGround(); this.stopGround = null
    }

    // Horizontal momentum — trim-speed model
    if (atGround) {
      // Ground drag: gradual slide to a halt
      this.horizontalVelocity = Math.max(0, this.horizontalVelocity - 65 * dt)
    } else if (!effectiveHolding) {
      if (vy > 20) {
        // Dive thrust: builds speed above trim (exponential ramp over ~1.2s)
        const diveMult = Math.min(6, Math.pow(2.2, this.releaseDuration / 1.2))
        this.horizontalVelocity += vy * 0.329 * edgeDriveMult * diveMult * dt
      }
      // Always pull toward trim speed — decay from dive peak or recover from hold
      this.horizontalVelocity += (TRIM_SPEED - this.horizontalVelocity) * 0.8 * dt
    } else {
      // Stage 1 (0–2s hold): fast bleed toward ~35 px/s floor
      // Stage 2 (2s+ hold): very slow final bleed to zero
      if (this.holdDuration < 2.0) {
        this.horizontalVelocity += (80 - this.horizontalVelocity) * 0.6 * dt
      } else {
        this.horizontalVelocity += (40 - this.horizontalVelocity) * 0.15 * dt
      }
    }
    this.horizontalVelocity = clamp(this.horizontalVelocity, 0, DIVE_SPEED_MAX) * haltFactor
    this.player.x += this.horizontalVelocity * dt

    // Camera — horizontal: velocity chases hero speed with heavy inertia, plus a gentle
    // position-correction nudge so it doesn't drift too far. Camera coasts when hero slows.
    const targetScrollX = Math.max(0, this.player.x - GAME_WIDTH * 0.28)
    const posCorrection = (targetScrollX - this.cameras.main.scrollX) * 0.4
    this.cameraVelX = lerp(this.cameraVelX, this.horizontalVelocity + posCorrection, dt * 0.5)
    this.cameras.main.scrollX = Math.max(0, this.cameras.main.scrollX + this.cameraVelX * dt)

    // Camera — vertical: only follows when hero is within top 20% of screen.
    // Background vertical offset is applied manually in the bg update call below.
    const camScreenY = this.player.y - this.cameras.main.scrollY
    if (camScreenY < GAME_HEIGHT * 0.2) {
      const targetScrollY = clamp(this.player.y - GAME_HEIGHT * 0.2, -EXTRA_TOP, 0)
      this.cameras.main.scrollY = lerp(this.cameras.main.scrollY, targetScrollY, dt * 1.5)
    } else {
      this.cameras.main.scrollY = lerp(this.cameras.main.scrollY, 0, dt * 4)
      if (Math.abs(this.cameras.main.scrollY) < 0.5) this.cameras.main.scrollY = 0
    }

    // Emit HUD update event
    this.events.emit('hudUpdate', {
      score: this.scoringSystem.getDisplay(),
      energy: this.energySystem.getNormalized(),
      wind: this.windSystem.getCategory(),
      groundDanger: Math.min(1, Math.max(0, (this.groundDangerMs - 4000) / 3000)),
    })
  }

  private updatePlayerAnim(holding: boolean, dt: number, atGround = false): void {
    let newState = this.heroState

    if (atGround) {
      // Sliding on ground — always show neutral/level pose
      newState = 'neutral'
      this.neutralTimer = 0.1
    } else if (this.heroState === 'neutral') {
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

  private stopAllSounds(): void {
    this.stopGround?.(); this.stopGround = null
    this.bgMusic?.pause(); this.bgMusic = null
  }

  private triggerGameOver(): void {
    if (!this.gameRunning) return
    this.gameRunning = false
    this.isHolding = false

    this.stopAllSounds()
    SoundSystem.playCollision()

    this.player.angle = 0
    this.sandEmitter.stop()
    this.holdDuration = 0
    this.releaseDuration = 0
    this.horizontalVelocity = 0
    this.heroState = 'dive'
    this.neutralTimer = 0
    this.committedUpwardCap = MIN_UPWARD_VELOCITY
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
    this.stopAllSounds()
    this.sandEmitter?.stop()
    this.bgLayers = []
    this.input.off('pointerdown')
    this.input.off('pointerup')
  }
}

