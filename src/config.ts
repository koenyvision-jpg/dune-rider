export const GAME_WIDTH = 960
export const GAME_HEIGHT = 540

// Physics
export const GRAVITY = 820
export const HOLD_LIFT = -1550
export const DRAG_COEFFICIENT = 0.92
export const TERMINAL_VELOCITY = 600
export const MAX_UPWARD_VELOCITY = -380  // lift ceiling after a full-speed dive
export const MIN_UPWARD_VELOCITY = -60   // lift ceiling with no dive momentum
export const STALL_TIME = 3              // seconds of continuous hold before lift cuts out

// Vertical gravity zones (as fraction of GAME_HEIGHT)
export const GRAVITY_EDGE = 1333        // gravity in top and bottom zones (1.625× GRAVITY)
export const GRAVITY_ZONE_TOP    = 0.25 // above this → edge gravity
export const GRAVITY_ZONE_BOTTOM = 0.85 // below this → edge gravity
export const GROUND_Y = 432   // feet land at y=480 — mid ground strip
export const BG_DUNE_Y = 370  // mid-dune layer center Y (was hardcoded 310)
export const CEILING_Y = 54   // 10% buffer from top    (540 * 0.1)
export const EXTRA_TOP = 162         // 30% of GAME_HEIGHT — extended vertical space above normal ceiling
export const GRAVITY_CEILING = 1800  // gravity in high-altitude extended zone

// Energy
export const MAX_ENERGY = 100
export const DRAIN_RATE = 10
export const RECHARGE_RATE = 6
export const RECHARGE_THRESHOLD = 10

// Wind
export const WIND_CHANGE_SPEED = 0.0003
export const MIN_WIND = -300
export const MAX_WIND = 300
export const WIND_LIFT_MULTIPLIER = 1.0

// Scroll / speed — purely input-driven, no time progression
export const CRUISE_SPEED = 200   // speed when releasing (full speed)
export const HOLD_SPEED   = 90    // speed when holding spacebar (decelerated)

// Hero sprite scale (1032×1675 source → ~88×142px on screen)
export const HERO_SCALE = 0.085
export const ENEMY_SCALE = 0.13        // 816px wide source → ~106px on screen
export const ENEMY_BANIT_SPEED = 240   // px/s constant screen-space speed
export const ENEMY_M2RED_SPEED  = 190  // px/s constant screen-space speed
// Obstacle base scale so Cat1 matches hero visible height (~142px / 64px frame)
export const PLAYER_SCALE = 2.22

// Obstacles
export const OBSTACLE_BASE_INTERVAL = 4000
export const OBSTACLE_MIN_INTERVAL  = 1200
export const OBSTACLE_POOL_SIZE     = 15  // 5 per category

// Category speed multipliers (applied to currentSpeed)
// Cat1 moves with the environment, Cat2 slower, Cat3 faster
export const OBS_CAT1_SPEED = 1.0
export const OBS_CAT2_SPEED = 0.65
export const OBS_CAT3_SPEED = 1.55

// Scoring
export const SCORE_SCALE = 0.05
export const SCORE_MILESTONES = [500, 1000, 2500, 5000, 10000, 25000]

// Ground danger timer (ms)
export const GROUND_DANGER_MS = 3000
